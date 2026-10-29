import { internalMutation } from "../_generated/server";
import { deleteUserAccount } from "../accounts/deletion";

/**
 * Retention limits, run daily (crons.ts). Each pass handles at most BATCH
 * rows per rule; the next day carries on.
 *   - unused guardian consent links, once expired;
 *   - accounts of under 18s whose guardian never consented, after
 *     NO_CONSENT_DAYS (data minimisation: nothing is kept without consent).
 */

const BATCH = 200;
const DAY_MS = 24 * 60 * 60 * 1000;
export const NO_CONSENT_DAYS = 30;

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
    let accounts = 0;
    const cutoff = now - NO_CONSENT_DAYS * DAY_MS;
    for (const profile of await ctx.db.query("profiles").withIndex("by_consent_state", (q) => q.eq("consentState", "pending").lt("createdAt", cutoff)).take(BATCH)) {
      const user = await ctx.db.get(profile.userId);
      if (user === null) await ctx.db.delete(profile._id);
      else await deleteUserAccount(ctx, user, "no_consent");
      accounts++;
    }
    return { links, accounts };
  },
});
