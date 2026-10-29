import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { scanConvex, scanSource } from "./scan-helpers";

/**
 * Every exported public function calls an access helper, except a fixed
 * allowlist read from docs/ACCESS.md. Ported from Amayi Learn
 * (tests/convex/access-scan.test.ts at ec3496e).
 */

const ROOT = process.cwd();

function allowlistFromSpec(): string[] {
  const spec = readFileSync(join(ROOT, "docs", "ACCESS.md"), "utf8");
  const line = spec.split(/\r?\n/).find((l) => l.startsWith("5. Every exported public query"));
  if (line === undefined) throw new Error("Rule 5 not found in docs/ACCESS.md.");
  const listPart = line.slice(line.indexOf("fixed and the test asserts exact membership"));
  return [...listPart.matchAll(/`([\w/]+:\w+)`/g)].map((m) => m[1]).sort();
}

const ALLOWLIST = ["accounts/consent:give", "accounts/consent:requestInfo", "accounts/consent:withdraw", "auth:isAuthenticated", "auth:signIn", "auth:signOut"];

describe("access scan", () => {
  test("the allowlist is exactly the one in docs/ACCESS.md", () => {
    expect(allowlistFromSpec()).toEqual(ALLOWLIST);
  });

  test("every public function calls an access helper or is allowlisted", () => {
    const functions = scanConvex(ROOT);
    expect(functions.length).toBeGreaterThan(5);
    const offenders = functions.filter((f) => !f.guarded && !ALLOWLIST.includes(f.name)).map((f) => f.name);
    expect(offenders, `Public functions without an access helper:\n${offenders.join("\n")}`).toEqual([]);
  });

  test("the scanner catches a planted unguarded function and ignores internal ones", () => {
    const source = [
      'import { query, internalQuery } from "./_generated/server";',
      'export const leaky = query({ args: {}, handler: async (ctx) => ctx.db.query("profiles").collect() });',
      "export const fine = query({ args: {}, handler: async (ctx) => { await requireUser(ctx); return 1; } });",
      'export const hidden = internalQuery({ args: {}, handler: async (ctx) => ctx.db.query("profiles").collect() });',
    ].join("\n");
    expect(scanSource("planted", source)).toEqual([
      { name: "planted:leaky", guarded: false },
      { name: "planted:fine", guarded: true },
    ]);
  });
});
