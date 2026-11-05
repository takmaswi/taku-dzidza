import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { scrubEvent, scrubUrl } from "../../src/observability";

const root = join(__dirname, "..", "..");

describe("error reports leave learner data behind", () => {
  test("guardian links lose their token and addresses lose their query", () => {
    expect(scrubUrl("https://takudzidza.vercel.app/consent/abc123secret")).toBe("https://takudzidza.vercel.app/consent/[link]");
    expect(scrubUrl("https://takudzidza.vercel.app/n/1?tool=quiz#x")).toBe("https://takudzidza.vercel.app/n/1");
  });

  test("the account, trail and request details are cut from an event", () => {
    const event = {
      message: "boom",
      request: { url: "https://x.app/consent/abc123secret?y=1", headers: { a: "b" }, cookies: { c: "d" }, query_string: "y=1", data: "typed text" },
      user: { email: "learner@example.com" },
      breadcrumbs: [{ message: "typed text" }],
      extra: { typed: "text" },
      transaction: "/consent/abc123secret",
    };
    const clean = scrubEvent(event);
    expect(clean).toEqual({ message: "boom", request: { url: "https://x.app/consent/[link]" }, transaction: "/consent/[link]" });
    expect(JSON.stringify(clean)).not.toMatch(/secret|learner@|typed/);
    expect(event.user).toBeDefined();
  });

  test("Sentry loads only behind its setting", () => {
    const source = readFileSync(join(root, "src/observability.ts"), "utf8");
    expect(source).toContain('dsn === undefined || dsn === ""');
    expect(source).not.toMatch(/^import .*@sentry/m);
  });
});

describe("what crawlers and link previews read", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");

  test("Open Graph and Twitter tags point at the social image", () => {
    for (const tag of ['property="og:title"', 'property="og:description"', 'property="og:url"', 'property="og:type"', 'name="twitter:title"', 'name="twitter:description"']) expect(html).toContain(tag);
    expect(html).toMatch(/property="og:image" content="https:\/\/[^"]+\/art\/og-landing\.jpg"/);
    expect(html).toMatch(/name="twitter:image" content="https:\/\/[^"]+\/art\/og-landing\.jpg"/);
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
  });

  test("the meta copy follows the no hyphen rule", () => {
    for (const [, words] of html.matchAll(/(?:property="og:(?:title|description)"|name="twitter:(?:title|description)") content="([^"]+)"/g)) {
      expect(words).not.toMatch(/[-‐-―]/);
    }
  });

  test("the build ends by writing the landing copy into the page", () => {
    expect(JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts.build).toContain("scripts/prerender.mjs");
  });
});
