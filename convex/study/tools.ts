import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { createEmptyCard } from "ts-fsrs";
import { MODES, PROMPTS } from "../data/generated";
import { requireLearner, requireLearnerInAction } from "../lib/access";
import type { OutputKind } from "../modes/package";
import { cleanDashes } from "../notebooks/ask";
import { ownNotebook } from "../notebooks/notebooks";
import { settleItems, type SourceMode } from "../sources/modes";
import { JSON_SCHEMAS, rawSchemas, type QuizContent } from "./shapes";

/**
 * Study tools (SPEC.md 3.3): Taku makes a summary, study guide, flashcards,
 * quiz, mind map or Scroll feed from a notebook, using the mode packages in
 * modes/. Every item is cited and its quote checked, like answers.
 */

/** Characters of the notebook sent to the model for one tool. */
export const TOOL_SOURCE_CHARS = 30_000;

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type ToolOptions = { count?: number; difficulty?: (typeof DIFFICULTIES)[number]; minutes?: number };

export function checkOptions(slug: string, raw: ToolOptions): ToolOptions {
  const mode = MODES[slug];
  if (mode === undefined) throw new ConvexError("That study tool does not exist.");
  const o = mode.frontmatter.options ?? {};
  const out: ToolOptions = {};
  if (o.count !== undefined) out.count = Math.min(o.count.max, Math.max(o.count.min, Math.round(raw.count ?? o.count.default)));
  if (o.difficulty === true) out.difficulty = DIFFICULTIES.includes(raw.difficulty ?? "medium") ? (raw.difficulty ?? "medium") : "medium";
  if (o.minutes === true) out.minutes = Math.min(180, Math.max(5, Math.round(raw.minutes ?? 30)));
  return out;
}

function optionsText(o: ToolOptions): string {
  const lines: string[] = [];
  if (o.count !== undefined) lines.push(`Make ${o.count} items, or fewer if the material supports fewer.`);
  if (o.difficulty !== undefined) lines.push(`Difficulty: ${o.difficulty}.`);
  if (o.minutes !== undefined) lines.push(`Time allowed: ${o.minutes} minutes. Set the minutes field to ${o.minutes} and size the paper so a prepared learner can finish in that time.`);
  return lines.length === 0 ? "" : `OPTIONS:\n${lines.join("\n")}`;
}

const SOURCE_TEXT: Record<SourceMode, string> = {
  only_mine: "SOURCE MODE: ONLY THE LEARNER'S MATERIAL. Use only what the pages say. Every item needs a ref, page and quote. Make fewer items rather than fill a gap from general knowledge.",
  mine_plus: "SOURCE MODE: THE LEARNER'S MATERIAL PLUS YOUR IDEAS. Build on the material first and cite it. You may add items of your own where they help; those have ref \"\", page 0 and quote \"\" and are marked as yours.",
};

const STYLE_TEXT: Record<Doc<"profiles">["studyStyle"], string> = {
  locked_in: "STYLE: LOCKED IN. Formal, dense and exact.",
  cook: "STYLE: COOK MODE. Lively and punchy, still accurate, never rude.",
  calm: "STYLE: CALM. Clear and patient.",
};

export function toolPrompt(slug: string, c: { sourceMode: SourceMode; studyStyle: Doc<"profiles">["studyStyle"] }, options: ToolOptions): string {
  const mode = MODES[slug];
  return PROMPTS["taku-tool"]
    .replace("{{SOURCE_MODE}}", SOURCE_TEXT[c.sourceMode])
    .replace("{{STYLE}}", STYLE_TEXT[c.studyStyle])
    .replace("{{MODE_NAME}}", mode.frontmatter.name.toUpperCase())
    .replace("{{MODE_BODY}}", mode.body)
    .replace("{{OPTIONS}}", optionsText(options));
}

type Page = { ref: string; sourceId: Id<"sources">; title: string; page: number; text: string };

export const toolContext = internalQuery({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, args) => {
    const { profile, notebook } = await ownNotebook(ctx, args.notebookId);
    const sources = (await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).collect()).filter((s) => s.status === "ready");
    const pages: Page[] = [];
    let chars = 0;
    for (const [i, source] of sources.entries()) {
      for (const row of await ctx.db.query("pages").withIndex("by_source_page", (q) => q.eq("sourceId", source._id)).collect()) {
        if (chars + row.text.length > TOOL_SOURCE_CHARS) break;
        pages.push({ ref: `S${i + 1}`, sourceId: source._id, title: source.title, page: row.page, text: row.text });
        chars += row.text.length;
      }
    }
    return { profileId: profile._id, studyStyle: profile.studyStyle, sourceMode: notebook.sourceMode, pages };
  },
});

export const saveOutput = internalMutation({
  args: { notebookId: v.id("notebooks"), profileId: v.id("profiles"), mode: v.string(), kind: v.string(), title: v.string(), content: v.any(), sourceMode: v.union(v.literal("only_mine"), v.literal("mine_plus")), note: v.optional(v.string()), cards: v.optional(v.array(v.object({ front: v.string(), back: v.string(), origin: v.any() }))) },
  handler: async (ctx, args): Promise<Id<"outputs">> => {
    const now = Date.now();
    const outputId = await ctx.db.insert("outputs", {
      notebookId: args.notebookId,
      profileId: args.profileId,
      mode: args.mode,
      kind: args.kind as OutputKind,
      title: args.title,
      content: args.content,
      sourceMode: args.sourceMode,
      note: args.note,
      createdAt: now,
    });
    for (const card of args.cards ?? []) {
      const empty = createEmptyCard(new Date(now));
      await ctx.db.insert("cards", {
        notebookId: args.notebookId,
        outputId,
        profileId: args.profileId,
        front: card.front,
        back: card.back,
        origin: card.origin,
        due: empty.due.getTime(),
        stability: empty.stability,
        difficulty: empty.difficulty,
        elapsedDays: empty.elapsed_days,
        scheduledDays: empty.scheduled_days,
        learningSteps: empty.learning_steps,
        reps: empty.reps,
        lapses: empty.lapses,
        state: empty.state,
      });
    }
    await ctx.db.patch(args.notebookId, { updatedAt: now });
    return outputId;
  },
});

export type GenerateResult = { ok: true; outputId: Id<"outputs"> } | { ok: false; message: string };

export const TOOL_MESSAGES = {
  noSources: "Add some notes to this notebook first.",
  failed: "Taku could not make this just now. Try again in a moment.",
  empty: "Your material does not support this tool yet. Add more notes, or switch to My material plus Taku's ideas.",
  learnerCap: "You have used Taku a lot today. Come back tomorrow, or review your flashcards in the meantime.",
  deploymentCap: "Taku has reached today's limit. Please try again tomorrow.",
} as const;

export const generate = action({
  args: { notebookId: v.id("notebooks"), mode: v.string(), options: v.object({ count: v.optional(v.number()), difficulty: v.optional(v.string()), minutes: v.optional(v.number()) }) },
  handler: async (ctx, args): Promise<GenerateResult> => {
    await requireLearnerInAction(ctx);
    const mode = MODES[args.mode];
    if (mode === undefined) throw new ConvexError("That study tool does not exist.");
    const options = checkOptions(args.mode, args.options as ToolOptions);
    const c: { profileId: Id<"profiles">; studyStyle: Doc<"profiles">["studyStyle"]; sourceMode: SourceMode; pages: Page[] } = await ctx.runQuery(internal.study.tools.toolContext, { notebookId: args.notebookId });
    if (c.pages.length === 0) return { ok: false, message: TOOL_MESSAGES.noSources };
    const room = await ctx.runQuery(internal.ai.usage.check, { profileId: c.profileId, calls: 1 });
    if (!room.allowed) return { ok: false, message: room.reason === "learner_cap" ? TOOL_MESSAGES.learnerCap : TOOL_MESSAGES.deploymentCap };

    const kind = mode.frontmatter.output as OutputKind;
    const sourceBlock = c.pages.map((p) => `<source ref="${p.ref}" title="${p.title.replace(/[<>"]/g, "'")}" page="${p.page}">\n${p.text.replace(/<\/?\s*source\b[^>]*>/gi, " ")}\n</source>`).join("\n");
    const result = await ctx.runAction(internal.ai.router.call, {
      tier: mode.frontmatter.modelTier,
      purpose: "taku_tool",
      messages: [
        { role: "system", content: toolPrompt(args.mode, c, options) },
        { role: "user", content: sourceBlock },
      ],
      jsonSchema: { name: `taku_${kind}`, strict: true, schema: JSON_SCHEMAS[kind] },
      maxTokens: mode.frontmatter.maxTokens,
      stablePrefixCount: 1,
      fixtureKey: { kind: "tool", mode: args.mode, sourceMode: c.sourceMode, options },
    });
    await ctx.runMutation(internal.ai.usage.record, { profileId: c.profileId, calls: 1, costUsd: result.costUsd });
    if (!result.ok) return { ok: false, message: TOOL_MESSAGES.failed };

    let raw: unknown;
    try {
      const t = result.content.trim();
      raw = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
    } catch {
      return { ok: false, message: TOOL_MESSAGES.failed };
    }
    const byRefPage = new Map(c.pages.map((p) => [`${p.ref}:${p.page}`, p]));
    const lookup = (ref: string, page: number) => {
      const found = byRefPage.get(`${ref}:${page}`);
      return found === undefined ? null : { sourceId: found.sourceId as string, text: found.text };
    };
    const built = buildContent(kind, raw, c.sourceMode, lookup);
    if (built === null) return { ok: false, message: TOOL_MESSAGES.failed };
    if (built.items === 0) return { ok: false, message: TOOL_MESSAGES.empty };
    const notes: string[] = [];
    if (built.missing.length > 0) notes.push(cleanDashes(built.missing));
    if (built.dropped > 0) notes.push(`${built.dropped} ${built.dropped === 1 ? "item was" : "items were"} left out because ${built.dropped === 1 ? "it" : "they"} could not be found in your material.`);
    const outputId: Id<"outputs"> = await ctx.runMutation(internal.study.tools.saveOutput, {
      notebookId: args.notebookId,
      profileId: c.profileId,
      mode: args.mode,
      kind,
      title: built.title || mode.listing.title,
      content: built.content,
      sourceMode: c.sourceMode,
      note: notes.length > 0 ? notes.join(" ") : undefined,
      cards: built.cards,
    });
    return { ok: true, outputId };
  },
});

type Lookup = (ref: string, page: number) => { sourceId: string; text: string } | null;

/** Leading numbers ("1.", "Q2)") come off: the paper numbers its own questions. */
export function cleanPrompt(prompt: string): string {
  return prompt.trim().replace(/^(?:q(?:uestion)?\s*)?\d+\s*[.):]\s*/i, "").trim();
}

/**
 * The text of the correct option, from the answer or the marking points, which
 * the model may give as the option text, a letter ("C", "(c)") or "C. Oxygen".
 * Null when no option can be found: the question cannot be marked and is left out.
 */
export function mcqAnswer(answer: string, options: readonly string[], markingPoints: readonly string[]): string | null {
  const norm = (s: string) => s.trim().toLowerCase().replace(/[.\s]+$/, "");
  for (const raw of [answer, ...markingPoints]) {
    const a = norm(raw);
    if (a === "") continue;
    const exact = options.find((o) => norm(o) === a);
    if (exact !== undefined) return exact;
    const letter = a.match(/^\(?([a-d])\)?(?:[.)]|\s|$)/);
    if (letter !== null) {
      const byLetter = options["abcd".indexOf(letter[1])];
      if (byLetter !== undefined) return byLetter;
    }
    const inside = options.filter((o) => a.includes(norm(o)));
    if (inside.length === 1) return inside[0];
  }
  return null;
}
type Built = { title: string; content: unknown; items: number; dropped: number; missing: string; cards?: { front: string; back: string; origin: unknown }[] };

/** Parses the model's JSON for one kind and settles every item's citation. Null when the JSON does not fit. */
export function buildContent(kind: OutputKind, raw: unknown, mode: SourceMode, lookup: Lookup): Built | null {
  const d = cleanDashes;
  if (kind === "summary") {
    const r = rawSchemas.summary.safeParse(raw);
    if (!r.success) return null;
    let dropped = 0;
    let items = 0;
    const sections = r.data.sections
      .map((s) => {
        const settled = settleItems(s.points.map((p) => ({ ...p, text: d(p.text) })), mode, lookup);
        dropped += settled.dropped;
        items += settled.kept.length;
        return { heading: d(s.heading), points: settled.kept };
      })
      .filter((s) => s.points.length > 0);
    return { title: d(r.data.title), content: { title: d(r.data.title), sections }, items, dropped, missing: r.data.missing.trim() };
  }
  if (kind === "cards") {
    const r = rawSchemas.cards.safeParse(raw);
    if (!r.success) return null;
    const settled = settleItems(r.data.cards.map((c) => ({ ...c, front: d(c.front), back: d(c.back) })), mode, lookup);
    return { title: "", content: { count: settled.kept.length }, items: settled.kept.length, dropped: settled.dropped, missing: r.data.missing.trim(), cards: settled.kept };
  }
  if (kind === "quiz") {
    const r = rawSchemas.quiz.safeParse(raw);
    if (!r.success) return null;
    let unmarkable = 0;
    const usable = r.data.questions
      .map((q) => ({ ...q, prompt: cleanPrompt(d(q.prompt)), answer: d(q.answer), options: q.options.map((o) => d(o).replace(/^\(?[A-Da-d][).]\s+/, "")), markingPoints: q.markingPoints.map(d), marks: Math.max(1, Math.min(20, Math.round(q.marks))) }))
      .map((q) => (q.kind === "mcq" ? { ...q, answer: mcqAnswer(q.answer, q.options, q.markingPoints) ?? "" } : q))
      .filter((q) => {
        const ok = q.prompt.length > 0 && (q.kind !== "mcq" || (q.options.length >= 2 && q.answer !== ""));
        if (!ok) unmarkable += 1;
        return ok;
      });
    const settled = settleItems(usable, mode, lookup);
    settled.dropped += unmarkable;
    const questions = settled.kept.map((q, i) => ({ ...q, number: i + 1 }));
    const content: QuizContent = { title: d(r.data.title), minutes: Math.max(5, Math.min(180, Math.round(r.data.minutes))), totalMarks: questions.reduce((n, q) => n + q.marks, 0), questions };
    return { title: content.title, content, items: questions.length, dropped: settled.dropped, missing: r.data.missing.trim() };
  }
  if (kind === "mindmap") {
    const r = rawSchemas.mindmap.safeParse(raw);
    if (!r.success) return null;
    let dropped = 0;
    let items = 0;
    const branches = r.data.branches
      .map((b) => {
        const settled = settleItems(b.leaves.map((l) => ({ ...l, text: d(l.text) })), mode, lookup);
        dropped += settled.dropped;
        items += settled.kept.length;
        return { label: d(b.label), leaves: settled.kept };
      })
      .filter((b) => b.leaves.length > 0);
    return { title: d(r.data.central), content: { central: d(r.data.central), branches }, items, dropped, missing: r.data.missing.trim() };
  }
  const r = rawSchemas.scroll.safeParse(raw);
  if (!r.success) return null;
  const settled = settleItems(r.data.cards.map((c) => ({ ...c, hook: d(c.hook), text: d(c.text), answer: d(c.answer) })), mode, lookup);
  return { title: "", content: { cards: settled.kept }, items: settled.kept.length, dropped: settled.dropped, missing: r.data.missing.trim() };
}

/** The tools a learner can pick, from the mode packages. */
export const modes = query({
  args: {},
  handler: async (ctx) => {
    await requireLearner(ctx);
    const order = ["summarise", "flashcards", "quiz", "scroll", "mind-map", "study-guide"];
    const rank = (slug: string) => (order.includes(slug) ? order.indexOf(slug) : order.length);
    return Object.values(MODES)
      .sort((a, b) => rank(a.frontmatter.slug) - rank(b.frontmatter.slug))
      .map((m) => ({ slug: m.frontmatter.slug, output: m.frontmatter.output, title: m.listing.title, tagline: m.listing.tagline, options: m.frontmatter.options ?? {} }));
  },
});

export const list = query({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, args) => {
    const { notebook } = await ownNotebook(ctx, args.notebookId);
    const outputs = await ctx.db.query("outputs").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).order("desc").take(100);
    return outputs.map((o) => ({ _id: o._id, mode: o.mode, kind: o.kind, title: o.title, createdAt: o.createdAt }));
  },
});

export const get = query({
  args: { outputId: v.id("outputs") },
  handler: async (ctx, args) => {
    const { profile } = await requireLearner(ctx);
    const output = await ctx.db.get(args.outputId);
    if (output === null || output.profileId !== profile._id) throw new ConvexError("Not found.");
    const sources = await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", output.notebookId)).collect();
    return { output, titles: Object.fromEntries(sources.map((s) => [s._id as string, s.title])) };
  },
});

export const remove = mutation({
  args: { outputId: v.id("outputs") },
  handler: async (ctx, args) => {
    const { profile } = await requireLearner(ctx);
    const output = await ctx.db.get(args.outputId);
    if (output === null || output.profileId !== profile._id) throw new ConvexError("Not found.");
    for (const c of await ctx.db.query("cards").withIndex("by_output", (q) => q.eq("outputId", output._id)).collect()) await ctx.db.delete(c._id);
    for (const a of await ctx.db.query("quizAttempts").withIndex("by_output", (q) => q.eq("outputId", output._id)).collect()) await ctx.db.delete(a._id);
    await ctx.db.delete(output._id);
  },
});
