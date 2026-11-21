import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { isAdult, TEACHER_OFF } from "../classes/access";
import { requireLearner } from "../lib/access";
import { teacherModeOn } from "../lib/env";

/**
 * Access helpers for organisations (schools, universities, colleges, training
 * providers, companies). Everything here is behind TEACHER_MODE, like classes.
 *
 *   requireOrgsProfile   the mode on, and requireLearner (an adult, or an under 18 with consent)
 *   requireOrgMember     a member of the organisation, in one of the given roles
 *   requireOrgAdmin      an admin of the organisation
 */

export type OrgRole = Doc<"memberships">["role"];

export async function requireOrgsProfile(ctx: QueryCtx): Promise<{ user: Doc<"users">; profile: Doc<"profiles"> }> {
  if (!teacherModeOn()) throw new ConvexError(TEACHER_OFF);
  return await requireLearner(ctx);
}

export async function membershipOf(ctx: QueryCtx, organisationId: Id<"organisations">, profileId: Id<"profiles">): Promise<Doc<"memberships"> | null> {
  const rows = await ctx.db.query("memberships").withIndex("by_profile", (q) => q.eq("profileId", profileId)).take(100);
  return rows.find((m) => m.organisationId === organisationId) ?? null;
}

export async function requireOrgMember(
  ctx: QueryCtx,
  organisationId: Id<"organisations">,
  roles: readonly OrgRole[] = ["learner", "teacher", "admin", "guardian"],
): Promise<{ profile: Doc<"profiles">; org: Doc<"organisations">; membership: Doc<"memberships"> }> {
  const { profile } = await requireOrgsProfile(ctx);
  const org = await ctx.db.get(organisationId);
  const membership = org === null ? null : await membershipOf(ctx, organisationId, profile._id);
  if (org === null || membership === null || !roles.includes(membership.role)) throw new ConvexError("Organisation not found.");
  // Staff roles are for adults; a profile that is not one cannot act as staff whatever the row says.
  if (membership.role !== "learner" && !isAdult(profile)) throw new ConvexError("Organisation not found.");
  return { profile, org, membership };
}

export async function requireOrgAdmin(ctx: QueryCtx, organisationId: Id<"organisations">): Promise<{ profile: Doc<"profiles">; org: Doc<"organisations">; membership: Doc<"memberships"> }> {
  return await requireOrgMember(ctx, organisationId, ["admin"]);
}
