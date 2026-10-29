import { ConvexError, v } from "convex/values";
import type { Doc, TableNames } from "../_generated/dataModel";
import { internalMutation, mutation, type MutationCtx } from "../_generated/server";
import { profileOf, requireUser } from "../lib/access";

/**
 * Deleting an account (Cyber and Data Protection Act; SPEC.md 3.8). In one
 * transaction: the profile, its consent links and consent records, and the
 * sign in rows (user, accounts, sessions, refresh tokens, codes, rate
 * limits). Ported from Amayi Learn (convex/accounts/deletion.ts at ec3496e).
 * Notebooks and sources join this list in Phase 2.
 */

const BATCH = 200;

async function drain<T extends { _id: import("convex/values").GenericId<TableNames> }>(ctx: MutationCtx, next: () => Promise<T[]>, each?: (row: T) => Promise<void>): Promise<void> {
  for (;;) {
    const rows = await next();
    if (rows.length === 0) return;
    for (const row of rows) {
      if (each !== undefined) await each(row);
      await ctx.db.delete(row._id);
    }
  }
}

export async function deleteProfileData(ctx: MutationCtx, profile: Doc<"profiles">): Promise<void> {
  await drain(ctx, () => ctx.db.query("consents").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(BATCH));
  await drain(ctx, () => ctx.db.query("consentRequests").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(BATCH));
  await ctx.db.delete(profile._id);
}

async function deleteSignIn(ctx: MutationCtx, user: Doc<"users">): Promise<void> {
  await drain(
    ctx,
    () => ctx.db.query("authSessions").withIndex("userId", (q) => q.eq("userId", user._id)).take(BATCH),
    async (session) => {
      await drain(ctx, () => ctx.db.query("authRefreshTokens").withIndex("sessionId", (q) => q.eq("sessionId", session._id)).take(BATCH));
    },
  );
  await drain(
    ctx,
    () => ctx.db.query("authAccounts").withIndex("userIdAndProvider", (q) => q.eq("userId", user._id)).take(BATCH),
    async (account) => {
      await drain(ctx, () => ctx.db.query("authVerificationCodes").withIndex("accountId", (q) => q.eq("accountId", account._id)).take(BATCH));
    },
  );
  const email = (user.email ?? "").toLowerCase();
  if (email !== "") await drain(ctx, () => ctx.db.query("authRateLimits").withIndex("identifier", (q) => q.eq("identifier", email)).take(BATCH));
  await ctx.db.delete(user._id);
}

export async function deleteUserAccount(ctx: MutationCtx, user: Doc<"users">, reason: Doc<"accountDeletions">["reason"]): Promise<void> {
  const profile = await profileOf(ctx, user._id);
  if (profile !== null) await deleteProfileData(ctx, profile);
  await deleteSignIn(ctx, user);
  await ctx.db.insert("accountDeletions", { deletedAt: Date.now(), reason });
}

export function confirmsDeletion(typed: string, email: string): boolean {
  const want = email.trim().toLowerCase();
  return want !== "" && typed.trim().toLowerCase() === want;
}

export const deleteMyAccount = mutation({
  args: { confirmEmail: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!confirmsDeletion(args.confirmEmail, user.email ?? "")) throw new ConvexError("Type your account's email address to confirm.");
    await deleteUserAccount(ctx, user, "self");
    return { deleted: true };
  },
});

/** The owner deletes an account on request, by email, with `npx convex run`. */
export const deleteByEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", email)).unique();
    if (user === null) return { deleted: false };
    await deleteUserAccount(ctx, user, "owner");
    return { deleted: true };
  },
});
