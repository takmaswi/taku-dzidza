import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx } from "../_generated/server";
import { isAdult } from "../classes/access";
import { normaliseCode, validCode } from "../classes/codes";
import { requestJoinClass, type JoinResult } from "../classes/joining";
import { uniqueCode, withRole } from "../classes/roles";
import { orgTypeValidator } from "../schema";
import { membershipOf, requireOrgMember, requireOrgsProfile, type OrgRole } from "./access";
import { ensureMembership } from "./members";
import { releasePacks } from "../packs/packs";

/**
 * Organisations: secondary schools, universities, colleges, training
 * providers, companies. Exam boards are not organisations; they stay part of
 * what a learner studies for and a syllabus id.
 *
 * The list starts empty. Anyone signed in can add a missing one, which is
 * pending until an owner (ADMIN_EMAILS) lists it or merges it into another
 * (convex/organisations/owner.ts). Pending entries are never shown in search.
 *
 * Joining needs a code from a teacher or admin: the organisation's learner
 * code, a staff code, or a class code. Picking an organisation without a code
 * only follows it: its public page and published course packs, nothing else.
 * Under 18s join through a class, which their guardian approves.
 */

export type OrgType = Doc<"organisations">["type"];
export const MAX_RESULTS = 8;
const MAX_PENDING_PER_PROFILE = 5;
const MAX_MEMBERSHIPS = 20;
const MAX_FOLLOWS = 30;

function clean(text: string, min: number, max: number, message: string): string {
  const out = text.trim().replace(/\s+/g, " ");
  if (out.length < min || out.length > max) throw new ConvexError(message);
  return out;
}

/** Shown to anyone signed in: listed or verified. */
export function isPublic(org: Doc<"organisations">): boolean {
  return org.status !== "pending";
}

/** Search after 2 letters, only the types asked for, at most 8 results, pending entries never shown. */
export const search = query({
  args: { text: v.string(), types: v.optional(v.array(orgTypeValidator)) },
  handler: async (ctx, args) => {
    await requireOrgsProfile(ctx);
    const text = args.text.trim();
    if (text.length < 2) return [];
    const seen = new Map<string, Doc<"organisations">>();
    const types: (OrgType | undefined)[] = args.types === undefined || args.types.length === 0 ? [undefined] : args.types.slice(0, 6);
    for (const type of types) {
      const rows = await ctx.db
        .query("organisations")
        .withSearchIndex("search_name", (q) => (type === undefined ? q.search("name", text) : q.search("name", text).eq("type", type)))
        .take(30);
      for (const o of rows) if (isPublic(o)) seen.set(o._id, o);
    }
    return [...seen.values()].slice(0, MAX_RESULTS).map((o) => ({ _id: o._id, name: o.name, type: o.type, town: o.town, country: o.country, verified: o.status === "verified" }));
  },
});

const orgFields = { name: v.string(), type: orgTypeValidator, town: v.string(), country: v.string() };

async function insertOrg(ctx: MutationCtx, profile: Doc<"profiles">, args: { name: string; type: OrgType; town: string; country: string }): Promise<Id<"organisations">> {
  const name = clean(args.name, 3, 100, "Enter the full name.");
  const town = clean(args.town, 2, 60, "Enter the town or city.");
  const country = clean(args.country, 2, 60, "Enter the country.");
  const mine = await ctx.db.query("organisations").withIndex("by_created_by", (q) => q.eq("createdBy", profile._id)).take(MAX_PENDING_PER_PROFILE + 1);
  if (mine.filter((o) => o.status === "pending").length >= MAX_PENDING_PER_PROFILE) throw new ConvexError("You have added several already. Wait until they are checked.");
  return await ctx.db.insert("organisations", { name, type: args.type, town, country, status: "pending", createdBy: profile._id, joinCode: await uniqueCode(ctx), createdAt: Date.now() });
}

/** "Not listed? Add it": a pending entry the person follows. An owner lists it or merges it with an existing one. */
export const addPending = mutation({
  args: orgFields,
  handler: async (ctx, args): Promise<Id<"organisations">> => {
    const { profile } = await requireOrgsProfile(ctx);
    const organisationId = await insertOrg(ctx, profile, args);
    await ctx.db.insert("follows", { organisationId, profileId: profile._id, createdAt: Date.now() });
    return organisationId;
  },
});

/** "Set up my school or institution", for adults only: a pending organisation with the person as its admin. */
export const setUp = mutation({
  args: orgFields,
  handler: async (ctx, args): Promise<Id<"organisations">> => {
    const { profile } = await requireOrgsProfile(ctx);
    if (!isAdult(profile)) throw new ConvexError("Only an adult can set up a school or institution.");
    const organisationId = await insertOrg(ctx, profile, args);
    await ensureMembership(ctx, organisationId, profile._id, "admin");
    return organisationId;
  },
});

export const follow = mutation({
  args: { organisationId: v.id("organisations") },
  handler: async (ctx, args) => {
    const { profile } = await requireOrgsProfile(ctx);
    const org = await ctx.db.get(args.organisationId);
    if (org === null || (!isPublic(org) && org.createdBy !== profile._id)) throw new ConvexError("Organisation not found.");
    if ((await membershipOf(ctx, org._id, profile._id)) !== null) return null;
    const mine = await ctx.db.query("follows").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(MAX_FOLLOWS + 1);
    if (mine.some((f) => f.organisationId === org._id)) return null;
    if (mine.length >= MAX_FOLLOWS) throw new ConvexError(`You can follow up to ${MAX_FOLLOWS}.`);
    await ctx.db.insert("follows", { organisationId: org._id, profileId: profile._id, createdAt: Date.now() });
    return null;
  },
});

export const unfollow = mutation({
  args: { organisationId: v.id("organisations") },
  handler: async (ctx, args) => {
    const { profile } = await requireOrgsProfile(ctx);
    for (const f of await ctx.db.query("follows").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(MAX_FOLLOWS)) {
      if (f.organisationId === args.organisationId) await ctx.db.delete(f._id);
    }
    return null;
  },
});

export const JOIN_ORG_ERRORS = {
  code: "A code has 6 letters and numbers.",
  unknown: "That code did not work. Check it with your teacher or admin.",
  minor: "Under 18? Ask your teacher for your class code. Your guardian then says yes to it.",
  staff: "Staff codes are for adults.",
  many: `You can belong to up to ${MAX_MEMBERSHIPS} organisations.`,
} as const;

export type JoinWithCodeResult = { ok: true; kind: "organisation"; name: string; role: OrgRole } | ({ kind: "class" } & JoinResult) | { ok: false; kind: "none"; message: string };

/** One box for every code: a class code (the class's rules apply), an organisation's learner code, or a staff code. */
export const joinWithCode = mutation({
  args: { code: v.string(), programme: v.optional(v.string()), year: v.optional(v.string()) },
  handler: async (ctx, args): Promise<JoinWithCodeResult> => {
    const { profile } = await requireOrgsProfile(ctx);
    const code = normaliseCode(args.code);
    if (!validCode(code)) return { ok: false, kind: "none", message: JOIN_ORG_ERRORS.code };
    const cls = await ctx.db.query("classes").withIndex("by_code", (q) => q.eq("code", code)).unique();
    if (cls !== null) return { kind: "class", ...(await requestJoinClass(ctx, profile, cls)) };
    const extra = {
      ...(args.programme === undefined || args.programme.trim() === "" ? {} : { programme: clean(args.programme, 1, 80, "Programme is too long.") }),
      ...(args.year === undefined || args.year.trim() === "" ? {} : { year: clean(args.year, 1, 20, "Year is too long.") }),
    };
    const mine = await ctx.db.query("memberships").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(MAX_MEMBERSHIPS + 1);
    const org = await ctx.db.query("organisations").withIndex("by_join_code", (q) => q.eq("joinCode", code)).unique();
    if (org !== null) {
      if (!isAdult(profile)) return { ok: false, kind: "none", message: JOIN_ORG_ERRORS.minor };
      if (mine.length >= MAX_MEMBERSHIPS && !mine.some((m) => m.organisationId === org._id)) return { ok: false, kind: "none", message: JOIN_ORG_ERRORS.many };
      await ensureMembership(ctx, org._id, profile._id, "learner", extra);
      return { ok: true, kind: "organisation", name: org.name, role: "learner" };
    }
    const staff = await ctx.db.query("orgCodes").withIndex("by_code", (q) => q.eq("code", code)).unique();
    const staffOrg = staff === null || staff.revokedAt !== undefined ? null : await ctx.db.get(staff.organisationId);
    if (staff === null || staffOrg === null) return { ok: false, kind: "none", message: JOIN_ORG_ERRORS.unknown };
    if (!isAdult(profile)) return { ok: false, kind: "none", message: JOIN_ORG_ERRORS.staff };
    if (mine.length >= MAX_MEMBERSHIPS && !mine.some((m) => m.organisationId === staffOrg._id)) return { ok: false, kind: "none", message: JOIN_ORG_ERRORS.many };
    await ensureMembership(ctx, staffOrg._id, profile._id, staff.role, extra);
    // A teacher's own classes from before belong to the organisation now.
    if (!(profile.roles ?? []).includes("teacher")) await ctx.db.patch(profile._id, { roles: withRole(profile, "teacher", true) });
    for (const c of await ctx.db.query("classes").withIndex("by_teacher", (q) => q.eq("teacherProfileId", profile._id)).take(400)) {
      if (c.organisationId === undefined) await ctx.db.patch(c._id, { organisationId: staffOrg._id });
    }
    return { ok: true, kind: "organisation", name: staffOrg.name, role: staff.role };
  },
});

export const leave = mutation({
  args: { organisationId: v.id("organisations") },
  handler: async (ctx, args) => {
    const { membership } = await requireOrgMember(ctx, args.organisationId);
    if (membership.role === "admin") {
      const admins = await ctx.db.query("memberships").withIndex("by_org_role", (q) => q.eq("organisationId", args.organisationId).eq("role", "admin")).take(2);
      if (admins.length < 2) throw new ConvexError("You are the only admin. Make someone else an admin first.");
    }
    await ctx.db.delete(membership._id);
    // The organisation keeps the course packs they made.
    await releasePacks(ctx, args.organisationId, membership.profileId);
    return null;
  },
});

function orgSummary(org: Doc<"organisations">) {
  return { _id: org._id, name: org.name, type: org.type, town: org.town, country: org.country, status: org.status };
}

/** Where this account belongs and what it follows. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const { profile } = await requireOrgsProfile(ctx);
    const members = [];
    for (const m of await ctx.db.query("memberships").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(MAX_MEMBERSHIPS)) {
      const org = await ctx.db.get(m.organisationId);
      if (org !== null) members.push({ ...orgSummary(org), role: m.role, programme: m.programme ?? null, year: m.year ?? null });
    }
    const follows = [];
    for (const f of await ctx.db.query("follows").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(MAX_FOLLOWS)) {
      const org = await ctx.db.get(f.organisationId);
      if (org !== null) follows.push(orgSummary(org));
    }
    return { members, follows };
  },
});

/** An organisation's public page: who it is and its published course packs. Nothing about its people. */
export const publicPage = query({
  args: { organisationId: v.id("organisations") },
  handler: async (ctx, args) => {
    const { profile } = await requireOrgsProfile(ctx);
    const org = await ctx.db.get(args.organisationId);
    if (org === null) return null;
    const membership = await membershipOf(ctx, org._id, profile._id);
    if (!isPublic(org) && org.createdBy !== profile._id && membership === null) return null;
    const following = (await ctx.db.query("follows").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(MAX_FOLLOWS)).some((f) => f.organisationId === org._id);
    return { ...orgSummary(org), role: membership?.role ?? null, following };
  },
});
