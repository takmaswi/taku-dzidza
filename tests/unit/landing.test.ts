import { describe, expect, test } from "vitest";
import { copy } from "../../src/copy/en";
import { regionForZone, STRIP_ORDER, stripOrder } from "../../src/components/landing/useRegion";

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
