import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import type { QuizContent, QuizQuestion } from "../study/shapes";
import { ownClass, requireClassMember } from "./access";
import { firstName } from "./codes";

/**
 * Quizzes and practice papers set for a class. The paper is copied when it is
 * set. A learner never receives the marking scheme before they hand in:
 * multiple choice is marked here, and written answers are marked against the
 * scheme after hand in (by the learner now; by Taku in Stage 5). Teachers can
 * also type marks for a printed paper, or have a photographed script read
 * (convex/classes/marking.ts). Results are by topic, numbers only.
 */

const MAX_MARKS_READ = 500;

/** The topic of a question: the chapter of the cited page, else the source title, else the paper's title. */
export async function questionTopics(ctx: QueryCtx, content: QuizContent): Promise<{ number: number; topic: string }[]> {
  const cache = new Map<string, Doc<"sources"> | null>();
  const out = [];
  for (const q of content.questions) {
    let topic = content.title;
    if (q.origin.kind === "source") {
      const id = q.origin.sourceId;
      if (!cache.has(id)) cache.set(id, await ctx.db.get(id as Id<"sources">).catch(() => null));
      const source = cache.get(id) ?? null;
      if (source !== null) {
        const page = q.origin.page;
        topic = source.sections?.find((s) => s.fromPage <= page && page <= s.toPage)?.title ?? source.title;
      }
    }
    out.push({ number: q.number, topic });
  }
  return out;
}

export const assign = mutation({
  args: { classId: v.id("classes"), outputId: v.id("outputs") },
  handler: async (ctx, args) => {
    const { profile, cls } = await ownClass(ctx, args.classId);
    const output = await ctx.db.get(args.outputId);
    if (output === null || output.profileId !== profile._id || output.kind !== "quiz") throw new ConvexError("Pick one of your quizzes or practice papers.");
    const notebook = await ctx.db.get(output.notebookId);
    if (notebook === null || notebook.deletingAt !== undefined) throw new ConvexError("Pick one of your quizzes or practice papers.");
    const content = output.content as QuizContent;
    return await ctx.db.insert("assignments", { classId: cls._id, teacherProfileId: profile._id, outputId: output._id, title: content.title, content, topics: await questionTopics(ctx, content), createdAt: Date.now() });
  },
});

function withoutScheme(q: QuizQuestion): Pick<QuizQuestion, "number" | "kind" | "prompt" | "options" | "marks"> {
  return { number: q.number, kind: q.kind, prompt: q.prompt, options: q.options, marks: q.marks };
}

function schemeOf(q: QuizQuestion): { number: number; answer: string; markingPoints: string[] } {
  return { number: q.number, answer: q.answer, markingPoints: q.markingPoints };
}

async function myMark(ctx: QueryCtx, assignmentId: Id<"assignments">, profileId: Id<"profiles">): Promise<Doc<"classMarks"> | null> {
  return (await ctx.db.query("classMarks").withIndex("by_assignment", (q) => q.eq("assignmentId", assignmentId)).take(MAX_MARKS_READ)).find((m) => m.learnerProfileId === profileId) ?? null;
}

async function assignmentOf(ctx: QueryCtx, assignmentId: Id<"assignments">): Promise<Doc<"assignments">> {
  const assignment = await ctx.db.get(assignmentId);
  if (assignment === null) throw new ConvexError("Not found.");
  return assignment;
}

/** The paper for a learner: questions only until they hand in, then the scheme and their marks. */
export const forLearner = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const assignment = await assignmentOf(ctx, args.assignmentId);
    const { profile } = await requireClassMember(ctx, assignment.classId);
    const content = assignment.content as QuizContent;
    const mark = await myMark(ctx, assignment._id, profile._id);
    const handedIn = mark !== null && mark.via === "app";
    return {
      assignmentId: assignment._id,
      classId: assignment.classId,
      title: content.title,
      minutes: content.minutes,
      totalMarks: content.totalMarks,
      questions: content.questions.map(withoutScheme),
      scheme: handedIn ? content.questions.map(schemeOf) : null,
      mark: mark === null ? null : { perQuestion: mark.perQuestion, score: mark.score, total: mark.total, confirmed: mark.confirmed, answers: (mark.notes ?? []).map((n) => ({ number: n.number, answer: n.answer })) },
    };
  },
});

function totals(perQuestion: Doc<"classMarks">["perQuestion"]): { score: number; total: number } {
  return { score: perQuestion.reduce((n, q) => n + q.got, 0), total: perQuestion.reduce((n, q) => n + q.marks, 0) };
}

/** Hand in: multiple choice is marked here; written answers wait for marking against the scheme. */
export const handIn = mutation({
  args: { assignmentId: v.id("assignments"), answers: v.array(v.object({ number: v.number(), text: v.string() })) },
  handler: async (ctx, args) => {
    const assignment = await assignmentOf(ctx, args.assignmentId);
    const { profile } = await requireClassMember(ctx, assignment.classId);
    if ((await myMark(ctx, assignment._id, profile._id)) !== null) throw new ConvexError("You already handed this in.");
    const content = assignment.content as QuizContent;
    const given = new Map(args.answers.map((a) => [a.number, a.text.slice(0, 4000)]));
    const perQuestion = content.questions.map((q) => ({ number: q.number, marks: q.marks, got: q.kind === "mcq" && given.get(q.number) === q.answer ? q.marks : 0 }));
    const written = content.questions.some((q) => q.kind !== "mcq");
    await ctx.db.insert("classMarks", {
      assignmentId: assignment._id,
      classId: assignment.classId,
      learnerProfileId: profile._id,
      via: "app",
      perQuestion,
      ...totals(perQuestion),
      confirmed: !written,
      notes: content.questions.filter((q) => q.kind !== "mcq").map((q) => ({ number: q.number, answer: given.get(q.number) ?? "", reason: "" })),
      createdAt: Date.now(),
    });
    return { written };
  },
});

/** The learner marks their written answers against the scheme they can now see. Multiple choice marks stay as the app gave them. */
export const markWritten = mutation({
  args: { assignmentId: v.id("assignments"), marks: v.array(v.object({ number: v.number(), got: v.number() })) },
  handler: async (ctx, args) => {
    const assignment = await assignmentOf(ctx, args.assignmentId);
    const { profile } = await requireClassMember(ctx, assignment.classId);
    const mark = await myMark(ctx, assignment._id, profile._id);
    if (mark === null || mark.via !== "app" || mark.confirmed) throw new ConvexError("There is nothing to mark.");
    const content = assignment.content as QuizContent;
    const given = new Map(args.marks.map((m) => [m.number, m.got]));
    const perQuestion = content.questions.map((q) => {
      const app = mark.perQuestion.find((p) => p.number === q.number)?.got ?? 0;
      const got = q.kind === "mcq" ? app : Math.max(0, Math.min(q.marks, Math.round(given.get(q.number) ?? 0)));
      return { number: q.number, marks: q.marks, got };
    });
    await ctx.db.patch(mark._id, { perQuestion, ...totals(perQuestion), confirmed: true });
    return totals(perQuestion);
  },
});

/** The teacher's marking sheet: every learner and listed name, and their score if marked. */
export const sheet = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (assignment === null) throw new ConvexError("Not found.");
    const { cls } = await ownClass(ctx, assignment.classId);
    const marks = await ctx.db.query("classMarks").withIndex("by_assignment", (q) => q.eq("assignmentId", assignment._id)).take(MAX_MARKS_READ);
    const view = (m: Doc<"classMarks"> | undefined) => (m === undefined ? null : { markId: m._id, via: m.via, score: m.score, total: m.total, confirmed: m.confirmed, perQuestion: m.perQuestion, check: m.check ?? [], notes: m.notes ?? [] });
    const rows = [];
    for (const e of await ctx.db.query("enrolments").withIndex("by_class", (q) => q.eq("classId", cls._id).eq("status", "approved")).take(200)) {
      const p = await ctx.db.get(e.learnerProfileId);
      if (p === null || p.deletingAt !== undefined) continue;
      rows.push({ key: e._id as string, enrolmentId: e._id, rosterId: null, firstName: firstName(p.displayName), mark: view(marks.find((m) => m.learnerProfileId === p._id)) });
    }
    for (const r of await ctx.db.query("rosterNames").withIndex("by_class", (q) => q.eq("classId", cls._id)).take(200)) {
      rows.push({ key: r._id as string, enrolmentId: null, rosterId: r._id, firstName: r.firstName, mark: view(marks.find((m) => m.rosterId === r._id)) });
    }
    const content = assignment.content as QuizContent;
    return { title: content.title, classId: cls._id, outputId: assignment.outputId, questions: content.questions.map((q) => ({ number: q.number, marks: q.marks, kind: q.kind })), rows };
  },
});

type Who = { enrolmentId?: Id<"enrolments">; rosterId?: Id<"rosterNames"> };
const whoArgs = { enrolmentId: v.optional(v.id("enrolments")), rosterId: v.optional(v.id("rosterNames")) };

/** Resolves who a teacher is marking: a learner in the class, or a listed name. */
export async function markTarget(ctx: QueryCtx, cls: Doc<"classes">, who: Who): Promise<{ learnerProfileId?: Id<"profiles">; rosterId?: Id<"rosterNames"> }> {
  if ((who.enrolmentId === undefined) === (who.rosterId === undefined)) throw new ConvexError("Choose one learner.");
  if (who.enrolmentId !== undefined) {
    const e = await ctx.db.get(who.enrolmentId);
    if (e === null || e.classId !== cls._id || e.status !== "approved") throw new ConvexError("Learner not found.");
    return { learnerProfileId: e.learnerProfileId };
  }
  const r = await ctx.db.get(who.rosterId!);
  if (r === null || r.classId !== cls._id) throw new ConvexError("Learner not found.");
  return { rosterId: r._id };
}

export async function saveMarks(ctx: MutationCtx, assignment: Doc<"assignments">, target: { learnerProfileId?: Id<"profiles">; rosterId?: Id<"rosterNames"> }, row: Pick<Doc<"classMarks">, "via" | "perQuestion" | "confirmed" | "check" | "notes">): Promise<Id<"classMarks">> {
  const all = await ctx.db.query("classMarks").withIndex("by_assignment", (q) => q.eq("assignmentId", assignment._id)).take(MAX_MARKS_READ);
  const existing = all.find((m) => (target.learnerProfileId !== undefined && m.learnerProfileId === target.learnerProfileId) || (target.rosterId !== undefined && m.rosterId === target.rosterId));
  const fields = { ...row, ...totals(row.perQuestion) };
  if (existing !== undefined) {
    await ctx.db.patch(existing._id, fields);
    return existing._id;
  }
  return await ctx.db.insert("classMarks", { assignmentId: assignment._id, classId: assignment.classId, ...target, ...fields, createdAt: Date.now() });
}

export function clampMarks(content: QuizContent, marks: readonly { number: number; got: number }[]): Doc<"classMarks">["perQuestion"] {
  const given = new Map(marks.map((m) => [m.number, m.got]));
  return content.questions.map((q) => ({ number: q.number, marks: q.marks, got: Math.max(0, Math.min(q.marks, Math.round(given.get(q.number) ?? 0))) }));
}

/** The teacher types the marks from a printed paper. */
export const enterMarks = mutation({
  args: { assignmentId: v.id("assignments"), ...whoArgs, marks: v.array(v.object({ number: v.number(), got: v.number() })) },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (assignment === null) throw new ConvexError("Not found.");
    const { cls } = await ownClass(ctx, assignment.classId);
    const target = await markTarget(ctx, cls, args);
    const perQuestion = clampMarks(assignment.content as QuizContent, args.marks);
    await saveMarks(ctx, assignment, target, { via: "hand", perQuestion, confirmed: true, check: undefined, notes: undefined });
    return totals(perQuestion);
  },
});

export type TopicTally = Map<string, { got: number; of: number; answers: number }>;
export type PaperResult = { assignmentId: Id<"assignments">; title: string; scripts: number; percent: number | null };

/** Adds one class's confirmed marks to a running tally by topic, and returns its papers. Drafts are not counted. */
export async function tallyClass(ctx: QueryCtx, classId: Id<"classes">, byTopic: TopicTally): Promise<PaperResult[]> {
  const assignments = await ctx.db.query("assignments").withIndex("by_class", (q) => q.eq("classId", classId)).order("desc").take(50);
  const papers: PaperResult[] = [];
  for (const a of assignments) {
    const marks = (await ctx.db.query("classMarks").withIndex("by_assignment", (q) => q.eq("assignmentId", a._id)).take(MAX_MARKS_READ)).filter((m) => m.confirmed);
    const topicOf = new Map(a.topics.map((t) => [t.number, t.topic]));
    for (const m of marks) {
      for (const q of m.perQuestion) {
        const topic = topicOf.get(q.number) ?? a.title;
        const t = byTopic.get(topic) ?? { got: 0, of: 0, answers: 0 };
        byTopic.set(topic, { got: t.got + q.got, of: t.of + q.marks, answers: t.answers + 1 });
      }
    }
    const got = marks.reduce((n, m) => n + m.score, 0);
    const of = marks.reduce((n, m) => n + m.total, 0);
    papers.push({ assignmentId: a._id, title: a.title, scripts: marks.length, percent: of === 0 ? null : Math.round((got / of) * 100) });
  }
  return papers;
}

/** Weakest topics first. */
export function topicRows(byTopic: TopicTally): { topic: string; answers: number; percent: number }[] {
  return [...byTopic.entries()].map(([topic, t]) => ({ topic, answers: t.answers, percent: t.of === 0 ? 0 : Math.round((t.got / t.of) * 100) })).sort((a, b) => a.percent - b.percent);
}

/** Results by topic and by paper: counts and percentages only, no names. Drafts are not counted. */
export const results = query({
  args: { classId: v.id("classes") },
  handler: async (ctx, args) => {
    const { cls } = await ownClass(ctx, args.classId);
    const byTopic: TopicTally = new Map();
    const papers = await tallyClass(ctx, cls._id, byTopic);
    return { topics: topicRows(byTopic), papers };
  },
});
