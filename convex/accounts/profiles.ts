import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { profileOf, requireProfile, requireUser } from "../lib/access";
import { accessibilityValidator, answerModeValidator, studyingForValidator, supportNeedValidator, voiceValidator } from "../schema";
import { checkBirth } from "./age";
import { cleanNeeds, defaultVoice, supportSettings, voiceOf } from "./voices";

/** The learner's own profile and settings (SPEC.md 3.10). */

export const NO_ACCESSIBILITY = {
  dyslexia: false,
  largeText: false,
  readAloud: false,
  shortChunks: false,
  highContrast: false,
  reducedMotion: false,
} as const;

/**
 * What the app needs on every screen. profile is null before sign up is
 * finished; the whole result is null when the account no longer exists
 * (deleted on another device), so the app signs out instead of failing.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null || (await ctx.db.get(userId)) === null) return null;
    const user = await requireUser(ctx);
    const profile = await profileOf(ctx, user._id);
    // Being deleted (convex/privacy/purge.ts): gone as far as the app is concerned.
    if (profile?.deletingAt !== undefined) return null;
    return { email: user.email ?? "", profile };
  },
});

export const create = mutation({
  args: { displayName: v.string(), birthYear: v.number(), birthMonth: v.number() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if ((await profileOf(ctx, user._id)) !== null) throw new ConvexError("Your account is already set up.");
    const displayName = args.displayName.trim().replace(/\s+/g, " ").slice(0, 40);
    if (displayName.length < 1) throw new ConvexError("Tell us what to call you.");
    const verdict = checkBirth(args.birthYear, args.birthMonth, new Date());
    if (!verdict.ok) throw new ConvexError(verdict.reason === "too_young" ? "TOO_YOUNG" : "Check your birth month and year.");
    const id = await ctx.db.insert("profiles", {
      userId: user._id,
      displayName,
      birthYear: args.birthYear,
      birthMonth: args.birthMonth,
      voice: defaultVoice(verdict.age),
      styleChosen: false,
      accessibility: { ...NO_ACCESSIBILITY },
      answerMode: "answer",
      language: "en",
      consentState: verdict.minor ? "pending" : "not_needed",
      createdAt: Date.now(),
    });
    return { profileId: id, minor: verdict.minor };
  },
});

export const setVoice = mutation({
  args: { voice: voiceValidator },
  handler: async (ctx, args) => {
    const { profile } = await requireProfile(ctx);
    await ctx.db.patch(profile._id, { voice: args.voice });
  },
});

/**
 * The end of onboarding. The needs ticked are stored as support preferences,
 * and the settings they recommend are switched on once (convex/accounts/voices.ts).
 * Ticking nothing, or skipping, changes no setting.
 */
export const finishOnboarding = mutation({
  args: { support: v.array(supportNeedValidator) },
  handler: async (ctx, args) => {
    const { profile } = await requireProfile(ctx);
    const support = cleanNeeds(args.support);
    const next = supportSettings(support, { accessibility: profile.accessibility, voice: voiceOf(profile) });
    await ctx.db.patch(profile._id, { support, accessibility: next.accessibility, voice: next.voice, styleChosen: true });
  },
});

/** Skipping onboarding keeps the age based defaults. */
export const skipOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const { profile } = await requireProfile(ctx);
    await ctx.db.patch(profile._id, { styleChosen: true });
  },
});

/** From Settings. A need ticked now switches on its settings, as in onboarding; unticking one switches nothing off. */
export const setSupport = mutation({
  args: { support: v.array(supportNeedValidator) },
  handler: async (ctx, args) => {
    const { profile } = await requireProfile(ctx);
    const support = cleanNeeds(args.support);
    const added = support.filter((n) => !(profile.support ?? []).includes(n));
    const next = supportSettings(added, { accessibility: profile.accessibility, voice: voiceOf(profile) });
    await ctx.db.patch(profile._id, { support, accessibility: next.accessibility, voice: next.voice });
  },
});

export const setStudyingFor = mutation({
  args: { studyingFor: studyingForValidator },
  handler: async (ctx, args) => {
    const { profile } = await requireProfile(ctx);
    await ctx.db.patch(profile._id, { studyingFor: args.studyingFor });
  },
});

export const setAccessibility = mutation({
  args: { accessibility: accessibilityValidator },
  handler: async (ctx, args) => {
    const { profile } = await requireProfile(ctx);
    await ctx.db.patch(profile._id, { accessibility: args.accessibility });
  },
});

export const setAnswerMode = mutation({
  args: { answerMode: answerModeValidator },
  handler: async (ctx, args) => {
    const { profile } = await requireProfile(ctx);
    await ctx.db.patch(profile._id, { answerMode: args.answerMode });
  },
});

export const setDisplayName = mutation({
  args: { displayName: v.string() },
  handler: async (ctx, args) => {
    const { profile } = await requireProfile(ctx);
    const displayName = args.displayName.trim().replace(/\s+/g, " ").slice(0, 40);
    if (displayName.length < 1) throw new ConvexError("Tell us what to call you.");
    await ctx.db.patch(profile._id, { displayName });
  },
});
