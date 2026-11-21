import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { adminEmails, envString } from "./env";

/**
 * Feature settings (Convex env). TEACHER_MODE and MARKETPLACE_MODE each take
 * "off", "admins" or "on"; anything else, or unset, is off. "admins" shows the
 * feature only to accounts on ADMIN_EMAILS with a verified email, the same
 * test as the owner's pages (convex/lib/access.ts, requireAdmin).
 */

export type Feature = "TEACHER_MODE" | "MARKETPLACE_MODE";
export type FeatureSetting = "off" | "admins" | "on";

export function featureSetting(name: Feature): FeatureSetting {
  const raw = envString(name);
  return raw === "on" || raw === "admins" ? raw : "off";
}

/** True for a verified email on ADMIN_EMAILS. Without verification anyone could register the owner's address. */
export function isAdminUser(user: Doc<"users"> | null): boolean {
  if (user === null) return false;
  const email = (user.email ?? "").toLowerCase();
  return email !== "" && user.emailVerificationTime !== undefined && adminEmails().includes(email);
}

/** Whether the feature is on for whoever is signed in (nobody signed in counts as not an admin). */
export async function featureOn(ctx: QueryCtx, name: Feature): Promise<boolean> {
  const setting = featureSetting(name);
  if (setting !== "admins") return setting === "on";
  const userId = await getAuthUserId(ctx);
  return isAdminUser(userId === null ? null : await ctx.db.get(userId));
}

/**
 * For pages opened with a link and no account, such as a guardian's consent
 * link: the feature counts as on unless it is off. Under "admins" anything
 * such a page can act on (a class request) was made by an admin account.
 */
export function featureNotOff(name: Feature): boolean {
  return featureSetting(name) !== "off";
}
