import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query, type ActionCtx } from "../_generated/server";
import { createEmptyCard } from "ts-fsrs";
import { ADULT_AGE, ageOn } from "../accounts/age";
import { needs, voiceOf, type Voice } from "../accounts/voices";
import { secondOpinion } from "../ai/secondOpinion";
import { MODES, PROMPTS } from "../data/generated";
import { requireLearner, requireLearnerInAction } from "../lib/access";
import type { OutputKind } from "../modes/package";
import { cleanDashes } from "../notebooks/ask";
import { ownNotebook } from "../notebooks/notebooks";
import { notebookSources, packOutputReadable, packScope } from "../packs/scope";
import { outputAllowed } from "../safety/checks";
import { coverageValidator } from "../schema";
import { settleItems, type SourceMode } from "../sources/modes";
import { applyIdeas, applyMarking, ideaItems, markingItems } from "./opinion";
import { JSON_SCHEMAS, rawSchemas, type MindmapContent, type QuizContent, type ScrollContent, type SummaryContent } from "./shapes";

/**
 * Study tools (SPEC.md 3.3): Taku makes a summary, study guide, flashcards,
 * quiz, mind map or Scroll feed from a notebook, using the mode packages in
 * modes/. Every item is cited and its quote checked, like answers.
 */

/** Characters of the notebook sent to the model in one call. More than this is read a section at a time. */
export const TOOL_SOURCE_CHARS = 30_000;
/** Sections one tool may read, each a model call. Beyond this the tool says it covers part of the choice. */
export const MAX_TOOL_SECTIONS = 8;

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

const VOICE_TEXT: Record<Voice, string> = {
  gentle: "VOICE: GENTLE. Clear, patient and warm.",
  direct: "VOICE: DIRECT. Formal, dense and exact.",
  upbeat: "VOICE: UPBEAT. Lively and punchy, still accurate, never rude.",
};

const SIMPLE_ENGLISH_TOOL = "LANGUAGE: English is not the learner's first language. Use short sentences and common words, and explain a subject word the first time you use it.";

export function toolPrompt(slug: string, c: { sourceMode: SourceMode; voice: Voice; simpleEnglish?: boolean }, options: ToolOptions): string {
  const mode = MODES[slug];
  return PROMPTS["taku-tool"]
    .replace("{{SOURCE_MODE}}", SOURCE_TEXT[c.sourceMode])
    .replace("{{VOICE}}", VOICE_TEXT[c.voice] + (c.simpleEnglish === true ? `\n\n${SIMPLE_ENGLISH_TOOL}` : ""))
    .replace("{{MODE_NAME}}", mode.frontmatter.name.toUpperCase())
    .replace("{{MODE_BODY}}", mode.body)
    .replace("{{OPTIONS}}", optionsText(options));
}

type Page = { ref: string; sourceId: Id<"sources">; title: string; page: number; text: string };

/** For widgets, which practise one thing: the first pages of the notebook, up to TOOL_SOURCE_CHARS. */
export const toolContext = internalQuery({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, args) => {
    const { profile, notebook } = await ownNotebook(ctx, args.notebookId);
    const sources = (await notebookSources(ctx, notebook)).filter((s) => s.status === "ready");
    const pages: Page[] = [];
    let chars = 0;
    for (const [i, source] of sources.entries()) {
      for (const row of await ctx.db.query("pages").withIndex("by_source_page", (q) => q.eq("sourceId", source._id)).take(40)) {
        if (chars + row.text.length > TOOL_SOURCE_CHARS) break;
        pages.push({ ref: `S${i + 1}`, sourceId: source._id, title: source.title, page: row.page, text: row.text });
        chars += row.text.length;
      }
    }
    return { profileId: profile._id, voice: voiceOf(profile), simpleEnglish: needs(profile, "english"), sourceMode: notebook.sourceMode, pages };
  },
});

/** What a tool is made from (audit U1): chosen sources, each whole or from one page to another. Nothing chosen means the whole notebook. */
export const scopeValidator = v.array(v.object({ sourceId: v.id("sources"), fromPage: v.optional(v.number()), toPage: v.optional(v.number()) }));
export type ToolScope = { sourceId: Id<"sources">; fromPage?: number; toPage?: number }[];
type Range = { ref: string; sourceId: Id<"sources">; title: string; fromPage: number; toPage: number };
type Plan = { profileId: Id<"profiles">; voice: Voice; simpleEnglish: boolean; sourceMode: SourceMode; minor: boolean; ranges: Range[] };

/** The page ranges a tool will read, checked against the learner's own notebook. */
export const toolPlan = internalQuery({
  args: { notebookId: v.id("notebooks"), scope: v.optional(scopeValidator) },
  handler: async (ctx, args): Promise<Plan> => {
    const { profile, notebook } = await ownNotebook(ctx, args.notebookId);
    // A linked notebook can make tools from its course pack's sources too.
    const sources = (await notebookSources(ctx, notebook)).filter((s) => s.status === "ready" && s.pageCount > 0);
    const refs = new Map(sources.map((s, i) => [s._id as string, { ref: `S${i + 1}`, source: s }]));
    const chosen: ToolScope = args.scope === undefined || args.scope.length === 0 ? sources.map((s) => ({ sourceId: s._id })) : args.scope.slice(0, 60);
    const ranges: Range[] = [];
    for (const pick of chosen) {
      const found = refs.get(pick.sourceId);
      // A source from another notebook, or one that is not ready, is not the learner's to use here.
      if (found === undefined) throw new ConvexError("Source not found.");
      const fromPage = Math.min(found.source.pageCount, Math.max(1, Math.round(pick.fromPage ?? 1)));
      const toPage = Math.min(found.source.pageCount, Math.max(fromPage, Math.round(pick.toPage ?? found.source.pageCount)));
      ranges.push({ ref: found.ref, sourceId: found.source._id, title: found.source.title, fromPage, toPage });
    }
    return { profileId: profile._id, voice: voiceOf(profile), simpleEnglish: needs(profile, "english"), sourceMode: notebook.sourceMode, minor: ageOn(profile.birthYear, profile.birthMonth, new Date()) < ADULT_AGE, ranges };
  },
});

/** Pages read per query, so a 300 page source never has to fit in one read. */
const PAGE_SLICE = 30;

export const toolPages = internalQuery({
  args: { sourceId: v.id("sources"), fromPage: v.number(), toPage: v.number() },
  handler: async (ctx, args): Promise<{ page: number; text: string }[]> => {
    const rows = await ctx.db.query("pages").withIndex("by_source_page", (q) => q.eq("sourceId", args.sourceId).gte("page", args.fromPage).lte("page", args.toPage)).take(PAGE_SLICE);
    return rows.map((r) => ({ page: r.page, text: r.text }));
  },
});

export type Coverage = { sourceId: string; title: string; fromPage: number; toPage: number }[];

/** Runs of pages per source, in the order used: "pages 1 to 40 of Biology.pdf". */
export function coverageOf(pages: readonly Pick<Page, "sourceId" | "title" | "page">[]): Coverage {
  const out: Coverage = [];
  for (const p of pages) {
    const last = out[out.length - 1];
    if (last !== undefined && last.sourceId === p.sourceId && p.page === last.toPage + 1) last.toPage = p.page;
    else if (last === undefined || last.sourceId !== p.sourceId || p.page > last.toPage) out.push({ sourceId: p.sourceId, title: p.title, fromPage: p.page, toPage: p.page });
  }
  return out;
}

/**
 * Splits the chosen pages into sections of at most TOOL_SOURCE_CHARS, so the
 * model reads all of them, a section at a time. Stops at MAX_TOOL_SECTIONS:
 * `complete` is false when pages were left over.
 */
async function readSections(ctx: ActionCtx, ranges: readonly Range[]): Promise<{ sections: Page[][]; complete: boolean }> {
  const sections: Page[][] = [];
  let current: Page[] = [];
  let chars = 0;
  for (const range of ranges) {
    let from = range.fromPage;
    while (from <= range.toPage) {
      const rows: { page: number; text: string }[] = await ctx.runQuery(internal.study.tools.toolPages, { sourceId: range.sourceId, fromPage: from, toPage: range.toPage });
      if (rows.length === 0) break;
      for (const row of rows) {
        // A page longer than a whole section is cut to fit rather than skipped.
        const text = row.text.slice(0, TOOL_SOURCE_CHARS);
        if (text.trim().length === 0) continue;
        if (current.length > 0 && chars + text.length > TOOL_SOURCE_CHARS) {
          sections.push(current);
          if (sections.length >= MAX_TOOL_SECTIONS) return { sections, complete: false };
          current = [];
          chars = 0;
        }
        current.push({ ref: range.ref, sourceId: range.sourceId, title: range.title, page: row.page, text });
        chars += text.length;
      }
      from = rows[rows.length - 1].page + 1;
    }
  }
  if (current.length > 0) sections.push(current);
  return { sections, complete: true };
}

/** Options for one of n sections: the items and the minutes are shared out. */
export function sectionOptions(options: ToolOptions, n: number): ToolOptions {
  if (n <= 1) return options;
  return {
    ...options,
    ...(options.count === undefined ? {} : { count: Math.max(1, Math.ceil(options.count / n)) }),
    ...(options.minutes === undefined ? {} : { minutes: Math.max(5, Math.ceil(options.minutes / n)) }),
  };
}

/** One tool from the tools made for each section, in order. */
export function mergeBuilt(kind: OutputKind, parts: readonly Built[], options: ToolOptions): Built {
  if (parts.length === 1) return parts[0];
  const missing = [...new Set(parts.map((p) => p.missing).filter((m) => m.length > 0))].slice(0, 3).join(" ");
  const dropped = parts.reduce((n, p) => n + p.dropped, 0);
  const title = parts.find((p) => p.title.length > 0)?.title ?? "";
  if (kind === "summary") {
    const sections = parts.flatMap((p) => (p.content as SummaryContent).sections);
    return { title, content: { title, sections }, items: sections.reduce((n, s) => n + s.points.length, 0), dropped, missing };
  }
  if (kind === "cards") {
    const cards = parts.flatMap((p) => p.cards ?? []);
    return { title: "", content: { count: cards.length }, items: cards.length, dropped, missing, cards };
  }
  if (kind === "quiz") {
    const all = parts.flatMap((p) => (p.content as QuizContent).questions);
    const questions = (options.count === undefined ? all : all.slice(0, options.count)).map((q, i) => ({ ...q, number: i + 1 }));
    const minutes = options.minutes ?? parts.reduce((n, p) => n + (p.content as QuizContent).minutes, 0);
    const content: QuizContent = { title, minutes: Math.max(5, Math.min(180, minutes)), totalMarks: questions.reduce((n, q) => n + q.marks, 0), questions };
    return { title, content, items: questions.length, dropped, missing };
  }
  if (kind === "mindmap") {
    const branches = parts.flatMap((p) => (p.content as MindmapContent).branches);
    return { title, content: { central: title, branches }, items: branches.reduce((n, b) => n + b.leaves.length, 0), dropped, missing };
  }
  const cards = parts.flatMap((p) => (p.content as ScrollContent).cards);
  return { title: "", content: { cards }, items: cards.length, dropped, missing };
}

export const saveOutput = internalMutation({
  args: {
    notebookId: v.id("notebooks"),
    profileId: v.id("profiles"),
    mode: v.string(),
    kind: v.string(),
    title: v.string(),
    content: v.any(),
    sourceMode: v.union(v.literal("only_mine"), v.literal("mine_plus")),
    note: v.optional(v.string()),
    coverage: v.optional(coverageValidator),
    cards: v.optional(v.array(v.object({ front: v.string(), back: v.string(), origin: v.any() }))),
  },
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
      coverage: args.coverage,
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
  learnerCap: "You have used today's Taku allowance. It comes back at 2am Harare time. Your flashcards still work in the meantime.",
  deploymentCap: "Taku has reached today's limit for everyone. It comes back at 2am Harare time.",
  busy: "That is a lot at once. Wait a minute, then try again.",
  blocked: "Taku could not check this, so it is not shown. Try again, or choose other pages.",
  partNote: "This covers part of what you chose. Choose a chapter or a page range to cover the rest.",
} as const;

export function capMessage(reason: "learner_cap" | "deployment_cap" | "busy"): string {
  if (reason === "busy") return TOOL_MESSAGES.busy;
  return reason === "learner_cap" ? TOOL_MESSAGES.learnerCap : TOOL_MESSAGES.deploymentCap;
}

function sourceBlockOf(pages: readonly Page[]): string {
  return pages.map((p) => `<source ref="${p.ref}" title="${p.title.replace(/[<>"]/g, "'")}" page="${p.page}">\n${p.text.replace(/<\/?\s*source\b[^>]*>/gi, " ")}\n</source>`).join("\n");
}

export const generate = action({
  args: {
    notebookId: v.id("notebooks"),
    mode: v.string(),
    options: v.object({ count: v.optional(v.number()), difficulty: v.optional(v.string()), minutes: v.optional(v.number()) }),
    scope: v.optional(scopeValidator),
  },
  handler: async (ctx, args): Promise<GenerateResult> => {
    await requireLearnerInAction(ctx);
    const mode = MODES[args.mode];
    if (mode === undefined) throw new ConvexError("That study tool does not exist.");
    const options = checkOptions(args.mode, args.options as ToolOptions);
    const c: Plan = await ctx.runQuery(internal.study.tools.toolPlan, { notebookId: args.notebookId, scope: args.scope });
    if (c.ranges.length === 0) return { ok: false, message: TOOL_MESSAGES.noSources };
    const room = await ctx.runMutation(internal.ai.usage.admit, { profileId: c.profileId, kind: "ask" });
    if (!room.allowed) return { ok: false, message: capMessage(room.reason) };

    const kind = mode.frontmatter.output as OutputKind;
    const { sections, complete } = await readSections(ctx, c.ranges);
    if (sections.length === 0) return { ok: false, message: TOOL_MESSAGES.noSources };
    const perSection = sectionOptions(options, sections.length);
    const built: Built[] = [];
    const used: Page[] = [];
    let stopped = !complete;
    for (const [i, pages] of sections.entries()) {
      // Every section after the first is a further call: stop at the caps and keep what is made.
      if (i > 0 && !(await ctx.runQuery(internal.ai.usage.check, { profileId: c.profileId })).allowed) {
        stopped = true;
        break;
      }
      const result = await ctx.runAction(internal.ai.router.call, {
        tier: mode.frontmatter.modelTier,
        purpose: "taku_tool",
        messages: [
          { role: "system", content: toolPrompt(args.mode, c, perSection) },
          { role: "user", content: sourceBlockOf(pages) },
        ],
        jsonSchema: { name: `taku_${kind}`, strict: true, schema: JSON_SCHEMAS[kind] },
        maxTokens: mode.frontmatter.maxTokens,
        stablePrefixCount: 1,
        fixtureKey: sections.length === 1 ? { kind: "tool", mode: args.mode, sourceMode: c.sourceMode, options } : { kind: "tool", mode: args.mode, sourceMode: c.sourceMode, options, section: i + 1, of: sections.length },
      });
      await ctx.runMutation(internal.ai.usage.record, { profileId: c.profileId, tool: args.mode, costUsd: result.costUsd });
      if (!result.ok) continue;
      let raw: unknown;
      try {
        const t = result.content.trim();
        raw = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
      } catch {
        continue;
      }
      const byRefPage = new Map(pages.map((p) => [`${p.ref}:${p.page}`, p]));
      const one = buildContent(kind, raw, c.sourceMode, (ref, page) => {
        const found = byRefPage.get(`${ref}:${page}`);
        return found === undefined ? null : { sourceId: found.sourceId as string, text: found.text };
      });
      if (one === null) continue;
      built.push(one);
      used.push(...pages);
    }
    if (built.length === 0) return { ok: false, message: TOOL_MESSAGES.failed };
    if (built.length < sections.length) stopped = true;
    const first = mergeBuilt(kind, built, options);
    if (first.items === 0) return { ok: false, message: TOOL_MESSAGES.empty };
    // A second opinion on Taku's own ideas, and on every marking scheme.
    const checked =
      kind === "quiz"
        ? applyMarking(first, await secondOpinion(ctx, { profileId: c.profileId, check: "marking", items: markingItems(first) }))
        : applyIdeas(kind, first, await secondOpinion(ctx, { profileId: c.profileId, check: "ideas", items: ideaItems(kind, first) }));
    const final = checked.built;
    if (final.items === 0) return { ok: false, message: TOOL_MESSAGES.empty };
    // Under 18s: nothing is shown before the output check allows it (audit S6).
    if (c.minor && !(await outputAllowed(ctx, { profileId: c.profileId, text: JSON.stringify({ content: final.content, cards: final.cards ?? [] }), key: { tool: args.mode } }))) return { ok: false, message: TOOL_MESSAGES.blocked };
    const notes: string[] = [];
    if (final.missing.length > 0) notes.push(cleanDashes(final.missing));
    if (final.dropped > 0) notes.push(`${final.dropped} ${final.dropped === 1 ? "item was" : "items were"} left out because ${final.dropped === 1 ? "it" : "they"} could not be found in your material.`);
    if (checked.left > 0) notes.push(`${checked.left} ${checked.left === 1 ? "item was" : "items were"} left out because a second check did not agree.`);
    if (stopped) notes.push(TOOL_MESSAGES.partNote);
    const outputId: Id<"outputs"> = await ctx.runMutation(internal.study.tools.saveOutput, {
      notebookId: args.notebookId,
      profileId: c.profileId,
      mode: args.mode,
      kind,
      title: final.title || mode.listing.title,
      content: final.content,
      sourceMode: c.sourceMode,
      note: notes.length > 0 ? notes.join(" ") : undefined,
      coverage: coverageOf(used),
      cards: final.cards,
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
export type Built = { title: string; content: unknown; items: number; dropped: number; missing: string; cards?: { front: string; back: string; origin: unknown }[] };

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
    const mine = outputs.map((o) => ({ _id: o._id, mode: o.mode, kind: o.kind, title: o.title, createdAt: o.createdAt, fromPack: false }));
    // A linked notebook lists its course pack's tools first, read only.
    const scope = await packScope(ctx, notebook);
    const fromPack = [];
    for (const id of scope?.pack.outputIds ?? []) {
      const o = await ctx.db.get(id);
      if (o !== null) fromPack.push({ _id: o._id, mode: o.mode, kind: o.kind, title: o.title, createdAt: o.createdAt, fromPack: true });
    }
    return [...fromPack, ...mine];
  },
});

export const get = query({
  args: { outputId: v.id("outputs") },
  handler: async (ctx, args) => {
    const { profile } = await requireLearner(ctx);
    const output = await ctx.db.get(args.outputId);
    if (output === null) throw new ConvexError("Not found.");
    // The learner's own tool, or one from a course pack they added (read only).
    const fromPack = output.profileId === profile._id ? null : await packOutputReadable(ctx, output, profile._id);
    if (output.profileId !== profile._id && fromPack === null) throw new ConvexError("Not found.");
    const notebook = await ctx.db.get(output.notebookId);
    if (notebook === null || notebook.deletingAt !== undefined) throw new ConvexError("Not found.");
    const sources = await notebookSources(ctx, notebook);
    return { output, fromPack: fromPack !== null, titles: Object.fromEntries(sources.map((s) => [s._id as string, s.title])) };
  },
});

export const remove = mutation({
  args: { outputId: v.id("outputs") },
  handler: async (ctx, args) => {
    const { profile } = await requireLearner(ctx);
    const output = await ctx.db.get(args.outputId);
    if (output === null || output.profileId !== profile._id) throw new ConvexError("Not found.");
    // One tool holds at most a few hundred cards and attempts, far inside one mutation.
    for (const c of await ctx.db.query("cards").withIndex("by_output", (q) => q.eq("outputId", output._id)).take(2000)) await ctx.db.delete(c._id);
    for (const a of await ctx.db.query("quizAttempts").withIndex("by_output", (q) => q.eq("outputId", output._id)).take(2000)) await ctx.db.delete(a._id);
    await ctx.db.delete(output._id);
  },
});
