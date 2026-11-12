// node scripts/screens-polish.mjs <outDir>: the signed in screens for the
// Polish 2 report, in light and dark, at 1280 wide and 390 wide. Needs the
// local Convex backend (pnpm dev:convex) running. Each run signs up a fresh
// learner in mock mode, so no AI is spent. Files: <outDir>/<theme>-<device>/<n>-<screen>.png
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { requireLocalDeployment } from "./lib/convex-target.mjs";
import { convexDevEnv } from "./lib/local-backend.mjs";

const out = process.argv[2] ?? "screens-polish";
const only = process.argv[3];
const port = 5197;
const base = `http://localhost:${port}`;
const win = process.platform === "win32";
const target = requireLocalDeployment("screens-polish");
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

const DEVICES = [
  { name: "desktop", viewport: { width: 1280, height: 800 }, scale: 1, mobile: false },
  { name: "phone", viewport: { width: 390, height: 844 }, scale: 2, mobile: true },
];

async function run(theme, device) {
  const dir = join(out, `${theme}-${device.name}`);
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: device.viewport, deviceScaleFactor: device.scale, isMobile: device.mobile, hasTouch: device.mobile, reducedMotion: "reduce" });
  await context.addInitScript((t) => localStorage.setItem("takudzidza-theme", t), theme);
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  console.log(`${theme} ${device.name}`);
  try {
    await steps(page, dir, device, theme);
  } catch (e) {
    await shoot(page, dir, "error");
    throw e;
  } finally {
    await browser.close();
  }
}

async function steps(page, dir, device, theme) {
  const email = `polish-${theme}-${device.name}-${Date.now()}@example.com`;
  await page.goto(`${base}/signin?mode=signUp`, { timeout: 240_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("studyhard2026");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Code from the email").fill(await code(email));
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.getByLabel("What should Taku call you?").fill("Farai");
  await page.getByLabel("Month").selectOption({ label: "January" });
  await page.getByLabel("Year").selectOption(String(new Date().getFullYear() - 22));
  await page.getByRole("button", { name: "Continue" }).click();
  // The style quiz, through to the study style cards.
  await page.getByRole("button", { name: /^O Level/ }).click();
  for (const answer of [/^Clean and quiet/, /^Going step by step/, /^Like a patient teacher/]) await page.getByRole("button", { name: answer }).click();
  await page.getByRole("button", { name: "Let's go" }).waitFor();
  await shoot(page, dir, "0-style-cards");
  await page.getByRole("button", { name: "Let's go" }).click();
  await page.getByRole("heading", { name: /Farai/ }).waitFor();
  await shoot(page, dir, "1-home");

  await page.goto(`${base}/notebooks`);
  await page.getByRole("heading", { name: "Notebooks", exact: true }).waitFor();
  await shoot(page, dir, "2-notebooks-empty");

  await page.getByRole("button", { name: "New notebook" }).first().click();
  await page.getByLabel("What is this notebook for?").fill("Form 4 Biology");
  await page.getByRole("button", { name: "Create notebook" }).click();
  await page.waitForURL(/\/n\//);
  await page.getByRole("heading", { name: "Form 4 Biology" }).waitFor();
  await shoot(page, dir, "3-notebook-empty");

  await page.getByRole("button", { name: /^Paste text/ }).first().click();
  await page.getByLabel("Your text").fill(NOTES);
  await page.getByRole("button", { name: "Add text" }).click();
  await page.getByLabel("Ask Taku about your notes").fill("What does chlorophyll do?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await page.getByText("Chlorophyll absorbs the light").last().waitFor();
  await page.locator(".stage").first().waitFor({ state: "detached" }).catch(() => undefined);
  await page.locator("#question").blur().catch(() => undefined);
  await shoot(page, dir, "4-notebook");

  if (device.mobile) await page.getByRole("button", { name: "Study tools", exact: true }).click();
  await page.getByRole("button", { name: /^Flashcards/ }).click();
  await page.getByLabel("How many").fill("5");
  await page.getByRole("button", { name: "Make flashcards" }).click();
  await page.getByTestId("flashcard").waitFor();
  await shoot(page, dir, "5-review");
  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: "Show answer", exact: true }).click();
    if (i === 0) await shoot(page, dir, "5-review-answer");
    await page.getByRole("button", { name: "Got it" }).click();
  }
  await page.getByText(/Got it: 5/).waitFor();
  await shoot(page, dir, "6-review-done");

  await page.goto(`${base}/notebooks`);
  await page.getByText("Form 4 Biology").first().waitFor();
  await shoot(page, dir, "2-notebooks");

  await page.goto(`${base}/chat`);
  await page.getByRole("button", { name: "Explain osmosis simply" }).first().waitFor();
  await shoot(page, dir, "7-chat-empty");
  await page.getByRole("button", { name: "Explain osmosis simply" }).first().click();
  await page.getByText("partially permeable membrane").last().waitFor();
  await shoot(page, dir, "7-chat");

  await page.goto(`${base}/settings`);
  await page.getByRole("heading", { name: "Settings" }).first().waitFor();
  await shoot(page, dir, "8-settings");

  await page.goto(`${base}/`);
  await page.getByRole("heading", { name: /Farai/ }).waitFor();
  await shoot(page, dir, "1-home-returning");

  // A learner under 18 waits for a guardian: a second, fresh account in a clean context.
  const young = await page.context().browser().newContext({ viewport: device.viewport, deviceScaleFactor: device.scale, isMobile: device.mobile, hasTouch: device.mobile, reducedMotion: "reduce" });
  await young.addInitScript((t) => localStorage.setItem("takudzidza-theme", t), theme);
  const kid = await young.newPage();
  kid.setDefaultTimeout(30_000);
  const kidEmail = `polish-young-${theme}-${device.name}-${Date.now()}@example.com`;
  await kid.goto(`${base}/signin?mode=signUp`);
  await kid.getByLabel("Email").fill(kidEmail);
  await kid.getByLabel("Password", { exact: true }).fill("studyhard2026");
  await kid.getByRole("button", { name: "Create account" }).click();
  await kid.getByLabel("Code from the email").fill(await code(kidEmail));
  await kid.getByRole("button", { name: "Confirm" }).click();
  await kid.getByLabel("What should Taku call you?").fill("Rudo");
  await kid.getByLabel("Month").selectOption({ label: "January" });
  await kid.getByLabel("Year").selectOption(String(new Date().getFullYear() - 15));
  await kid.getByRole("button", { name: "Continue" }).click();
  await kid.getByRole("button", { name: "Make the link" }).waitFor();
  await shoot(kid, dir, "9-guardian");
  await young.close();
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
  for (const theme of ["light", "dark"]) {
    for (const device of DEVICES) {
      if (only !== undefined && only !== `${theme}-${device.name}`) continue;
      await run(theme, device);
    }
  }
} finally {
  if (win) spawnSync("taskkill", ["/pid", String(web.pid), "/T", "/F"], { stdio: "ignore" });
  else process.kill(-web.pid);
}
