import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { QuizContent, ScrollContent, SummaryContent } from "../../convex/study/shapes";
import { makeLearner, makeT, type Person } from "./people";

const NOTES = "Photosynthesis\nGreen plants make glucose from carbon dioxide and water using light energy.\nChlorophyll in the chloroplasts absorbs the light.\nOxygen is released as a by product.";

async function setUp(p: Person): Promise<Id<"notebooks">> {
  const notebookId = await p.as.mutation(api.notebooks.notebooks.create, { title: "Biology" });
  await p.as.mutation(api.notebooks.sources.addText, { notebookId, title: "Biology notes", text: NOTES });
  return notebookId;
}

async function make(p: Person, notebookId: Id<"notebooks">, mode: string, options: Record<string, number | string> = {}) {
  const r = await p.as.action(api.study.tools.generate, { notebookId, mode, options });
  if (!r.ok) throw new Error(r.message);
  return (await p.as.query(api.study.tools.get, { outputId: r.outputId })).output;
}

describe("study tools", () => {
  test("a summary keeps cited points and marks Taku's own", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const output = await make(p, await setUp(p), "summarise");
    const content = output.content as SummaryContent;
    expect(output.kind).toBe("summary");
    expect(content.sections.flatMap((s) => s.points.map((x) => x.origin.kind))).toEqual(["source", "source", "source", "added"]);
  });

  test("flashcards become cards with a schedule, and Got it moves a card on", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const notebookId = await setUp(p);
    const output = await make(p, notebookId, "flashcards", { count: 5, difficulty: "medium" });
    expect(output.note).toMatch(/support 4 cards/);
    const due = await p.as.query(api.study.cards.due, { notebookId, now: Date.now() + 1000 });
    expect(due.total).toBe(5);
    expect(due.cards).toHaveLength(5);
    const { due: next } = await p.as.mutation(api.study.cards.review, { cardId: due.cards[0]._id, got: true });
    expect(next).toBeGreaterThan(Date.now());
  });

  test("a quiz drops the question whose quote is not in the notes, and marks are saved", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const output = await make(p, await setUp(p), "quiz", { count: 4, difficulty: "medium", minutes: 15 });
    const quiz = output.content as QuizContent;
    expect(quiz.questions.map((q) => q.number)).toEqual([1, 2, 3, 4]);
    expect(quiz.questions[3].origin.kind).toBe("added");
    expect(quiz.totalMarks).toBe(7);
    const result = await p.as.mutation(api.study.quizzes.submit, { outputId: output._id, marks: [{ number: 1, got: 1 }, { number: 2, got: 5 }] });
    expect(result).toEqual({ score: 3, total: 7 });
  });

  test("mind map and Scroll are made and cited", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const notebookId = await setUp(p);
    const map = await make(p, notebookId, "mind-map");
    expect(map.title).toBe("Photosynthesis");
    const scroll = await make(p, notebookId, "scroll", { count: 8 });
    const cards = (scroll.content as ScrollContent).cards;
    expect(cards).toHaveLength(6);
    expect(new Set(cards.map((c) => c.type))).toEqual(new Set(["fact", "question", "truefalse"]));
    expect(cards.every((c) => c.origin.kind === "source")).toBe(true);
  });

  test("options are clamped to the package limits", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const notebookId = await setUp(p);
    // count 2 is below the flashcards minimum of 5, so it becomes 5 and finds the recorded response.
    const r = await p.as.action(api.study.tools.generate, { notebookId, mode: "flashcards", options: { count: 2, difficulty: "medium" } });
    expect(r.ok).toBe(true);
  });

  test("another learner cannot open or review someone else's tools", async () => {
    const t = makeT();
    const owner = await makeLearner(t, 20);
    const other = await makeLearner(t, 21);
    const notebookId = await setUp(owner);
    const output = await make(owner, notebookId, "flashcards", { count: 5, difficulty: "medium" });
    await expect(other.as.query(api.study.tools.get, { outputId: output._id })).rejects.toThrow(/Not found/);
    const due = await owner.as.query(api.study.cards.due, { notebookId, now: Date.now() + 1000 });
    await expect(other.as.mutation(api.study.cards.review, { cardId: due.cards[0]._id, got: true })).rejects.toThrow(/Card not found/);
    await expect(other.as.action(api.study.tools.generate, { notebookId, mode: "summarise", options: {} })).rejects.toThrow(/Notebook not found/);
  });

  test("an empty notebook asks for notes first", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const notebookId = await p.as.mutation(api.notebooks.notebooks.create, { title: "Empty" });
    expect(await p.as.action(api.study.tools.generate, { notebookId, mode: "summarise", options: {} })).toEqual({ ok: false, message: "Add some notes to this notebook first." });
  });

  test("deleting the notebook deletes tools, cards and attempts", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const notebookId = await setUp(p);
    await make(p, notebookId, "flashcards", { count: 5, difficulty: "medium" });
    await p.as.mutation(api.notebooks.notebooks.remove, { notebookId });
    const left = await t.run(async (ctx) => (await ctx.db.query("outputs").collect()).length + (await ctx.db.query("cards").collect()).length);
    expect(left).toBe(0);
  });
});
