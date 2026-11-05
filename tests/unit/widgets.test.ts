import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { WIDGETS } from "../../convex/data/generated";
import { checkLine, prepare as prepareEquation, type EquationData } from "../../convex/widgets/equationSteps";
import { checkBlank, prepare as prepareBlanks, type BlanksData } from "../../convex/widgets/fillBlanks";
import { extractWidget, prepareWidget, stripWidgetBlock, WIDGET_SLUGS, widgetFromText } from "../../convex/widgets/inline";
import { checkStep, divisionSteps, prepare as prepareDivision, result, type DivisionData } from "../../convex/widgets/longDivision";
import { widgetFrontmatter, widgetListing, widgetTests } from "../../convex/widgets/package";

const root = join(__dirname, "..", "..");
const NOTES = "Chlorophyll in the chloroplasts absorbs the light.\nOxygen is released as a by product.";
const lookup = (ref: string, page: number) => (ref === "S1" && page === 1 ? { sourceId: "s1", text: NOTES } : null);

describe("widget packages", () => {
  const folders = readdirSync(join(root, "widgets"));

  test("every package has its files, a checker and a React component", () => {
    expect([...folders].sort()).toEqual([...WIDGET_SLUGS].sort());
    for (const slug of folders) {
      for (const file of ["widget.md", "listing.json", "tests.json"]) expect(existsSync(join(root, "widgets", slug, file)), `${slug}/${file}`).toBe(true);
    }
    expect(existsSync(join(root, "src/widgets/EquationSteps.tsx"))).toBe(true);
    expect(existsSync(join(root, "src/widgets/FillBlanks.tsx"))).toBe(true);
    expect(existsSync(join(root, "src/widgets/LongDivision.tsx"))).toBe(true);
    const host = readFileSync(join(root, "src/widgets/WidgetHost.tsx"), "utf8");
    for (const slug of WIDGET_SLUGS) expect(host).toContain(`"${slug}"`);
  });

  test("generated data matches the packages and they all validate", () => {
    expect(Object.keys(WIDGETS).sort()).toEqual([...WIDGET_SLUGS].sort());
    for (const slug of folders) {
      expect(widgetListing.safeParse(JSON.parse(readFileSync(join(root, "widgets", slug, "listing.json"), "utf8"))).success, slug).toBe(true);
      expect(widgetTests.safeParse(JSON.parse(readFileSync(join(root, "widgets", slug, "tests.json"), "utf8"))).success, slug).toBe(true);
      expect(widgetFrontmatter.safeParse(WIDGETS[slug].frontmatter).success, slug).toBe(true);
    }
  });

  test("the recorded test cases in each package give the verdict they promise", () => {
    for (const slug of folders) {
      const { cases } = widgetTests.parse(JSON.parse(readFileSync(join(root, "widgets", slug, "tests.json"), "utf8")));
      for (const c of cases) {
        const widget = prepareWidget(slug, c.data, lookup);
        expect(widget !== null, `${slug}: ${c.id}`).toBe(c.valid);
        if (widget === null) continue;
        for (const step of c.steps) {
          const label = `${slug}: ${c.id}: ${step.typed}`;
          if (slug === "equation-steps") {
            const d = widget.data as EquationData;
            const verdict = checkLine(d.equation, d.variable, step.typed);
            expect(verdict.ok, label).toBe(step.ok);
            if (step.done !== undefined) expect(verdict.done, label).toBe(step.done);
          } else if (slug === "fill-blanks") {
            expect(checkBlank((widget.data as BlanksData).items[0], step.typed), label).toBe(step.ok);
          } else {
            const d = widget.data as DivisionData;
            expect(checkStep(divisionSteps(d.dividend, d.divisor)[0], step.typed), label).toBe(step.ok);
          }
        }
      }
    }
  });
});

describe("equation steps", () => {
  const line = (typed: string, equation = "2x + 3 = 11") => checkLine(equation, "x", typed);

  test("valid working is accepted", () => {
    for (const typed of ["2x = 8", "2x = 11 - 3", "2*x + 3 - 11 = 0", "4x + 6 = 22", "x + 1.5 = 5.5"]) {
      expect(line(typed).ok, typed).toBe(true);
      expect(line(typed).done, typed).toBe(false);
    }
  });

  test("the final answer finishes it, either way round", () => {
    expect(line("x = 4")).toMatchObject({ ok: true, done: true });
    expect(line("4 = x")).toMatchObject({ ok: true, done: true });
  });

  test("wrong working is refused", () => {
    for (const typed of ["2x = 14", "x = 5", "2x + 3 = 12"]) expect(line(typed), typed).toMatchObject({ ok: false, problem: "wrong" });
  });

  test("what cannot be read is reported, and never evaluated", () => {
    for (const typed of ["hello", "2x", "x = = 4", "import('fs') = 1", "x = process.exit(1)", "x = y"]) {
      expect(line(typed), typed).toMatchObject({ ok: false, problem: "unreadable" });
    }
  });

  test("quadratics: factorised and solved forms are accepted", () => {
    const eq = "x^2 + 5x + 6 = 0";
    expect(line("(x + 2)(x + 3) = 0", eq).ok).toBe(true);
    expect(line("x = -2 or x = -3", eq)).toMatchObject({ ok: true, done: true });
    expect(line("x = -2", eq).ok).toBe(false);
    expect(line("(x + 1)(x + 6) = 0", eq).ok).toBe(false);
  });

  test("characters from a phone keyboard are understood", () => {
    expect(line("2x = 11 − 3").ok).toBe(true);
    expect(line("x² + 5x + 6 = 0", "x^2 + 5x + 6 = 0").ok).toBe(true);
  });

  test("Taku's data: a hint that gives the answer goes, and an unreadable equation means no widget", () => {
    const good = prepareEquation({ title: "Solve", equation: "2x + 3 = 11", variable: "x", hints: ["Take 3 from both sides.", "So x = 4."] });
    expect(good?.hints).toEqual(["Take 3 from both sides."]);
    expect(prepareEquation({ title: "Solve", equation: "not an equation", variable: "x", hints: [] })).toBeNull();
    expect(prepareEquation({ title: "Solve", equation: "2x + 3 = 11", variable: "xx", hints: [] })).toBeNull();
    // No real solution: nothing to reach.
    expect(prepareEquation({ title: "Solve", equation: "x^2 + 1 = 0", variable: "x", hints: [] })).toBeNull();
  });
});

describe("long division", () => {
  test("the steps come from the numbers and reach the right answer", () => {
    const steps = divisionSteps(125, 5);
    expect(steps.map((s) => s.kind)).toEqual(["divide", "multiply", "subtract", "bring", "divide", "multiply", "subtract"]);
    expect(steps[0]).toMatchObject({ kind: "divide", current: 12, divisor: 5, answer: 2 });
    expect(result(125, 5)).toEqual({ quotient: 25, remainder: 0 });
    expect(result(127, 5)).toEqual({ quotient: 25, remainder: 2 });
  });

  test("every division agrees with the arithmetic", () => {
    for (const [a, b] of [[7, 2], [100, 7], [9999, 13], [1000, 10], [305, 5], [999999, 7]]) {
      const steps = divisionSteps(a, b);
      const digits = steps.flatMap((s) => (s.kind === "divide" ? [String(s.answer)] : [])).join("");
      expect(Number(digits), `${a} / ${b}`).toBe(Math.floor(a / b));
      expect(result(a, b)).toEqual({ quotient: Math.floor(a / b), remainder: a % b });
    }
  });

  test("each step marks its own answer", () => {
    const [first] = divisionSteps(125, 5);
    expect(checkStep(first, "2")).toBe(true);
    expect(checkStep(first, " 2 ")).toBe(true);
    expect(checkStep(first, "3")).toBe(false);
    expect(checkStep(first, "two")).toBe(false);
  });

  test("Taku's data: only the numbers are kept, and silly ones mean no widget", () => {
    expect(prepareDivision({ title: "Divide", dividend: 125, divisor: 5 })).toMatchObject({ dividend: 125, divisor: 5 });
    expect(prepareDivision({ title: "Divide", dividend: 125, divisor: 0 })).toBeNull();
    expect(prepareDivision({ title: "Divide", dividend: 1.5, divisor: 2 })).toBeNull();
    expect(prepareDivision("nonsense")).toBeNull();
  });
});

describe("fill in the blanks", () => {
  const raw = (over: Record<string, unknown>) => ({
    title: "Light",
    items: [{ before: "Chlorophyll in the chloroplasts", answer: "absorbs", after: "the light.", alternatives: ["takes in"], hint: "What does it do to the light?", ref: "S1", page: 1, quote: "Chlorophyll in the chloroplasts absorbs the light", ...over }],
  });

  test("a blank with a real quote is kept and cited", () => {
    const data = prepareBlanks(raw({}), lookup);
    expect(data?.items[0].origin).toEqual({ kind: "source", sourceId: "s1", page: 1, quote: "Chlorophyll in the chloroplasts absorbs the light" });
  });

  test("a quote that is not in the notes, or misses the answer, drops the blank", () => {
    expect(prepareBlanks(raw({ quote: "Plants love sunshine a great deal" }), lookup)).toBeNull();
    expect(prepareBlanks(raw({ answer: "releases" }), lookup)).toBeNull();
    expect(prepareBlanks(raw({ page: 9 }), lookup)).toBeNull();
    expect(prepareBlanks(raw({}), undefined)).toBeNull();
  });

  test("marking forgives case and spaces and takes the alternatives", () => {
    const item = prepareBlanks(raw({}), lookup)!.items[0];
    expect(checkBlank(item, "Absorbs ")).toBe(true);
    expect(checkBlank(item, "takes  in")).toBe(true);
    expect(checkBlank(item, "reflects")).toBe(false);
    expect(checkBlank(item, "")).toBe(false);
  });
});

describe("widgets inside an answer", () => {
  const block = 'First try this.\n\n```widget\n{"slug":"long-division","data":{"title":"Divide","dividend":125,"divisor":5}}\n```';

  test("a block is pulled out of the reply and the text keeps the rest", () => {
    const { text, raw } = extractWidget(block);
    expect(text).toBe("First try this.");
    expect(widgetFromText(raw ?? "", ["long-division"])).toMatchObject({ slug: "long-division" });
    expect(extractWidget("No block here")).toEqual({ text: "No block here", raw: null });
    expect(stripWidgetBlock(block).trim()).toBe("First try this.");
    expect(stripWidgetBlock("No block here")).toBe("No block here");
  });

  test("a half finished block stays out of the streamed text", () => {
    expect(stripWidgetBlock('First try this.\n\n```widget\n{"slug":').trim()).toBe("First try this.");
  });

  test("a slug that is not allowed, or broken JSON, means no widget", () => {
    expect(widgetFromText(extractWidget(block).raw ?? "", ["equation-steps"])).toBeNull();
    expect(widgetFromText("not json", WIDGET_SLUGS)).toBeNull();
    expect(prepareWidget("nope", {})).toBeNull();
  });

  test("data sent as a JSON string is understood", () => {
    expect(widgetFromText(JSON.stringify({ slug: "long-division", data: JSON.stringify({ title: "Divide", dividend: 125, divisor: 5 }) }), WIDGET_SLUGS)).toMatchObject({ slug: "long-division" });
  });
});
