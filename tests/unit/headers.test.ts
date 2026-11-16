import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
// @ts-expect-error A plain script module with no types; the shapes are checked below.
import { contentSecurityPolicy, convexOrigins, LANDING_HIDE_SCRIPT, scriptHash, securityHeaders, vercelHeaders } from "../../scripts/lib/security-headers.mjs";

/** Security headers (audit S7). One module makes them; vercel.json and the deploy script must both agree with it. */

const ROOT = process.cwd();
const csp = (url?: string) => contentSecurityPolicy(url) as string;

describe("security headers", () => {
  test("vercel.json carries exactly the generated headers", () => {
    const config = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8")) as { headers: unknown };
    expect(config.headers).toEqual(vercelHeaders());
  });

  test("every header the audit asked for is sent", () => {
    const names = (securityHeaders() as [string, string][]).map(([name]) => name);
    expect(names).toEqual(expect.arrayContaining(["Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"]));
    const byName = new Map(securityHeaders() as [string, string][]);
    expect(byName.get("Referrer-Policy")).toBe("no-referrer");
    expect(byName.get("X-Content-Type-Options")).toBe("nosniff");
  });

  test("the policy allows the Convex origin over https and wss, and nothing wider for scripts", () => {
    // The production host carries a region label.
    const policy = csp("https://disciplined-condor-946.eu-west-1.convex.cloud");
    expect(policy).toContain("connect-src 'self' https://disciplined-condor-946.eu-west-1.convex.cloud https://disciplined-condor-946.eu-west-1.convex.site wss://disciplined-condor-946.eu-west-1.convex.cloud");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    const scripts = policy.split("; ").find((d) => d.startsWith("script-src"))!;
    expect(scripts).not.toMatch(/unsafe-inline|unsafe-eval|\*|https:/);
    expect(scripts).toBe(`script-src 'self' '${scriptHash() as string}'`);
    // A build that does not know its deployment allows any Convex cloud deployment, still over https and wss only.
    expect(csp()).toContain("https://*.convex.cloud");
    expect(csp()).toContain("wss://*.convex.cloud");
    expect(csp()).not.toMatch(/\bws:|http:/);
  });

  test("a local backend gets its own origin, for the local check", () => {
    expect(convexOrigins("http://127.0.0.1:3210")).toEqual({ http: ["http://127.0.0.1:3210"], socket: ["ws://127.0.0.1:3210"] });
  });

  test("the one inline script is the one the build writes, so its hash matches", () => {
    const prerender = readFileSync(join(ROOT, "scripts", "prerender.mjs"), "utf8");
    expect(prerender).toContain("<script>${LANDING_HIDE_SCRIPT}</script>");
    expect(scriptHash()).toMatch(/^sha256-[A-Za-z0-9+/]{43}=$/);
    expect(scriptHash(`${LANDING_HIDE_SCRIPT as string} `)).not.toBe(scriptHash());
  });
});
