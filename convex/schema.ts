import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Takudzidza data (SPEC.md section 5). Phase 1 holds accounts, learner
 * profiles, guardian consent for under 18s and model prices. Phase 2 adds
 * notebooks, their sources (pages and search chunks) and each notebook's chat. Retention limits are in convex/privacy/retention.ts.
 */

export const studyStyleValidator = v.union(v.literal("locked_in"), v.literal("cook"), v.literal("calm"));
export const studyingForValidator = v.union(v.literal("olevel"), v.literal("alevel"), v.literal("university"), v.literal("professional"), v.literal("learning"));
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
  v.object({ kind: v.literal("added"), unchecked: v.optional(v.boolean()) }),
);
/** An interactive widget attached to an answer or stored as a study tool (convex/widgets). */
export const widgetValidator = v.object({ slug: v.string(), data: v.any() });

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
    /** From onboarding; tunes the starters on the home page. */
    studyingFor: v.optional(studyingForValidator),
    consentState: consentStateValidator,
    /** Adults only: said yes to counting which features are used, with no content (convex/analytics.ts). */
    analyticsConsent: v.optional(v.boolean()),
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
    /** When the guardian typed the code sent to guardianContact. Older consents predate the code. */
    phoneVerifiedAt: v.optional(v.number()),
    withdrawnAt: v.optional(v.number()),
  }).index("by_profile", ["profileId"]).index("by_request", ["requestId"]),

  /** One code sent to a guardian's phone. Kept 24 hours to count sends per day, then swept. Only the code's hash is stored. */
  consentCodes: defineTable({
    requestId: v.id("consentRequests"),
    profileId: v.id("profiles"),
    phone: v.string(),
    codeHash: v.string(),
    attempts: v.number(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_request", ["requestId", "createdAt"])
    .index("by_profile", ["profileId", "createdAt"])
    .index("by_phone", ["phone", "createdAt"])
    .index("by_created", ["createdAt"]),

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
    /** Set while Taku is still working on this answer; what the learner sees meanwhile. */
    stage: v.optional(v.union(v.literal("reading"), v.literal("writing"), v.literal("checking"))),
    widget: v.optional(widgetValidator),
    createdAt: v.number(),
  }).index("by_notebook", ["notebookId", "createdAt"]),

  /** A general chat with Taku, not tied to a notebook. It belongs to the learner. */
  chats: defineTable({ profileId: v.id("profiles"), title: v.string(), createdAt: v.number(), updatedAt: v.number() }).index("by_profile", ["profileId", "updatedAt"]),
  chatMessages: defineTable({
    chatId: v.id("chats"),
    role: v.union(v.literal("learner"), v.literal("taku")),
    kind: v.union(v.literal("question"), v.literal("answer"), v.literal("help"), v.literal("redirect"), v.literal("error")),
    text: v.string(),
    /** True while the reply is still arriving. */
    streaming: v.optional(v.boolean()),
    widget: v.optional(widgetValidator),
    createdAt: v.number(),
  }).index("by_chat", ["chatId", "createdAt"]),

  /** A study tool Taku made from a notebook (SPEC.md 3.3). content is checked by convex/study/shapes.ts before it is stored. */
  outputs: defineTable({
    notebookId: v.id("notebooks"),
    profileId: v.id("profiles"),
    mode: v.string(),
    kind: v.union(v.literal("summary"), v.literal("cards"), v.literal("quiz"), v.literal("mindmap"), v.literal("scroll"), v.literal("widget")),
    title: v.string(),
    content: v.any(),
    sourceMode: sourceModeValidator,
    note: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_notebook", ["notebookId", "createdAt"]),

  /** One flashcard with its spaced repetition state (ts-fsrs). */
  cards: defineTable({
    notebookId: v.id("notebooks"),
    outputId: v.id("outputs"),
    profileId: v.id("profiles"),
    front: v.string(),
    back: v.string(),
    origin: originValidator,
    due: v.number(),
    stability: v.number(),
    difficulty: v.number(),
    elapsedDays: v.number(),
    scheduledDays: v.number(),
    learningSteps: v.number(),
    reps: v.number(),
    lapses: v.number(),
    state: v.number(),
    lastReview: v.optional(v.number()),
  })
    .index("by_output", ["outputId"])
    .index("by_notebook_due", ["notebookId", "due"])
    .index("by_profile_due", ["profileId", "due"]),

  /** A finished quiz: marks only, for weak topics in Phase 4. */
  quizAttempts: defineTable({
    outputId: v.id("outputs"),
    notebookId: v.id("notebooks"),
    profileId: v.id("profiles"),
    score: v.number(),
    total: v.number(),
    perQuestion: v.array(v.object({ number: v.number(), got: v.number(), marks: v.number() })),
    createdAt: v.number(),
  }).index("by_output", ["outputId"]).index("by_profile", ["profileId", "createdAt"]),

  /** AI calls and cost per day: one row for the whole deployment (scope "all"), one per learner (their profile id) and one per tool ("tool:quiz"). Numbers only. */
  aiUsageDaily: defineTable({ day: v.string(), scope: v.string(), calls: v.number(), costUsd: v.number() }).index("by_day_scope", ["day", "scope"]).index("by_scope", ["scope"]),

  /** How many things a learner started in the current minute (convex/ai/usage.ts). One row per learner and kind. */
  aiStarts: defineTable({ profileId: v.string(), kind: v.union(v.literal("ask"), v.literal("read")), windowStart: v.number(), count: v.number() }).index("by_profile_kind", ["profileId", "kind"]),

  /** The deployment passed a share of its daily cap. Read by the owner with npx convex run ai/usage:alerts. */
  spendAlerts: defineTable({ day: v.string(), percent: v.number(), costUsd: v.number(), capUsd: v.number(), createdAt: v.number() }).index("by_day_percent", ["day", "percent"]),

  /** How many times a feature was used per day, from adults who said yes. A count, with no user and no content. */
  analyticsDaily: defineTable({ day: v.string(), event: v.string(), count: v.number() }).index("by_day_event", ["day", "event"]),

  /** Codes the mock email and SMS senders would have sent. Written only in mock mode, read only by tests. */
  mockOutbox: defineTable({ channel: v.union(v.literal("email"), v.literal("sms")), to: v.string(), code: v.string(), createdAt: v.number() }).index("by_to", ["to", "createdAt"]),

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
