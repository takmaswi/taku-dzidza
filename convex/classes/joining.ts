import { ConvexError, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { joinedClassOrg } from "../organisations/members";
import { requireClassMember, requireJoiningLearner, isAdult } from "./access";
import { firstName, normaliseCode, validCode } from "./codes";

/**
 * A learner joins a class by code, link or QR code (all carry the same code).
 * An adult is in at once. An under 18 waits for their guardian, who answers
 * from their own account (convex/classes/guardians.ts) or from the consent
 * link with a code to their phone (convex/accounts/consent.ts, decideClass).
 */

const MAX_JOINED = 30;

export type JoinResult = { ok: true; className: string; status: "approved" | "pending" } | { ok: false; message: string };

export const JOIN_ERRORS = {
  code: "A class code has 6 letters and numbers.",
  unknown: "That code did not work. Check it with your teacher.",
  own: "This is your own class.",
  many: `You can be in up to ${MAX_JOINED} classes.`,
} as const;

async function myEnrolments(ctx: QueryCtx, profile: Doc<"profiles">): Promise<Doc<"enrolments">[]> {
  return await ctx.db.query("enrolments").withIndex("by_learner", (q) => q.eq("learnerProfileId", profile._id)).take(MAX_JOINED + 1);
}

/** Join a class found by its code. Shared with the one code box for organisations (convex/organisations). */
export async function requestJoinClass(ctx: MutationCtx, profile: Doc<"profiles">, cls: Doc<"classes">): Promise<JoinResult> {
  if (cls.teacherProfileId === profile._id) return { ok: false, message: JOIN_ERRORS.own };
  const mine = await myEnrolments(ctx, profile);
  const existing = mine.find((e) => e.classId === cls._id);
  const now = Date.now();
  const adult = isAdult(profile);
  const status = adult ? "approved" : "pending";
  const decided = adult ? { decidedAt: now, decidedBy: "adult" as const } : {};
  if (existing === undefined) {
    if (mine.length >= MAX_JOINED) return { ok: false, message: JOIN_ERRORS.many };
    await ctx.db.insert("enrolments", { classId: cls._id, learnerProfileId: profile._id, status, requestedAt: now, ...decided });
  } else if (existing.status === "declined") {
    await ctx.db.patch(existing._id, { status, requestedAt: now, decidedAt: adult ? now : undefined, decidedBy: adult ? "adult" : undefined });
  } else return { ok: true, className: cls.name, status: existing.status };
  if (adult) await joinedClassOrg(ctx, cls, profile._id);
  return { ok: true, className: cls.name, status };
}

export const requestJoin = mutation({
  args: { code: v.string() },
  handler: async (ctx, args): Promise<JoinResult> => {
    const { profile } = await requireJoiningLearner(ctx);
    const code = normaliseCode(args.code);
    if (!validCode(code)) return { ok: false, message: JOIN_ERRORS.code };
    const cls = await ctx.db.query("classes").withIndex("by_code", (q) => q.eq("code", code)).unique();
    if (cls === null) return { ok: false, message: JOIN_ERRORS.unknown };
    return await requestJoinClass(ctx, profile, cls);
  },
});

/** The learner's classes, with whether each is waiting for a guardian. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const { profile } = await requireJoiningLearner(ctx);
    const out = [];
    for (const e of await myEnrolments(ctx, profile)) {
      if (e.status === "declined") continue;
      const cls = await ctx.db.get(e.classId);
      if (cls === null) continue;
      const teacher = await ctx.db.get(cls.teacherProfileId);
      out.push({ classId: cls._id, name: cls.name, subject: cls.subject, level: cls.level, teacher: teacher === null ? "" : firstName(teacher.displayName), status: e.status });
    }
    return out;
  },
});

export const leave = mutation({
  args: { classId: v.id("classes") },
  handler: async (ctx, args) => {
    const { profile } = await requireClassMember(ctx, args.classId);
    for (const m of await ctx.db.query("classMarks").withIndex("by_learner", (q) => q.eq("learnerProfileId", profile._id)).take(2000)) {
      if (m.classId === args.classId) await ctx.db.delete(m._id);
    }
    for (const e of await myEnrolments(ctx, profile)) if (e.classId === args.classId) await ctx.db.delete(e._id);
    return null;
  },
});

/** Cancel a request still waiting for a guardian. */
export const cancel = mutation({
  args: { classId: v.id("classes") },
  handler: async (ctx, args) => {
    const { profile } = await requireJoiningLearner(ctx);
    for (const e of await myEnrolments(ctx, profile)) {
      if (e.classId === args.classId && e.status === "pending") await ctx.db.delete(e._id);
    }
    if ((await ctx.db.get(args.classId)) === null) throw new ConvexError("Class not found.");
    return null;
  },
});
