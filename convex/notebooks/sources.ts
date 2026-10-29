import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { requireLearner } from "../lib/access";
import { fileKind, SOURCE_LIMITS } from "../sources/limits";
import { linkProblem, splitPages } from "../sources/text";
import { deleteSourceData, ownNotebook } from "./notebooks";
import { writePages } from "./read";

/** Adding sources to a notebook (SPEC.md 3.2): files, pasted text and links. */

export async function ownSource(ctx: QueryCtx, sourceId: Id<"sources">): Promise<{ profile: Doc<"profiles">; source: Doc<"sources"> }> {
  const { profile } = await requireLearner(ctx);
  const source = await ctx.db.get(sourceId);
  if (source === null || source.profileId !== profile._id) throw new ConvexError("Source not found.");
  return { profile, source };
}

async function roomFor(ctx: MutationCtx, notebookId: Id<"notebooks">): Promise<void> {
  const count = (await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", notebookId)).take(SOURCE_LIMITS.maxSourcesPerNotebook + 1)).length;
  if (count >= SOURCE_LIMITS.maxSourcesPerNotebook) throw new ConvexError(`A notebook can hold up to ${SOURCE_LIMITS.maxSourcesPerNotebook} sources.`);
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireLearner(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const addFile = mutation({
  args: { notebookId: v.id("notebooks"), storageId: v.id("_storage"), fileName: v.string() },
  handler: async (ctx, args) => {
    const { profile, notebook } = await ownNotebook(ctx, args.notebookId);
    const meta = await ctx.db.system.get(args.storageId);
    if (meta === null) throw new ConvexError("The upload did not arrive. Try again.");
    const kind = fileKind(meta.contentType ?? "", args.fileName);
    const problem =
      kind === null ? "Add a PDF, a Word file (.docx) or a photo." : meta.size > SOURCE_LIMITS.maxFileBytes ? `Files can be up to ${SOURCE_LIMITS.maxFileBytes / 1024 / 1024} MB.` : meta.size === 0 ? "That file is empty." : null;
    if (problem !== null || kind === null) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError(problem ?? "That file cannot be read.");
    }
    await roomFor(ctx, notebook._id);
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
    return sourceId;
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
    await writePages(ctx, sourceId, pages);
    await ctx.db.patch(notebook._id, { updatedAt: Date.now() });
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
    await deleteSourceData(ctx, source);
  },
});

/** One page of a source, for the citation viewer. */
export const page = query({
  args: { sourceId: v.id("sources"), page: v.number() },
  handler: async (ctx, args) => {
    const { source } = await ownSource(ctx, args.sourceId);
    const row = await ctx.db.query("pages").withIndex("by_source_page", (q) => q.eq("sourceId", source._id).eq("page", args.page)).unique();
    return { title: source.title, kind: source.kind, url: source.url ?? null, page: args.page, pageCount: source.pageCount, text: row?.text ?? null };
  },
});
