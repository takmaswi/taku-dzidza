import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx, QueryCtx } from "../_generated/server";
import { ADULT_AGE, ageOn } from "../accounts/age";
import { requireLearner, requireProfile } from "../lib/access";
import { featureOn } from "../lib/features";

/**
 * Access helpers for teachers, classes and guardians (Stage 2). Every public
 * function in convex/classes calls one of these (tests/convex/access-scan.test.ts).
 * All of them refuse while TEACHER_MODE is off for this account (convex/lib/features.ts).
 *
 *   requireTeacher       an adult who switched on the teacher role
 *   ownClass             requireTeacher, and the class is theirs
 *   requireGuardian      an adult (the guardian role is added when they first add a child)
 *   requireClassMember   a learner allowed to study, approved in the class
 *   requireTeacherInAction  ownClass from an action
 */

export const TEACHER_OFF = "Teacher tools are not on yet.";
export type Role = NonNullable<Doc<"profiles">["roles"]>[number];

export function isAdult(profile: Pick<Doc<"profiles">, "birthYear" | "birthMonth">, now = new Date()): boolean {
  return ageOn(profile.birthYear, profile.birthMonth, now) >= ADULT_AGE;
}

export function hasRole(profile: Pick<Doc<"profiles">, "roles">, role: Role): boolean {
  return (profile.roles ?? []).includes(role);
}

export async function requireTeacherMode(ctx: QueryCtx): Promise<void> {
  if (!(await featureOn(ctx, "TEACHER_MODE"))) throw new ConvexError(TEACHER_OFF);
}

export async function requireTeacher(ctx: QueryCtx): Promise<{ user: Doc<"users">; profile: Doc<"profiles"> }> {
  await requireTeacherMode(ctx);
  const found = await requireProfile(ctx);
  if (!isAdult(found.profile) || !hasRole(found.profile, "teacher")) throw new ConvexError("Switch on teaching in Settings first.");
  return found;
}

export async function ownClass(ctx: QueryCtx, classId: Id<"classes">): Promise<{ profile: Doc<"profiles">; cls: Doc<"classes"> }> {
  const { profile } = await requireTeacher(ctx);
  const cls = await ctx.db.get(classId);
  if (cls === null || cls.teacherProfileId !== profile._id) throw new ConvexError("Class not found.");
  return { profile, cls };
}

export async function requireGuardian(ctx: QueryCtx): Promise<{ user: Doc<"users">; profile: Doc<"profiles"> }> {
  await requireTeacherMode(ctx);
  const found = await requireProfile(ctx);
  if (!isAdult(found.profile)) throw new ConvexError("Only an adult can be a guardian here.");
  return found;
}

/** A learner in the class, approved. Also used before any class material is shown. */
export async function requireClassMember(ctx: QueryCtx, classId: Id<"classes">): Promise<{ profile: Doc<"profiles">; cls: Doc<"classes"> }> {
  await requireTeacherMode(ctx);
  const { profile } = await requireLearner(ctx);
  const cls = await ctx.db.get(classId);
  if (cls === null) throw new ConvexError("Class not found.");
  const rows = await ctx.db.query("enrolments").withIndex("by_learner", (q) => q.eq("learnerProfileId", profile._id)).take(100);
  if (!rows.some((e) => e.classId === classId && e.status === "approved")) throw new ConvexError("Class not found.");
  return { profile, cls };
}

/** ownClass from an action, through an internal query. Returns the teacher's profile id. */
export async function requireTeacherInAction(ctx: ActionCtx, classId: Id<"classes">): Promise<Id<"profiles">> {
  const { profileId }: { profileId: Id<"profiles"> } = await ctx.runQuery(internal.classes.accessQueries.classCheck, { classId });
  return profileId;
}

/** The learner side of joining: a learner allowed to study, with the mode on. */
export async function requireJoiningLearner(ctx: QueryCtx): Promise<{ user: Doc<"users">; profile: Doc<"profiles"> }> {
  await requireTeacherMode(ctx);
  return await requireLearner(ctx);
}
