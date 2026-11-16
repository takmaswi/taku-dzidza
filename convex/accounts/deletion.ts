import { ConvexError, v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { requireUser } from "../lib/access";
import { beginAccountDeletion } from "../privacy/purge";

/**
 * Deleting an account (Cyber and Data Protection Act; SPEC.md 3.8). The sign
 * in rows go and the profile is hidden in the calling mutation; then the
 * profile, its consent links and records, every notebook with its sources,
 * files, pages and chat, and the user row are deleted in scheduled batches
 * (convex/privacy/purge.ts), because a heavy account holds more rows than
 * one mutation may touch. Ported from Amayi Learn (convex/accounts/deletion.ts
 * at ec3496e) and reworked for batches.
 */

export const deleteUserAccount = beginAccountDeletion;

export function confirmsDeletion(typed: string, email: string): boolean {
  const want = email.trim().toLowerCase();
  return want !== "" && typed.trim().toLowerCase() === want;
}

export const deleteMyAccount = mutation({
  args: { confirmEmail: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!confirmsDeletion(args.confirmEmail, user.email ?? "")) throw new ConvexError("Type your account's email address to confirm.");
    await beginAccountDeletion(ctx, user, "self");
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
    await beginAccountDeletion(ctx, user, "owner");
    return { deleted: true };
  },
});
