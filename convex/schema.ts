import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Takudzidza data (SPEC.md section 5). Phase 1 holds accounts, learner
 * profiles, guardian consent for under 18s and model prices. Phase 2 adds
 * notebooks, their sources (pages and search chunks) and each notebook's chat. Retention limits are in convex/privacy/retention.ts.
 */

/** The study styles before 21 November 2026. Kept optional on profiles until every row has a voice (convex/accounts/migrations.ts), then removed. */
export const studyStyleValidator = v.union(v.literal("locked_in"), v.literal("cook"), v.literal("calm"));
export const voiceValidator = v.union(v.literal("gentle"), v.literal("direct"), v.literal("upbeat"));
export const studyModeValidator = v.union(v.literal("learn"), v.literal("test"), v.literal("sprint"), v.literal("exam"));
export const supportNeedValidator = v.union(v.literal("focus"), v.literal("reading"), v.literal("anxious"), v.literal("english"), v.literal("clearer"));
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

export const deletionReasonValidator = v.union(v.literal("self"), v.literal("owner"), v.literal("no_consent"), v.literal("withdrawn"), v.literal("guardian"), v.literal("unverified"));
/** Dimensions of a chunk's embedding (convex/ai/embeddings.ts). */
export const EMBEDDING_DIMENSIONS = 512;
/** A part of a source a study tool can be made from: a chapter found in the text, or a block of pages. */
export const sectionValidator = v.object({ title: v.string(), fromPage: v.number(), toPage: v.number() });
/** The pages a study tool was made from, shown on the tool. */
export const coverageValidator = v.array(v.object({ sourceId: v.string(), title: v.string(), fromPage: v.number(), toPage: v.number() }));

export const sourceModeValidator = v.union(v.literal("only_mine"), v.literal("mine_plus"));
export const sourceKindValidator = v.union(v.literal("pdf"), v.literal("docx"), v.literal("image"), v.literal("text"), v.literal("link"));
export const originValidator = v.union(
  v.object({ kind: v.literal("source"), sourceId: v.string(), page: v.number(), quote: v.string() }),
  v.object({ kind: v.literal("added"), unchecked: v.optional(v.boolean()) }),
);
/** An interactive widget attached to an answer or stored as a study tool (convex/widgets). */
export const widgetValidator = v.object({ slug: v.string(), data: v.any() });
/** Roles an adult account can add (Stage 2). Every account is a learner. */
export const roleValidator = v.union(v.literal("teacher"), v.literal("guardian"));
/** Kinds of organisation. Exam boards are not organisations: they stay part of what a learner studies for and a syllabus id. */
export const orgTypeValidator = v.union(v.literal("secondary_school"), v.literal("university"), v.literal("college"), v.literal("training_provider"), v.literal("company"), v.literal("other"));
export const orgRoleValidator = v.union(v.literal("learner"), v.literal("teacher"), v.literal("admin"), v.literal("guardian"));
/** A Test me turn on Taku's reply: the question it asked (the answer is never sent to the browser) and the mark for the learner's last answer. */
export const testTurnValidator = v.object({ question: v.string(), answer: v.string(), origin: v.optional(originValidator), correct: v.optional(v.boolean()) });
export const perQuestionValidator = v.array(v.object({ number: v.number(), got: v.number(), marks: v.number() }));

export default defineSchema({
  ...authTables,

  /** One per signed in learner. Birth month and year decide consent (convex/accounts/age.ts). */
  profiles: defineTable({
    userId: v.id("users"),
    displayName: v.string(),
    birthYear: v.number(),
    birthMonth: v.number(),
    /** Legacy (see studyStyleValidator). New profiles have voice instead. */
    studyStyle: v.optional(studyStyleValidator),
    /** How Taku talks: gentle, direct or upbeat (convex/accounts/voices.ts). Unset on profiles from before the migration. */
    voice: v.optional(voiceValidator),
    /** What the learner said gets in the way when they study. Preferences, never a diagnosis; never sent to analytics. */
    support: v.optional(v.array(supportNeedValidator)),
    /** True once the learner finished or skipped onboarding (the name is from the old style quiz). */
    styleChosen: v.boolean(),
    accessibility: accessibilityValidator,
    answerMode: answerModeValidator,
    language: v.union(v.literal("en"), v.literal("sn")),
    /** From onboarding; tunes the starters on the home page. */
    studyingFor: v.optional(studyingForValidator),
    consentState: consentStateValidator,
    /** Adults only: said yes to counting which features are used, with no content (convex/analytics.ts). */
    analyticsConsent: v.optional(v.boolean()),
    /** When the guardian withdrew consent; the data goes WITHDRAWN_DAYS later (convex/privacy/retention.ts). */
    consentWithdrawnAt: v.optional(v.number()),
    /** Bytes of uploaded files this account holds (convex/notebooks/uploads.ts). */
    storageBytes: v.optional(v.number()),
    /** Set when deletion starts: the account is hidden and signed out, then emptied in batches (convex/privacy/purge.ts). */
    deletingAt: v.optional(v.number()),
    deletionReason: v.optional(deletionReasonValidator),
    /** Teacher, guardian (convex/classes). Adults only. Roles in an organisation are on memberships. */
    roles: v.optional(v.array(roleValidator)),
    createdAt: v.number(),
  }).index("by_user", ["userId"]).index("by_consent_state", ["consentState", "createdAt"]).index("by_deleting", ["deletingAt"]),

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
    /** Set when the guardian gave consent signed in to their own adult account; that account may then approve classes (convex/classes). */
    guardianProfileId: v.optional(v.id("profiles")),
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
    /** Set when deletion starts: hidden at once, emptied in batches. */
    deletingAt: v.optional(v.number()),
    /** The one notebook that holds review cards from Test me in Ask Taku chats. */
    testReview: v.optional(v.boolean()),
    /** A learner's copy of a course pack: the pack's sources and tools are read from the pack, never copied (convex/packs). */
    packId: v.optional(v.id("coursePacks")),
    /** The pack version this copy's review cards were last brought up to. */
    packVersion: v.optional(v.number()),
  })
    .index("by_profile", ["profileId", "updatedAt"])
    .index("by_pack", ["packId", "profileId"]),

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
    deletingAt: v.optional(v.number()),
    /** Chapters found in the text, or blocks of pages, for choosing what a tool covers. */
    sections: v.optional(v.array(sectionValidator)),
    /** When every chunk got its embedding. Unset means keyword search only for this source. */
    embeddedAt: v.optional(v.number()),
    /** Pages from a published book the owner does not hold the rights to share. Never shown to a class. */
    thirdParty: v.optional(v.boolean()),
  }).index("by_notebook", ["notebookId", "createdAt"]).index("by_storage", ["storageId"]),

  /**
   * One upload a learner asked for. The file's storage id is bound to the
   * learner when the source is added; an upload nobody claims within the hour
   * is swept with its file (convex/notebooks/uploads.ts).
   */
  uploads: defineTable({
    profileId: v.id("profiles"),
    storageId: v.optional(v.id("_storage")),
    bytes: v.optional(v.number()),
    createdAt: v.number(),
    claimedAt: v.optional(v.number()),
  }).index("by_profile", ["profileId", "createdAt"]).index("by_storage", ["storageId"]).index("by_created", ["createdAt"]),

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
    embedding: v.optional(v.array(v.float64())),
  })
    .index("by_source", ["sourceId"])
    .index("by_notebook", ["notebookId"])
    .searchIndex("search_text", { searchField: "text", filterFields: ["notebookId"] })
    .vectorIndex("by_embedding", { vectorField: "embedding", dimensions: EMBEDDING_DIMENSIONS, filterFields: ["notebookId"] }),

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
    studyMode: v.optional(studyModeValidator),
    test: v.optional(testTurnValidator),
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
    studyMode: v.optional(studyModeValidator),
    test: v.optional(testTurnValidator),
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
    coverage: v.optional(coverageValidator),
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

  /**
   * AI calls and cost per day. Numbers only. One row per learner (their profile
   * id). The deployment total and each tool's total are spread over shards
   * ("all~3", "tool:quiz~7") so busy days do not queue on one row; readers add
   * the shards up (convex/ai/usage.ts). Rows without a shard are from before.
   */
  aiUsageDaily: defineTable({ day: v.string(), scope: v.string(), calls: v.number(), costUsd: v.number() }).index("by_day_scope", ["day", "scope"]).index("by_scope", ["scope"]),

  /** How many things a learner started in the current minute (convex/ai/usage.ts). One row per learner and kind. */
  aiStarts: defineTable({ profileId: v.string(), kind: v.union(v.literal("ask"), v.literal("read"), v.literal("upload"), v.literal("code")), windowStart: v.number(), count: v.number() }).index("by_profile_kind", ["profileId", "kind"]),

  /** The deployment passed a share of its daily cap. Read by the owner with npx convex run ai/usage:alerts. */
  spendAlerts: defineTable({ day: v.string(), percent: v.number(), costUsd: v.number(), capUsd: v.number(), createdAt: v.number() }).index("by_day_percent", ["day", "percent"]),

  /** How many times a feature was used per day, from adults who said yes. A count, with no user and no content. */
  analyticsDaily: defineTable({ day: v.string(), event: v.string(), count: v.number() }).index("by_day_event", ["day", "event"]),

  /** Codes the mock email and SMS senders would have sent. Written only in mock mode, read only by tests. */
  mockOutbox: defineTable({ channel: v.union(v.literal("email"), v.literal("sms")), to: v.string(), code: v.string(), createdAt: v.number() }).index("by_to", ["to", "createdAt"]),

  /** Count only, no personal data: proof that deletions happen. */
  accountDeletions: defineTable({ deletedAt: v.number(), reason: deletionReasonValidator }),

  /** Where a sweep that walks a whole table got to, so each run carries on (convex/privacy/retention.ts). */
  sweepCursors: defineTable({ name: v.string(), value: v.number() }).index("by_name", ["name"]),

  // ---- Stage 2: teachers, classes, guardians (convex/classes) and organisations (convex/organisations)

  /**
   * A school, university, college, training provider or company (convex/organisations).
   * Added by people and pending until an owner lists or merges it; the list starts empty.
   * joinCode is the learner code; staff join with an orgCodes code.
   */
  organisations: defineTable({
    name: v.string(),
    type: orgTypeValidator,
    town: v.string(),
    country: v.string(),
    status: v.union(v.literal("pending"), v.literal("listed"), v.literal("verified")),
    createdBy: v.id("profiles"),
    joinCode: v.string(),
    createdAt: v.number(),
  })
    .index("by_join_code", ["joinCode"])
    .index("by_status", ["status"])
    .index("by_created_by", ["createdBy"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["type", "status"] }),
  memberships: defineTable({
    organisationId: v.id("organisations"),
    profileId: v.id("profiles"),
    role: orgRoleValidator,
    programme: v.optional(v.string()),
    year: v.optional(v.string()),
    joinedAt: v.number(),
  })
    .index("by_org_role", ["organisationId", "role"])
    .index("by_profile", ["profileId"]),
  /** Following without a code: the public page and published course packs, nothing else. */
  follows: defineTable({ organisationId: v.id("organisations"), profileId: v.id("profiles"), createdAt: v.number() })
    .index("by_org", ["organisationId"])
    .index("by_profile", ["profileId"]),
  /** Staff join codes an admin makes and can revoke. */
  orgCodes: defineTable({
    organisationId: v.id("organisations"),
    code: v.string(),
    role: v.union(v.literal("teacher"), v.literal("admin")),
    createdBy: v.id("profiles"),
    createdAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_org", ["organisationId"]),
  /**
   * A course pack: notes an organisation's teacher or admin publishes from one
   * of their own notebooks. Publishing makes the summary, flashcards and
   * practice paper once; every learner who adds the pack reads them, and the
   * sources, from here. sourceIds and outputIds are the published version.
   */
  coursePacks: defineTable({
    organisationId: v.id("organisations"),
    title: v.string(),
    subject: v.string(),
    level: v.string(),
    syllabusId: v.optional(v.string()),
    masterNotebookId: v.id("notebooks"),
    createdBy: v.id("profiles"),
    version: v.number(),
    status: v.union(v.literal("draft"), v.literal("published")),
    publishedAt: v.optional(v.number()),
    /** The publisher confirmed they own the notes or are licensed to share them. */
    rightsConfirmedAt: v.optional(v.number()),
    sourceIds: v.array(v.id("sources")),
    outputIds: v.array(v.id("outputs")),
    /** Set while a publish is running, so two cannot run at once. */
    publishingSince: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_org", ["organisationId", "createdAt"])
    .index("by_master", ["masterNotebookId"])
    .index("by_created_by", ["createdBy"]),
  /** A teacher's class. Learners join with the code, a link or a QR code. */
  classes: defineTable({
    teacherProfileId: v.id("profiles"),
    organisationId: v.optional(v.id("organisations")),
    name: v.string(),
    subject: v.string(),
    level: v.string(),
    /** A syllabus pack id (convex/curriculum). */
    syllabusId: v.optional(v.string()),
    code: v.string(),
    createdAt: v.number(),
  })
    .index("by_teacher", ["teacherProfileId"])
    .index("by_code", ["code"])
    .index("by_organisation", ["organisationId"]),

  /** A learner in a class. An under 18 waits for a guardian (pending) before the teacher sees them as joined. */
  enrolments: defineTable({
    classId: v.id("classes"),
    learnerProfileId: v.id("profiles"),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("declined")),
    requestedAt: v.number(),
    decidedAt: v.optional(v.number()),
    decidedBy: v.optional(v.union(v.literal("adult"), v.literal("guardian"), v.literal("teacher"))),
  })
    .index("by_class", ["classId", "status"])
    .index("by_learner", ["learnerProfileId"]),

  /** A learner without an account, for a class that shares one phone: a first name the teacher typed. */
  rosterNames: defineTable({ classId: v.id("classes"), firstName: v.string(), createdAt: v.number() }).index("by_class", ["classId"]),

  /** A guardian's link to a child's own account. */
  guardianLinks: defineTable({ guardianProfileId: v.id("profiles"), childProfileId: v.id("profiles"), createdAt: v.number() })
    .index("by_guardian", ["guardianProfileId"])
    .index("by_child", ["childProfileId"]),
  /** A one time code a guardian gives a child to link their accounts. Only the hash is stored. */
  childCodes: defineTable({ guardianProfileId: v.id("profiles"), codeHash: v.string(), firstName: v.string(), createdAt: v.number(), expiresAt: v.number(), usedAt: v.optional(v.number()) })
    .index("by_code", ["codeHash"])
    .index("by_guardian", ["guardianProfileId"]),

  /** A teacher's own notebook shared with a class, view only. */
  classShares: defineTable({ classId: v.id("classes"), notebookId: v.id("notebooks"), sharedAt: v.number() })
    .index("by_class", ["classId"])
    .index("by_notebook", ["notebookId"]),

  /** A quiz or practice paper set for a class. The paper is a copy, so later edits never reach learners. */
  assignments: defineTable({
    classId: v.id("classes"),
    teacherProfileId: v.id("profiles"),
    outputId: v.id("outputs"),
    title: v.string(),
    content: v.any(),
    /** The topic of each question, for results by topic. */
    topics: v.array(v.object({ number: v.number(), topic: v.string() })),
    createdAt: v.number(),
  }).index("by_class", ["classId", "createdAt"]),

  /**
   * Marks for one learner on one assignment: from the app, typed by the
   * teacher, or read from a photographed script. Marks read from a photo stay
   * a draft until the teacher confirms them; check lists the questions the
   * second opinion did not agree with.
   */
  classMarks: defineTable({
    assignmentId: v.id("assignments"),
    classId: v.id("classes"),
    learnerProfileId: v.optional(v.id("profiles")),
    rosterId: v.optional(v.id("rosterNames")),
    via: v.union(v.literal("app"), v.literal("hand"), v.literal("photo")),
    perQuestion: perQuestionValidator,
    score: v.number(),
    total: v.number(),
    confirmed: v.boolean(),
    check: v.optional(v.array(v.number())),
    notes: v.optional(v.array(v.object({ number: v.number(), answer: v.string(), reason: v.string() }))),
    createdAt: v.number(),
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_class", ["classId"])
    .index("by_learner", ["learnerProfileId"]),

  modelPrices: defineTable({
    model: v.string(),
    promptUsdPerToken: v.number(),
    completionUsdPerToken: v.number(),
    cachedPromptUsdPerToken: v.number(),
    refreshedAt: v.number(),
  }).index("by_model", ["model"]),
});
