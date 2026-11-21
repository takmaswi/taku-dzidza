import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { membershipOf, type OrgRole } from "./access";

const MAX_FOLLOWS = 30;

/** A membership, made once; an existing one keeps the higher role. */
export async function ensureMembership(ctx: MutationCtx, organisationId: Id<"organisations">, profileId: Id<"profiles">, role: OrgRole, extra: { programme?: string; year?: string } = {}): Promise<void> {
  const rank: Record<OrgRole, number> = { guardian: 0, learner: 1, teacher: 2, admin: 3 };
  const existing = await membershipOf(ctx, organisationId, profileId);
  if (existing === null) {
    await ctx.db.insert("memberships", { organisationId, profileId, role, joinedAt: Date.now(), ...extra });
    // Joining replaces following.
    for (const f of await ctx.db.query("follows").withIndex("by_profile", (q) => q.eq("profileId", profileId)).take(MAX_FOLLOWS)) {
      if (f.organisationId === organisationId) await ctx.db.delete(f._id);
    }
  } else if (rank[role] > rank[existing.role]) await ctx.db.patch(existing._id, { role });
}

/** An approved place in a class that belongs to an organisation makes the learner a member of it. */
export async function joinedClassOrg(ctx: MutationCtx, cls: Doc<"classes">, profileId: Id<"profiles">): Promise<void> {
  if (cls.organisationId === undefined) return;
  if ((await ctx.db.get(cls.organisationId)) === null) return;
  await ensureMembership(ctx, cls.organisationId, profileId, "learner");
}
/** A guardian said yes to a class place: the learner joins the class's organisation, and the guardian (if signed in) is its guardian member. */
export async function enrolmentApproved(ctx: MutationCtx, enrolment: Doc<"enrolments">, guardianProfileId?: Id<"profiles">): Promise<void> {
  const cls = await ctx.db.get(enrolment.classId);
  if (cls === null) return;
  await joinedClassOrg(ctx, cls, enrolment.learnerProfileId);
  if (guardianProfileId !== undefined && cls.organisationId !== undefined && (await ctx.db.get(cls.organisationId)) !== null) {
    await ensureMembership(ctx, cls.organisationId, guardianProfileId, "guardian");
  }
}