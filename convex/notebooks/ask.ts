import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action, internalMutation, internalQuery } from "../_generated/server";
import { ADULT_AGE, ageOn } from "../accounts/age";
import { PROMPTS } from "../data/generated";
import { requireLearner, requireLearnerInAction } from "../lib/access";
import { prefilter, type Audience } from "../safety/prefilter";
import { settleParts, type RawPart, type SourceMode } from "../sources/modes";
import { originValidator } from "../schema";

/**
 * Ask Taku about a notebook (SPEC.md 2.2 and 3.2). In order:
 *   1. the learner owns the notebook and may study (consent);
 *   2. the deterministic prefilter (distress opens Get help);
 *   3. for under 18s, the model input check, failing closed;
 *   4. search the notebook's chunks for the question;
 *   5. Taku answers with a ref, page and quote per part;
 *   6. every quote is checked on its page (sources/modes.ts) and the
 *      source mode decides what happens to parts that fail.
 * The question and answer are kept in the notebook, which the learner owns.
 */

export const MAX_QUESTION = 2000;
const TOP_CHUNKS = 8;
const SMALL_NOTEBOOK = 12;

export const REPLIES = {
  help: "It sounds like things are really hard right now. You do not have to face this alone. Open Get help to talk to someone. Under 18 in Zimbabwe, you can call Childline on 116 for free, day or night.",
  redirect: "That is not something I can help with. I am here to help you study. What would you like to go over from your notes?",
  companion: "I am Taku, your study tutor, so I keep things to studying. What would you like to work on?",
  noSources: "Add some notes, a PDF, photos or a link to this notebook first, then ask me about them.",
  failed: "I could not answer just now. Your question was saved. Try again in a moment.",
  learnerCap: "You have asked a lot today. Take a break and come back tomorrow, or review your flashcards in the meantime.",
  deploymentCap: "Taku is very busy today and has reached today's limit. Please try again tomorrow.",
  nothingFound: "Your material does not seem to cover this.",
} as const;

export type AskContext = {
  profileId: Id<"profiles">;
  audience: Audience;
  answerMode: Doc<"profiles">["answerMode"];
  studyStyle: Doc<"profiles">["studyStyle"];
  shortChunks: boolean;
  sourceMode: SourceMode;
  readySources: number;
};

export const context = internalQuery({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, args): Promise<AskContext> => {
    const { profile } = await requireLearner(ctx);
    const notebook = await ctx.db.get(args.notebookId);
    if (notebook === null || notebook.profileId !== profile._id) throw new ConvexError("Notebook not found.");
    const sources = await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).collect();
    return {
      profileId: profile._id,
      audience: ageOn(profile.birthYear, profile.birthMonth, new Date()) < ADULT_AGE ? "minor" : "adult",
      answerMode: profile.answerMode,
      studyStyle: profile.studyStyle,
      shortChunks: profile.accessibility.shortChunks,
      sourceMode: notebook.sourceMode,
      readySources: sources.filter((s) => s.status === "ready").length,
    };
  },
});

export type Retrieved = { ref: string; sourceId: Id<"sources">; title: string; page: number; text: string };

/** The pages to show Taku: the whole notebook when it is small, otherwise the pages of the best matching chunks. */
export const retrieve = internalQuery({
  args: { notebookId: v.id("notebooks"), question: v.string() },
  handler: async (ctx, args): Promise<Retrieved[]> => {
    const all = await ctx.db.query("chunks").withIndex("by_notebook", (q) => q.eq("notebookId", args.notebookId)).take(SMALL_NOTEBOOK + 1);
    const hits = all.length <= SMALL_NOTEBOOK ? all : await ctx.db.query("chunks").withSearchIndex("search_text", (q) => q.search("text", args.question).eq("notebookId", args.notebookId)).take(TOP_CHUNKS);
    const wanted = new Map<string, { sourceId: Id<"sources">; page: number }>();
    for (const h of hits) wanted.set(`${h.sourceId}:${h.page}`, { sourceId: h.sourceId, page: h.page });
    const sourceRefs = new Map<string, string>();
    const out: Retrieved[] = [];
    for (const { sourceId, page } of wanted.values()) {
      const source = await ctx.db.get(sourceId);
      const row = await ctx.db.query("pages").withIndex("by_source_page", (q) => q.eq("sourceId", sourceId).eq("page", page)).unique();
      if (source === null || row === null) continue;
      if (!sourceRefs.has(sourceId)) sourceRefs.set(sourceId, `S${sourceRefs.size + 1}`);
      out.push({ ref: sourceRefs.get(sourceId)!, sourceId, title: source.title, page, text: row.text });
    }
    return out;
  },
});

const partValidator = v.object({ text: v.string(), origin: originValidator });

export const save = internalMutation({
  args: {
    notebookId: v.id("notebooks"),
    question: v.string(),
    reply: v.object({
      kind: v.union(v.literal("answer"), v.literal("help"), v.literal("redirect"), v.literal("error")),
      text: v.string(),
      parts: v.optional(v.array(partValidator)),
      note: v.optional(v.string()),
      sourceMode: v.optional(v.union(v.literal("only_mine"), v.literal("mine_plus"))),
      answerMode: v.optional(v.union(v.literal("answer"), v.literal("guide"))),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("messages", { notebookId: args.notebookId, role: "learner", kind: "question", text: args.question, createdAt: now });
    await ctx.db.insert("messages", { notebookId: args.notebookId, role: "taku", ...args.reply, createdAt: now + 1 });
    await ctx.db.patch(args.notebookId, { updatedAt: now });
  },
});

/** Data goes inside tags; text cannot close a tag and talk to the model. */
export function asData(text: string): string {
  return text.replace(/<\/?\s*(text|source|question)\b[^>]*>/gi, " ");
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
  guide:
    "ANSWER MODE: GUIDE ME. Do not give the final answer. Give one hint or one guiding question at a time that moves the learner to the next step, and ask them to try. If they have clearly tried and are stuck, show a worked example of a similar problem with different numbers. Never write a finished essay or paragraph for them to hand in.",
};

const STYLE_TEXT: Record<Doc<"profiles">["studyStyle"], string> = {
  locked_in: "STYLE: LOCKED IN. Formal and dense, like a good exam board mark scheme. No small talk, no slang.",
  cook: "STYLE: COOK MODE. Upbeat and punchy, short sentences, a little everyday lingo is fine (like \"lock in\"), but stay accurate and never rude.",
  calm: "STYLE: CALM. Patient and clear, steady pace, gentle tone.",
};

export function systemPrompt(c: Pick<AskContext, "sourceMode" | "answerMode" | "studyStyle" | "shortChunks">): string {
  const style = STYLE_TEXT[c.studyStyle] + (c.shortChunks ? " Keep the whole answer short: at most 5 parts." : "");
  return PROMPTS["taku-answer"].replace("{{SOURCE_MODE}}", SOURCE_MODE_TEXT[c.sourceMode]).replace("{{ANSWER_MODE}}", ANSWER_MODE_TEXT[c.answerMode]).replace("{{STYLE}}", style);
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
    },
    required: ["parts", "missing"],
    additionalProperties: false,
  },
};

export function parseAnswer(content: string): { parts: RawPart[]; missing: string } | null {
  try {
    const trimmed = content.trim();
    const parsed = JSON.parse(trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1)) as { parts?: unknown; missing?: unknown };
    if (!Array.isArray(parsed.parts)) return null;
    const parts: RawPart[] = [];
    for (const p of parsed.parts as Record<string, unknown>[]) {
      if (typeof p?.text !== "string") continue;
      parts.push({ text: p.text, ref: typeof p.ref === "string" ? p.ref : "", page: typeof p.page === "number" ? p.page : 0, quote: typeof p.quote === "string" ? p.quote : "" });
    }
    return { parts, missing: typeof parsed.missing === "string" ? parsed.missing : "" };
  } catch {
    return null;
  }
}

const INPUT_SCHEMA = {
  name: "input_verdict",
  strict: true,
  schema: {
    type: "object",
    properties: { verdict: { type: "string", enum: ["allow", "redirect", "self_harm", "harmed"] }, reason: { type: "string" } },
    required: ["verdict", "reason"],
    additionalProperties: false,
  },
};

export const ask = action({
  args: { notebookId: v.id("notebooks"), question: v.string() },
  handler: async (ctx, args): Promise<{ kind: string }> => {
    await requireLearnerInAction(ctx);
    const c: AskContext = await ctx.runQuery(internal.notebooks.ask.context, { notebookId: args.notebookId });
    const question = args.question.trim().slice(0, MAX_QUESTION);
    if (question.length === 0) throw new ConvexError("Type a question first.");
    const reply = async (r: { kind: "answer" | "help" | "redirect" | "error"; text: string; parts?: { text: string; origin: { kind: "source"; sourceId: string; page: number; quote: string } | { kind: "added" } }[]; note?: string }) => {
      await ctx.runMutation(internal.notebooks.ask.save, { notebookId: args.notebookId, question, reply: { ...r, sourceMode: c.sourceMode, answerMode: c.answerMode } });
      return { kind: r.kind };
    };

    const pre = prefilter(question, c.audience);
    if (pre.kind === "distress") return await reply({ kind: "help", text: REPLIES.help });
    if (pre.kind === "redirect") return await reply({ kind: "redirect", text: pre.category === "companion" || pre.category === "romance" ? REPLIES.companion : REPLIES.redirect });
    // Personal details from an under 18 are not sent to any model.
    if (pre.kind === "personal_info") return await reply({ kind: "redirect", text: "Please leave out phone numbers, addresses, ID numbers and full names. Ask your question again without them." });

    // Spending limits (convex/ai/usage.ts): this question can make up to two model calls.
    const room = await ctx.runQuery(internal.ai.usage.check, { profileId: c.profileId, calls: c.audience === "minor" ? 2 : 1 });
    if (!room.allowed) return await reply({ kind: "error", text: room.reason === "learner_cap" ? REPLIES.learnerCap : REPLIES.deploymentCap });
    const count = async (r: { costUsd: number }) => {
      await ctx.runMutation(internal.ai.usage.record, { profileId: c.profileId, calls: 1, costUsd: r.costUsd });
    };

    if (c.audience === "minor") {
      const check = await ctx.runAction(internal.ai.router.call, {
        tier: "fast",
        purpose: "safety_check",
        messages: [
          { role: "system", content: PROMPTS["safety-input"] },
          { role: "user", content: `<text>${asData(question)}</text>` },
        ],
        jsonSchema: INPUT_SCHEMA,
        maxTokens: 120,
        reasoningEffort: "none",
        stablePrefixCount: 1,
        fixtureKey: { kind: "input_check", question },
      });
      await count(check);
      let verdict: string | null = null;
      try {
        verdict = check.ok ? (JSON.parse(check.content) as { verdict?: string }).verdict ?? null : null;
      } catch {
        verdict = null;
      }
      if (verdict === "self_harm" || verdict === "harmed") return await reply({ kind: "help", text: REPLIES.help });
      if (verdict === "redirect") return await reply({ kind: "redirect", text: REPLIES.redirect });
      // Fail closed: no clear allow, no answer.
      if (verdict !== "allow") return await reply({ kind: "error", text: REPLIES.failed });
    }

    if (c.readySources === 0) return await reply({ kind: "redirect", text: REPLIES.noSources });
    const pages: Retrieved[] = await ctx.runQuery(internal.notebooks.ask.retrieve, { notebookId: args.notebookId, question });
    if (pages.length === 0) return await reply({ kind: "answer", text: REPLIES.nothingFound, parts: [], note: "Try other words, or add material that covers this." });

    const sourceBlock = pages.map((p) => `<source ref="${p.ref}" title="${asData(p.title).replace(/"/g, "'")}" page="${p.page}">\n${asData(p.text)}\n</source>`).join("\n");
    const result = await ctx.runAction(internal.ai.router.call, {
      tier: "main",
      purpose: "taku_answer",
      messages: [
        { role: "system", content: systemPrompt(c) },
        { role: "user", content: `${sourceBlock}\n<question>${asData(question)}</question>` },
      ],
      jsonSchema: ANSWER_SCHEMA,
      maxTokens: 2400,
      stablePrefixCount: 1,
      fixtureKey: { kind: "answer", question, sourceMode: c.sourceMode, answerMode: c.answerMode },
    });
    await count(result);
    const parsed = result.ok ? parseAnswer(result.content) : null;
    if (parsed === null) return await reply({ kind: "error", text: REPLIES.failed });

    const byRefPage = new Map(pages.map((p) => [`${p.ref}:${p.page}`, p]));
    const { kept, dropped } = settleParts(parsed.parts.map((p) => ({ ...p, text: cleanDashes(p.text) })), c.sourceMode, (ref, page) => {
      const found = byRefPage.get(`${ref}:${page}`);
      return found === undefined ? null : { sourceId: found.sourceId, text: found.text };
    });
    const notes: string[] = [];
    if (parsed.missing.trim().length > 0) notes.push(cleanDashes(parsed.missing.trim()));
    if (dropped > 0) notes.push(`${dropped} ${dropped === 1 ? "point was" : "points were"} left out because ${dropped === 1 ? "it" : "they"} could not be found in your material.`);
    return await reply({ kind: "answer", text: kept.length === 0 ? REPLIES.nothingFound : "", parts: kept, note: notes.length > 0 ? notes.join(" ") : undefined });
  },
});
