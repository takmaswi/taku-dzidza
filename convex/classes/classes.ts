import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { syllabusById } from "../curriculum/catalogue";
import { ownClass, requireTeacher } from "./access";
import { firstName, validFirstName } from "./codes";
import { uniqueCode } from "./roles";

/**
 * A teacher's classes. Ported from Amayi Learn (convex/classes/classes.ts at
 * 290e4b4, "classes"): a class has a code; learners join with it and an
 * under 18's guardian approves. Teachers only ever see first names. A class
 * that shares one phone keeps a list of first names typed by the teacher.
 */

export const MAX_CLASSES = 40;
export const MAX_ROSTER = 120;

export const createClass = mutation({
  args: { name: v.string(), subject: v.string(), level: v.string(), syllabusId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { profile } = await requireTeacher(ctx);
    const name = args.name.trim().replace(/\s+/g, " ");
    const subject = args.subject.trim().replace(/\s+/g, " ");
    const level = args.level.trim();
    if (name.length < 2 || name.length > 60) throw new ConvexError("Give the class a name.");
    if (subject.length < 2 || subject.length > 60) throw new ConvexError("Say which subject you teach this class.");
    if (level.length < 1 || level.length > 30) throw new ConvexError("Say which form or level the class is.");
    if (args.syllabusId !== undefined && syllabusById(args.syllabusId) === undefined) throw new ConvexError("Pick a syllabus from the list.");
    const mine = await ctx.db.query("classes").withIndex("by_teacher", (q) => q.eq("teacherProfileId", profile._id)).take(MAX_CLASSES + 1);
    if (mine.length >= MAX_CLASSES) throw new ConvexError(`One teacher can have up to ${MAX_CLASSES} classes.`);
    // A new class belongs to the organisation the teacher teaches at, if any.
    const staff = (await ctx.db.query("memberships").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(20)).find((m) => m.role === "teacher" || m.role === "admin");
    return await ctx.db.insert("classes", {
      teacherProfileId: profile._id,
      organisationId: staff?.organisationId,
      name,
      subject,
      level,
      syllabusId: args.syllabusId,
      code: await uniqueCode(ctx),
      createdAt: Date.now(),
    });
  },
});

export const myClasses = query({
  args: {},
  handler: async (ctx) => {
    const { profile } = await requireTeacher(ctx);
    const rows = await ctx.db.query("classes").withIndex("by_teacher", (q) => q.eq("teacherProfileId", profile._id)).take(MAX_CLASSES);
    const out = [];
    for (const c of rows) {
      const joined = await ctx.db.query("enrolments").withIndex("by_class", (q) => q.eq("classId", c._id).eq("status", "approved")).take(MAX_ROSTER);
      const waiting = await ctx.db.query("enrolments").withIndex("by_class", (q) => q.eq("classId", c._id).eq("status", "pending")).take(MAX_ROSTER);
      const names = await ctx.db.query("rosterNames").withIndex("by_class", (q) => q.eq("classId", c._id)).take(MAX_ROSTER);
      out.push({ _id: c._id, name: c.name, subject: c.subject, level: c.level, code: c.code, learners: joined.length + names.length, waiting: waiting.length });
    }
    return out;
  },
});

/** Everything the class page shows. Learners by first name and status; nothing else about them. */
export const detail = query({
  args: { classId: v.id("classes") },
  handler: async (ctx, args) => {
    const { cls } = await ownClass(ctx, args.classId);
    const learners = [];
    for (const status of ["approved", "pending"] as const) {
      for (const e of await ctx.db.query("enrolments").withIndex("by_class", (q) => q.eq("classId", cls._id).eq("status", status)).take(MAX_ROSTER)) {
        const p = await ctx.db.get(e.learnerProfileId);
        if (p !== null && p.deletingAt === undefined) learners.push({ enrolmentId: e._id, firstName: firstName(p.displayName), status });
      }
    }
    const names = (await ctx.db.query("rosterNames").withIndex("by_class", (q) => q.eq("classId", cls._id)).take(MAX_ROSTER)).map((r) => ({ rosterId: r._id, firstName: r.firstName }));
    const shares = [];
    for (const s of await ctx.db.query("classShares").withIndex("by_class", (q) => q.eq("classId", cls._id)).take(50)) {
      const nb = await ctx.db.get(s.notebookId);
      if (nb !== null && nb.deletingAt === undefined) shares.push({ notebookId: nb._id, title: nb.title });
    }
    const assignments = [];
    for (const a of await ctx.db.query("assignments").withIndex("by_class", (q) => q.eq("classId", cls._id)).order("desc").take(50)) {
      const marks = await ctx.db.query("classMarks").withIndex("by_assignment", (q) => q.eq("assignmentId", a._id)).take(500);
      assignments.push({ assignmentId: a._id, outputId: a.outputId, title: a.title, createdAt: a.createdAt, marked: marks.filter((m) => m.confirmed).length, drafts: marks.filter((m) => !m.confirmed).length });
    }
    return {
      class: { _id: cls._id, name: cls.name, subject: cls.subject, level: cls.level, syllabusId: cls.syllabusId ?? null, code: cls.code },
      learners,
      names,
      shares,
      assignments,
    };
  },
});

export const addName = mutation({
  args: { classId: v.id("classes"), firstName: v.string() },
  handler: async (ctx, args) => {
    const { cls } = await ownClass(ctx, args.classId);
    const name = args.firstName.trim().replace(/\s+/g, " ");
    if (!validFirstName(name)) throw new ConvexError("Type a first name only.");
    const count = await ctx.db.query("rosterNames").withIndex("by_class", (q) => q.eq("classId", cls._id)).take(MAX_ROSTER);
    if (count.length >= MAX_ROSTER) throw new ConvexError(`A class can list up to ${MAX_ROSTER} names.`);
    return await ctx.db.insert("rosterNames", { classId: cls._id, firstName: name, createdAt: Date.now() });
  },
});

export const removeName = mutation({
  args: { classId: v.id("classes"), rosterId: v.id("rosterNames") },
  handler: async (ctx, args) => {
    const { cls } = await ownClass(ctx, args.classId);
    const row = await ctx.db.get(args.rosterId);
    if (row === null || row.classId !== cls._id) throw new ConvexError("Name not found.");
    for (const m of await ctx.db.query("classMarks").withIndex("by_class", (q) => q.eq("classId", cls._id)).take(2000)) {
      if (m.rosterId === row._id) await ctx.db.delete(m._id);
    }
    await ctx.db.delete(row._id);
    return null;
  },
});

/** The teacher takes a learner out of the class. Their marks for this class go with them. */
export const removeLearner = mutation({
  args: { classId: v.id("classes"), enrolmentId: v.id("enrolments") },
  handler: async (ctx, args) => {
    const { cls } = await ownClass(ctx, args.classId);
    const row = await ctx.db.get(args.enrolmentId);
    if (row === null || row.classId !== cls._id) throw new ConvexError("Learner not found.");
    for (const m of await ctx.db.query("classMarks").withIndex("by_learner", (q) => q.eq("learnerProfileId", row.learnerProfileId)).take(2000)) {
      if (m.classId === cls._id) await ctx.db.delete(m._id);
    }
    await ctx.db.delete(row._id);
    return null;
  },
});
