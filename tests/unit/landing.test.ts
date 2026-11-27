import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { LANDING_PHOTOS } from "../../src/art.generated";
import { copy } from "../../src/copy/en";
import { regionForZone, STRIP_ORDER, stripOrder } from "../../src/components/landing/useRegion";

test("every batch 7 landing photo has both registered, published WebP sizes", () => {
  const groups = { notes: 5, market: 13, spot: 6 };
  for (const [prefix, count] of Object.entries(groups)) {
    expect(Object.keys(LANDING_PHOTOS).filter((slug) => slug.startsWith(`${prefix}-`))).toHaveLength(count);
  }
  for (const [slug, art] of Object.entries(LANDING_PHOTOS)) {
    expect(art.widths, slug).toEqual([480, 800]);
    for (const width of art.widths) {
      const file = readFileSync(join(process.cwd(), "public", "art", "landing", `${slug}-${width}.webp`));
      expect(file.toString("ascii", 8, 12), `${slug}-${width}`).toBe("WEBP");
    }
  }
});

/** The landing page's local layer (src/components/landing/useRegion.ts). */
describe("region", () => {
  test("a time zone gives a first guess, anything else is Global", () => {
    expect(regionForZone("Africa/Harare")).toBe("ZW");
    expect(regionForZone("Africa/Johannesburg")).toBe("ZA");
    expect(regionForZone("Africa/Nairobi")).toBe("KE");
    expect(regionForZone("Africa/Lagos")).toBe("NG");
    expect(regionForZone("Europe/London")).toBe("GB");
    expect(regionForZone("America/New_York")).toBe("GLOBAL");
    expect(regionForZone(undefined)).toBe("GLOBAL");
  });

  test("the strip puts the region's own exams first and keeps every exam once", () => {
    expect(stripOrder("GLOBAL")[0]).toBe("igcse");
    expect(stripOrder("ZW")[0]).toBe("zimsec");
    expect(stripOrder("ZA").slice(0, 2)).toEqual(["nsc", "ieb"]);
    expect(stripOrder("KE")[0]).toBe("kcse");
    expect(stripOrder("NG")[0]).toBe("waec");
    expect(stripOrder("GB").slice(0, 2)).toEqual(["gcse", "alevel"]);
    for (const region of ["GLOBAL", "ZW", "ZA", "KE", "NG", "GB"] as const) expect([...stripOrder(region)].sort()).toEqual([...STRIP_ORDER].sort());
  });

  test("every strip item has its words", () => {
    for (const key of STRIP_ORDER) expect(copy.landing.strip.items[key]).toBeTruthy();
  });
});
