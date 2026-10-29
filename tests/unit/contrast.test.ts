import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * WCAG AA contrast for every text and background pair the CSS uses
 * (SPEC.md section 4). Colours are read from src/styles/tokens.css so a
 * changed token is checked automatically.
 */

const css = readFileSync(join(process.cwd(), "src", "styles", "tokens.css"), "utf8");
function token(name: string): string {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (m === null) throw new Error(`token --${name} not found`);
  return m[1];
}

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** [text, background, minimum]. 4.5 for body text, 3 for large text and UI borders. */
const PAIRS: [string, string, number][] = [
  ["ink", "cream", 4.5],
  ["ink", "butter", 4.5],
  ["ink", "honey", 4.5],
  ["ink", "white", 4.5],
  ["ink-soft", "cream", 4.5],
  ["ink-soft", "butter", 4.5],
  ["ink-soft", "white", 4.5],
  ["msasa", "cream", 4.5],
  ["msasa", "white", 4.5],
  ["sage", "cream", 4.5],
  ["sage", "white", 4.5],
  ["cream", "ink", 4.5],
  ["white", "msasa", 4.5],
];

describe("contrast", () => {
  for (const [fg, bg, min] of PAIRS) {
    test(`${fg} on ${bg} is at least ${min}`, () => {
      expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(min);
    });
  }

  test("the rules that keep failing pairs out of the CSS are real failures", () => {
    expect(ratio(token("honey"), token("cream"))).toBeLessThan(3);
    expect(ratio(token("msasa"), token("butter"))).toBeLessThan(4.5);
    expect(ratio(token("ink-soft"), token("honey"))).toBeLessThan(4.5);
  });
});
