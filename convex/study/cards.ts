import { ConvexError, v } from "convex/values";
import { fsrs, Rating, type Card, type Grade } from "ts-fsrs";
import type { Doc } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { requireLearner } from "../lib/access";
import { ownNotebook } from "../notebooks/notebooks";

/**
 * Flashcard review with spaced repetition (SPEC.md 3.3). The scheduler is
 * ts-fsrs (MIT, the open FSRS algorithm) with its default parameters. The
 * two buttons map to FSRS ratings: "Got it" is Good, "Try again" is Again.
 */

const scheduler = fsrs();

export function toFsrs(c: Doc<"cards">): Card {
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsedDays,
    scheduled_days: c.scheduledDays,
    learning_steps: c.learningSteps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.lastReview === undefined ? undefined : new Date(c.lastReview),
  };
}

export function schedule(c: Doc<"cards">, got: boolean, now: Date) {
  const rating: Grade = got ? Rating.Good : Rating.Again;
  const next = scheduler.next(toFsrs(c), now, rating).card;
  return {
    due: next.due.getTime(),
    stability: next.stability,
    difficulty: next.difficulty,
    elapsedDays: next.elapsed_days,
    scheduledDays: next.scheduled_days,
    learningSteps: next.learning_steps,
    reps: next.reps,
    lapses: next.lapses,
    state: next.state,
    lastReview: now.getTime(),
  };
}

/** Cards due now in a notebook, soonest first, with how many there are in all. */
export const due = query({
  args: { notebookId: v.id("notebooks"), now: v.number() },
  handler: async (ctx, args) => {
    const { notebook } = await ownNotebook(ctx, args.notebookId);
    const dueCards = await ctx.db.query("cards").withIndex("by_notebook_due", (q) => q.eq("notebookId", notebook._id).lte("due", args.now)).take(200);
    const total = (await ctx.db.query("cards").withIndex("by_notebook_due", (q) => q.eq("notebookId", notebook._id)).take(1000)).length;
    return { cards: dueCards, total };
  },
});

/** How many cards are due across all the learner's notebooks, for the home page. */
export const dueCount = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const { profile } = await requireLearner(ctx);
    const due = await ctx.db.query("cards").withIndex("by_profile_due", (q) => q.eq("profileId", profile._id).lte("due", args.now)).take(500);
    const byNotebook = new Map<string, number>();
    for (const c of due) byNotebook.set(c.notebookId, (byNotebook.get(c.notebookId) ?? 0) + 1);
    const first = [...byNotebook.entries()].sort((a, b) => b[1] - a[1])[0];
    return { count: due.length, notebookId: first?.[0] ?? null };
  },
});

export const review = mutation({
  args: { cardId: v.id("cards"), got: v.boolean() },
  handler: async (ctx, args) => {
    const { profile } = await requireLearner(ctx);
    const card = await ctx.db.get(args.cardId);
    if (card === null || card.profileId !== profile._id) throw new ConvexError("Card not found.");
    const next = schedule(card, args.got, new Date());
    await ctx.db.patch(card._id, next);
    return { due: next.due };
  },
});
