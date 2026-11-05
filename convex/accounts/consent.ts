import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action, internalMutation, mutation, query, type QueryCtx } from "../_generated/server";
import { requireProfile } from "../lib/access";
import { randomDigits, randomToken, tokenHash } from "../lib/tokens";
import { aiMode } from "../lib/env";
import { CONSENT_POINTS, CONSENT_TEXT_VERSION } from "./consentText";
import { normalisePhone, smsReady, smsSender } from "./sms";

/**
 * Guardian consent for learners under 18 (SPEC.md 3.8). The learner makes a
 * link and sends it to a guardian (WhatsApp, SMS or email). The guardian opens
 * it on their own phone, confirms they are the parent or guardian and 18 or
 * older, types a 6 digit code sent to their phone, and agrees. Consent
 * completes only with the code. The same link lets the guardian withdraw later.
 * Only the hashes of the link and the code are stored.
 */

export const REQUEST_DAYS = 14;
/** After consent the link stays usable for withdrawing. */
export const WITHDRAW_LINK_DAYS = 400;
export const CODE_DIGITS = 6;
export const CODE_MINUTES = 10;
export const CODE_MAX_ATTEMPTS = 5;
/** Each message costs money and reaches someone's phone, so sending is limited. */
export const CODE_MAX_SENDS_PER_DAY = 5;
export const CODE_RESEND_SECONDS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

const ERRORS = {
  expired: "This link has expired. Ask the learner for a new one.",
  wrongCode: "That code is not right. Check the message and try again.",
  deadCode: "That code has expired. Ask for a new one.",
  noCode: "Ask for a code first.",
  tooMany: "Too many codes have been sent today. Try again tomorrow.",
  tooSoon: "A code was just sent. Wait a minute before asking for another.",
  phone: "Enter a phone number we can send a code to, like 077 123 4567 or +263 77 123 4567.",
} as const;

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
      smsReady: smsReady(),
    };
  },
});

function codeHash(requestId: Id<"consentRequests">, phone: string, code: string): Promise<string> {
  // Bound to this link and this phone, so a code cannot be reused for anything else.
  return tokenHash(`${requestId}:${phone}:${code}`);
}

/** Makes one code row after the sending limits pass, and returns the code to send. */
export const prepareCode = internalMutation({
  args: { token: v.string(), phone: v.string() },
  handler: async (ctx, args): Promise<{ code: string }> => {
    const found = await requestFor(ctx, args.token);
    if (found === null) throw new ConvexError(ERRORS.expired);
    if (found.profile.consentState === "given") throw new ConvexError("Permission is already given.");
    const now = Date.now();
    const since = now - DAY_MS;
    const byProfile = await ctx.db.query("consentCodes").withIndex("by_profile", (q) => q.eq("profileId", found.profile._id).gt("createdAt", since)).collect();
    const byPhone = await ctx.db.query("consentCodes").withIndex("by_phone", (q) => q.eq("phone", args.phone).gt("createdAt", since)).collect();
    if (byProfile.length >= CODE_MAX_SENDS_PER_DAY || byPhone.length >= CODE_MAX_SENDS_PER_DAY) throw new ConvexError(ERRORS.tooMany);
    if (byProfile.some((row) => row.createdAt > now - CODE_RESEND_SECONDS * 1000)) throw new ConvexError(ERRORS.tooSoon);
    const code = randomDigits(CODE_DIGITS);
    await ctx.db.insert("consentCodes", { requestId: found.request._id, profileId: found.profile._id, phone: args.phone, codeHash: await codeHash(found.request._id, args.phone, code), attempts: 0, createdAt: now, expiresAt: now + CODE_MINUTES * 60 * 1000 });
    return { code };
  },
});

/** Public, with the link's token: sends a code to the phone the guardian typed. */
export const sendCode = action({
  args: { token: v.string(), phone: v.string() },
  handler: async (ctx, args): Promise<{ sent: boolean }> => {
    const phone = normalisePhone(args.phone);
    if (phone === null) throw new ConvexError(ERRORS.phone);
    if (!smsReady()) return { sent: false };
    const { code }: { code: string } = await ctx.runMutation(internal.accounts.consent.prepareCode, { token: args.token, phone });
    if (aiMode() === "mock") await ctx.runMutation(internal.accounts.outbox.record, { channel: "sms", to: phone, code });
    const result = await smsSender().send(phone, `Your Takudzidza permission code is ${code}. It works for ${CODE_MINUTES} minutes.`);
    if (!result.ok) console.warn(`sms failed: ${result.reason}`);
    return { sent: result.ok };
  },
});

export const give = mutation({
  args: {
    token: v.string(),
    guardianName: v.string(),
    relationship: v.string(),
    guardianContact: v.string(),
    code: v.string(),
    confirmsGuardian: v.boolean(),
    agrees: v.boolean(),
  },
  handler: async (ctx, args): Promise<{ state: "given" | "wrong_code"; error?: string }> => {
    const found = await requestFor(ctx, args.token);
    if (found === null) throw new ConvexError(ERRORS.expired);
    if (found.profile.consentState === "given") return { state: "given" };
    if (!args.confirmsGuardian || !args.agrees) throw new ConvexError("Tick both boxes to give consent.");
    const guardianName = args.guardianName.trim().slice(0, 80);
    const relationship = args.relationship.trim().slice(0, 40);
    if (guardianName.length < 2) throw new ConvexError("Enter your full name.");
    if (relationship.length < 2) throw new ConvexError("Say how you are related to the learner.");
    const phone = normalisePhone(args.guardianContact);
    if (phone === null) throw new ConvexError(ERRORS.phone);

    const now = Date.now();
    const row = await ctx.db.query("consentCodes").withIndex("by_request", (q) => q.eq("requestId", found.request._id)).order("desc").first();
    if (row === null || row.phone !== phone) return { state: "wrong_code", error: ERRORS.noCode };
    if (row.expiresAt < now || row.attempts >= CODE_MAX_ATTEMPTS) return { state: "wrong_code", error: ERRORS.deadCode };
    if (row.codeHash !== (await codeHash(found.request._id, phone, args.code.trim()))) {
      // Returned, not thrown: a thrown error would undo the attempt count.
      await ctx.db.patch(row._id, { attempts: row.attempts + 1 });
      return { state: "wrong_code", error: ERRORS.wrongCode };
    }

    await ctx.db.insert("consents", {
      profileId: found.profile._id,
      requestId: found.request._id,
      guardianName,
      relationship,
      guardianContact: phone,
      consentTextVersion: CONSENT_TEXT_VERSION,
      givenAt: now,
      phoneVerifiedAt: now,
    });
    await ctx.db.patch(row._id, { expiresAt: now, attempts: CODE_MAX_ATTEMPTS });
    await ctx.db.patch(found.request._id, { expiresAt: now + WITHDRAW_LINK_DAYS * DAY_MS });
    await ctx.db.patch(found.profile._id, { consentState: "given" });
    return { state: "given" };
  },
});

export const withdraw = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const found = await requestFor(ctx, args.token);
    if (found === null) throw new ConvexError("This link has expired.");
    // The newest: a guardian can give, withdraw and give again on one link.
    const consent = await ctx.db.query("consents").withIndex("by_request", (q) => q.eq("requestId", found.request._id)).order("desc").first();
    if (consent === null || consent.withdrawnAt !== undefined) throw new ConvexError("There is no consent to withdraw on this link.");
    await ctx.db.patch(consent._id, { withdrawnAt: Date.now() });
    await ctx.db.patch(found.profile._id, { consentState: "withdrawn" });
    return { state: "withdrawn" as const };
  },
});
