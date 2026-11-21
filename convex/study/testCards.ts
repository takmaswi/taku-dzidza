import { v } from "convex/values";
import { createEmptyCard } from "ts-fsrs";
import type { Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { originValidator } from "../schema";

/**
 * A Test me answer that was wrong becomes a review card (ts-fsrs), so it comes
 * back before the learner forgets it. Cards from a notebook go into that
 * notebook; cards from an Ask Taku chat go into one notebook kept for them.
 * Either way they hang off one "Test me" output per notebook, made on first use.
 */

export const TEST_ME_MODE = "test-me";
export const TEST_ME_TITLE = "Test me: questions to go over";
export const TEST_REVIEW_NOTEBOOK = "Test me questions";
const MAX_FIELD = 600;

async function reviewNotebook(ctx: MutationCtx, profileId: Id<"profiles">): Promise<Id<"notebooks">> {
  // A learner has few notebooks; the newest 200 are enough to find this one.
  const mine = await ctx.db.query("notebooks").withIndex("by_profile", (q) => q.eq("profileId", profileId)).order("desc").take(200);
  const found = mine.find((n) => n.testReview === true && n.deletingAt === undefined);
  if (found !== undefined) return found._id;
  const now = Date.now();
  return await ctx.db.insert("notebooks", { profileId, title: TEST_REVIEW_NOTEBOOK, sourceMode: "mine_plus", testReview: true, createdAt: now, updatedAt: now });
}

async function testOutput(ctx: MutationCtx, profileId: Id<"profiles">, notebookId: Id<"notebooks">): Promise<Id<"outputs">> {
  const outputs = await ctx.db.query("outputs").withIndex("by_notebook", (q) => q.eq("notebookId", notebookId)).order("desc").take(200);
  const found = outputs.find((o) => o.mode === TEST_ME_MODE);
  if (found !== undefined) return found._id;
  return await ctx.db.insert("outputs", { notebookId, profileId, mode: TEST_ME_MODE, kind: "cards", title: TEST_ME_TITLE, content: { count: 0 }, sourceMode: "mine_plus", createdAt: Date.now() });
}

export const add = internalMutation({
  args: { profileId: v.id("profiles"), notebookId: v.optional(v.id("notebooks")), front: v.string(), back: v.string(), origin: v.optional(originValidator) },
  handler: async (ctx, args): Promise<Id<"cards"> | null> => {
    const front = args.front.trim().slice(0, MAX_FIELD);
    const back = args.back.trim().slice(0, MAX_FIELD);
    if (front === "" || back === "") return null;
    if (args.notebookId !== undefined) {
      const notebook = await ctx.db.get(args.notebookId);
      if (notebook === null || notebook.profileId !== args.profileId || notebook.deletingAt !== undefined) return null;
    }
    const notebookId = args.notebookId ?? (await reviewNotebook(ctx, args.profileId));
    const outputId = await testOutput(ctx, args.profileId, notebookId);
    const output = await ctx.db.get(outputId);
    const count = typeof (output?.content as { count?: unknown } | undefined)?.count === "number" ? (output!.content as { count: number }).count : 0;
    await ctx.db.patch(outputId, { content: { count: count + 1 } });
    const now = Date.now();
    const empty = createEmptyCard(new Date(now));
    return await ctx.db.insert("cards", {
      notebookId,
      outputId,
      profileId: args.profileId,
      front,
      back,
      origin: args.origin ?? { kind: "added" },
      due: empty.due.getTime(),
      stability: empty.stability,
      difficulty: empty.difficulty,
      elapsedDays: empty.elapsed_days,
      scheduledDays: empty.scheduled_days,
      learningSteps: empty.learning_steps,
      reps: empty.reps,
      lapses: empty.lapses,
      state: empty.state,
    });
  },
});
