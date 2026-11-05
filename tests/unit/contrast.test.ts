import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * WCAG AA contrast for every text and background pair the CSS uses, in the
 * light app, the public pages and the dark app. Colours are read from
 * src/styles/tokens.css so a changed token is checked automatically.
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

/** [text, background]. All are held to 4.5, the body text level, even where the text is large. */
const LIGHT: [string, string][] = [
  // Ink: body text, headings, pill buttons, chips and selected cards.
  ["ink", "cream"],
  ["ink", "paper"],
  ["ink", "white"],
  ["ink", "tint"],
  ["ink", "butter"],
  ["ink", "butter-pick"],
  ["ink", "honey"],
  // Grey: secondary text on panels, raised cards, tiles and selected cards.
  ["grey", "cream"],
  ["grey", "paper"],
  ["grey", "white"],
  ["grey", "tint"],
  ["grey", "butter-pick"],
  // Deep amber: eyebrows, the rolling headline word, accents.
  ["deep", "cream"],
  ["deep", "paper"],
  ["deep", "white"],
  ["deep", "tint"],
  // Brown ink: icons and numbers on tint and butter tiles, citation markers.
  ["brown", "tint"],
  ["brown", "butter"],
  ["msasa", "cream"],
  ["msasa", "paper"],
  ["msasa", "white"],
  ["sage", "cream"],
  ["sage", "paper"],
  ["sage", "white"],
  // On charcoal: learner bubbles, the avatar, flashcard backs, Scroll.
  ["cream", "ink"],
  ["on-ink-soft", "ink"],
  ["mid", "ink"],
  ["honey", "ink"],
  ["white", "msasa"],
];

const DARK: [string, string][] = [
  ["d-text", "d-page"],
  ["d-text", "d-panel"],
  ["d-text", "d-raised"],
  ["d-text", "d-pick"],
  ["d-soft", "d-page"],
  ["d-soft", "d-panel"],
  ["d-soft", "d-raised"],
  ["d-accent", "d-page"],
  ["d-accent", "d-panel"],
  ["d-accent", "d-raised"],
  ["d-danger", "d-panel"],
  ["d-danger", "d-raised"],
  ["d-ok", "d-panel"],
  ["d-ok", "d-raised"],
  // Primary buttons in the dark app: ink on honey.
  ["ink", "honey"],
];

describe("contrast", () => {
  for (const [fg, bg] of [...LIGHT, ...DARK]) {
    test(`${fg} on ${bg} is at least 4.5`, () => {
      expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
    });
  }

  test("the colours kept off text really are too light for it", () => {
    // Honey is a fill only; suffix amber and mid are for the logo and line marks.
    expect(ratio(token("honey"), token("cream"))).toBeLessThan(3);
    expect(ratio(token("suffix"), token("cream"))).toBeLessThan(4.5);
    expect(ratio(token("mid"), token("cream"))).toBeLessThan(3);
  });

  test("the app has no teal", () => {
    const styles = ["tokens.css", "base.css", "shell.css", "workspace.css", "pages.css", "features.css"].map((f) => readFileSync(join(process.cwd(), "src", "styles", f), "utf8")).join("\n");
    expect(styles.toLowerCase()).not.toMatch(/#2a9d8f|teal/);
  });
});
