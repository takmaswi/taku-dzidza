import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { TEACHER_OFF } from "../classes/access";
import { adminEmails, teacherModeOn } from "../lib/env";
import { requireAdmin, requireUser } from "../lib/access";
import { ensureMembership } from "./members";

/**
 * The owner's review of organisations people added (accounts on ADMIN_EMAILS
 * with a verified email). An entry is listed (shown in search), verified
 * (checked as real), or merged into one that already exists.
 */

const MAX_PENDING = 100;

function requireMode(): void {
  if (!teacherModeOn()) throw new ConvexError(TEACHER_OFF);
}

/** Whether to show the owner's link. True only for a verified email on ADMIN_EMAILS. */
export const isOwner = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const email = (user.email ?? "").toLowerCase();
    return teacherModeOn() && email !== "" && user.emailVerificationTime !== undefined && adminEmails().includes(email);
  },
});

export const pending = query({
  args: {},
  handler: async (ctx) => {
    requireMode();
    await requireAdmin(ctx);
    const rows = await ctx.db.query("organisations").withIndex("by_status", (q) => q.eq("status", "pending")).take(MAX_PENDING);
    const out = [];
    for (const o of rows) {
      const members = await ctx.db.query("memberships").withIndex("by_org_role", (q) => q.eq("organisationId", o._id)).take(500);
      const follows = await ctx.db.query("follows").withIndex("by_org", (q) => q.eq("organisationId", o._id)).take(500);
      out.push({ _id: o._id, name: o.name, type: o.type, town: o.town, country: o.country, createdAt: o.createdAt, members: members.length, follows: follows.length });
    }
    return out;
  },
});

export const setStatus = mutation({
  args: { organisationId: v.id("organisations"), status: v.union(v.literal("listed"), v.literal("verified")) },
  handler: async (ctx, args) => {
    requireMode();
    await requireAdmin(ctx);
    const org = await ctx.db.get(args.organisationId);
    if (org === null) throw new ConvexError("Organisation not found.");
    await ctx.db.patch(org._id, { status: args.status });
    return null;
  },
});

/** A duplicate goes into the one that already exists: its members, followers, staff codes and classes move, then it is removed. */
export const merge = mutation({
  args: { fromId: v.id("organisations"), intoId: v.id("organisations") },
  handler: async (ctx, args) => {
    requireMode();
    await requireAdmin(ctx);
    const from = await ctx.db.get(args.fromId);
    const into = await ctx.db.get(args.intoId);
    if (from === null || into === null || from._id === into._id) throw new ConvexError("Pick two different organisations.");
    if (from.status !== "pending") throw new ConvexError("Only a pending entry can be merged into another.");
    for (const m of await ctx.db.query("memberships").withIndex("by_org_role", (q) => q.eq("organisationId", from._id)).take(2000)) {
      await ensureMembership(ctx, into._id, m.profileId, m.role, { ...(m.programme === undefined ? {} : { programme: m.programme }), ...(m.year === undefined ? {} : { year: m.year }) });
      await ctx.db.delete(m._id);
    }
    for (const f of await ctx.db.query("follows").withIndex("by_org", (q) => q.eq("organisationId", from._id)).take(2000)) {
      const already = (await ctx.db.query("follows").withIndex("by_profile", (q) => q.eq("profileId", f.profileId)).take(50)).some((x) => x.organisationId === into._id);
      if (already) await ctx.db.delete(f._id);
      else await ctx.db.patch(f._id, { organisationId: into._id });
    }
    for (const c of await ctx.db.query("orgCodes").withIndex("by_org", (q) => q.eq("organisationId", from._id)).take(500)) await ctx.db.patch(c._id, { organisationId: into._id });
    for (const c of await ctx.db.query("classes").withIndex("by_organisation", (q) => q.eq("organisationId", from._id)).take(2000)) await ctx.db.patch(c._id, { organisationId: into._id });
    await ctx.db.delete(from._id);
    return into._id as Id<"organisations">;
  },
});
