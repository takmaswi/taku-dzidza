import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { requireLearner } from "../lib/access";
import { fileKind, SOURCE_LIMITS } from "../sources/limits";
import { linkProblem, splitPages } from "../sources/text";
import { ADULT_AGE, ageOn } from "../accounts/age";
import { startPurge } from "../privacy/purge";
import { packSourceReadable } from "../packs/scope";
import { ownNotebook } from "./notebooks";
import { writePages } from "./read";
import { claimUpload, dropUpload, issueUpload } from "./uploads";

/** Adding sources to a notebook (SPEC.md 3.2): files, pasted text and links. */

export async function ownSource(ctx: QueryCtx, sourceId: Id<"sources">): Promise<{ profile: Doc<"profiles">; source: Doc<"sources"> }> {
  const { profile } = await requireLearner(ctx);
  const source = await ctx.db.get(sourceId);
  if (source === null || source.profileId !== profile._id || source.deletingAt !== undefined) throw new ConvexError("Source not found.");
  return { profile, source };
}

async function roomFor(ctx: MutationCtx, notebookId: Id<"notebooks">): Promise<void> {
  const count = (await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", notebookId)).take(SOURCE_LIMITS.maxSourcesPerNotebook + 1)).length;
  if (count >= SOURCE_LIMITS.maxSourcesPerNotebook) throw new ConvexError(`A notebook can hold up to ${SOURCE_LIMITS.maxSourcesPerNotebook} sources.`);
}

/** An upload address with its ticket (convex/notebooks/uploads.ts). addFile needs the ticket back. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx): Promise<{ url: string; uploadId: Id<"uploads"> }> => {
    const { profile } = await requireLearner(ctx);
    const uploadId = await issueUpload(ctx, profile);
    return { url: await ctx.storage.generateUploadUrl(), uploadId };
  },
});

export const addFile = mutation({
  args: { notebookId: v.id("notebooks"), uploadId: v.id("uploads"), storageId: v.id("_storage"), fileName: v.string() },
  handler: async (ctx, args): Promise<{ ok: true; sourceId: Id<"sources"> } | { ok: false; message: string }> => {
    const { profile, notebook } = await ownNotebook(ctx, args.notebookId);
    // From here the file is this learner's: bound to their ticket, or the call throws and the file is not touched.
    const meta = await claimUpload(ctx, profile, args.uploadId, args.storageId);
    const kind = fileKind(meta.contentType, args.fileName);
    const count = (await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).take(SOURCE_LIMITS.maxSourcesPerNotebook + 1)).length;
    const problem =
      kind === null
        ? "Add a PDF, a Word file (.docx) or a photo."
        : meta.size > SOURCE_LIMITS.maxFileBytes
          ? `Files can be up to ${SOURCE_LIMITS.maxFileBytes / 1024 / 1024} MB.`
          : meta.size === 0
            ? "That file is empty."
            : count >= SOURCE_LIMITS.maxSourcesPerNotebook
              ? `A notebook can hold up to ${SOURCE_LIMITS.maxSourcesPerNotebook} sources.`
              : null;
    if (problem !== null || kind === null) {
      // Returned, not thrown: a thrown error would undo giving the file back.
      await dropUpload(ctx, profile, args.uploadId);
      return { ok: false, message: problem ?? "That file cannot be read." };
    }
    const sourceId = await ctx.db.insert("sources", {
      notebookId: notebook._id,
      profileId: profile._id,
      kind,
      title: args.fileName.trim().slice(0, 120) || "Untitled",
      storageId: args.storageId,
      status: "reading",
      pageCount: 0,
      createdAt: Date.now(),
    });
    await ctx.db.patch(notebook._id, { updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.notebooks.read.readFile, { sourceId });
    return { ok: true, sourceId };
  },
});

export const addText = mutation({
  args: { notebookId: v.id("notebooks"), title: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    const { profile, notebook } = await ownNotebook(ctx, args.notebookId);
    const text = args.text.slice(0, SOURCE_LIMITS.maxPasteChars);
    const pages = splitPages(text);
    if (pages.length === 0) throw new ConvexError("Paste some text first.");
    await roomFor(ctx, notebook._id);
    const sourceId = await ctx.db.insert("sources", {
      notebookId: notebook._id,
      profileId: profile._id,
      kind: "text",
      title: args.title.trim().slice(0, 120) || "Pasted text",
      status: "reading",
      pageCount: 0,
      createdAt: Date.now(),
    });
    await ctx.db.patch(notebook._id, { updatedAt: Date.now() });
    // An under 18's text is screened before it becomes a source (convex/notebooks/read.ts).
    if (ageOn(profile.birthYear, profile.birthMonth, new Date()) < ADULT_AGE) await ctx.scheduler.runAfter(0, internal.notebooks.read.readText, { sourceId, pages });
    else await writePages(ctx, sourceId, pages);
    return sourceId;
  },
});

export const addLink = mutation({
  args: { notebookId: v.id("notebooks"), url: v.string() },
  handler: async (ctx, args) => {
    const { profile, notebook } = await ownNotebook(ctx, args.notebookId);
    const problem = linkProblem(args.url);
    if (problem !== null) throw new ConvexError(problem);
    await roomFor(ctx, notebook._id);
    const url = new URL(args.url.trim()).toString();
    const sourceId = await ctx.db.insert("sources", {
      notebookId: notebook._id,
      profileId: profile._id,
      kind: "link",
      title: url.slice(0, 120),
      url,
      status: "reading",
      pageCount: 0,
      createdAt: Date.now(),
    });
    await ctx.db.patch(notebook._id, { updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.notebooks.read.readLink, { sourceId });
    return sourceId;
  },
});

export const remove = mutation({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, args) => {
    const { source } = await ownSource(ctx, args.sourceId);
    await ctx.db.patch(source._id, { deletingAt: Date.now() });
    await startPurge(ctx, { kind: "source", id: source._id });
  },
});

/** One page of a source, for the citation viewer: the learner's own, or one in a course pack they added. */
export const page = query({
  args: { sourceId: v.id("sources"), page: v.number() },
  handler: async (ctx, args) => {
    const { profile } = await requireLearner(ctx);
    const found = await ctx.db.get(args.sourceId);
    const readable = found !== null && found.deletingAt === undefined && (found.profileId === profile._id || (await packSourceReadable(ctx, found, profile._id)));
    if (!readable) throw new ConvexError("Source not found.");
    const source = found;
    const row = await ctx.db.query("pages").withIndex("by_source_page", (q) => q.eq("sourceId", source._id).eq("page", args.page)).unique();
    return { title: source.title, kind: source.kind, url: source.url ?? null, page: args.page, pageCount: source.pageCount, text: row?.text ?? null };
  },
});
