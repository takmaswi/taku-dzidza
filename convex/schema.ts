import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Takudzidza data (SPEC.md section 5). Phase 1 holds accounts, learner
 * profiles, guardian consent for under 18s and model prices. Notebooks and
 * sources arrive in Phase 2. Retention limits are in convex/privacy/retention.ts.
 */

export const studyStyleValidator = v.union(v.literal("locked_in"), v.literal("cook"), v.literal("calm"));
export const answerModeValidator = v.union(v.literal("answer"), v.literal("guide"));
export const consentStateValidator = v.union(v.literal("not_needed"), v.literal("pending"), v.literal("given"), v.literal("withdrawn"));
export const accessibilityValidator = v.object({
  dyslexia: v.boolean(),
  largeText: v.boolean(),
  readAloud: v.boolean(),
  shortChunks: v.boolean(),
  highContrast: v.boolean(),
  reducedMotion: v.boolean(),
});

export default defineSchema({
  ...authTables,

  /** One per signed in learner. Birth month and year decide consent (convex/accounts/age.ts). */
  profiles: defineTable({
    userId: v.id("users"),
    displayName: v.string(),
    birthYear: v.number(),
    birthMonth: v.number(),
    studyStyle: studyStyleValidator,
    /** True once the learner took the style quiz or skipped it. */
    styleChosen: v.boolean(),
    accessibility: accessibilityValidator,
    answerMode: answerModeValidator,
    language: v.union(v.literal("en"), v.literal("sn")),
    consentState: consentStateValidator,
    createdAt: v.number(),
  }).index("by_user", ["userId"]).index("by_consent_state", ["consentState", "createdAt"]),

  /** A link a learner under 18 sends to a guardian. Only the token's SHA 256 hash is stored. */
  consentRequests: defineTable({
    profileId: v.id("profiles"),
    tokenHash: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_token", ["tokenHash"]).index("by_profile", ["profileId"]).index("by_expiry", ["expiresAt"]),

  /** A guardian's written consent (Cyber and Data Protection Act; SPEC.md 3.8). */
  consents: defineTable({
    profileId: v.id("profiles"),
    requestId: v.id("consentRequests"),
    guardianName: v.string(),
    relationship: v.string(),
    guardianContact: v.string(),
    consentTextVersion: v.string(),
    givenAt: v.number(),
    withdrawnAt: v.optional(v.number()),
  }).index("by_profile", ["profileId"]).index("by_request", ["requestId"]),

  /** Count only, no personal data: proof that deletions happen. */
  accountDeletions: defineTable({ deletedAt: v.number(), reason: v.union(v.literal("self"), v.literal("owner"), v.literal("no_consent")) }),

  modelPrices: defineTable({
    model: v.string(),
    promptUsdPerToken: v.number(),
    completionUsdPerToken: v.number(),
    cachedPromptUsdPerToken: v.number(),
    refreshedAt: v.number(),
  }).index("by_model", ["model"]),
});
