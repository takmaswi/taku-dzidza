import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery, type ActionCtx } from "../_generated/server";
import { MODES } from "../data/generated";
import { screenForMinor, type Screen } from "../notebooks/read";
import { minorCheckValidator } from "../schema";
import { outputAllowed } from "./checks";

/**
 * The check for under 18s on material that reaches other people: a course
 * pack (convex/packs/publish.ts) and a notebook a teacher shares with a class
 * (convex/classes/sharing.ts). The teacher is an adult, so nothing was checked
 * when they made it, but the learners may be under 18. Every source gets the
 * source screen (screenForMinor) and every tool the under 18 output check,
 * once each: the verdict is kept on the row. A source read again loses its
 * verdict (convex/notebooks/read.ts, writePages); a tool never changes.
 */

/** Pages read per query, as in convex/study/tools.ts. */
const PAGE_SLICE = 30;
/** Cards of one flashcard tool sent with it to the output check. */
const MAX_CARDS = 200;

type Verdict = "allowed" | "blocked";
type SourceItem = { _id: Id<"sources">; title: string; pageCount: number; minorCheck: Verdict | null };
type OutputItem = { _id: Id<"outputs">; name: string; mode: string; text: string; minorCheck: Verdict | null };

/** A tool as the teacher sees it named: "Summary: Photosynthesis", or "Flashcards". */
function toolName(mode: string, title: string): string {
  const listed = MODES[mode]?.listing.title ?? title;
  return title === "" || title === listed ? listed : `${listed}: ${title}`;
}

export const items = internalQuery({
  args: { sourceIds: v.array(v.id("sources")), outputIds: v.array(v.id("outputs")) },
  handler: async (ctx, args): Promise<{ sources: SourceItem[]; outputs: OutputItem[] }> => {
    const sources: SourceItem[] = [];
    for (const id of args.sourceIds) {
      const s = await ctx.db.get(id);
      if (s !== null) sources.push({ _id: s._id, title: s.title, pageCount: s.pageCount, minorCheck: s.minorCheck ?? null });
    }
    const outputs: OutputItem[] = [];
    for (const id of args.outputIds) {
      const o = await ctx.db.get(id);
      if (o === null) continue;
      // A flashcard tool keeps its cards in the cards table; the check reads them with it.
      const cards = o.kind === "cards" ? (await ctx.db.query("cards").withIndex("by_output", (q) => q.eq("outputId", o._id)).take(MAX_CARDS)).filter((c) => c.notebookId === o.notebookId).map((c) => ({ front: c.front, back: c.back })) : [];
      outputs.push({ _id: o._id, name: toolName(o.mode, o.title), mode: o.mode, text: JSON.stringify({ title: o.title, content: o.content, cards }), minorCheck: o.minorCheck ?? null });
    }
    return { sources, outputs };
  },
});

export const record = internalMutation({
  args: {
    sources: v.array(v.object({ id: v.id("sources"), verdict: minorCheckValidator })),
    outputs: v.array(v.object({ id: v.id("outputs"), verdict: minorCheckValidator })),
  },
  handler: async (ctx, args) => {
    for (const s of args.sources) if ((await ctx.db.get(s.id)) !== null) await ctx.db.patch(s.id, { minorCheck: s.verdict });
    for (const o of args.outputs) if ((await ctx.db.get(o.id)) !== null) await ctx.db.patch(o.id, { minorCheck: o.verdict });
    return null;
  },
});

async function screenSource(ctx: ActionCtx, payerId: Id<"profiles">, source: SourceItem): Promise<Screen> {
  const pages: string[] = [];
  for (let from = 1; from <= source.pageCount; from += PAGE_SLICE) {
    const rows: { page: number; text: string }[] = await ctx.runQuery(internal.study.tools.toolPages, { sourceId: source._id, fromPage: from, toPage: from + PAGE_SLICE - 1 });
    for (const r of rows) pages[r.page - 1] = r.text;
  }
  return await screenForMinor(ctx, payerId, Array.from(pages, (p) => p ?? ""));
}

/** What failed, in the words the teacher sees, and whether something could not be checked at all. */
export type MinorFindings = { blocked: string[]; unchecked: boolean };

/**
 * Checks sources and tools for under 18s, charged to `payerId`. Each item is
 * checked once: one already allowed is skipped, one already blocked is
 * reported again without a call. `key` names the mock fixture: it says
 * where the material is going (a pack's or a notebook's name).
 */
export async function checkForMinors(ctx: ActionCtx, args: { payerId: Id<"profiles">; sourceIds: Id<"sources">[]; outputIds: Id<"outputs">[]; key: Record<string, unknown> }): Promise<MinorFindings> {
  const found: { sources: SourceItem[]; outputs: OutputItem[] } = await ctx.runQuery(internal.safety.minorCheck.items, { sourceIds: args.sourceIds, outputIds: args.outputIds });
  const blocked: string[] = [];
  const done: { sources: { id: Id<"sources">; verdict: Verdict }[]; outputs: { id: Id<"outputs">; verdict: Verdict }[] } = { sources: [], outputs: [] };
  let unchecked = false;
  for (const s of found.sources) {
    if (s.minorCheck === "allowed") continue;
    if (s.minorCheck === "blocked") {
      blocked.push(s.title);
      continue;
    }
    const screen = await screenSource(ctx, args.payerId, s);
    if (screen.verdict === "unchecked") {
      unchecked = true;
      break;
    }
    done.sources.push({ id: s._id, verdict: screen.verdict });
    if (screen.verdict === "blocked") blocked.push(`${s.title} (page ${screen.page})`);
  }
  for (const o of unchecked ? [] : found.outputs) {
    if (o.minorCheck === "allowed") continue;
    if (o.minorCheck === "blocked") {
      blocked.push(o.name);
      continue;
    }
    if (!(await ctx.runQuery(internal.ai.usage.check, { profileId: args.payerId })).allowed) {
      unchecked = true;
      break;
    }
    const verdict: Verdict = (await outputAllowed(ctx, { profileId: args.payerId, text: o.text, key: { ...args.key, tool: o.mode } })) ? "allowed" : "blocked";
    done.outputs.push({ id: o._id, verdict });
    if (verdict === "blocked") blocked.push(o.name);
  }
  if (done.sources.length > 0 || done.outputs.length > 0) await ctx.runMutation(internal.safety.minorCheck.record, done);
  return { blocked, unchecked };
}

/** The teacher's message when something failed: which items, in plain words. Null when everything passed. */
export function findingsMessage(f: MinorFindings, what: "published" | "shared"): string | null {
  if (f.blocked.length > 0) {
    const these = f.blocked.length === 1 ? "this did" : "these did";
    return `Not ${what}, because ${these} not pass the check for learners under 18: ${f.blocked.join(", ")}. Change or remove ${f.blocked.length === 1 ? "it" : "them"}, then try again.`;
  }
  if (f.unchecked) return `Not ${what}. Taku could not check it for learners under 18 just now. Try again in a moment.`;
  return null;
}
