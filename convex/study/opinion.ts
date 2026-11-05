import type { Opinion, OpinionItem } from "../ai/secondOpinion";
import type { OutputKind } from "../modes/package";
import type { Origin } from "../sources/modes";
import type { QuizContent, QuizQuestion } from "./shapes";

/**
 * Applying a second opinion (convex/ai/secondOpinion.ts) to the content of a
 * study tool. Plain TypeScript, unit tested in tests/unit/opinion.test.ts.
 * Taku's ideas are the items whose origin is "added". A quiz is checked whole,
 * through its marking scheme.
 */

export type BuiltContent = { title: string; content: unknown; items: number; dropped: number; missing: string; cards?: { front: string; back: string; origin: unknown }[] };

type Marked = { origin: Origin };
type Summary = { title: string; sections: { heading: string; points: (Marked & { text: string })[] }[] };
type MindMap = { central: string; branches: { label: string; leaves: (Marked & { text: string })[] }[] };
type Scroll = { cards: (Marked & { text: string; answer: string })[] };

function isIdea(item: Marked): boolean {
  return item.origin.kind === "added";
}

/** Taku's ideas in a tool, each with an id that says where it is. */
export function ideaItems(kind: OutputKind, built: BuiltContent): OpinionItem[] {
  if (kind === "summary") {
    return (built.content as Summary).sections.flatMap((s, i) => s.points.flatMap((p, j) => (isIdea(p) ? [{ id: `${i}.${j}`, text: p.text }] : [])));
  }
  if (kind === "cards") {
    return (built.cards ?? []).flatMap((c, i) => (isIdea(c as Marked) ? [{ id: String(i), text: `${c.front} ${c.back}` }] : []));
  }
  if (kind === "mindmap") {
    return (built.content as MindMap).branches.flatMap((b, i) => b.leaves.flatMap((l, j) => (isIdea(l) ? [{ id: `${i}.${j}`, text: l.text }] : [])));
  }
  if (kind === "scroll") {
    return (built.content as Scroll).cards.flatMap((c, i) => (isIdea(c) ? [{ id: String(i), text: `${c.text} ${c.answer}`.trim() }] : []));
  }
  return [];
}

/** Keeps or marks one item; null means it is left out. */
function settle<T extends Marked>(item: T, id: string, opinion: Opinion): T | null {
  if (opinion.rejected.has(id)) return null;
  if (opinion.unchecked.has(id)) return { ...item, origin: { kind: "added", unchecked: true } };
  return item;
}

function present<T>(value: T | null): value is T {
  return value !== null;
}

/** The tool with rejected ideas left out and unjudged ones marked; left says how many went. */
export function applyIdeas(kind: OutputKind, built: BuiltContent, opinion: Opinion): { built: BuiltContent; left: number } {
  const left = opinion.rejected.size;
  if (left === 0 && opinion.unchecked.size === 0) return { built, left };
  if (kind === "summary") {
    const content = built.content as Summary;
    const sections = content.sections.map((s, i) => ({ ...s, points: s.points.map((p, j) => settle(p, `${i}.${j}`, opinion)).filter(present) })).filter((s) => s.points.length > 0);
    return { built: { ...built, content: { ...content, sections }, items: built.items - left }, left };
  }
  if (kind === "cards") {
    const cards = (built.cards ?? []).map((c, i) => settle(c as typeof c & Marked, String(i), opinion)).filter(present);
    return { built: { ...built, cards, content: { count: cards.length }, items: cards.length }, left };
  }
  if (kind === "mindmap") {
    const content = built.content as MindMap;
    const branches = content.branches.map((b, i) => ({ ...b, leaves: b.leaves.map((l, j) => settle(l, `${i}.${j}`, opinion)).filter(present) })).filter((b) => b.leaves.length > 0);
    return { built: { ...built, content: { ...content, branches }, items: built.items - left }, left };
  }
  if (kind === "scroll") {
    const cards = (built.content as Scroll).cards.map((c, i) => settle(c, String(i), opinion)).filter(present);
    return { built: { ...built, content: { cards }, items: cards.length }, left };
  }
  return { built, left: 0 };
}

export function markingText(q: Pick<QuizQuestion, "prompt" | "answer" | "marks" | "markingPoints" | "options">): string {
  const options = q.options.length > 0 ? `\nOptions: ${q.options.join("; ")}` : "";
  return `Question: ${q.prompt}${options}\nAnswer: ${q.answer}\nMarks: ${q.marks}\nMarking points: ${q.markingPoints.join("; ")}`;
}

export function markingItems(built: BuiltContent): OpinionItem[] {
  return (built.content as QuizContent).questions.map((q) => ({ id: String(q.number), text: markingText(q) }));
}

/** The paper without rejected questions, renumbered, and saying whether the whole scheme was checked. */
export function applyMarking(built: BuiltContent, opinion: Opinion): { built: BuiltContent; left: number } {
  const content = built.content as QuizContent;
  const questions = content.questions.filter((q) => !opinion.rejected.has(String(q.number))).map((q, i) => ({ ...q, number: i + 1 }));
  const next: QuizContent = { ...content, questions, totalMarks: questions.reduce((n, q) => n + q.marks, 0), schemeChecked: opinion.unchecked.size === 0 };
  return { built: { ...built, content: next, items: questions.length }, left: content.questions.length - questions.length };
}
