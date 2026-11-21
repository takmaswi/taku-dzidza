import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action, internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { pendingClassRequests } from "../classes/requests";
import { profileOf, requireProfile } from "../lib/access";
import { featureNotOff } from "../lib/features";
import { ADULT_AGE, ageOn } from "./age";
import { beginAccountDeletion } from "../privacy/purge";
import { randomDigits, randomToken, tokenHash } from "../lib/tokens";
import { aiMode } from "../lib/env";
import { enrolmentApproved } from "../organisations/members";
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

/** A fresh consent link for a learner under 18, replacing their unused ones. Also used by a linked guardian (convex/classes/guardians.ts). */
export async function newConsentRequest(ctx: MutationCtx, profile: Doc<"profiles">): Promise<{ token: string }> {
  if (profile.consentState !== "pending" && profile.consentState !== "withdrawn") throw new ConvexError("No guardian consent is needed.");
  for (const old of await ctx.db.query("consentRequests").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).collect()) {
    const used = await ctx.db.query("consents").withIndex("by_request", (q) => q.eq("requestId", old._id)).first();
    if (used === null) await ctx.db.delete(old._id);
  }
  const token = randomToken();
  const now = Date.now();
  await ctx.db.insert("consentRequests", { profileId: profile._id, tokenHash: await tokenHash(token), createdAt: now, expiresAt: now + REQUEST_DAYS * DAY_MS });
  return { token };
}

export const createRequest = mutation({
  args: {},
  handler: async (ctx): Promise<{ token: string }> => {
    const { profile } = await requireProfile(ctx);
    return await newConsentRequest(ctx, profile);
  },
});

export async function requestFor(ctx: QueryCtx, token: string): Promise<{ request: Doc<"consentRequests">; profile: Doc<"profiles"> } | null> {
  if (token.length < 20 || token.length > 100) return null;
  const hash = await tokenHash(token);
  const row = await ctx.db.query("consentRequests").withIndex("by_token", (q) => q.eq("tokenHash", hash)).unique();
  if (row === null || row.expiresAt < Date.now()) return null;
  const profile = await ctx.db.get(row.profileId);
  if (profile === null || profile.deletingAt !== undefined) return null;
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
      // Classes waiting for this guardian (Stage 2), only once consent is given on this link.
      classRequests: featureNotOff("TEACHER_MODE") && (await givenOn(ctx, found.request._id)) ? await pendingClassRequests(ctx, found.profile._id) : [],
    };
  },
});

/** The consent standing on this link: the newest, if it was not withdrawn. */
export async function givenOn(ctx: QueryCtx, requestId: Id<"consentRequests">): Promise<Doc<"consents"> | null> {
  const consent = await ctx.db.query("consents").withIndex("by_request", (q) => q.eq("requestId", requestId)).order("desc").first();
  return consent === null || consent.withdrawnAt !== undefined ? null : consent;
}

/** The adult account giving consent, when the guardian is signed in to one that is not the learner's. */
async function signedInGuardian(ctx: QueryCtx, learner: Doc<"profiles">): Promise<Doc<"profiles"> | null> {
  const userId = await getAuthUserId(ctx);
  if (userId === null || userId === learner.userId) return null;
  const profile = await profileOf(ctx, userId);
  if (profile === null || profile.deletingAt !== undefined || ageOn(profile.birthYear, profile.birthMonth, new Date()) < ADULT_AGE) return null;
  return profile;
}

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

    const guardian = featureNotOff("TEACHER_MODE") ? await signedInGuardian(ctx, found.profile) : null;
    await ctx.db.insert("consents", {
      profileId: found.profile._id,
      requestId: found.request._id,
      guardianName,
      relationship,
      guardianContact: phone,
      consentTextVersion: CONSENT_TEXT_VERSION,
      givenAt: now,
      phoneVerifiedAt: now,
      ...(guardian === null ? {} : { guardianProfileId: guardian._id }),
    });
    if (guardian !== null) await linkGuardian(ctx, guardian, found.profile._id);
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
    const now = Date.now();
    await ctx.db.patch(consent._id, { withdrawnAt: now });
    await ctx.db.patch(found.profile._id, { consentState: "withdrawn", consentWithdrawnAt: now });
    return { state: "withdrawn" as const };
  },
});

/**
 * Public, with the link's token: the guardian asks for the learner's account
 * and everything in it to be deleted now (audit S4). Works on the link of an
 * under 18's account once consent was given on it, or withdrawn. Without this
 * the data goes WITHDRAWN_DAYS after a withdrawal (convex/privacy/retention.ts).
 */
async function linkGuardian(ctx: MutationCtx, guardian: Doc<"profiles">, childProfileId: Id<"profiles">): Promise<void> {
  const links = await ctx.db.query("guardianLinks").withIndex("by_child", (q) => q.eq("childProfileId", childProfileId)).take(20);
  if (!links.some((l) => l.guardianProfileId === guardian._id)) await ctx.db.insert("guardianLinks", { guardianProfileId: guardian._id, childProfileId, createdAt: Date.now() });
  const roles = guardian.roles ?? [];
  if (!roles.includes("guardian")) await ctx.db.patch(guardian._id, { roles: [...roles, "guardian"] });
}

/**
 * A class request decided from the consent link (Stage 2). The learner holds
 * this link too, so the link alone is not enough: a code goes to the phone the
 * guardian verified when they gave consent, and the decision needs it.
 */
export const prepareApprovalCode = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<{ code: string; phone: string }> => {
    const found = await requestFor(ctx, args.token);
    if (found === null) throw new ConvexError(ERRORS.expired);
    const consent = await givenOn(ctx, found.request._id);
    if (consent === null) throw new ConvexError("Only the guardian who gave permission on this link can do this.");
    const now = Date.now();
    const since = now - DAY_MS;
    const byProfile = await ctx.db.query("consentCodes").withIndex("by_profile", (q) => q.eq("profileId", found.profile._id).gt("createdAt", since)).collect();
    if (byProfile.length >= CODE_MAX_SENDS_PER_DAY) throw new ConvexError(ERRORS.tooMany);
    if (byProfile.some((row) => row.createdAt > now - CODE_RESEND_SECONDS * 1000)) throw new ConvexError(ERRORS.tooSoon);
    const code = randomDigits(CODE_DIGITS);
    const phone = consent.guardianContact;
    await ctx.db.insert("consentCodes", { requestId: found.request._id, profileId: found.profile._id, phone, codeHash: await codeHash(found.request._id, phone, code), attempts: 0, createdAt: now, expiresAt: now + CODE_MINUTES * 60 * 1000 });
    return { code, phone };
  },
});

/** Public, with the link's token: sends a code to the guardian's verified phone. */
export const sendApprovalCode = action({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<{ sent: boolean }> => {
    if (!featureNotOff("TEACHER_MODE") || !smsReady()) return { sent: false };
    const { code, phone }: { code: string; phone: string } = await ctx.runMutation(internal.accounts.consent.prepareApprovalCode, { token: args.token });
    if (aiMode() === "mock") await ctx.runMutation(internal.accounts.outbox.record, { channel: "sms", to: phone, code });
    const result = await smsSender().send(phone, `Your Takudzidza code to answer a class request is ${code}. It works for ${CODE_MINUTES} minutes.`);
    if (!result.ok) console.warn(`sms failed: ${result.reason}`);
    return { sent: result.ok };
  },
});

/** Public, with the link's token and the code: the guardian lets the learner into a class, or says no. */
export const decideClass = mutation({
  args: { token: v.string(), enrolmentId: v.id("enrolments"), approve: v.boolean(), code: v.string() },
  handler: async (ctx, args): Promise<{ state: "decided" | "wrong_code"; error?: string }> => {
    if (!featureNotOff("TEACHER_MODE")) throw new ConvexError("Teacher tools are not on yet.");
    const found = await requestFor(ctx, args.token);
    if (found === null) throw new ConvexError(ERRORS.expired);
    const consent = await givenOn(ctx, found.request._id);
    if (consent === null) throw new ConvexError("Only the guardian who gave permission on this link can do this.");
    const enrolment = await ctx.db.get(args.enrolmentId);
    if (enrolment === null || enrolment.learnerProfileId !== found.profile._id || enrolment.status !== "pending") throw new ConvexError("This request was already answered.");
    const now = Date.now();
    const row = await ctx.db.query("consentCodes").withIndex("by_request", (q) => q.eq("requestId", found.request._id)).order("desc").first();
    if (row === null || row.phone !== consent.guardianContact) return { state: "wrong_code", error: ERRORS.noCode };
    if (row.expiresAt < now || row.attempts >= CODE_MAX_ATTEMPTS) return { state: "wrong_code", error: ERRORS.deadCode };
    if (row.codeHash !== (await codeHash(found.request._id, row.phone, args.code.trim()))) {
      await ctx.db.patch(row._id, { attempts: row.attempts + 1 });
      return { state: "wrong_code", error: ERRORS.wrongCode };
    }
    await ctx.db.patch(row._id, { expiresAt: now, attempts: CODE_MAX_ATTEMPTS });
    await ctx.db.patch(enrolment._id, { status: args.approve ? "approved" : "declined", decidedAt: now, decidedBy: "guardian" });
    if (args.approve) await enrolmentApproved(ctx, enrolment);
    return { state: "decided" };
  },
});

export const requestDeletion = mutation({
  args: { token: v.string(), confirm: v.boolean() },
  handler: async (ctx, args): Promise<{ state: "deleted" }> => {
    const found = await requestFor(ctx, args.token);
    if (found === null) throw new ConvexError("This link has expired.");
    if (!args.confirm) throw new ConvexError("Tick the box to confirm.");
    const consent = await ctx.db.query("consents").withIndex("by_request", (q) => q.eq("requestId", found.request._id)).first();
    // Only a guardian who gave consent on this link can delete: the link alone is what a learner holds too.
    if (consent === null) throw new ConvexError("Only the guardian who gave permission on this link can ask for this.");
    const user = await ctx.db.get(found.profile.userId);
    if (user !== null) await beginAccountDeletion(ctx, user, "guardian");
    return { state: "deleted" };
  },
});
