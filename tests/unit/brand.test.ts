import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { MARK_FILLS, MARK_RECTS } from "../../src/components/brand";

/**
 * The mark in the app is the Taku Education kit, unchanged: same rectangles,
 * same colours, for both variants the app uses. The old tile T and dot is
 * gone from the app, art/brand and public.
 */

const KIT = join(process.cwd(), "art", "brand", "takudzidza", "kit");

function rects(file: string) {
  const svg = readFileSync(join(KIT, file), "utf8");
  return [...svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" rx="(\d+)" fill="(#[0-9A-F]{6})"/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
    width: Number(m[3]),
    height: Number(m[4]),
    rx: Number(m[5]),
    fill: m[6],
  }));
}

describe("brand", () => {
  for (const [variant, file] of [
    ["on-cream", "taku-education-mark-on-cream.svg"],
    ["inverse", "taku-education-mark-inverse.svg"],
  ] as const) {
    test(`the ${variant} mark matches ${file}`, () => {
      const kit = rects(file);
      expect(kit).toHaveLength(3);
      expect(kit.map(({ x, y, width, height }) => ({ x, y, width, height }))).toEqual(MARK_RECTS.map((r) => ({ ...r })));
      expect(kit.map((r) => r.rx)).toEqual([12, 12, 12]);
      expect(kit.map((r) => r.fill)).toEqual([...MARK_FILLS[variant]]);
    });
  }

  test("public/icon.svg is the on cream kit mark", () => {
    expect(readFileSync(join(process.cwd(), "public", "icon.svg"), "utf8")).toBe(readFileSync(join(KIT, "taku-education-mark-on-cream.svg"), "utf8"));
  });

  test("no trace of the old tile T in art/brand or public", () => {
    const top = readdirSync(join(process.cwd(), "art", "brand"));
    expect(top.filter((f) => f !== "takudzidza")).toEqual([]);
    for (const f of readdirSync(join(process.cwd(), "public")).filter((n) => n.endsWith(".svg"))) {
      // The old mark drew a 512 tile with a circle dot.
      expect(readFileSync(join(process.cwd(), "public", f), "utf8")).not.toMatch(/<circle|rx="120"|viewBox="0 0 512 512"/);
    }
  });
});
