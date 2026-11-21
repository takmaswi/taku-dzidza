import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { query, type ActionCtx, type QueryCtx } from "../_generated/server";
import { requireLearner } from "../lib/access";
import { retrievePages, type Retrieved } from "../notebooks/ask";
import { notebookSources } from "../packs/scope";
import type { SourceMode } from "../sources/modes";

/**
 * Ask Taku from the learner's own notebooks (Step 8). In a chat the learner
 * can pick up to 5 of their notebooks: their own, linked course packs, and
 * (with the marketplace) notebooks they bought or rent. With none picked Taku
 * answers from general knowledge as before. With some picked, the question
 * goes through the same search, quote checks, second opinion and under 18
 * rules as a question in a notebook (convex/notebooks/ask.ts,
 * answerFromPages). The choice is kept on the chat.
 */

export const MAX_PICKED = 5;
/** Pages sent to Taku across every picked notebook, best of each first. */
const MAX_PAGES = 10;
const MAX_LIST = 200;

export type PickedNotebook = { notebookId: Id<"notebooks">; title: string; kind: "own" | "pack" | "bought" };

function kindOf(n: Doc<"notebooks">): PickedNotebook["kind"] {
  return n.packId !== undefined ? "pack" : n.listingId !== undefined ? "bought" : "own";
}

/** The learner's notebooks Taku may answer from: theirs and not being deleted. */
export async function readableNotebooks(ctx: QueryCtx, profileId: Id<"profiles">, ids: readonly Id<"notebooks">[]): Promise<Doc<"notebooks">[]> {
  const unique = [...new Set(ids)];
  if (unique.length > MAX_PICKED) throw new ConvexError(`Pick up to ${MAX_PICKED} notebooks.`);
  const out: Doc<"notebooks">[] = [];
  for (const id of unique) {
    const n = await ctx.db.get(id);
    if (n !== null && n.profileId === profileId && n.deletingAt === undefined) out.push(n);
  }
  return out;
}

/** For the picker: every notebook the learner can ask from, newest first. The search box filters this list on the phone. */
export const pickable = query({
  args: {},
  handler: async (ctx): Promise<PickedNotebook[]> => {
    const { profile } = await requireLearner(ctx);
    const rows = await ctx.db.query("notebooks").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).order("desc").take(MAX_LIST);
    return rows.filter((n) => n.deletingAt === undefined).map((n) => ({ notebookId: n._id, title: n.title, kind: kindOf(n) }));
  },
});

export type NotebookScope = { picked: PickedNotebook[]; ready: number; sourceMode: SourceMode };

/** What the picked notebooks hold. Only my material when every picked notebook says so; otherwise Taku may add its own ideas, marked as such. */
export async function scopeOf(ctx: QueryCtx, notebooks: Doc<"notebooks">[]): Promise<NotebookScope> {
  let ready = 0;
  for (const n of notebooks) ready += (await notebookSources(ctx, n)).filter((s) => s.status === "ready").length;
  const sourceMode: SourceMode = notebooks.length > 0 && notebooks.every((n) => n.sourceMode === "only_mine") ? "only_mine" : "mine_plus";
  return { picked: notebooks.map((n) => ({ notebookId: n._id, title: n.title, kind: kindOf(n) })), ready, sourceMode };
}

/**
 * Searches each picked notebook as a notebook question would, then takes the
 * best pages of each in turn. Refs are numbered again across notebooks, one
 * per source, so a citation always points at the right page.
 */
export async function retrieveAcross(ctx: ActionCtx, a: { profileId: Id<"profiles">; question: string; notebookIds: Id<"notebooks">[] }): Promise<Retrieved[]> {
  const lists: Retrieved[][] = [];
  for (const notebookId of a.notebookIds) lists.push(await retrievePages(ctx, { notebookId, profileId: a.profileId, question: a.question }));
  const out: Retrieved[] = [];
  const seen = new Set<string>();
  const refs = new Map<string, string>();
  for (let i = 0; out.length < MAX_PAGES && lists.some((l) => i < l.length); i++) {
    for (const list of lists) {
      const p = list[i];
      if (p === undefined || out.length >= MAX_PAGES) continue;
      const key = `${p.sourceId}:${p.page}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!refs.has(p.sourceId)) refs.set(p.sourceId, `S${refs.size + 1}`);
      out.push({ ...p, ref: refs.get(p.sourceId)! });
    }
  }
  return out;
}

/** Titles for the sources a chat's answers cite, so the citation marks can name them. Opening the page still checks the learner may read it. */
export async function citedTitles(ctx: QueryCtx, messages: Doc<"chatMessages">[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const m of messages) {
    for (const p of m.parts ?? []) {
      if (p.origin.kind !== "source" || out[p.origin.sourceId] !== undefined) continue;
      const source = await ctx.db.get(p.origin.sourceId as Id<"sources">).catch(() => null);
      if (source !== null && source.deletingAt === undefined) out[p.origin.sourceId] = source.title;
    }
  }
  return out;
}
