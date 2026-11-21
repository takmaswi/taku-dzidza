import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query, type QueryCtx } from "../_generated/server";
import { checkForMinors, findingsMessage } from "../safety/minorCheck";
import { ownClass, requireClassMember, requireTeacher, requireTeacherInAction } from "./access";

/**
 * A teacher shares their own notebooks with a class, view only: the source
 * titles and the study tools made from them, never learner data. A source
 * marked as pages from a published book (thirdParty) is never shown to a
 * class, and citations into it lose their quote. Licensed shelf books
 * (Stage 4) live outside notebooks and are never shared.
 *
 * A class may hold learners under 18, so sharing runs the under 18 checks
 * (convex/safety/minorCheck.ts) on the notebook's sources and shareable
 * tools, once each, and the class sees only what passed. Anything added
 * after sharing waits until the teacher shares again.
 */

/** Read only tools. Quizzes and papers reach a class as set work (convex/classes/assignments.ts), never with their scheme. */
const SHAREABLE: readonly Doc<"outputs">["kind"][] = ["summary", "mindmap"];

/** What a class may see of a notebook: sources not marked as a published book, and read only tools, each once it passed the under 18 check. */
function shareableSource(s: Doc<"sources">): boolean {
  return s.deletingAt === undefined && s.thirdParty !== true && s.status === "ready";
}

async function ownNotebookFor(ctx: QueryCtx, classId: Id<"classes">, notebookId: Id<"notebooks">): Promise<{ profile: Doc<"profiles">; cls: Doc<"classes">; notebook: Doc<"notebooks"> }> {
  const { profile, cls } = await ownClass(ctx, classId);
  const notebook = await ctx.db.get(notebookId);
  if (notebook === null || notebook.profileId !== profile._id || notebook.deletingAt !== undefined) throw new ConvexError("Notebook not found.");
  return { profile, cls, notebook };
}

/** The teacher's sources and tools a share would show the class. */
export const sharePlan = internalQuery({
  args: { classId: v.id("classes"), notebookId: v.id("notebooks") },
  handler: async (ctx, args): Promise<{ payerId: Id<"profiles">; title: string; sourceIds: Id<"sources">[]; outputIds: Id<"outputs">[] }> => {
    const { profile, notebook } = await ownNotebookFor(ctx, args.classId, args.notebookId);
    const sources = (await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).take(50)).filter(shareableSource);
    const outputs = (await ctx.db.query("outputs").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).order("desc").take(50)).filter((o) => SHAREABLE.includes(o.kind));
    return { payerId: profile._id, title: notebook.title, sourceIds: sources.map((s) => s._id), outputIds: outputs.map((o) => o._id) };
  },
});

export type ShareResult = { ok: true } | { ok: false; message: string };

/**
 * Shares a notebook with a class, or stops. Sharing checks every source and
 * tool the class would see for under 18s, charged to the teacher; if one
 * fails, nothing is shared and the teacher is told which. Sharing a notebook
 * that is shared already checks what was added since.
 */
export const share = action({
  args: { classId: v.id("classes"), notebookId: v.id("notebooks"), on: v.boolean() },
  handler: async (ctx, args): Promise<ShareResult> => {
    await requireTeacherInAction(ctx, args.classId);
    if (args.on) {
      const plan = await ctx.runQuery(internal.classes.sharing.sharePlan, { classId: args.classId, notebookId: args.notebookId });
      const message = findingsMessage(await checkForMinors(ctx, { payerId: plan.payerId, sourceIds: plan.sourceIds, outputIds: plan.outputIds, key: { shared: plan.title } }), "shared");
      if (message !== null) return { ok: false, message };
    }
    await ctx.runMutation(internal.classes.sharing.setShare, args);
    return { ok: true };
  },
});

export const setShare = internalMutation({
  args: { classId: v.id("classes"), notebookId: v.id("notebooks"), on: v.boolean() },
  handler: async (ctx, args) => {
    const { cls, notebook } = await ownNotebookFor(ctx, args.classId, args.notebookId);
    const rows = await ctx.db.query("classShares").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).take(100);
    const existing = rows.find((r) => r.classId === cls._id);
    if (args.on && existing === undefined) await ctx.db.insert("classShares", { classId: cls._id, notebookId: notebook._id, sharedAt: Date.now() });
    if (!args.on && existing !== undefined) await ctx.db.delete(existing._id);
    return null;
  },
});

/** The teacher marks a source as pages from a published book. It then never reaches a class. */
export const setThirdParty = mutation({
  args: { sourceId: v.id("sources"), on: v.boolean() },
  handler: async (ctx, args) => {
    const { profile } = await requireTeacher(ctx);
    const source = await ctx.db.get(args.sourceId);
    if (source === null || source.profileId !== profile._id || source.deletingAt !== undefined) throw new ConvexError("Source not found.");
    await ctx.db.patch(source._id, { thirdParty: args.on });
    return null;
  },
});

/** The teacher's share picker: their notebooks and sources, with what is shared, what is marked as a published book, and how much is waiting for the under 18 check. */
export const picker = query({
  args: { classId: v.id("classes") },
  handler: async (ctx, args) => {
    const { profile, cls } = await ownClass(ctx, args.classId);
    const shared = new Set((await ctx.db.query("classShares").withIndex("by_class", (q) => q.eq("classId", cls._id)).take(100)).map((s) => s.notebookId as string));
    const out = [];
    for (const nb of await ctx.db.query("notebooks").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(100)) {
      if (nb.deletingAt !== undefined) continue;
      const sources = (await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", nb._id)).take(50))
        .filter((s) => s.deletingAt === undefined)
        .map((s) => ({ sourceId: s._id, title: s.title, thirdParty: s.thirdParty === true }));
      const quizzes = (await ctx.db.query("outputs").withIndex("by_notebook", (q) => q.eq("notebookId", nb._id)).order("desc").take(50))
        .filter((o) => o.kind === "quiz")
        .map((o) => ({ outputId: o._id, title: o.title }));
      const checkable = [
        ...(await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", nb._id)).take(50)).filter(shareableSource),
        ...(await ctx.db.query("outputs").withIndex("by_notebook", (q) => q.eq("notebookId", nb._id)).take(50)).filter((o) => SHAREABLE.includes(o.kind)),
      ];
      const waiting = checkable.filter((x) => x.minorCheck !== "allowed").length;
      out.push({ notebookId: nb._id, title: nb.title, shared: shared.has(nb._id as string), sources, quizzes, waiting });
    }
    return out;
  },
});

async function sharedNotebook(ctx: QueryCtx, classId: Id<"classes">, notebookId: Id<"notebooks">): Promise<Doc<"notebooks">> {
  const rows = await ctx.db.query("classShares").withIndex("by_notebook", (q) => q.eq("notebookId", notebookId)).take(100);
  const notebook = await ctx.db.get(notebookId);
  if (!rows.some((r) => r.classId === classId) || notebook === null || notebook.deletingAt !== undefined) throw new ConvexError("Not found.");
  return notebook;
}

/** What a learner in the class sees: shared notebooks and their study tools, and the work set. */
export const material = query({
  args: { classId: v.id("classes") },
  handler: async (ctx, args) => {
    const { profile, cls } = await requireClassMember(ctx, args.classId);
    const notebooks = [];
    for (const s of await ctx.db.query("classShares").withIndex("by_class", (q) => q.eq("classId", cls._id)).take(50)) {
      const nb = await ctx.db.get(s.notebookId);
      if (nb === null || nb.deletingAt !== undefined || nb.profileId !== cls.teacherProfileId) continue;
      const sources = (await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", nb._id)).take(50)).filter((x) => shareableSource(x) && x.minorCheck === "allowed").map((x) => ({ title: x.title, pages: x.pageCount }));
      const outputs = (await ctx.db.query("outputs").withIndex("by_notebook", (q) => q.eq("notebookId", nb._id)).order("desc").take(50)).filter((o) => SHAREABLE.includes(o.kind) && o.minorCheck === "allowed").map((o) => ({ outputId: o._id, title: o.title, kind: o.kind }));
      notebooks.push({ notebookId: nb._id, title: nb.title, sources, outputs });
    }
    const work = [];
    for (const a of await ctx.db.query("assignments").withIndex("by_class", (q) => q.eq("classId", cls._id)).order("desc").take(50)) {
      const mark = (await ctx.db.query("classMarks").withIndex("by_assignment", (q) => q.eq("assignmentId", a._id)).take(500)).find((m) => m.learnerProfileId === profile._id && m.confirmed);
      work.push({ assignmentId: a._id, title: a.title, createdAt: a.createdAt, score: mark?.score ?? null, total: mark?.total ?? null });
    }
    return { class: { name: cls.name, subject: cls.subject, level: cls.level }, notebooks, work };
  },
});

/** One shared study tool, read only. Citations into a published book keep their page and lose the quote. */
export const sharedOutput = query({
  args: { classId: v.id("classes"), outputId: v.id("outputs") },
  handler: async (ctx, args) => {
    const { cls } = await requireClassMember(ctx, args.classId);
    const output = await ctx.db.get(args.outputId);
    if (output === null || output.profileId !== cls.teacherProfileId || !SHAREABLE.includes(output.kind) || output.minorCheck !== "allowed") throw new ConvexError("Not found.");
    await sharedNotebook(ctx, cls._id, output.notebookId);
    const sources = await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", output.notebookId)).take(50);
    const hidden = new Set(sources.filter((s) => s.thirdParty === true).map((s) => s._id as string));
    const titles = Object.fromEntries(sources.filter((s) => !hidden.has(s._id as string)).map((s) => [s._id as string, s.title]));
    return { output: { ...output, content: stripQuotes(output.content, hidden) }, titles };
  },
});

/** Removes quote text from citations into hidden sources, anywhere in a stored tool. */
export function stripQuotes(value: unknown, hidden: ReadonlySet<string>): unknown {
  if (hidden.size === 0) return value;
  if (Array.isArray(value)) return value.map((x) => stripQuotes(x, hidden));
  if (value === null || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  if (record.kind === "source" && typeof record.sourceId === "string" && hidden.has(record.sourceId)) return { ...record, quote: "" };
  return Object.fromEntries(Object.entries(record).map(([k, x]) => [k, stripQuotes(x, hidden)]));
}
