import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { copy } from "../../src/copy/en";
import { CUES } from "../../src/components/landing/listenCues";
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

/** The listen demo plays public/audio/landing (art batch 5) with captions from its manifest. */
describe("listen demo", () => {
  type Entry = { file: string; script: string; cues: { start: number; text: string }[]; bytes: number };
  const manifest = JSON.parse(readFileSync(join(process.cwd(), "public", "audio", "landing", "manifest.json"), "utf8")) as { files: Entry[] };
  const t = copy.landing.listen;

  test("every clip is in the manifest, on disk, and its caption times match", () => {
    for (const [file, starts] of Object.entries(CUES)) {
      const entry = manifest.files.find((f) => f.file === file);
      expect(entry, file).toBeDefined();
      expect(readFileSync(join(process.cwd(), "public", "audio", "landing", file)).length).toBe(entry?.bytes);
      expect(entry?.cues.map((c) => c.start)).toEqual([...starts]);
    }
  });

  test("the captions are the scripts the voices read", () => {
    const summary = manifest.files.find((f) => f.file === "summary-calm.mp3");
    expect(t.summaryScript).toBe(summary?.script);
    expect(t.summaryScript.match(/[^.]+\./g)?.map((x) => x.trim())).toEqual(summary?.cues.map((c) => c.text));
    const duo = manifest.files.find((f) => f.file === "overview-duo.mp3");
    expect([...t.overviewScript]).toEqual(duo?.cues.map((c) => c.text));
  });
});
