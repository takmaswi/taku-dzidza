import { describe, expect, test } from "vitest";
import { chartAsText, niceScale, parseChart, withChartsAsText } from "../../src/components/chartSpec";
import { prettyPlain } from "../../src/components/math";

const bar = { type: "bar", title: "Scores", unit: "out of 5", max: 5, labels: ["A", "B"], series: [{ name: "One", values: [3, 5] }] };

describe("chart blocks", () => {
  test("a good block parses", () => {
    expect(parseChart(JSON.stringify(bar))).toMatchObject({ type: "bar", max: 5, labels: ["A", "B"] });
  });

  test("bad blocks give nothing, never a broken chart", () => {
    expect(parseChart("not json")).toBeNull();
    expect(parseChart(JSON.stringify({ ...bar, labels: [] }))).toBeNull();
    expect(parseChart(JSON.stringify({ ...bar, series: [{ name: "One", values: [3] }] }))).toBeNull();
    expect(parseChart(JSON.stringify({ ...bar, series: [{ name: "One", values: [3, "x"] }] }))).toBeNull();
    expect(parseChart(JSON.stringify({ type: "pie", labels: ["A", "B"], series: [{ name: "S", values: [-1, 2] }] }))).toBeNull();
  });

  test("an unknown type is drawn as bars, and a pie keeps one series", () => {
    expect(parseChart(JSON.stringify({ ...bar, type: "radar" }))?.type).toBe("bar");
    const pie = parseChart(JSON.stringify({ type: "pie", labels: ["A", "B"], series: [{ name: "S", values: [1, 3] }, { name: "T", values: [2, 2] }] }));
    expect(pie?.series).toHaveLength(1);
  });

  test("axes use round steps, and a fixed max is kept", () => {
    expect(niceScale([3, 5], 5).ticks).toEqual([0, 1, 2, 3, 4, 5]);
    expect(niceScale([0, 9], null)).toMatchObject({ min: 0, max: 10 });
    expect(niceScale([-4, 7], null).min).toBeLessThanOrEqual(-4);
  });

  test("copy and read aloud get sentences, not JSON", () => {
    const reply = `Here it is.\n\n\`\`\`chart\n${JSON.stringify(bar)}\n\`\`\`\n\nWhat next?`;
    const text = withChartsAsText(reply);
    expect(text).not.toContain("{");
    expect(text).toContain("Chart: Scores.");
    expect(text).toContain("A 3 out of 5");
    expect(chartAsText(parseChart(JSON.stringify(bar))!)).toContain("One: A 3 out of 5, B 5 out of 5.");
  });
});

describe("typed maths in titles", () => {
  test("powers show as superscripts", () => {
    expect(prettyPlain("How do I factorise x^2 + 5x + 6?")).toBe("How do I factorise x² + 5x + 6?");
    expect(prettyPlain("10^-3 and x^(n)")).toBe("10⁻³ and xⁿ");
    expect(prettyPlain("No maths here")).toBe("No maths here");
  });
});
