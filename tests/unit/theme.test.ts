import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Light is the default. Dark mode only comes from the learner's own switch
 * (data-theme="dark"), never from the phone or computer setting, and the
 * light set has no brown text or brown fills.
 */
const dir = join(process.cwd(), "src", "styles");
const styles = readdirSync(dir).filter((f) => f.endsWith(".css")).map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
const tokens = readFileSync(join(dir, "tokens.css"), "utf8");
const light = tokens.slice(0, tokens.indexOf('[data-theme="dark"]'));

describe("theme", () => {
  test("nothing follows the device dark setting", () => {
    expect(styles).not.toMatch(/prefers-color-scheme:\s*dark/);
  });

  test("dark styles hang off the learner's switch", () => {
    expect(tokens).toMatch(/:root\[data-theme="dark"\]/);
  });

  test("light text and dark fills are black ink, not brown", () => {
    for (const name of ["heading", "primary", "bubble", "dark-fill", "accent-text"]) {
      expect(light).toMatch(new RegExp(`--${name}: var\\(--ink\\);`));
    }
    expect(light).toMatch(/--ink: #111111;/);
  });

  test("no style colours text with the brand browns", () => {
    expect(styles).not.toMatch(/color: var\(--(brown|deep)\)/);
  });
});
