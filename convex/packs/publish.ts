import { ConvexError, v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action, internalMutation, internalQuery } from "../_generated/server";
import { requireLearnerInAction } from "../lib/access";
import { requireOrgMember } from "../organisations/access";
import type { GenerateResult } from "../study/tools";

/**
 * Publishing a course pack. The sources are already read and embedded once,
 * when the publisher added them to their notebook. Publishing makes the
 * summary, flashcards and practice paper once, with the usual study tools,
 * run as the publisher: the cost is theirs, and learners who add the pack
 * read the same tools. Each publish is a new version; every linked notebook
 * reads the newest one.
 */

/** The tools made for every pack. The options match the app's defaults for each tool. */
export const PACK_TOOLS = [
  { mode: "summarise", options: {} },
  { mode: "flashcards", options: { count: 5, difficulty: "medium" } },
  { mode: "quiz", options: { count: 4, difficulty: "medium", minutes: 15 } },
] as const;

/** A publish that started this long ago and never finished no longer blocks another. */
const LOCK_MS = 10 * 60 * 1000;

export const PUBLISH_ERRORS = {
  rights: "Tick the box to confirm you own these notes or are licensed to share them.",
  notMine: "Only the person who made this course pack can publish it.",
  empty: "Add notes to the notebook first.",
  reading: "Wait until every source has been read.",
  failed: "Some sources could not be read. Remove them first.",
  book: "Pages from a published book cannot go in a course pack. Remove them first.",
  busy: "This course pack is being published already.",
} as const;

export const plan = internalQuery({
  args: { packId: v.id("coursePacks") },
  handler: async (ctx, args): Promise<{ masterNotebookId: Id<"notebooks">; sourceIds: Id<"sources">[] } | { error: string }> => {
    const pack = await ctx.db.get(args.packId);
    if (pack === null) throw new ConvexError("Course pack not found.");
    const { profile } = await requireOrgMember(ctx, pack.organisationId, ["teacher", "admin"]);
    if (pack.createdBy !== profile._id) return { error: PUBLISH_ERRORS.notMine };
    const notebook = await ctx.db.get(pack.masterNotebookId);
    if (notebook === null || notebook.deletingAt !== undefined || notebook.profileId !== profile._id) throw new ConvexError("Course pack not found.");
    const sources = (await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).collect()).filter((s) => s.deletingAt === undefined);
    if (sources.length === 0) return { error: PUBLISH_ERRORS.empty };
    if (sources.some((s) => s.thirdParty === true)) return { error: PUBLISH_ERRORS.book };
    if (sources.some((s) => s.status === "reading")) return { error: PUBLISH_ERRORS.reading };
    if (sources.some((s) => s.status === "failed")) return { error: PUBLISH_ERRORS.failed };
    if (pack.publishingSince !== undefined && Date.now() - pack.publishingSince < LOCK_MS) return { error: PUBLISH_ERRORS.busy };
    return { masterNotebookId: notebook._id, sourceIds: sources.map((s) => s._id) };
  },
});

export const lock = internalMutation({
  args: { packId: v.id("coursePacks"), on: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.packId, { publishingSince: args.on ? Date.now() : undefined });
    return null;
  },
});

export const finish = internalMutation({
  args: { packId: v.id("coursePacks"), sourceIds: v.array(v.id("sources")), outputIds: v.array(v.id("outputs")) },
  handler: async (ctx, args): Promise<number> => {
    const pack = await ctx.db.get(args.packId);
    if (pack === null) throw new ConvexError("Course pack not found.");
    const now = Date.now();
    const version = pack.version + 1;
    await ctx.db.patch(pack._id, { status: "published", version, publishedAt: now, rightsConfirmedAt: now, sourceIds: args.sourceIds, outputIds: args.outputIds, publishingSince: undefined });
    return version;
  },
});

export type PublishResult = { ok: true; version: number } | { ok: false; message: string };

export const publish = action({
  args: { packId: v.id("coursePacks"), confirmRights: v.boolean() },
  handler: async (ctx, args): Promise<PublishResult> => {
    await requireLearnerInAction(ctx);
    if (!args.confirmRights) return { ok: false, message: PUBLISH_ERRORS.rights };
    const p = await ctx.runQuery(internal.packs.publish.plan, { packId: args.packId });
    if ("error" in p) return { ok: false, message: p.error };
    await ctx.runMutation(internal.packs.publish.lock, { packId: args.packId, on: true });
    try {
      const outputIds: Id<"outputs">[] = [];
      for (const tool of PACK_TOOLS) {
        const made: GenerateResult = await ctx.runAction(api.study.tools.generate, { notebookId: p.masterNotebookId, mode: tool.mode, options: { ...tool.options } });
        if (!made.ok) {
          await ctx.runMutation(internal.packs.publish.lock, { packId: args.packId, on: false });
          return { ok: false, message: made.message };
        }
        outputIds.push(made.outputId);
      }
      const version: number = await ctx.runMutation(internal.packs.publish.finish, { packId: args.packId, sourceIds: p.sourceIds, outputIds });
      return { ok: true, version };
    } catch (err) {
      await ctx.runMutation(internal.packs.publish.lock, { packId: args.packId, on: false });
      throw err;
    }
  },
});
