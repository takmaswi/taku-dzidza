import { renderToString } from "katex";
import "katex/contrib/mhchem";
import { describe, expect, test } from "vitest";
import { hasMath, speakable, splitMath } from "../../src/components/math";

describe("finding maths in text", () => {
  test("inline and display maths are found", () => {
    expect(splitMath("So $x^2$ grows.")).toEqual([
      { kind: "text", text: "So " },
      { kind: "math", tex: "x^2", display: false },
      { kind: "text", text: " grows." },
    ]);
    expect(splitMath("$$x = 4$$")).toEqual([{ kind: "math", tex: "x = 4", display: true }]);
  });

  test("money stays plain text", () => {
    for (const text of ["It costs $5 and $10 today", "Pay $5.", "Between $3 and $4", "USD 5 costs $ 5"]) {
      expect(hasMath(text), text).toBe(false);
    }
    expect(splitMath("Costs \\$5")).toEqual([{ kind: "text", text: "Costs $5" }]);
  });

  test("an unclosed sign is left alone", () => {
    expect(splitMath("a $x + 1")).toEqual([{ kind: "text", text: "a $x + 1" }]);
    expect(splitMath("$$x")).toEqual([{ kind: "text", text: "$$x" }]);
  });

  test("chemistry comes through whole", () => {
    expect(splitMath("$\\ce{H2O}$")).toEqual([{ kind: "math", tex: "\\ce{H2O}", display: false }]);
  });

  test("read aloud and labels get words, not LaTeX", () => {
    expect(speakable("Take $\\frac{1}{2}$ of $\\ce{H2O}$")).toBe("Take 1 over 2 of H2O");
    expect(speakable("$3 \\times 4$")).toBe("3 times 4");
    expect(speakable("No maths here")).toBe("No maths here");
  });
});

describe("KaTeX with the settings the app uses", () => {
  const options = { throwOnError: false, trust: false, strict: "ignore" } as const;

  test("mhchem draws formulas", () => {
    expect(renderToString("\\ce{CO2 + H2O}", options)).toContain("katex");
  });

  test("bad LaTeX never throws", () => {
    expect(() => renderToString("\\frac{", options)).not.toThrow();
  });

  test("links and raw HTML in the source do not become markup", () => {
    const html = renderToString("\\href{javascript:alert(1)}{x} \\htmlId{a}{b} <script>", options);
    // Refused commands show as plain red text, so the words may appear but never as a link or a tag.
    expect(html).not.toMatch(/<a\b|href=/);
    expect(html).not.toContain("<script");
  });
});
