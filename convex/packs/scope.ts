import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/**
 * What a learner's linked notebook reads from its course pack. Only the
 * published version counts: its sourceIds and outputIds. A source marked as
 * pages from a published book is never part of a pack, even if one slipped
 * in. Nothing is copied: the learner's notebook points at the pack.
 */

export type PackSource = Doc<"sources"> & { fromPack: true };
export type PackScope = { pack: Doc<"coursePacks">; sources: PackSource[] } | null;

export async function publishedPack(ctx: QueryCtx, packId: Id<"coursePacks"> | undefined): Promise<Doc<"coursePacks"> | null> {
  if (packId === undefined) return null;
  const pack = await ctx.db.get(packId);
  return pack === null || pack.status !== "published" ? null : pack;
}

export async function packScope(ctx: QueryCtx, notebook: Doc<"notebooks">): Promise<PackScope> {
  const pack = await publishedPack(ctx, notebook.packId);
  if (pack === null) return null;
  const sources: PackSource[] = [];
  for (const id of pack.sourceIds) {
    const s = await ctx.db.get(id);
    if (s === null || s.deletingAt !== undefined || s.thirdParty === true || s.notebookId !== pack.masterNotebookId) continue;
    sources.push({ ...s, fromPack: true });
  }
  return { pack, sources };
}

/** A learner's own sources plus, for a linked notebook, the pack's. */
export async function notebookSources(ctx: QueryCtx, notebook: Doc<"notebooks">): Promise<(Doc<"sources"> & { fromPack?: true })[]> {
  const own = (await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).collect()).filter((s) => s.deletingAt === undefined);
  const scope = await packScope(ctx, notebook);
  return scope === null ? own : [...scope.sources, ...own];
}

/** The learner's linked notebook for a pack, if they added it. */
export async function linkedNotebook(ctx: QueryCtx, packId: Id<"coursePacks">, profileId: Id<"profiles">): Promise<Doc<"notebooks"> | null> {
  const rows = await ctx.db.query("notebooks").withIndex("by_pack", (q) => q.eq("packId", packId).eq("profileId", profileId)).take(5);
  return rows.find((n) => n.deletingAt === undefined) ?? null;
}

/** The published pack a source or output belongs to, if this learner has added it. */
async function packFor(ctx: QueryCtx, masterNotebookId: Id<"notebooks">, profileId: Id<"profiles">, holds: (pack: Doc<"coursePacks">) => boolean): Promise<Doc<"coursePacks"> | null> {
  for (const pack of await ctx.db.query("coursePacks").withIndex("by_master", (q) => q.eq("masterNotebookId", masterNotebookId)).take(20)) {
    if (pack.status !== "published" || !holds(pack)) continue;
    if ((await linkedNotebook(ctx, pack._id, profileId)) !== null) return pack;
  }
  return null;
}

export async function packSourceReadable(ctx: QueryCtx, source: Doc<"sources">, profileId: Id<"profiles">): Promise<boolean> {
  if (source.deletingAt !== undefined || source.thirdParty === true) return false;
  return (await packFor(ctx, source.notebookId, profileId, (p) => p.sourceIds.includes(source._id))) !== null;
}

export async function packOutputReadable(ctx: QueryCtx, output: Doc<"outputs">, profileId: Id<"profiles">): Promise<Doc<"coursePacks"> | null> {
  return await packFor(ctx, output.notebookId, profileId, (p) => p.outputIds.includes(output._id));
}
