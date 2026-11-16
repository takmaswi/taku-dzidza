import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { mailMode } from "../accounts/mail";
import { readCursor, writeCursor } from "../notebooks/uploads";
import { beginAccountDeletion, startPurge } from "./purge";

/**
 * Retention limits, run daily (crons.ts).
 *   - unused guardian consent links, once expired;
 *   - guardian phone codes, after CODE_KEEP_MS (they count sends per day);
 *   - accounts of under 18s whose guardian never consented, after
 *     NO_CONSENT_DAYS (data minimisation: nothing is kept without consent);
 *   - accounts of under 18s whose guardian withdrew consent, WITHDRAWN_DAYS
 *     after the withdrawal (audit S4). The days give the family time to
 *     change their mind; the guardian can also ask for deletion at once from
 *     the same link (convex/accounts/consent.ts);
 *   - accounts that signed up, never confirmed their email and were left
 *     with nothing in them, after UNVERIFIED_DAYS. Only while email codes
 *     can be sent: when they cannot, nobody is able to confirm.
 *
 * Accounts go one per step (audit S1): `sweep` clears the small rows, then
 * `sweepAccounts` starts the deletion of one account and schedules itself
 * for the next, so one heavy account can never block the rest. The deletion
 * itself runs in batches (convex/privacy/purge.ts).
 */

const BATCH = 200;
const DAY_MS = 24 * 60 * 60 * 1000;
export const NO_CONSENT_DAYS = 30;
export const WITHDRAWN_DAYS = 30;
export const UNVERIFIED_DAYS = 14;
export const CODE_KEEP_MS = DAY_MS;
/** Accounts one daily run may start deleting. The next day carries on. */
const MAX_ACCOUNTS_PER_RUN = 500;
/** Users looked at per step while searching for an abandoned one. */
const UNVERIFIED_SCAN = 100;

export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let links = 0;
    for (const row of await ctx.db.query("consentRequests").withIndex("by_expiry", (q) => q.lt("expiresAt", now)).take(BATCH)) {
      const used = await ctx.db.query("consents").withIndex("by_request", (q) => q.eq("requestId", row._id)).first();
      if (used !== null && used.withdrawnAt === undefined) continue;
      await ctx.db.delete(row._id);
      links++;
    }
    let codes = 0;
    for (const row of await ctx.db.query("consentCodes").withIndex("by_created", (q) => q.lt("createdAt", now - CODE_KEEP_MS)).take(BATCH)) {
      await ctx.db.delete(row._id);
      codes++;
    }
    await ctx.scheduler.runAfter(0, internal.privacy.purge.resume, {});
    await ctx.scheduler.runAfter(0, internal.privacy.retention.sweepAccounts, { left: MAX_ACCOUNTS_PER_RUN });
    return { links, codes };
  },
});

async function withdrawnAt(ctx: MutationCtx, profile: Doc<"profiles">): Promise<number> {
  if (profile.consentWithdrawnAt !== undefined) return profile.consentWithdrawnAt;
  // Withdrawn before the field existed: read it from the consent record.
  const consent = await ctx.db.query("consents").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).order("desc").first();
  return consent?.withdrawnAt ?? profile.createdAt;
}

/** True when the account holds nothing a person would miss. */
async function isEmpty(ctx: MutationCtx, profile: Doc<"profiles"> | null): Promise<boolean> {
  if (profile === null) return true;
  if ((await ctx.db.query("notebooks").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).first()) !== null) return false;
  return (await ctx.db.query("chats").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).first()) === null;
}

type Found = { user: Doc<"users"> | null; profile: Doc<"profiles"> | null; reason: "no_consent" | "withdrawn" | "unverified" };

/** The next account a rule says must go; "more" when this step found none but has not looked at everyone; null when today's work is done. */
async function nextAccount(ctx: MutationCtx, now: number): Promise<Found | "more" | null> {
  const pending = await ctx.db.query("profiles").withIndex("by_consent_state", (q) => q.eq("consentState", "pending").lt("createdAt", now - NO_CONSENT_DAYS * DAY_MS)).take(20);
  const noConsent = pending.find((p) => p.deletingAt === undefined);
  if (noConsent !== undefined) return { user: await ctx.db.get(noConsent.userId), profile: noConsent, reason: "no_consent" };

  for (const profile of await ctx.db.query("profiles").withIndex("by_consent_state", (q) => q.eq("consentState", "withdrawn")).take(BATCH)) {
    if (profile.deletingAt !== undefined) continue;
    if ((await withdrawnAt(ctx, profile)) < now - WITHDRAWN_DAYS * DAY_MS) return { user: await ctx.db.get(profile.userId), profile, reason: "withdrawn" };
  }

  if (mailMode() === "off") return null;
  const cutoff = now - UNVERIFIED_DAYS * DAY_MS;
  const at = await readCursor(ctx, "unverified_users");
  const users = await ctx.db.query("users").withIndex("by_creation_time", (q) => q.gt("_creationTime", at.value).lt("_creationTime", cutoff)).take(UNVERIFIED_SCAN);
  let found: Found | null = null;
  let last = at.value;
  for (const user of users) {
    last = user._creationTime;
    // No email means the account is already being deleted.
    if (user.emailVerificationTime !== undefined || user.email === undefined) continue;
    const profile = await ctx.db.query("profiles").withIndex("by_user", (q) => q.eq("userId", user._id)).unique();
    if (profile?.deletingAt !== undefined) continue;
    if (await isEmpty(ctx, profile)) {
      found = { user, profile, reason: "unverified" };
      break;
    }
  }
  // At the end of the list the walk starts again from the oldest tomorrow, so an account that empties later is still found.
  const finished = found === null && users.length < UNVERIFIED_SCAN;
  await writeCursor(ctx, "unverified_users", at.id, finished ? 0 : last);
  if (found !== null) return found;
  return finished ? null : "more";
}

/** One account per step. */
export const sweepAccounts = internalMutation({
  args: { left: v.number() },
  handler: async (ctx, args): Promise<{ deleted: Found["reason"] | null }> => {
    if (args.left <= 0) return { deleted: null };
    const found = await nextAccount(ctx, Date.now());
    if (found === null) return { deleted: null };
    await ctx.scheduler.runAfter(0, internal.privacy.retention.sweepAccounts, { left: args.left - 1 });
    if (found === "more") return { deleted: null };
    if (found.user !== null) await beginAccountDeletion(ctx, found.user, found.reason);
    else if (found.profile !== null) {
      // A profile whose user row is already gone still has data to empty.
      await ctx.db.patch(found.profile._id, { deletingAt: Date.now(), deletionReason: found.reason });
      await startPurge(ctx, { kind: "profile", id: found.profile._id });
    }
    return { deleted: found.reason };
  },
});
