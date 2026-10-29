import { ConvexError, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation, query, type QueryCtx } from "../_generated/server";
import { requireProfile } from "../lib/access";
import { randomToken, tokenHash } from "../lib/tokens";
import { CONSENT_POINTS, CONSENT_TEXT_VERSION } from "./consentText";

/**
 * Guardian consent for learners under 18 (SPEC.md 3.8). The learner makes a
 * link and sends it to a guardian (WhatsApp, SMS or email). The guardian opens
 * it on their own phone, confirms they are the parent or guardian and 18 or
 * older, and agrees. The same link lets the guardian withdraw later.
 * Only the link's SHA 256 hash is stored.
 */

export const REQUEST_DAYS = 14;
/** After consent the link stays usable for withdrawing. */
export const WITHDRAW_LINK_DAYS = 400;
const DAY_MS = 24 * 60 * 60 * 1000;

export const createRequest = mutation({
  args: {},
  handler: async (ctx): Promise<{ token: string }> => {
    const { profile } = await requireProfile(ctx);
    if (profile.consentState !== "pending" && profile.consentState !== "withdrawn") throw new ConvexError("No guardian consent is needed.");
    for (const old of await ctx.db.query("consentRequests").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).collect()) {
      const used = await ctx.db.query("consents").withIndex("by_request", (q) => q.eq("requestId", old._id)).first();
      if (used === null) await ctx.db.delete(old._id);
    }
    const token = randomToken();
    const now = Date.now();
    await ctx.db.insert("consentRequests", { profileId: profile._id, tokenHash: await tokenHash(token), createdAt: now, expiresAt: now + REQUEST_DAYS * DAY_MS });
    return { token };
  },
});

async function requestFor(ctx: QueryCtx, token: string): Promise<{ request: Doc<"consentRequests">; profile: Doc<"profiles"> } | null> {
  if (token.length < 20 || token.length > 100) return null;
  const hash = await tokenHash(token);
  const row = await ctx.db.query("consentRequests").withIndex("by_token", (q) => q.eq("tokenHash", hash)).unique();
  if (row === null || row.expiresAt < Date.now()) return null;
  const profile = await ctx.db.get(row.profileId);
  if (profile === null) return null;
  return { request: row, profile };
}

/** Public: what the guardian's page shows. Only the learner's display name, never their email. */
export const requestInfo = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const found = await requestFor(ctx, args.token);
    if (found === null) return null;
    return {
      learnerName: found.profile.displayName,
      state: found.profile.consentState,
      version: CONSENT_TEXT_VERSION,
      points: CONSENT_POINTS,
    };
  },
});

export const give = mutation({
  args: {
    token: v.string(),
    guardianName: v.string(),
    relationship: v.string(),
    guardianContact: v.string(),
    confirmsGuardian: v.boolean(),
    agrees: v.boolean(),
  },
  handler: async (ctx, args) => {
    const found = await requestFor(ctx, args.token);
    if (found === null) throw new ConvexError("This link has expired. Ask the learner for a new one.");
    if (found.profile.consentState === "given") return { state: "given" as const };
    if (!args.confirmsGuardian || !args.agrees) throw new ConvexError("Tick both boxes to give consent.");
    const guardianName = args.guardianName.trim().slice(0, 80);
    const relationship = args.relationship.trim().slice(0, 40);
    const guardianContact = args.guardianContact.trim().slice(0, 120);
    if (guardianName.length < 2) throw new ConvexError("Enter your full name.");
    if (relationship.length < 2) throw new ConvexError("Say how you are related to the learner.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianContact) && !/^\+?[\d\s]{9,16}$/.test(guardianContact)) {
      throw new ConvexError("Enter an email address or phone number we can reach you on.");
    }
    const now = Date.now();
    await ctx.db.insert("consents", {
      profileId: found.profile._id,
      requestId: found.request._id,
      guardianName,
      relationship,
      guardianContact,
      consentTextVersion: CONSENT_TEXT_VERSION,
      givenAt: now,
    });
    await ctx.db.patch(found.request._id, { expiresAt: now + WITHDRAW_LINK_DAYS * DAY_MS });
    await ctx.db.patch(found.profile._id, { consentState: "given" });
    return { state: "given" as const };
  },
});

export const withdraw = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const found = await requestFor(ctx, args.token);
    if (found === null) throw new ConvexError("This link has expired.");
    const consent = await ctx.db.query("consents").withIndex("by_request", (q) => q.eq("requestId", found.request._id)).first();
    if (consent === null || consent.withdrawnAt !== undefined) throw new ConvexError("There is no consent to withdraw on this link.");
    await ctx.db.patch(consent._id, { withdrawnAt: Date.now() });
    await ctx.db.patch(found.profile._id, { consentState: "withdrawn" });
    return { state: "withdrawn" as const };
  },
});
