import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Takudzidza data (SPEC.md section 5). Phase 1 holds accounts, learner
 * profiles, guardian consent for under 18s and model prices. Phase 2 adds
 * notebooks, their sources (pages and search chunks) and each notebook's chat. Retention limits are in convex/privacy/retention.ts.
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

export const sourceModeValidator = v.union(v.literal("only_mine"), v.literal("mine_plus"));
export const sourceKindValidator = v.union(v.literal("pdf"), v.literal("docx"), v.literal("image"), v.literal("text"), v.literal("link"));
export const originValidator = v.union(
  v.object({ kind: v.literal("source"), sourceId: v.string(), page: v.number(), quote: v.string() }),
  v.object({ kind: v.literal("added") }),
);

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

  /** A learner's notebook (SPEC.md 3.2). */
  notebooks: defineTable({
    profileId: v.id("profiles"),
    title: v.string(),
    sourceMode: sourceModeValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_profile", ["profileId", "updatedAt"]),

  sources: defineTable({
    notebookId: v.id("notebooks"),
    profileId: v.id("profiles"),
    kind: sourceKindValidator,
    title: v.string(),
    /** Uploaded file, kept while the source exists so the learner can open the original. */
    storageId: v.optional(v.id("_storage")),
    url: v.optional(v.string()),
    status: v.union(v.literal("reading"), v.literal("ready"), v.literal("failed")),
    error: v.optional(v.string()),
    pageCount: v.number(),
    createdAt: v.number(),
  }).index("by_notebook", ["notebookId", "createdAt"]),

  /** The text of one page of a source. Citations point here. */
  pages: defineTable({
    sourceId: v.id("sources"),
    notebookId: v.id("notebooks"),
    page: v.number(),
    text: v.string(),
  }).index("by_source_page", ["sourceId", "page"]).index("by_notebook", ["notebookId"]),

  /** Overlapping pieces of pages, searched to find what a question needs. */
  chunks: defineTable({
    sourceId: v.id("sources"),
    notebookId: v.id("notebooks"),
    page: v.number(),
    text: v.string(),
  })
    .index("by_source", ["sourceId"])
    .index("by_notebook", ["notebookId"])
    .searchIndex("search_text", { searchField: "text", filterFields: ["notebookId"] }),

  /** The notebook's chat. It belongs to the learner and is deleted with the notebook. */
  messages: defineTable({
    notebookId: v.id("notebooks"),
    role: v.union(v.literal("learner"), v.literal("taku")),
    kind: v.union(v.literal("question"), v.literal("answer"), v.literal("help"), v.literal("redirect"), v.literal("error")),
    text: v.string(),
    parts: v.optional(v.array(v.object({ text: v.string(), origin: originValidator }))),
    note: v.optional(v.string()),
    sourceMode: v.optional(sourceModeValidator),
    answerMode: v.optional(answerModeValidator),
    createdAt: v.number(),
  }).index("by_notebook", ["notebookId", "createdAt"]),

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
