import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { Cutout, Scene } from "../../src/components/Art";
import { ObjectArt, type ObjectName } from "../../src/components/ObjectArt";
import { SignedInContext } from "../../src/components/signedIn";
import { skyFor } from "../../src/components/sky";

/**
 * Polish 2: no people inside the signed in app, objects in one palette, the
 * sky on Home by the clock, and real textures in place of the wave wallpaper.
 */

const root = process.cwd();
const read = (...p: string[]) => readFileSync(join(root, ...p), "utf8");
function sources(dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? sources(join(dir, d.name)) : /\.tsx?$/.test(d.name) ? [join(dir, d.name)] : []));
}

describe("people stay out of the signed in app", () => {
  test("only SignIn and Setup draw a person", () => {
    const drawing = sources("src")
      .filter((f) => /<(Cutout|Scene)\b/.test(read(f)))
      .map((f) => f.split(/[\\/]/).pop())
      .sort();
    expect(drawing).toEqual(["Setup.tsx", "SignIn.tsx"]);
  });

  test("Cutout and Scene draw nothing inside the app shell", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const inApp = (child: ReactElement) => renderToStaticMarkup(createElement(SignedInContext.Provider, { value: true }, child));
    const cutout = createElement(Cutout, { slug: "tile-ask", alt: "", sizes: "100px" });
    const scene = createElement(Scene, { slug: "home-dashboard", alt: "", sizes: "100px" });
    expect(inApp(cutout)).toBe("");
    expect(inApp(scene)).toBe("");
    expect(quiet).toHaveBeenCalledTimes(2);
    quiet.mockRestore();
    // Outside the app (Landing, SignIn, Setup) they draw as before.
    expect(renderToStaticMarkup(cutout)).toContain("/art/cutouts/tile-ask");
  });

  test("the app shells provide the signed in context", () => {
    const layout = read("src", "components", "Layout.tsx");
    expect(layout).toMatch(/<SignedInContext\.Provider value=\{ready\}>/);
    expect(layout).toMatch(/<SignedInContext\.Provider value=\{true\}>/);
  });
});

describe("objects", () => {
  const NAMES: ObjectName[] = ["sun", "sun-low", "moon", "speech-bubble", "open-book", "index-cards", "star-medal", "hourglass", "lamp", "spark", "tea-cup", "key", "seedling"];
  // The four paper colours, plus white and black, which only appear inside masks.
  const PALETTE = new Set(["#fff8ec", "#f8e2a8", "#f2b33d", "#111111", "#ffffff", "#000000"]);

  // Art batch 5 ships photos for some names; check the drawings themselves, which still show for any name without a photo.
  let Drawn: typeof ObjectArt = ObjectArt;
  beforeAll(async () => {
    vi.resetModules();
    vi.doMock("../../src/art.generated", async (original) => ({ ...(await original<object>()), OBJECT_RASTERS: {} }));
    ({ ObjectArt: Drawn } = await import("../../src/components/ObjectArt"));
    vi.doUnmock("../../src/art.generated");
    vi.resetModules();
  });

  for (const name of NAMES) {
    test(`${name} is cut paper in the four colours, with no text and no heavy outline`, () => {
      const svg = renderToStaticMarkup(createElement(Drawn, { name, alt: "" }));
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).toContain('aria-hidden="true"');
      const colours = [...svg.matchAll(/#[0-9a-fA-F]{6}\b|#fff\b|#000\b/g)].map((m) => m[0].toLowerCase().replace(/^#(fff|000)$/, (_, c: string) => `#${c}${c}`));
      expect(colours.filter((c) => !PALETTE.has(c))).toEqual([]);
      expect(svg).not.toMatch(/<text\b/);
      const widths = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => Number(m[1]));
      expect(widths.every((w) => w <= 1.5)).toBe(true);
      expect(svg).toContain("/art/textures/paper-cotton.webp");
    });
  }

  test("an object with alt text is announced as an image", () => {
    const svg = renderToStaticMarkup(createElement(Drawn, { name: "key", alt: "A key" }));
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="A key"');
  });

  test("a photo listed in art/objects/manifest.json replaces the drawing, with its shadow", async () => {
    vi.resetModules();
    vi.doMock("../../src/art.generated", async (original) => ({ ...(await original<object>()), OBJECT_RASTERS: { sun: { widths: [160, 320, 640] } } }));
    const { ObjectArt: Swapped } = await import("../../src/components/ObjectArt");
    const photo = renderToStaticMarkup(createElement(Swapped, { name: "sun", alt: "", size: 96 }));
    expect(photo).not.toContain("<svg");
    expect(photo).toContain("/art/objects/sun-320.webp 320w");
    expect(photo).toContain("/art/objects/sun-shadow.webp");
    // Objects without a photo stay drawn.
    expect(renderToStaticMarkup(createElement(Swapped, { name: "moon", alt: "" }))).toContain("<svg");
    vi.doUnmock("../../src/art.generated");
    vi.resetModules();
  });

  test("Home shows the sun before 12:00, a low sun until 17:00, then the moon", () => {
    expect([0, 6, 11].map(skyFor)).toEqual(["sun", "sun", "sun"]);
    expect([12, 14, 16].map(skyFor)).toEqual(["sun-low", "sun-low", "sun-low"]);
    expect([17, 20, 23].map(skyFor)).toEqual(["moon", "moon", "moon"]);
  });
});

describe("surfaces", () => {
  const styles = readdirSync(join(root, "src", "styles"))
    .filter((f) => f.endsWith(".css"))
    .map((f) => read("src", "styles", f))
    .join("\n");
  const tokens = read("src", "styles", "tokens.css");

  test("the wave wallpaper and the old grain are gone from the styles", () => {
    expect(styles).not.toMatch(/honey-waves|paper-grain|highlighter-stroke/);
  });

  test("the page is cotton paper in light mode and linen in dark mode", () => {
    expect(tokens).toMatch(/--page-bg: var\(--paper-tex\) 0 0 \/ 512px 512px, var\(--cream\);/);
    expect(tokens.slice(tokens.indexOf('[data-theme="dark"]'))).toMatch(/--page-bg: var\(--linen-tex\)/);
    expect(read("src", "styles", "base.css")).toMatch(/body::before \{[^}]*background: var\(--page-bg\);/);
  });

  test("high contrast mode is flat: no paper, no cloth", () => {
    const contrast = tokens.slice(tokens.indexOf(':root[data-contrast="true"]'));
    const block = contrast.slice(0, contrast.indexOf("}"));
    expect(block).toMatch(/--page-bg: var\(--white\);/);
    expect(block).toMatch(/--panel-fill: var\(--white\);/);
    expect(block).toMatch(/--pick-fill: var\(--butter\);/);
    const polish = read("src", "styles", "polish.css");
    expect(polish).toMatch(/:root\[data-contrast="true"\] \{ --sky-glow: transparent; --sky-glow-mid: transparent; --home-wash: transparent; \}/);
  });

  test("the butter wash is on Home only, and the paper shows through it", () => {
    const polish = read("src", "styles", "polish.css");
    const uses = [...styles.matchAll(/var\(--home-wash\)/g)];
    expect(uses).toHaveLength(1);
    expect(polish).toMatch(/\.app-main:has\(> \.home\) \{ background: linear-gradient\(var\(--home-wash\), transparent \d+px\) local; \}/);
    // Translucent, so the cotton paper under it stays visible.
    for (const [, alpha] of polish.matchAll(/--home-wash: rgb\([\d ]+\/ ([\d.]+)\)/g)) expect(Number(alpha)).toBeLessThanOrEqual(0.12);
  });

  test("the textures the styles name are the ones made and shipped", () => {
    const manifest = JSON.parse(read("art", "textures", "textures-manifest.json")) as { textures: { file: string; grain_L_std: number; pixels_blue_over_red: number }[] };
    for (const name of ["paper-cotton", "bookcloth-honey", "linen-charcoal"]) {
      expect(tokens).toContain(`/art/textures/${name}.webp`);
      const t = manifest.textures.find((x) => x.file === `${name}.webp`);
      expect(t?.pixels_blue_over_red).toBe(0);
      expect(t?.grain_L_std).toBeGreaterThanOrEqual(1.5);
      expect(t?.grain_L_std).toBeLessThanOrEqual(3.5);
    }
    expect(read("scripts", "gen-data.mjs")).toContain('const TEXTURES = ["paper-cotton.webp", "bookcloth-honey.webp", "linen-charcoal.webp"];');
  });
});
