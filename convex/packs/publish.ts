import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action, internalMutation, internalQuery, type MutationCtx, type QueryCtx } from "../_generated/server";
import { requireLearnerInAction } from "../lib/access";
import { startPurge } from "../privacy/purge";
import { checkForMinors, findingsMessage } from "../safety/minorCheck";
import { makeTool, planFor, type GenerateResult, type Plan } from "../study/tools";
import { liveMaster, managedPack } from "./packs";

/**
 * Publishing a course pack. A pack belongs to its organisation, not to the
 * teacher who made it (DECISIONS.md, Course packs belong to the organisation).
 *
 *   1. Copy. The teacher's notebook (the master) holds sources that were read
 *      and embedded once. Publishing copies them, with their pages, chunks and
 *      embeddings, into the pack's own notebook, which the organisation owns
 *      and no account does. A source copied before is not copied again. Once
 *      the master is gone (its teacher left or deleted their account), later
 *      versions are made from the copy as it stands.
 *   2. Check. The copy's sources get the under 18 source screen, once each.
 *   3. Make. The summary, flashcards and practice paper are made from the
 *      copy with the usual study tools, charged to whoever publishes.
 *   4. Check. Every tool gets the under 18 output check.
 *   5. Publish. Only if everything passed: a new version, read by every linked
 *      notebook. Otherwise the new tools go, and the teacher is told which item
 *      failed.
 */

/** The tools made for every pack. The options match the app's defaults for each tool. */
export const PACK_TOOLS = [
  { mode: "summarise", options: {} },
  { mode: "flashcards", options: { count: 5, difficulty: "medium" } },
  { mode: "quiz", options: { count: 4, difficulty: "medium", minutes: 15 } },
] as const;

/** A publish that started this long ago and never finished no longer blocks another. */
const LOCK_MS = 10 * 60 * 1000;
/** Pages or chunks copied per mutation: a chunk with its embedding is about 6 KB. */
const COPY_ROWS = 100;

export const PUBLISH_ERRORS = {
  rights: "Tick the box to confirm you own these notes or are licensed to share them.",
  empty: "Add notes to the notebook first.",
  reading: "Wait until every source has been read.",
  failed: "Some sources could not be read. Remove them first.",
  book: "Pages from a published book cannot go in a course pack. Remove them first.",
  busy: "This course pack is being published already.",
} as const;

type PublishPlan = {
  payerId: Id<"profiles">;
  title: string;
  /** The master's sources to copy, or null when versions are made from the copy as it stands. */
  masterSources: Id<"sources">[] | null;
  sourceMode: Doc<"notebooks">["sourceMode"];
};

async function liveSources(ctx: QueryCtx, notebookId: Id<"notebooks">): Promise<Doc<"sources">[]> {
  return (await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", notebookId)).collect()).filter((s) => s.deletingAt === undefined);
}

export const plan = internalQuery({
  args: { packId: v.id("coursePacks") },
  handler: async (ctx, args): Promise<PublishPlan | { error: string }> => {
    const { profile, pack } = await managedPack(ctx, args.packId);
    const master = await liveMaster(ctx, pack);
    const copy = pack.notebookId === undefined ? null : await ctx.db.get(pack.notebookId);
    const sources = master !== null ? await liveSources(ctx, master._id) : copy !== null ? (await liveSources(ctx, copy._id)).filter((s) => pack.sourceIds.includes(s._id)) : [];
    if (sources.length === 0) return { error: PUBLISH_ERRORS.empty };
    if (sources.some((s) => s.thirdParty === true)) return { error: PUBLISH_ERRORS.book };
    if (sources.some((s) => s.status === "reading")) return { error: PUBLISH_ERRORS.reading };
    if (sources.some((s) => s.status === "failed")) return { error: PUBLISH_ERRORS.failed };
    if (pack.publishingSince !== undefined && Date.now() - pack.publishingSince < LOCK_MS) return { error: PUBLISH_ERRORS.busy };
    return { payerId: profile._id, title: pack.title, masterSources: master === null ? null : sources.map((s) => s._id), sourceMode: master?.sourceMode ?? copy?.sourceMode ?? "mine_plus" };
  },
});

export const lock = internalMutation({
  args: { packId: v.id("coursePacks"), on: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.packId, { publishingSince: args.on ? Date.now() : undefined });
    return null;
  },
});

/** The pack's own notebook, made at the first publish: owned by the organisation, no account. */
export const ensureCopy = internalMutation({
  args: { packId: v.id("coursePacks"), sourceMode: v.union(v.literal("only_mine"), v.literal("mine_plus")) },
  handler: async (ctx, args): Promise<Id<"notebooks">> => {
    const pack = await ctx.db.get(args.packId);
    if (pack === null) throw new ConvexError("Course pack not found.");
    if (pack.notebookId !== undefined && (await ctx.db.get(pack.notebookId)) !== null) return pack.notebookId;
    const now = Date.now();
    const notebookId = await ctx.db.insert("notebooks", { organisationId: pack.organisationId, title: pack.title, sourceMode: args.sourceMode, createdAt: now, updatedAt: now });
    await ctx.db.patch(pack._id, { notebookId });
    return notebookId;
  },
});

/** Starts copying one master source: the copy made before if it finished, else a new row (a half copy from a publish that stopped goes). */
export const beginCopy = internalMutation({
  args: { copyId: v.id("notebooks"), fromId: v.id("sources") },
  handler: async (ctx, args): Promise<{ id: Id<"sources">; done: boolean }> => {
    const from = await ctx.db.get(args.fromId);
    if (from === null) throw new ConvexError("Source not found.");
    for (const s of await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", args.copyId)).collect()) {
      if (s.copiedFrom !== from._id || s.deletingAt !== undefined) continue;
      if (s.status === "ready") return { id: s._id, done: true };
      await ctx.db.patch(s._id, { deletingAt: Date.now() });
      await startPurge(ctx, { kind: "source", id: s._id });
    }
    const id = await ctx.db.insert("sources", {
      notebookId: args.copyId,
      kind: from.kind,
      title: from.title,
      ...(from.url === undefined ? {} : { url: from.url }),
      status: "reading",
      pageCount: from.pageCount,
      createdAt: Date.now(),
      ...(from.sections === undefined ? {} : { sections: from.sections }),
      copiedFrom: from._id,
      // Same text, same verdict: a source already checked is not checked again.
      ...(from.minorCheck === undefined ? {} : { minorCheck: from.minorCheck }),
    });
    return { id, done: false };
  },
});

/** Copies one batch of a source's pages or chunks (with their embeddings). */
export const copyRows = internalMutation({
  args: { fromId: v.id("sources"), toId: v.id("sources"), table: v.union(v.literal("pages"), v.literal("chunks")), cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args): Promise<{ cursor: string; done: boolean }> => {
    const to = await ctx.db.get(args.toId);
    if (to === null) throw new ConvexError("Source not found.");
    if (args.table === "pages") {
      const res = await ctx.db.query("pages").withIndex("by_source_page", (q) => q.eq("sourceId", args.fromId)).paginate({ numItems: COPY_ROWS, cursor: args.cursor });
      for (const p of res.page) await ctx.db.insert("pages", { sourceId: to._id, notebookId: to.notebookId, page: p.page, text: p.text });
      return { cursor: res.continueCursor, done: res.isDone };
    }
    const res = await ctx.db.query("chunks").withIndex("by_source", (q) => q.eq("sourceId", args.fromId)).paginate({ numItems: COPY_ROWS, cursor: args.cursor });
    for (const c of res.page) await ctx.db.insert("chunks", { sourceId: to._id, notebookId: to.notebookId, page: c.page, text: c.text, ...(c.embedding === undefined ? {} : { embedding: c.embedding }) });
    return { cursor: res.continueCursor, done: res.isDone };
  },
});

export const endCopy = internalMutation({
  args: { fromId: v.id("sources"), toId: v.id("sources") },
  handler: async (ctx, args) => {
    const from = await ctx.db.get(args.fromId);
    await ctx.db.patch(args.toId, { status: "ready", ...(from?.embeddedAt === undefined ? {} : { embeddedAt: from.embeddedAt }) });
    return null;
  },
});

/** The plan for the pack's tools: made from the copy's published sources, paid for by the person publishing. */
export const toolPlan = internalQuery({
  args: { packId: v.id("coursePacks"), sourceIds: v.array(v.id("sources")) },
  handler: async (ctx, args): Promise<Plan> => {
    const { profile, pack } = await managedPack(ctx, args.packId);
    const copy = pack.notebookId === undefined ? null : await ctx.db.get(pack.notebookId);
    if (copy === null) throw new ConvexError("Course pack not found.");
    return await planFor(ctx, profile, copy, args.sourceIds.map((sourceId) => ({ sourceId })));
  },
});

async function removeOutputs(ctx: MutationCtx, outputIds: readonly Id<"outputs">[]): Promise<void> {
  for (const id of outputIds) {
    for (const c of await ctx.db.query("cards").withIndex("by_output", (q) => q.eq("outputId", id)).take(500)) await ctx.db.delete(c._id);
    if ((await ctx.db.get(id)) !== null) await ctx.db.delete(id);
  }
}

/** A version that did not publish: its new tools go, and the lock comes off. */
export const abandon = internalMutation({
  args: { packId: v.id("coursePacks"), outputIds: v.array(v.id("outputs")) },
  handler: async (ctx, args) => {
    await removeOutputs(ctx, args.outputIds);
    await ctx.db.patch(args.packId, { publishingSince: undefined });
    return null;
  },
});

export const finish = internalMutation({
  args: { packId: v.id("coursePacks"), sourceIds: v.array(v.id("sources")), outputIds: v.array(v.id("outputs")) },
  handler: async (ctx, args): Promise<number> => {
    const pack = await ctx.db.get(args.packId);
    if (pack === null || pack.notebookId === undefined) throw new ConvexError("Course pack not found.");
    const now = Date.now();
    const version = pack.version + 1;
    await ctx.db.patch(pack._id, { status: "published", version, publishedAt: now, rightsConfirmedAt: now, sourceIds: args.sourceIds, outputIds: args.outputIds, publishingSince: undefined });
    // Copies of sources the teacher has since removed are no longer in any version.
    const keep = new Set(args.sourceIds as string[]);
    const copyId = pack.notebookId;
    for (const s of await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", copyId)).collect()) {
      if (keep.has(s._id) || s.deletingAt !== undefined) continue;
      await ctx.db.patch(s._id, { deletingAt: now });
      await startPurge(ctx, { kind: "source", id: s._id });
    }
    await ctx.db.patch(copyId, { updatedAt: now });
    return version;
  },
});

export type PublishResult = { ok: true; version: number } | { ok: false; message: string };

/** Copies the master's sources into the pack's notebook; returns the copies, in the master's order. */
async function copySources(ctx: Parameters<typeof makeTool>[0], copyId: Id<"notebooks">, masterSources: readonly Id<"sources">[]): Promise<Id<"sources">[]> {
  const out: Id<"sources">[] = [];
  for (const fromId of masterSources) {
    const started: { id: Id<"sources">; done: boolean } = await ctx.runMutation(internal.packs.publish.beginCopy, { copyId, fromId });
    if (!started.done) {
      for (const table of ["pages", "chunks"] as const) {
        let cursor: string | null = null;
        for (;;) {
          const r: { cursor: string; done: boolean } = await ctx.runMutation(internal.packs.publish.copyRows, { fromId, toId: started.id, table, cursor });
          if (r.done) break;
          cursor = r.cursor;
        }
      }
      await ctx.runMutation(internal.packs.publish.endCopy, { fromId, toId: started.id });
    }
    out.push(started.id);
  }
  return out;
}

export const publish = action({
  args: { packId: v.id("coursePacks"), confirmRights: v.boolean() },
  handler: async (ctx, args): Promise<PublishResult> => {
    await requireLearnerInAction(ctx);
    if (!args.confirmRights) return { ok: false, message: PUBLISH_ERRORS.rights };
    const p = await ctx.runQuery(internal.packs.publish.plan, { packId: args.packId });
    if ("error" in p) return { ok: false, message: p.error };
    await ctx.runMutation(internal.packs.publish.lock, { packId: args.packId, on: true });
    const made: Id<"outputs">[] = [];
    const stop = async (message: string): Promise<PublishResult> => {
      await ctx.runMutation(internal.packs.publish.abandon, { packId: args.packId, outputIds: made });
      return { ok: false, message };
    };
    try {
      const copyId: Id<"notebooks"> = await ctx.runMutation(internal.packs.publish.ensureCopy, { packId: args.packId, sourceMode: p.sourceMode });
      const sourceIds = p.masterSources === null ? (await ctx.runQuery(internal.packs.publish.copySourceIds, { packId: args.packId })) : await copySources(ctx, copyId, p.masterSources);
      const key = { pack: p.title };
      const sourceCheck = findingsMessage(await checkForMinors(ctx, { payerId: p.payerId, sourceIds, outputIds: [], key }), "published");
      if (sourceCheck !== null) return await stop(sourceCheck);
      const c: Plan = await ctx.runQuery(internal.packs.publish.toolPlan, { packId: args.packId, sourceIds });
      for (const tool of PACK_TOOLS) {
        const result: GenerateResult = await makeTool(ctx, c, { notebookId: copyId, mode: tool.mode, options: { ...tool.options } });
        if (!result.ok) return await stop(result.message);
        made.push(result.outputId);
      }
      const toolCheck = findingsMessage(await checkForMinors(ctx, { payerId: p.payerId, sourceIds: [], outputIds: made, key }), "published");
      if (toolCheck !== null) return await stop(toolCheck);
      const version: number = await ctx.runMutation(internal.packs.publish.finish, { packId: args.packId, sourceIds, outputIds: made });
      return { ok: true, version };
    } catch (err) {
      await ctx.runMutation(internal.packs.publish.abandon, { packId: args.packId, outputIds: made });
      throw err;
    }
  },
});

/** With no master left, a new version is made from the copy's published sources as they stand. */
export const copySourceIds = internalQuery({
  args: { packId: v.id("coursePacks") },
  handler: async (ctx, args): Promise<Id<"sources">[]> => {
    const { pack } = await managedPack(ctx, args.packId);
    const out: Id<"sources">[] = [];
    for (const id of pack.sourceIds) {
      const s = await ctx.db.get(id);
      if (s !== null && s.deletingAt === undefined && s.notebookId === pack.notebookId && s.status === "ready" && s.thirdParty !== true) out.push(s._id);
    }
    return out;
  },
});
