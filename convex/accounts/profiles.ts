import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { profileOf, requireProfile, requireUser } from "../lib/access";
import { accessibilityValidator, answerModeValidator, studyStyleValidator } from "../schema";
import { checkBirth } from "./age";
import { defaultStyle } from "./styles";

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
      studyStyle: defaultStyle(verdict.age),
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

export const setStyle = mutation({
  args: { studyStyle: studyStyleValidator },
  handler: async (ctx, args) => {
    const { profile } = await requireProfile(ctx);
    await ctx.db.patch(profile._id, { studyStyle: args.studyStyle, styleChosen: true });
  },
});

/** Skipping the quiz keeps the age based default. */
export const skipStyleQuiz = mutation({
  args: {},
  handler: async (ctx) => {
    const { profile } = await requireProfile(ctx);
    await ctx.db.patch(profile._id, { styleChosen: true });
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
