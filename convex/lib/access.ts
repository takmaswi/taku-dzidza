import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { adminEmails } from "./env";

/**
 * Access helpers. Every public function calls one of these, or is on the
 * fixed list in docs/ACCESS.md (tests/convex/access-scan.test.ts). Ported
 * from Amayi Learn (convex/lib/access.ts at ec3496e).
 *
 *   requireUser     a signed in Convex Auth user
 *   requireProfile  a signed in user who finished sign up
 *   requireLearner  a profile allowed to study: an adult, or a minor whose guardian consented
 *   requireAdmin    the owner (ADMIN_EMAILS)
 */

export async function requireUser(ctx: QueryCtx): Promise<Doc<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new ConvexError("Sign in first.");
  const user = await ctx.db.get(userId);
  if (user === null) throw new ConvexError("Sign in first.");
  return user;
}

export async function profileOf(ctx: QueryCtx, userId: Doc<"users">["_id"]): Promise<Doc<"profiles"> | null> {
  return await ctx.db.query("profiles").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
}

export async function requireProfile(ctx: QueryCtx): Promise<{ user: Doc<"users">; profile: Doc<"profiles"> }> {
  const user = await requireUser(ctx);
  const profile = await profileOf(ctx, user._id);
  if (profile === null) throw new ConvexError("Finish setting up your account first.");
  return { user, profile };
}

export function canStudy(profile: Pick<Doc<"profiles">, "consentState">): boolean {
  return profile.consentState === "not_needed" || profile.consentState === "given";
}

export async function requireLearner(ctx: QueryCtx): Promise<{ user: Doc<"users">; profile: Doc<"profiles"> }> {
  const found = await requireProfile(ctx);
  if (!canStudy(found.profile)) throw new ConvexError("NEEDS_GUARDIAN_CONSENT");
  return found;
}

export async function requireAdmin(ctx: QueryCtx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  const email = (user.email ?? "").toLowerCase();
  if (email === "" || !adminEmails().includes(email)) throw new ConvexError("Only the owner can see this.");
  return user;
}
