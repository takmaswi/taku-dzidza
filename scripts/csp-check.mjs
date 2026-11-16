// pnpm csp-check: serves the built site (dist) with the production security
// headers and drives it in a real browser, to prove the Content Security
// Policy breaks nothing (audit S7). The e2e journeys run on the Vite dev
// server, which cannot carry the policy, so this is the check that does.
//
// Needs: `pnpm build` done against the local Convex backend (pnpm dev running),
// in mock mode. Fails on any console error, any policy violation, or a step
// that does not finish.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { chromium } from "@playwright/test";
import { requireLocalDeployment } from "./lib/convex-target.mjs";
import { securityHeaders } from "./lib/security-headers.mjs";

const PORT = 5198;
const ORIGIN = `http://localhost:${PORT}`;
const DIST = join(process.cwd(), "dist");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".txt": "text/plain" };

const target = requireLocalDeployment("pnpm csp-check");
if (!existsSync(join(DIST, "index.html"))) {
  console.error("csp-check: dist/index.html is missing. Run pnpm build first.");
  process.exit(1);
}
const bundle = readFileSync(join(DIST, "index.html"), "utf8");
const headers = securityHeaders(target.url).filter(([name]) => name !== "Strict-Transport-Security");

const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url ?? "/", ORIGIN).pathname)).replace(/^([/\\])+/, "");
  let file = join(DIST, path);
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, "index.html");
  for (const [name, value] of headers) res.setHeader(name, value);
  res.setHeader("Content-Type", TYPES[extname(file)] ?? "application/octet-stream");
  res.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(PORT, resolve));

function outboxCode(to) {
  for (let i = 0; i < 40; i++) {
    const result = spawnSync(process.execPath, ["node_modules/convex/bin/main.js", "run", "accounts/outbox:latest", JSON.stringify({ to })], { encoding: "utf8" });
    const code = result.status === 0 ? JSON.parse(result.stdout.trim().split("\n").pop() ?? "null") : null;
    if (code !== null) return code;
    spawnSync(process.execPath, ["-e", "setTimeout(()=>{},500)"]);
  }
  throw new Error("no sign up code arrived in the mock outbox");
}

const problems = [];
let browser = null;
let ok = false;
try {
  if (!bundle.includes("<script>")) throw new Error("the build has no prerendered landing page; run pnpm build, not vite build");
  browser = await chromium.launch(process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
  // As text, because it runs in the page, not here.
  await page.addInitScript({ content: 'document.addEventListener("securitypolicyviolation", function (e) { console.error("CSP violation: " + e.violatedDirective + " blocked " + (e.blockedURI || "inline")); });' });
  const step = async (name, work) => {
    await work();
    console.log(`  ok  ${name}`);
  };

  await step("the landing page loads with its inline script allowed by hash", async () => {
    await page.goto(ORIGIN, { waitUntil: "networkidle" });
    await page.getByRole("heading", { level: 1 }).first().waitFor();
  });
  const email = `csp-${Date.now()}@example.com`;
  await step("sign up over the Convex connection", async () => {
    await page.goto(`${ORIGIN}/signin?mode=signUp`, { waitUntil: "networkidle" });
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("studyhard2026");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByRole("heading", { name: "Check your email" }).waitFor();
    await page.getByLabel("Code from the email").fill(outboxCode(email));
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.getByLabel("What should Taku call you?").fill("Tendai");
    await page.getByLabel("Month").selectOption({ label: "January" });
    await page.getByLabel("Year").selectOption(String(new Date().getFullYear() - 22));
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Skip" }).click();
    await page.getByRole("heading", { name: /What are we studying today, Tendai/ }).waitFor();
  });
  await step("a notebook, pasted notes and a cited answer", async () => {
    await page.getByRole("button", { name: "New notebook" }).first().click();
    await page.getByLabel("What is this notebook for?").fill("Biology");
    await page.getByRole("button", { name: "Create notebook" }).click();
    await page.getByRole("button", { name: /^Paste text/ }).click();
    await page.getByLabel("Your text").fill("Photosynthesis\nGreen plants make glucose from carbon dioxide and water using light energy.\nChlorophyll in the chloroplasts absorbs the light.\nOxygen is released as a by product.");
    await page.getByRole("button", { name: "Add text" }).click();
    await page.getByLabel("Ask Taku about your notes").fill("What does chlorophyll do?");
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await page.getByTestId("message-taku").last().getByText("Chlorophyll absorbs the light").waitFor({ timeout: 60_000 });
  });
  await step("a file upload to Convex storage", async () => {
    await page.getByTestId("file-input").setInputFiles(join(process.cwd(), "tests", "fixtures", "sources", "biology-notes.pdf"));
    // The sources rail folds once the learner is chatting.
    if ((await page.getByTestId("sources-rail").getAttribute("data-state")) === "folded") await page.getByRole("button", { name: /^Open sources/ }).click();
    await page.getByText("2 pages").first().waitFor({ timeout: 60_000 });
  });
  await step("a general chat with maths drawn by KaTeX", async () => {
    await page.goto(`${ORIGIN}/chat`, { waitUntil: "networkidle" });
    await page.getByLabel("Message Taku").fill("How do I factorise x^2 + 5x + 6?");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await page.locator(".katex").first().waitFor({ timeout: 60_000 });
  });
  await step("the privacy notice, a plain page on its own address", async () => {
    await page.goto(`${ORIGIN}/privacy`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { level: 1 }).first().waitFor();
  });
  ok = problems.length === 0;
} catch (error) {
  problems.push(`step failed: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
} finally {
  await browser?.close();
  server.close();
}
for (const p of problems) console.error(`csp-check: ${p}`);
console.log(ok ? "\nCSP CHECK: passed, no console errors and no policy violations." : `\nCSP CHECK: failed with ${problems.length} problem(s).`);
process.exit(ok ? 0 : 1);
