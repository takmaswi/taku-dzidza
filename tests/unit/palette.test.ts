import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * The app is warm all through. The old brand book's charcoal #2B2D42 and
 * slate #5C677D must not come back anywhere in src/ or public/, in hex or
 * rgb form, and no colour in the styles may lean blue.
 */

const TEXT = new Set([".ts", ".tsx", ".css", ".svg", ".html", ".json", ".webmanifest"]);
const BANNED = [/#2b2d42/i, /#5c677d/i, /rgba?\(\s*43[\s,]+45[\s,]+66\b/, /rgba?\(\s*92[\s,]+103[\s,]+125\b/];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return TEXT.has(extname(name)) ? [path] : [];
  });
}

function channels(css: string): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const m of css.matchAll(/#([0-9a-f]{6})\b/gi)) out.push([0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) as [number, number, number]);
  for (const m of css.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/g)) out.push([Number(m[1]), Number(m[2]), Number(m[3])]);
  return out;
}

describe("warm palette", () => {
  const root = process.cwd();
  const all = [...files(join(root, "src")), ...files(join(root, "public"))];

  test("finds the files it checks", () => {
    expect(all.some((f) => f.endsWith("tokens.css"))).toBe(true);
  });

  for (const pattern of BANNED) {
    test(`${pattern.source} appears nowhere in src or public`, () => {
      const hits = all.filter((f) => pattern.test(readFileSync(f, "utf8")));
      expect(hits).toEqual([]);
    });
  }

  test("no colour in the styles leans blue", () => {
    const styles = readdirSync(join(root, "src", "styles")).filter((f) => f.endsWith(".css"));
    const cool = styles.flatMap((f) =>
      channels(readFileSync(join(root, "src", "styles", f), "utf8"))
        .filter(([r, , b]) => b > r)
        .map((c) => `${f}: rgb(${c.join(" ")})`),
    );
    expect(cool).toEqual([]);
  });
});
