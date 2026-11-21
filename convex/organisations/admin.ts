import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx } from "../_generated/server";
import { isAdult } from "../classes/access";
import { tallyClass, topicRows, type TopicTally } from "../classes/assignments";
import { firstName } from "../classes/codes";
import { releasePacks } from "../packs/packs";
import { requireOrgAdmin, type OrgRole } from "./access";

/**
 * The organisation admin page (Step 7), for its admins only and behind
 * TEACHER_MODE like the rest of organisations. Members by role, with first
 * names only for learners; removing a member and making a teacher an admin;
 * and results by topic across the organisation's classes, counts and
 * percentages only. Join codes are in ./codes.ts and course packs in
 * ../packs/packs.ts (forStaff), which already never names the learners who
 * added a pack.
 */

const ROLES: readonly OrgRole[] = ["admin", "teacher", "learner", "guardian"];
const MAX_PER_ROLE = 500;
const MAX_CLASSES = 200;

export type MemberRow = { membershipId: Id<"memberships">; name: string; you: boolean; adult: boolean };

/** What an admin sees of a member: a learner's first name only; staff and guardians by the name they gave. */
export function memberName(profile: Pick<Doc<"profiles">, "displayName">, role: OrgRole): string {
  return role === "learner" ? firstName(profile.displayName) : profile.displayName.trim();
}

export const members = query({
  args: { organisationId: v.id("organisations") },
  handler: async (ctx, args): Promise<Record<OrgRole, MemberRow[]>> => {
    const { org, profile: me } = await requireOrgAdmin(ctx, args.organisationId);
    const out: Record<OrgRole, MemberRow[]> = { admin: [], teacher: [], learner: [], guardian: [] };
    for (const role of ROLES) {
      for (const m of await ctx.db.query("memberships").withIndex("by_org_role", (q) => q.eq("organisationId", org._id).eq("role", role)).take(MAX_PER_ROLE)) {
        const p = await ctx.db.get(m.profileId);
        if (p === null || p.deletingAt !== undefined) continue;
        out[role].push({ membershipId: m._id, name: memberName(p, role), you: p._id === me._id, adult: isAdult(p) });
      }
      out[role].sort((a, b) => a.name.localeCompare(b.name));
    }
    return out;
  },
});

async function memberOfOrg(ctx: MutationCtx, membershipId: Id<"memberships">): Promise<{ membership: Doc<"memberships">; me: Doc<"profiles">; org: Doc<"organisations"> }> {
  const membership = await ctx.db.get(membershipId);
  if (membership === null) throw new ConvexError("Member not found.");
  const { profile: me, org } = await requireOrgAdmin(ctx, membership.organisationId);
  return { membership, me, org };
}

export const ADMIN_ERRORS = {
  self: "To leave, use Leave on the organisation's page.",
  lastAdmin: "An organisation needs at least one admin.",
  notTeacher: "Only a teacher can be made an admin.",
  minor: "Admins must be 18 or older.",
} as const;

/** Removes someone from the organisation. Their own work stays theirs, and course packs they made stay with the organisation. Class places are left to each class's teacher. */
export const removeMember = mutation({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, args) => {
    const { membership, me, org } = await memberOfOrg(ctx, args.membershipId);
    if (membership.profileId === me._id) throw new ConvexError(ADMIN_ERRORS.self);
    if (membership.role === "admin") {
      const admins = await ctx.db.query("memberships").withIndex("by_org_role", (q) => q.eq("organisationId", org._id).eq("role", "admin")).take(2);
      if (admins.length < 2) throw new ConvexError(ADMIN_ERRORS.lastAdmin);
    }
    await ctx.db.delete(membership._id);
    await releasePacks(ctx, org._id, membership.profileId);
    return null;
  },
});

export const makeAdmin = mutation({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, args) => {
    const { membership } = await memberOfOrg(ctx, args.membershipId);
    if (membership.role !== "teacher") throw new ConvexError(ADMIN_ERRORS.notTeacher);
    const profile = await ctx.db.get(membership.profileId);
    if (profile === null || !isAdult(profile)) throw new ConvexError(ADMIN_ERRORS.minor);
    await ctx.db.patch(membership._id, { role: "admin" });
    return null;
  },
});

export type OrgResults = {
  topics: { topic: string; answers: number; percent: number }[];
  classes: { classId: Id<"classes">; name: string; teacher: string; scripts: number; percent: number | null }[];
};

/** Results by topic across every class of the organisation, weakest first, and one line per class with its teacher's first name. No learner is named. */
export const results = query({
  args: { organisationId: v.id("organisations") },
  handler: async (ctx, args): Promise<OrgResults> => {
    const { org } = await requireOrgAdmin(ctx, args.organisationId);
    const byTopic: TopicTally = new Map();
    const classes: OrgResults["classes"] = [];
    for (const cls of await ctx.db.query("classes").withIndex("by_organisation", (q) => q.eq("organisationId", org._id)).take(MAX_CLASSES)) {
      const papers = await tallyClass(ctx, cls._id, byTopic);
      const teacher = await ctx.db.get(cls.teacherProfileId);
      const scripts = papers.reduce((n, p) => n + p.scripts, 0);
      const marked = papers.filter((p) => p.percent !== null && p.scripts > 0);
      const percent = marked.length === 0 ? null : Math.round(marked.reduce((n, p) => n + (p.percent ?? 0) * p.scripts, 0) / marked.reduce((n, p) => n + p.scripts, 0));
      classes.push({ classId: cls._id, name: cls.name, teacher: teacher === null ? "" : firstName(teacher.displayName), scripts, percent });
    }
    return { topics: topicRows(byTopic), classes: classes.sort((a, b) => a.name.localeCompare(b.name)) };
  },
});
