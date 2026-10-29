import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { listingSchema, packageProblems, parseModeMarkdown, testsSchema } from "../../convex/modes/package";
import { schedule } from "../../convex/study/cards";
import { buildContent } from "../../convex/study/tools";
import type { Doc } from "../../convex/_generated/dataModel";

const ROOT = join(process.cwd(), "modes");
const slugs = readdirSync(ROOT);

describe("Taku mode packages", () => {
  test("there are the six launch modes", () => {
    expect(slugs.sort()).toEqual(["flashcards", "mind-map", "quiz", "scroll", "study-guide", "summarise"]);
  });
  for (const slug of slugs) {
    test(`${slug} is a valid package`, () => {
      const { frontmatter, body } = parseModeMarkdown(readFileSync(join(ROOT, slug, "mode.md"), "utf8"));
      const listing = listingSchema.parse(JSON.parse(readFileSync(join(ROOT, slug, "listing.json"), "utf8")));
      const tests = testsSchema.parse(JSON.parse(readFileSync(join(ROOT, slug, "tests.json"), "utf8")));
      expect(packageProblems(slug, { frontmatter, body, listing, tests })).toEqual([]);
    });
  }
  test("a package with hidden characters or a wrong slug is refused", () => {
    expect(() => parseModeMarkdown("---\nname: X\n---\nshort")).toThrow();
    const good = parseModeMarkdown(readFileSync(join(ROOT, "quiz", "mode.md"), "utf8"));
    const listing = { title: "Quiz", tagline: "Practice tests", description: "A description long enough." };
    expect(packageProblems("not-quiz", { ...good, listing, tests: { cases: [] } })).toContain("slug quiz must match the folder not-quiz.");
  });
});

const PAGE = "Green plants make glucose from carbon dioxide and water using light energy. Chlorophyll in the chloroplasts absorbs the light.";
const lookup = (ref: string, page: number) => (ref === "S1" && page === 1 ? { sourceId: "s1", text: PAGE } : null);

describe("building tool content", () => {
  const quiz = {
    title: "Test",
    minutes: 15,
    questions: [
      { kind: "mcq", prompt: "Which absorbs light?", options: ["Chlorophyll", "Water"], marks: 1, answer: "Chlorophyll", markingPoints: ["Chlorophyll"], ref: "S1", page: 1, quote: "Chlorophyll in the chloroplasts absorbs the light" },
      { kind: "short", prompt: "Invented", options: [], marks: 2, answer: "x", markingPoints: ["x"], ref: "S1", page: 1, quote: "plants sing at night to the moon" },
    ],
    missing: "",
  };
  test("quiz questions are numbered after settling, with total marks", () => {
    const built = buildContent("quiz", quiz, "only_mine", lookup)!;
    expect(built.dropped).toBe(1);
    expect(built.content).toMatchObject({ totalMarks: 1, questions: [{ number: 1, prompt: "Which absorbs light?" }] });
  });
  test("bad JSON shape gives null", () => {
    expect(buildContent("cards", { cards: "nope" }, "mine_plus", lookup)).toBeNull();
  });
});

describe("spaced repetition", () => {
  const now = new Date("2026-10-29T08:00:00Z");
  const card = { due: now.getTime(), stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0, learningSteps: 0, reps: 0, lapses: 0, state: 0 } as unknown as Doc<"cards">;
  test("Got it pushes the card further out than Try again", () => {
    const got = schedule(card, true, now);
    const again = schedule(card, false, now);
    expect(got.due).toBeGreaterThan(again.due);
    expect(got.reps).toBe(1);
  });
  test("a card got right twice comes back days later", () => {
    const first = schedule(card, true, now);
    const second = schedule({ ...card, ...first } as Doc<"cards">, true, new Date(first.due));
    expect(second.due - first.due).toBeGreaterThan(24 * 60 * 60 * 1000);
  });
});

describe("quiz clean up (from the live check, 29 October 2026)", () => {
  test("the model's own numbering comes off the prompt", async () => {
    const { cleanPrompt } = await import("../../convex/study/tools");
    expect(cleanPrompt("1. Which substance is released?")).toBe("Which substance is released?");
    expect(cleanPrompt("Question 3) Name two gases.")).toBe("Name two gases.");
    expect(cleanPrompt("(a) State the raw materials.")).toBe("(a) State the raw materials.");
  });
  test("a multiple choice answer is found from text, a letter or the marking points", async () => {
    const { mcqAnswer } = await import("../../convex/study/tools");
    const options = ["Carbon dioxide", "Glucose", "Oxygen", "Water"];
    expect(mcqAnswer("Oxygen", options, [])).toBe("Oxygen");
    expect(mcqAnswer("C", options, [])).toBe("Oxygen");
    expect(mcqAnswer("(c) Oxygen", options, [])).toBe("Oxygen");
    expect(mcqAnswer("", options, ["C. Oxygen"])).toBe("Oxygen");
    expect(mcqAnswer("", options, [])).toBeNull();
  });
  test("a multiple choice question with no findable answer is left out", () => {
    const raw = { title: "T", minutes: 15, questions: [{ kind: "mcq", prompt: "1. Which absorbs light?", options: ["Chlorophyll", "Water"], marks: 1, answer: "", markingPoints: [], ref: "S1", page: 1, quote: "Chlorophyll in the chloroplasts absorbs the light" }], missing: "" };
    const built = buildContent("quiz", raw, "mine_plus", lookup)!;
    expect(built.items).toBe(0);
    expect(built.dropped).toBe(1);
  });
});
