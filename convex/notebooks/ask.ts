import { ConvexError, v, type Infer } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action, internalAction, internalMutation, internalQuery, type ActionCtx, type QueryCtx } from "../_generated/server";
import { ADULT_AGE, ageOn } from "../accounts/age";
import { fuse } from "../ai/embeddings";
import { secondOpinion } from "../ai/secondOpinion";
import { PROMPTS } from "../data/generated";
import { requireLearner, requireLearnerInAction } from "../lib/access";
import { embeddingsOn } from "../lib/env";
import { BLOCKED_REPLY, inputCheck, outputAllowed } from "../safety/checks";
import { prefilter, type Audience } from "../safety/prefilter";
import { settleParts, type RawPart, type SourceMode } from "../sources/modes";
import { needs, voiceOf, type StudyMode, type Voice } from "../accounts/voices";
import { notebookSources, packScope } from "../packs/scope";
import { examFor, EXAM_TEXT, SIMPLE_ENGLISH } from "../ai/promptLines";
import { originValidator, studyModeValidator, testTurnValidator, widgetValidator } from "../schema";
import { widgetFromText, type StoredWidget } from "../widgets/inline";

/**
 * Ask Taku about a notebook (SPEC.md 2.2 and 3.2). In order:
 *   1. the learner owns the notebook and may study (consent);
 *   2. the deterministic prefilter (distress opens Get help);
 *   3. the model input check, for every learner, failing closed;
 *   4. search the notebook's chunks for the question, by words and by
 *      meaning (embeddings), and merge the two;
 *   5. Taku answers with a ref, page and quote per part;
 *   6. every quote is checked on its page (sources/modes.ts) and the
 *      source mode decides what happens to parts that fail;
 *   7. Taku's own ideas get a second opinion (ai/secondOpinion.ts);
 *   8. for under 18s, the finished answer passes the output check or is
 *      not shown.
 * The question and an unfinished answer are saved first, and the answer's
 * stage moves along so the app can show real progress. The question and answer
 * are kept in the notebook, which the learner owns.
 */

export const MAX_QUESTION = 2000;
const TOP_CHUNKS = 8;
/** Matches asked of each search before the two lists are merged. */
const SEARCH_EACH = 16;
const SMALL_NOTEBOOK = 12;

export const REPLIES = {
  help: "It sounds like things are really hard right now. You do not have to face this alone. Open Get help to talk to someone. Under 18 in Zimbabwe, you can call Childline on 116 for free, day or night.",
  redirect: "That is not something I can help with. I am here to help you study. What would you like to go over from your notes?",
  companion: "I am Taku, your study tutor, so I keep things to studying. What would you like to work on?",
  noSources: "Add some notes, a PDF, photos or a link to this notebook first, then ask me about them.",
  failed: "I could not answer just now. Your question was saved. Try again in a moment.",
  learnerCap: "You have used today's Taku allowance. It comes back at 2am Harare time. Your flashcards still work in the meantime.",
  deploymentCap: "Taku is very busy and has reached today's limit for everyone. It comes back at 2am Harare time.",
  busy: "That is a lot at once. Wait a minute, then ask again.",
  nothingFound: "Your material does not seem to cover this.",
} as const;

export function capReply(reason: "learner_cap" | "deployment_cap" | "busy"): string {
  if (reason === "busy") return REPLIES.busy;
  return reason === "learner_cap" ? REPLIES.learnerCap : REPLIES.deploymentCap;
}

export type AskContext = {
  profileId: Id<"profiles">;
  audience: Audience;
  answerMode: Doc<"profiles">["answerMode"];
  voice: Voice;
  shortChunks: boolean;
  simpleEnglish: boolean;
  studyingFor: Doc<"profiles">["studyingFor"];
  sourceMode: SourceMode;
  readySources: number;
  /** The question Taku asked last in Test me, if the learner has not answered it yet. */
  asked: { question: string; answer: string; origin?: Infer<typeof originValidator> } | null;
};

export const context = internalQuery({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, args): Promise<AskContext> => {
    const { profile } = await requireLearner(ctx);
    const notebook = await ctx.db.get(args.notebookId);
    if (notebook === null || notebook.profileId !== profile._id) throw new ConvexError("Notebook not found.");
    const sources = await notebookSources(ctx, notebook);
    const last = await ctx.db.query("messages").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).order("desc").first();
    return {
      profileId: profile._id,
      audience: ageOn(profile.birthYear, profile.birthMonth, new Date()) < ADULT_AGE ? "minor" : "adult",
      answerMode: profile.answerMode,
      voice: voiceOf(profile),
      shortChunks: profile.accessibility.shortChunks,
      simpleEnglish: needs(profile, "english"),
      studyingFor: profile.studyingFor,
      sourceMode: notebook.sourceMode,
      readySources: sources.filter((s) => s.status === "ready").length,
      asked: last?.role === "taku" && last.test !== undefined && last.test.question !== "" ? { question: last.test.question, answer: last.test.answer, ...(last.test.origin === undefined ? {} : { origin: last.test.origin }) } : null,
    };
  },
});

export type Retrieved = { ref: string; sourceId: Id<"sources">; title: string; page: number; text: string };

/** Where a notebook's chunks live: its own, and for a linked notebook the course pack's notebook, limited to the published sources. */
async function chunkScope(ctx: QueryCtx, notebookId: Id<"notebooks">): Promise<{ notebookIds: Id<"notebooks">[]; packSources: Set<string> | null }> {
  const notebook = await ctx.db.get(notebookId);
  const scope = notebook === null ? null : await packScope(ctx, notebook);
  if (scope === null) return { notebookIds: [notebookId], packSources: null };
  return { notebookIds: [notebookId, scope.pack.notebookId], packSources: new Set(scope.sources.map((s) => s._id as string)) };
}

function inScope(chunk: Doc<"chunks">, notebookId: Id<"notebooks">, s: { notebookIds: Id<"notebooks">[]; packSources: Set<string> | null }): boolean {
  if (chunk.notebookId === notebookId) return true;
  return s.packSources !== null && s.notebookIds.includes(chunk.notebookId) && s.packSources.has(chunk.sourceId);
}

/** Chunks that match the question's words, best first. `small` means the notebook is small enough to send whole. */
export const keywordHits = internalQuery({
  args: { notebookId: v.id("notebooks"), question: v.string() },
  handler: async (ctx, args): Promise<{ small: boolean; chunkIds: Id<"chunks">[]; notebookIds: Id<"notebooks">[] }> => {
    const s = await chunkScope(ctx, args.notebookId);
    const all: Doc<"chunks">[] = [];
    for (const id of s.notebookIds) {
      for (const c of await ctx.db.query("chunks").withIndex("by_notebook", (q) => q.eq("notebookId", id)).take(SMALL_NOTEBOOK + 1)) if (inScope(c, args.notebookId, s)) all.push(c);
    }
    if (all.length <= SMALL_NOTEBOOK) return { small: true, chunkIds: all.map((c) => c._id), notebookIds: s.notebookIds };
    const lists: string[][] = [];
    for (const id of s.notebookIds) {
      const hits = await ctx.db.query("chunks").withSearchIndex("search_text", (q) => q.search("text", args.question).eq("notebookId", id)).take(SEARCH_EACH);
      lists.push(hits.filter((c) => inScope(c, args.notebookId, s)).map((c) => c._id as string));
    }
    return { small: false, chunkIds: (lists.length === 1 ? lists[0] : fuse(lists)) as Id<"chunks">[], notebookIds: s.notebookIds };
  },
});

/** The pages of the chosen chunks, in the order given, each page once. Chunks of a source being deleted are left out. */
export const pagesFor = internalQuery({
  args: { notebookId: v.id("notebooks"), chunkIds: v.array(v.id("chunks")) },
  handler: async (ctx, args): Promise<Retrieved[]> => {
    const s = await chunkScope(ctx, args.notebookId);
    const wanted = new Map<string, { sourceId: Id<"sources">; page: number }>();
    for (const id of args.chunkIds) {
      const chunk = await ctx.db.get(id);
      // The notebook is checked again here: a vector match must never bring in another notebook's page.
      if (chunk === null || !inScope(chunk, args.notebookId, s)) continue;
      wanted.set(`${chunk.sourceId}:${chunk.page}`, { sourceId: chunk.sourceId, page: chunk.page });
    }
    const sourceRefs = new Map<string, string>();
    const out: Retrieved[] = [];
    for (const { sourceId, page } of wanted.values()) {
      const source = await ctx.db.get(sourceId);
      const row = await ctx.db.query("pages").withIndex("by_source_page", (q) => q.eq("sourceId", sourceId).eq("page", page)).unique();
      if (source === null || source.deletingAt !== undefined || row === null) continue;
      if (!sourceRefs.has(sourceId)) sourceRefs.set(sourceId, `S${sourceRefs.size + 1}`);
      out.push({ ref: sourceRefs.get(sourceId)!, sourceId, title: source.title, page, text: row.text });
    }
    return out;
  },
});

/**
 * The pages to show Taku (audit U2). A small notebook goes whole. Otherwise
 * two searches run, by words (the search index) and by meaning (the vector
 * index, on the question's embedding), and their rankings are merged, so a
 * question worded differently from the notes still finds the page. If the
 * embedding cannot be made, the word search alone is used.
 */
export async function retrievePages(ctx: ActionCtx, args: { notebookId: Id<"notebooks">; profileId: Id<"profiles">; question: string }): Promise<Retrieved[]> {
  const words: { small: boolean; chunkIds: Id<"chunks">[]; notebookIds: Id<"notebooks">[] } = await ctx.runQuery(internal.notebooks.ask.keywordHits, { notebookId: args.notebookId, question: args.question });
  let ranked: string[] = words.chunkIds;
  if (!words.small && embeddingsOn()) {
    const embedded: { ok: boolean; vectors: number[][]; costUsd: number } = await ctx.runAction(internal.ai.router.embed, { inputs: [args.question] });
    await ctx.runMutation(internal.ai.usage.record, { profileId: args.profileId, tool: "embed", costUsd: embedded.costUsd });
    if (embedded.ok && embedded.vectors.length === 1) {
      const [first, second] = words.notebookIds;
      // A linked notebook also searches its course pack; pagesFor keeps only the pack's published sources.
      const near = await ctx.vectorSearch("chunks", "by_embedding", { vector: embedded.vectors[0], limit: SEARCH_EACH, filter: (q) => (second === undefined ? q.eq("notebookId", first) : q.or(q.eq("notebookId", first), q.eq("notebookId", second))) });
      ranked = fuse([words.chunkIds, near.map((n) => n._id as string)]);
    }
  }
  if (!words.small) ranked = ranked.slice(0, TOP_CHUNKS);
  return await ctx.runQuery(internal.notebooks.ask.pagesFor, { notebookId: args.notebookId, chunkIds: ranked as Id<"chunks">[] });
}

/** For the owner and for tests: what a question would bring back from a notebook. `npx convex run notebooks/ask:retrieve`. */
export const retrieve = internalAction({
  args: { notebookId: v.id("notebooks"), profileId: v.id("profiles"), question: v.string() },
  handler: async (ctx, args): Promise<Retrieved[]> => await retrievePages(ctx, args),
});

const partValidator = v.object({ text: v.string(), origin: originValidator });

/** The question, and an unfinished answer that shows the first stage. */
export const begin = internalMutation({
  args: { notebookId: v.id("notebooks"), question: v.string(), sourceMode: v.union(v.literal("only_mine"), v.literal("mine_plus")), answerMode: v.union(v.literal("answer"), v.literal("guide")), studyMode: studyModeValidator },
  handler: async (ctx, args): Promise<Id<"messages">> => {
    const now = Date.now();
    await ctx.db.insert("messages", { notebookId: args.notebookId, role: "learner", kind: "question", text: args.question, createdAt: now });
    await ctx.db.patch(args.notebookId, { updatedAt: now });
    return await ctx.db.insert("messages", { notebookId: args.notebookId, role: "taku", kind: "answer", text: "", stage: "reading", sourceMode: args.sourceMode, answerMode: args.answerMode, studyMode: args.studyMode, createdAt: now + 1 });
  },
});

export const setStage = internalMutation({
  args: { messageId: v.id("messages"), stage: v.union(v.literal("reading"), v.literal("writing"), v.literal("checking")) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { stage: args.stage });
  },
});

export const finish = internalMutation({
  args: {
    messageId: v.id("messages"),
    reply: v.object({
      kind: v.union(v.literal("answer"), v.literal("help"), v.literal("redirect"), v.literal("error")),
      text: v.string(),
      parts: v.optional(v.array(partValidator)),
      note: v.optional(v.string()),
      widget: v.optional(widgetValidator),
      test: v.optional(testTurnValidator),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { ...args.reply, stage: undefined });
  },
});

/** Data goes inside tags; text cannot close a tag and talk to the model. */
export function asData(text: string): string {
  return text.replace(/<\/?\s*(text|source|question|asked|expected)\b[^>]*>/gi, " ");
}

/** Em and en dashes become commas (copy rule); the model is also told not to use them. */
export function cleanDashes(text: string): string {
  return text.replace(/\s*[\u2013\u2014]\s*/g, ", ");
}

const SOURCE_MODE_TEXT: Record<SourceMode, string> = {
  only_mine:
    "SOURCE MODE: ONLY THE LEARNER'S MATERIAL. Use only what the pages say. Do not add facts, examples or explanations from general knowledge, not even ones you are sure of. Every part needs a ref, page and quote. If the material does not answer the question, say what is missing in missing and keep parts to what the material supports (an empty list is fine).",
  mine_plus:
    "SOURCE MODE: THE LEARNER'S MATERIAL PLUS YOUR IDEAS. Use the material first and cite it. You may add explanations and examples of your own where they help; those parts have ref \"\", page 0 and quote \"\" and the app marks them as yours.",
};

const ANSWER_MODE_TEXT: Record<Doc<"profiles">["answerMode"], string> = {
  answer: "ANSWER MODE: SHOW ME THE ANSWER. Give the answer with full working, step by step, so the learner can follow every step.",
  guide: `ANSWER MODE: GUIDE ME. Do not give the final answer. Give one hint or one guiding question at a time that moves the learner to the next step, and ask them to try. If they have clearly tried and are stuck, show a worked example of a similar problem with different numbers. Never write a finished essay or paragraph for them to hand in.

WIDGETS IN GUIDE ME. When it helps the learner practise, set widget to one of these, with data as a JSON string. Never put the final answer in a hint.
- slug "equation-steps" for an equation in one unknown. data: {"title": "...", "equation": "2x + 3 = 11", "variable": "x", "hints": ["..."]}
- slug "long-division" for a long division. data: {"title": "...", "dividend": 1234, "divisor": 7}
- slug "fill-blanks" to recall facts from the pages. data: {"title": "...", "items": [{"before": "words before the gap", "answer": "the missing word", "after": "words after the gap", "alternatives": [], "hint": "...", "ref": "S1", "page": 1, "quote": "exact words from that page that include the answer"}]}`,
};

const VOICE_TEXT: Record<Voice, string> = {
  gentle: "VOICE: GENTLE. Patient and clear, steady pace, warm and calm.",
  direct: "VOICE: DIRECT. Plain and exact, like a good exam board mark scheme. No small talk, no slang.",
  upbeat: "VOICE: UPBEAT. Lively and encouraging, short sentences, a little everyday lingo is fine (like \"lock in\"), but stay accurate and never rude.",
};

const MODE_TEXT: Record<Exclude<StudyMode, "exam">, string> = {
  learn: "STUDY MODE: LEARN. Explain the idea clearly, then give one worked example, then make the last part one short check question for the learner to answer before moving on. When the learner answers a check question, say whether they are right first.",
  test: `STUDY MODE: TEST ME. Test the learner on their material, one question at a time. When the learner answers the asked question, mark it at once against the expected answer, accepting other correct wording: in parts, say plainly whether it is right, and if it is not, give the right answer, cited to its page. Set test.correct to "yes" or "no", or "none" when there was nothing to mark. Then set test.question to the next question, on something the pages say, and test.answer to its right answer in a few words, with test.ref, test.page and test.quote (5 to 25 words copied from the page that holds the answer). Never put the new question's answer in parts.`,
  sprint: "STUDY MODE: SPRINT. The learner is in a short timed study sprint. Keep the whole answer under 120 words, in at most 3 parts. One idea only. End with the next small step.",
};

export function systemPrompt(c: Pick<AskContext, "sourceMode" | "answerMode" | "voice" | "shortChunks" | "simpleEnglish" | "studyingFor">, mode: StudyMode = "learn"): string {
  const voice = VOICE_TEXT[c.voice] + (c.shortChunks && mode !== "sprint" ? " Keep the whole answer short: at most 5 parts." : "") + (c.simpleEnglish ? `\n\n${SIMPLE_ENGLISH} Put the key words in the last part.` : "");
  const study = mode === "exam" ? EXAM_TEXT(examFor(c.studyingFor)) : MODE_TEXT[mode];
  return PROMPTS["taku-answer"].replace("{{SOURCE_MODE}}", SOURCE_MODE_TEXT[c.sourceMode]).replace("{{ANSWER_MODE}}", ANSWER_MODE_TEXT[c.answerMode]).replace("{{VOICE}}", voice).replace("{{STUDY_MODE}}", study);
}
export const ANSWER_SCHEMA = {
  name: "taku_answer",
  strict: true,
  schema: {
    type: "object",
    properties: {
      parts: {
        type: "array",
        items: {
          type: "object",
          properties: { text: { type: "string" }, ref: { type: "string" }, page: { type: "integer" }, quote: { type: "string" } },
          required: ["text", "ref", "page", "quote"],
          additionalProperties: false,
        },
      },
      missing: { type: "string" },
      widget: {
        type: "object",
        properties: { slug: { type: "string", enum: ["", "equation-steps", "fill-blanks", "long-division"] }, data: { type: "string" } },
        required: ["slug", "data"],
        additionalProperties: false,
      },
    },
    required: ["parts", "missing", "widget"],
    additionalProperties: false,
  },
};

/** Test me answers also carry the mark and the next question, with its answer cited to a page. */
export const TEST_SCHEMA = {
  name: "taku_test",
  strict: true,
  schema: {
    ...ANSWER_SCHEMA.schema,
    properties: {
      ...ANSWER_SCHEMA.schema.properties,
      test: {
        type: "object",
        properties: { correct: { type: "string", enum: ["yes", "no", "none"] }, question: { type: "string" }, answer: { type: "string" }, ref: { type: "string" }, page: { type: "integer" }, quote: { type: "string" } },
        required: ["correct", "question", "answer", "ref", "page", "quote"],
        additionalProperties: false,
      },
    },
    required: [...ANSWER_SCHEMA.schema.required, "test"],
  },
};

export type RawTest = { correct: "yes" | "no" | "none"; question: string; answer: string; ref: string; page: number; quote: string };

export function parseTest(content: string): RawTest | null {
  try {
    const trimmed = content.trim();
    const t = (JSON.parse(trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1)) as { test?: Record<string, unknown> }).test;
    if (t === undefined || typeof t.question !== "string" || typeof t.answer !== "string") return null;
    const correct = t.correct === "yes" || t.correct === "no" ? t.correct : "none";
    return { correct, question: t.question.trim().slice(0, 600), answer: t.answer.trim().slice(0, 600), ref: typeof t.ref === "string" ? t.ref : "", page: typeof t.page === "number" ? t.page : 0, quote: typeof t.quote === "string" ? t.quote : "" };
  } catch {
    return null;
  }
}

export function parseAnswer(content: string): { parts: RawPart[]; missing: string; widget: { slug: string; data: string } | null } | null {
  try {
    const trimmed = content.trim();
    const parsed = JSON.parse(trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1)) as { parts?: unknown; missing?: unknown; widget?: { slug?: unknown; data?: unknown } };
    if (!Array.isArray(parsed.parts)) return null;
    const parts: RawPart[] = [];
    for (const p of parsed.parts as Record<string, unknown>[]) {
      if (typeof p?.text !== "string") continue;
      parts.push({ text: p.text, ref: typeof p.ref === "string" ? p.ref : "", page: typeof p.page === "number" ? p.page : 0, quote: typeof p.quote === "string" ? p.quote : "" });
    }
    const w = parsed.widget;
    const widget = typeof w?.slug === "string" && w.slug !== "" && typeof w.data === "string" ? { slug: w.slug, data: w.data } : null;
    return { parts, missing: typeof parsed.missing === "string" ? parsed.missing : "", widget };
  } catch {
    return null;
  }
}

type AskReply = { kind: "answer" | "help" | "redirect" | "error"; text: string; parts?: { text: string; origin: { kind: "source"; sourceId: string; page: number; quote: string } | { kind: "added"; unchecked?: boolean } }[]; note?: string; widget?: StoredWidget; test?: Infer<typeof testTurnValidator> };

/**
 * Test me in a notebook. A wrong answer to the asked question becomes a
 * review card with the expected answer and its citation. The next question's
 * answer is quote checked like any part: in Only my material a question whose
 * answer is not found on the page is not asked.
 */
async function settleNotebookTest(
  ctx: ActionCtx,
  a: { profileId: Id<"profiles">; notebookId: Id<"notebooks">; sourceMode: SourceMode; asked: AskContext["asked"]; raw: RawTest | null; lookup: (ref: string, page: number) => { sourceId: string; text: string } | null; notes: string[] },
): Promise<Infer<typeof testTurnValidator> | undefined> {
  if (a.raw === null) return undefined;
  const correct = a.asked === null || a.raw.correct === "none" ? undefined : a.raw.correct === "yes";
  if (correct === false && a.asked !== null) await ctx.runMutation(internal.study.testCards.add, { profileId: a.profileId, notebookId: a.notebookId, front: a.asked.question, back: a.asked.answer, ...(a.asked.origin === undefined ? {} : { origin: a.asked.origin }) });
  const settled = a.raw.question === "" ? { kept: [], dropped: 0 } : settleParts([{ text: a.raw.answer, ref: a.raw.ref, page: a.raw.page, quote: a.raw.quote }], a.sourceMode, a.lookup);
  const next = settled.kept[0];
  if (a.raw.question !== "" && next === undefined) a.notes.push("Taku could not find the answer to its next question in your material, so it did not ask one. Send any message to try another.");
  if (next === undefined) return correct === undefined ? undefined : { question: "", answer: "", correct };
  return { question: cleanDashes(a.raw.question), answer: cleanDashes(next.text), origin: next.origin, ...(correct === undefined ? {} : { correct }) };
}

export const ask = action({
  args: { notebookId: v.id("notebooks"), question: v.string(), studyMode: v.optional(studyModeValidator) },
  handler: async (ctx, args): Promise<{ kind: string }> => {
    await requireLearnerInAction(ctx);
    const c: AskContext = await ctx.runQuery(internal.notebooks.ask.context, { notebookId: args.notebookId });
    const mode: StudyMode = args.studyMode ?? "learn";
    const asked = mode === "test" ? c.asked : null;
    const question = args.question.trim().slice(0, MAX_QUESTION);
    if (question.length === 0) throw new ConvexError("Type a question first.");
    const messageId: Id<"messages"> = await ctx.runMutation(internal.notebooks.ask.begin, { notebookId: args.notebookId, question, sourceMode: c.sourceMode, answerMode: c.answerMode, studyMode: mode });
    const reply = async (r: AskReply) => {
      await ctx.runMutation(internal.notebooks.ask.finish, { messageId, reply: r });
      return { kind: r.kind };
    };
    const count = async (tool: string, r: { costUsd: number }) => {
      await ctx.runMutation(internal.ai.usage.record, { profileId: c.profileId, tool, costUsd: r.costUsd });
    };
    // Under 18s: the finished answer is checked before it is saved, so it is never on screen unchecked.
    const checkedReply = async (r: AskReply) => {
      const shown = [r.text, ...(r.parts ?? []).map((p) => p.text), r.note ?? "", r.widget === undefined ? "" : JSON.stringify(r.widget.data)].join("\n");
      if (c.audience === "minor" && !(await outputAllowed(ctx, { profileId: c.profileId, text: shown, key: { question } }))) return await reply({ kind: "error", text: BLOCKED_REPLY });
      return await reply(r);
    };

    try {
      const pre = prefilter(question, c.audience);
      if (pre.kind === "distress") return await reply({ kind: "help", text: REPLIES.help });
      if (pre.kind === "redirect") return await reply({ kind: "redirect", text: pre.category === "companion" || pre.category === "romance" ? REPLIES.companion : REPLIES.redirect });
      // Personal details from an under 18 are not sent to any model.
      if (pre.kind === "personal_info") return await reply({ kind: "redirect", text: "Please leave out phone numbers, addresses, ID numbers and full names. Ask your question again without them." });

      // Spending limits (convex/ai/usage.ts).
      const room = await ctx.runMutation(internal.ai.usage.admit, { profileId: c.profileId, kind: "ask" });
      if (!room.allowed) return await reply({ kind: "error", text: capReply(room.reason) });

      // Every learner, whatever age they gave (audit S5). Fail closed: no clear allow, no answer.
      const verdict = await inputCheck(ctx, { profileId: c.profileId, question });
      if (verdict === "help") return await reply({ kind: "help", text: REPLIES.help });
      if (verdict === "redirect") return await reply({ kind: "redirect", text: REPLIES.redirect });
      if (verdict !== "allow") return await reply({ kind: "error", text: REPLIES.failed });

      if (c.readySources === 0) return await reply({ kind: "redirect", text: REPLIES.noSources });
      // In Test me the learner's answer alone may share few words with the notes; the asked question finds its page.
      const pages: Retrieved[] = await retrievePages(ctx, { notebookId: args.notebookId, profileId: c.profileId, question: asked === null ? question : `${asked.question} ${question}` });
      if (pages.length === 0) return await reply({ kind: "answer", text: REPLIES.nothingFound, parts: [], note: "Try other words, or add material that covers this." });

      await ctx.runMutation(internal.notebooks.ask.setStage, { messageId, stage: "writing" });
      const sourceBlock = pages.map((p) => `<source ref="${p.ref}" title="${asData(p.title).replace(/"/g, "'")}" page="${p.page}">\n${asData(p.text)}\n</source>`).join("\n");
      const result = await ctx.runAction(internal.ai.router.call, {
        tier: "main",
        purpose: "taku_answer",
        messages: [
          { role: "system", content: systemPrompt(c, mode) },
          { role: "user", content: `${sourceBlock}\n${asked === null ? "" : `<asked>${asData(asked.question)}</asked>\n<expected>${asData(asked.answer)}</expected>\nThe learner's message is their answer to the asked question.\n`}<question>${asData(question)}</question>` },
        ],
        jsonSchema: mode === "test" ? TEST_SCHEMA : ANSWER_SCHEMA,
        maxTokens: mode === "sprint" ? 900 : 2400,
        stablePrefixCount: 1,
        // Learn keeps the key it had before study modes, so existing fixtures still match.
        fixtureKey: mode === "learn" ? { kind: "answer", question, sourceMode: c.sourceMode, answerMode: c.answerMode } : { kind: "answer", question, sourceMode: c.sourceMode, answerMode: c.answerMode, studyMode: mode, asked: asked?.question ?? "" },
      });
      await count("answer", result);
      const parsed = result.ok ? parseAnswer(result.content) : null;
      if (parsed === null) return await reply({ kind: "error", text: REPLIES.failed });

      await ctx.runMutation(internal.notebooks.ask.setStage, { messageId, stage: "checking" });
      const byRefPage = new Map(pages.map((p) => [`${p.ref}:${p.page}`, p]));
      const lookup = (ref: string, page: number) => {
        const found = byRefPage.get(`${ref}:${page}`);
        return found === undefined ? null : { sourceId: found.sourceId as string, text: found.text };
      };
      const { kept, dropped } = settleParts(parsed.parts.map((p) => ({ ...p, text: cleanDashes(p.text) })), c.sourceMode, lookup);

      // A hint in Guide me is a question, not a claim, so only full answers get a second opinion.
      const ideas = c.answerMode === "answer" ? kept.flatMap((p, i) => (p.origin.kind === "added" ? [{ id: String(i), text: p.text }] : [])) : [];
      const opinion = await secondOpinion(ctx, { profileId: c.profileId, check: "ideas", items: ideas });
      const final = kept.flatMap((p, i) => {
        if (opinion.rejected.has(String(i))) return [];
        return opinion.unchecked.has(String(i)) ? [{ text: p.text, origin: { kind: "added" as const, unchecked: true } }] : [p];
      });

      const notes: string[] = [];
      if (parsed.missing.trim().length > 0) notes.push(cleanDashes(parsed.missing.trim()));
      if (dropped > 0) notes.push(`${dropped} ${dropped === 1 ? "point was" : "points were"} left out because ${dropped === 1 ? "it" : "they"} could not be found in your material.`);
      if (opinion.rejected.size > 0) notes.push(`${opinion.rejected.size} of Taku's ideas ${opinion.rejected.size === 1 ? "was" : "were"} left out because a second check did not agree.`);
      const widget = c.answerMode === "guide" && parsed.widget !== null ? widgetFromText(JSON.stringify(parsed.widget), ["equation-steps", "fill-blanks", "long-division"], lookup) : null;
      const test = mode === "test" ? await settleNotebookTest(ctx, { profileId: c.profileId, notebookId: args.notebookId, sourceMode: c.sourceMode, asked, raw: parseTest(result.content), lookup, notes }) : undefined;
      const empty = final.length === 0 && test === undefined;
      return await checkedReply({ kind: "answer", text: empty ? REPLIES.nothingFound : "", parts: final, note: notes.length > 0 ? notes.join(" ") : undefined, ...(widget === null ? {} : { widget }), ...(test === undefined ? {} : { test }) });
    } catch (error) {
      // Never leave an answer stuck on its progress line.
      await ctx.runMutation(internal.notebooks.ask.finish, { messageId, reply: { kind: "error", text: REPLIES.failed } });
      throw error;
    }
  },
});
