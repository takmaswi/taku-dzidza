import { ConvexError, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation, query, type MutationCtx } from "../_generated/server";
import { requireProfile } from "../lib/access";
import { teacherModeOn } from "../lib/env";
import { hasRole, isAdult, requireTeacher, TEACHER_OFF, type Role } from "./access";
import { cryptoRandom, firstName, normaliseCode, randomCode, validCode } from "./codes";

/**
 * Roles and schools. An adult switches on teaching in Settings; a school
 * admin creates a school and shares its staff code; teachers join with it.
 * Ported from Amayi Learn (convex/classes/classes.ts at 290e4b4, "schools"),
 * with roles on the one account instead of a separate grown up profile.
 */

const MAX_STAFF = 200;
const MAX_CLASSES = 400;

export async function uniqueCode(ctx: MutationCtx, table: "classes" | "schools"): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = randomCode(cryptoRandom);
    const taken =
      table === "classes"
        ? await ctx.db.query("classes").withIndex("by_code", (q) => q.eq("code", code)).first()
        : await ctx.db.query("schools").withIndex("by_staff_code", (q) => q.eq("staffCode", code)).first();
    if (taken === null) return code;
  }
  throw new ConvexError("Could not make a code. Try again.");
}

export function withRole(profile: Doc<"profiles">, role: Role, on: boolean): Role[] {
  const rest = (profile.roles ?? []).filter((r) => r !== role);
  return on ? [...rest, role] : rest;
}

/** Settings: an adult switches teaching on or off. Their classes stay; they come back when it is on again. */
export const setTeaching = mutation({
  args: { on: v.boolean() },
  handler: async (ctx, args) => {
    if (!teacherModeOn()) throw new ConvexError(TEACHER_OFF);
    const { profile } = await requireProfile(ctx);
    if (!isAdult(profile)) throw new ConvexError("Teaching tools are for adults.");
    await ctx.db.patch(profile._id, { roles: withRole(profile, "teacher", args.on) });
    return null;
  },
});

export const createSchool = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const { profile } = await requireTeacher(ctx);
    const name = args.name.trim().replace(/\s+/g, " ");
    if (name.length < 3 || name.length > 100) throw new ConvexError("Enter the school's name.");
    const mine = await ctx.db.query("schoolStaff").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).first();
    if (mine !== null) throw new ConvexError("You already belong to a school.");
    const now = Date.now();
    const schoolId = await ctx.db.insert("schools", { name, adminProfileId: profile._id, staffCode: await uniqueCode(ctx, "schools"), createdAt: now });
    await ctx.db.insert("schoolStaff", { schoolId, profileId: profile._id, role: "admin", joinedAt: now });
    await ctx.db.patch(profile._id, { roles: withRole(profile, "school_admin", true) });
    // Classes made before the school belong to it now.
    for (const c of await ctx.db.query("classes").withIndex("by_teacher", (q) => q.eq("teacherProfileId", profile._id)).take(MAX_CLASSES)) {
      if (c.schoolId === undefined) await ctx.db.patch(c._id, { schoolId });
    }
    return schoolId;
  },
});

export const joinSchool = mutation({
  args: { staffCode: v.string() },
  handler: async (ctx, args) => {
    const { profile } = await requireTeacher(ctx);
    const code = normaliseCode(args.staffCode);
    if (!validCode(code)) throw new ConvexError("A staff code has 6 letters and numbers.");
    const school = await ctx.db.query("schools").withIndex("by_staff_code", (q) => q.eq("staffCode", code)).unique();
    if (school === null) throw new ConvexError("No school has that staff code.");
    const mine = await ctx.db.query("schoolStaff").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).first();
    if (mine !== null) throw new ConvexError("You already belong to a school.");
    await ctx.db.insert("schoolStaff", { schoolId: school._id, profileId: profile._id, role: "teacher", joinedAt: Date.now() });
    for (const c of await ctx.db.query("classes").withIndex("by_teacher", (q) => q.eq("teacherProfileId", profile._id)).take(MAX_CLASSES)) {
      if (c.schoolId === undefined) await ctx.db.patch(c._id, { schoolId: school._id });
    }
    return school._id;
  },
});

/** The school page: staff first names, classes and how many learners joined. Numbers only, no learner names. */
export const mySchool = query({
  args: {},
  handler: async (ctx) => {
    const { profile } = await requireTeacher(ctx);
    const membership = await ctx.db.query("schoolStaff").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).first();
    if (membership === null) return null;
    const school = await ctx.db.get(membership.schoolId);
    if (school === null) return null;
    const isAdmin = membership.role === "admin" && hasRole(profile, "school_admin");
    const staff = [];
    for (const s of await ctx.db.query("schoolStaff").withIndex("by_school", (q) => q.eq("schoolId", school._id)).take(MAX_STAFF)) {
      const p = await ctx.db.get(s.profileId);
      if (p !== null && p.deletingAt === undefined) staff.push({ name: firstName(p.displayName), role: s.role });
    }
    const classes = [];
    if (isAdmin) {
      for (const c of await ctx.db.query("classes").withIndex("by_school", (q) => q.eq("schoolId", school._id)).take(MAX_CLASSES)) {
        const joined = await ctx.db.query("enrolments").withIndex("by_class", (q) => q.eq("classId", c._id).eq("status", "approved")).take(500);
        const teacher = await ctx.db.get(c.teacherProfileId);
        classes.push({ name: c.name, subject: c.subject, level: c.level, teacher: teacher === null ? "" : firstName(teacher.displayName), learners: joined.length });
      }
    }
    return { name: school.name, isAdmin, staffCode: isAdmin ? school.staffCode : null, staff, classes };
  },
});
