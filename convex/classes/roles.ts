import { ConvexError, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation, type MutationCtx } from "../_generated/server";
import { requireProfile } from "../lib/access";
import { teacherModeOn } from "../lib/env";
import { isAdult, TEACHER_OFF, type Role } from "./access";
import { cryptoRandom, randomCode } from "./codes";

/**
 * Roles on the one account, and the 6 character codes. An adult switches on
 * teaching in Settings. Schools became organisations (convex/organisations).
 * Ported from Amayi Learn (convex/classes/classes.ts at 290e4b4, "schools"),
 * with roles on the one account instead of a separate grown up profile.
 */

/** A code no class, organisation or staff code already uses, so one box can take any of them. */
export async function uniqueCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = randomCode(cryptoRandom);
    const taken =
      (await ctx.db.query("classes").withIndex("by_code", (q) => q.eq("code", code)).first()) ??
      (await ctx.db.query("organisations").withIndex("by_join_code", (q) => q.eq("joinCode", code)).first()) ??
      (await ctx.db.query("orgCodes").withIndex("by_code", (q) => q.eq("code", code)).first());
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
