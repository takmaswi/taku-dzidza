import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireLearner } from "../lib/access";
import { linkedNotebook, packOutputReadable } from "../packs/scope";
import type { QuizContent } from "./shapes";

/** Finished quizzes. Multiple choice is marked by the app; written answers are marked by the learner against the marking scheme. */

export const submit = mutation({
  args: { outputId: v.id("outputs"), marks: v.array(v.object({ number: v.number(), got: v.number() })) },
  handler: async (ctx, args) => {
    const { profile } = await requireLearner(ctx);
    const output = await ctx.db.get(args.outputId);
    if (output === null || output.kind !== "quiz") throw new ConvexError("Quiz not found.");
    // A course pack's paper counts too; the attempt is the learner's own and is kept in their linked notebook.
    let notebookId = output.notebookId;
    if (output.profileId !== profile._id) {
      const pack = await packOutputReadable(ctx, output, profile._id);
      const linked = pack === null ? null : await linkedNotebook(ctx, pack._id, profile._id);
      if (linked === null) throw new ConvexError("Quiz not found.");
      notebookId = linked._id;
    }
    const quiz = output.content as QuizContent;
    const given = new Map(args.marks.map((m) => [m.number, m.got]));
    const perQuestion = quiz.questions.map((q) => ({ number: q.number, marks: q.marks, got: Math.max(0, Math.min(q.marks, Math.round(given.get(q.number) ?? 0))) }));
    const score = perQuestion.reduce((n, q) => n + q.got, 0);
    await ctx.db.insert("quizAttempts", { outputId: output._id, notebookId, profileId: profile._id, score, total: quiz.totalMarks, perQuestion, createdAt: Date.now() });
    return { score, total: quiz.totalMarks };
  },
});

export const attempts = query({
  args: { outputId: v.id("outputs") },
  handler: async (ctx, args) => {
    const { profile } = await requireLearner(ctx);
    const rows = await ctx.db.query("quizAttempts").withIndex("by_output", (q) => q.eq("outputId", args.outputId)).order("desc").take(20);
    return rows.filter((r) => r.profileId === profile._id).map((r) => ({ score: r.score, total: r.total, createdAt: r.createdAt }));
  },
});
