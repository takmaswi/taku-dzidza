import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { CONSENT_POINTS } from "../../convex/accounts/consentText";
import { copy } from "../../src/copy/en";
import { walk } from "../convex/scan-helpers";

/**
 * Copy rule (SPEC.md): no hyphens, en dashes or em dashes in anything a
 * learner or guardian reads. All UI copy lives in src/copy/en.ts and the
 * consent text in convex/accounts/consentText.ts, so those are checked for
 * hyphens; every source file is checked for en and em dashes.
 */

const EN = String.fromCharCode(0x2013);
const EM = String.fromCharCode(0x2014);

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") return [String((value as (s: string) => string)("Name"))];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value !== null && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

describe("copy rule", () => {
  test("UI copy and consent text have no hyphens or dashes", () => {
    const bad = [...strings(copy), ...CONSENT_POINTS].filter((s) => /[-\u2010-\u2015]/.test(s));
    expect(bad).toEqual([]);
  });

  test("no en or em dash anywhere in source, prompts or index.html", () => {
    const root = process.cwd();
    const files = [
      ...walk(join(root, "src"), (p) => /\.(ts|tsx|css)$/.test(p)),
      ...walk(join(root, "convex"), (p) => /\.(ts|md)$/.test(p) && !p.includes("_generated")),
      join(root, "index.html"),
    ];
    const offenders = files.filter((f) => {
      const text = readFileSync(f, "utf8");
      return text.includes(EN) || text.includes(EM);
    });
    expect(offenders).toEqual([]);
  });

  test("the check detects a hyphen", () => {
    expect(/[-\u2010-\u2015]/.test("step-by-step")).toBe(true);
  });
});
