// node scripts/screens.mjs <outDir> [before|after] [phone]: screenshots of
// the main screens on a phone and a desktop, from a local mock run (the local
// Convex backend from pnpm dev:convex must be running). Used for the redesign
// report. "before" handles the layout before Redesign 2.
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { requireLocalDeployment } from "./lib/convex-target.mjs";
import { convexDevEnv } from "./lib/local-backend.mjs";

const out = process.argv[2] ?? "screens";
const version = process.argv[3] ?? "after";
const port = 5198;
const base = `http://localhost:${port}`;
const win = process.platform === "win32";
const target = requireLocalDeployment("screens");
const NOTES = "Photosynthesis\nGreen plants make glucose from carbon dioxide and water using light energy.\nChlorophyll in the chloroplasts absorbs the light.\nOxygen is released as a by product.";

spawnSync("node", ["scripts/setup-env.mjs", "--mode", "mock", "--site-url", base], { stdio: "inherit", shell: win, env: convexDevEnv() });
const web = spawn("npx", ["vite", "--port", String(port), "--strictPort"], { stdio: "ignore", shell: win, detached: !win, env: { ...convexDevEnv(), VITE_CONVEX_URL: target.url } });

function outbox(to) {
  const r = spawnSync(process.execPath, ["node_modules/convex/bin/main.js", "run", "accounts/outbox:latest", JSON.stringify({ to })], { encoding: "utf8", env: convexDevEnv() });
  return JSON.parse(r.stdout.trim().split("\n").pop() ?? "null");
}
async function code(to) {
  for (let i = 0; i < 40; i++) {
    const c = outbox(to);
    if (c !== null) return c;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("no code");
}

async function shoot(page, dir, name) {
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(dir, `${name}.png`) });
  console.log(`  ${name}`);
}

async function run(device) {
  const dir = join(out, device.name);
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: device.viewport, deviceScaleFactor: device.scale, isMobile: device.mobile, hasTouch: device.mobile, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  console.log(device.name);
  try {
    await steps(page, dir, device, browser);
  } catch (e) {
    await shoot(page, dir, "error");
    throw e;
  }
}

async function steps(page, dir, device, browser) {
  await page.goto(`${base}/`);
  await page.getByRole("link", { name: "Start studying free" }).first().waitFor();
  await shoot(page, dir, "1-landing");

  const email = `screens-${device.name}-${Date.now()}@example.com`;
  await page.goto(`${base}/signin?mode=signUp`);
  await shoot(page, dir, "2-signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("studyhard2026");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Code from the email").fill(await code(email));
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.getByLabel("What should Taku call you?").fill("Farai");
  await page.getByLabel("Month").selectOption({ label: "January" });
  await page.getByLabel("Year").selectOption(String(new Date().getFullYear() - 22));
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await page.getByRole("heading", { name: /Farai/ }).waitFor();
  await shoot(page, dir, "3-home");

  await page.getByRole("button", { name: "New notebook" }).first().click();
  await page.getByLabel("What is this notebook for?").fill("Form 4 Biology");
  await page.getByRole("button", { name: "Create notebook" }).click();
  await page.waitForURL(/\/n\//);
  await page.getByRole("heading", { name: "Form 4 Biology" }).waitFor();
  await shoot(page, dir, "4-notebook-empty");

  if (version === "before" && device.mobile) await page.getByRole("button", { name: /^Sources|Add a source/ }).first().click();
  await page.getByRole("button", { name: /^Paste text/ }).first().click();
  await page.getByLabel("Your text").fill(NOTES);
  await page.getByRole("button", { name: "Add text" }).click();
  if (version === "before") await page.getByText("1 page").first().waitFor();
  if (version === "before" && device.mobile) await page.getByRole("button", { name: "Done" }).click();
  for (const q of ["What does chlorophyll do?", "What does chlorophyll do?"]) {
    await page.getByLabel("Ask Taku about your notes").fill(q);
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await page.getByText("Chlorophyll absorbs the light").last().waitFor();
    await page.locator(".stage").first().waitFor({ state: "detached" }).catch(() => undefined);
  }
  await shoot(page, dir, "5-notebook");

  await page.goto(`${base}/chat`);
  await page.getByRole("button", { name: "Explain osmosis simply" }).first().click();
  await page.getByText("partially permeable membrane").last().waitFor();
  await shoot(page, dir, "6-chat");
  await page.goto(`${base}/settings`);
  await shoot(page, dir, "7-settings");
  await browser.close();
}

try {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (process.argv[4] !== "phone") await run({ name: "desktop", viewport: { width: 1280, height: 800 }, scale: 1, mobile: false });
  await run({ name: "phone", viewport: { width: 360, height: 780 }, scale: 2, mobile: true });
} finally {
  if (win) spawnSync("taskkill", ["/pid", String(web.pid), "/T", "/F"], { stdio: "ignore" });
  else process.kill(-web.pid);
}
