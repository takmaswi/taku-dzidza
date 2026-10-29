// pnpm e2e: the Playwright journeys in mock mode. Ported from Amayi Learn
// (scripts/e2e.mjs at ec3496e).
//
//   1. require the already running local Convex backend (pnpm dev)
//   2. set the mock env on it (scripts/setup-env.mjs --mode mock)
//   3. start Vite on port 5199 (a dedicated port, checked free first)
//   4. run Playwright
//   5. fail unless at least one test passed, none failed and none was skipped

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { requireLocalDeployment } from "./lib/convex-target.mjs";
import { convexDevEnv } from "./lib/local-backend.mjs";

const REPORT = "test-results/e2e-report.json";
const WEB_PORT = 5199;
const WEB_URL = `http://localhost:${WEB_PORT}`;
const win = process.platform === "win32";

function run(label, command, args, env = {}) {
  console.log(`\n> ${label}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: win, env: { ...convexDevEnv(), ...env } });
  if (result.status !== 0) {
    console.error(`e2e: "${label}" failed with exit code ${result.status}.`);
    process.exit(1);
  }
}

async function portInUse(url) {
  try {
    await fetch(url);
    return true;
  } catch {
    return false;
  }
}

async function waitFor(url, timeoutMs) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${url} did not start within ${timeoutMs / 1000} s.`);
}

function stopTree(child) {
  if (child === null || child.exitCode !== null) return;
  if (win) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }
}

function summarise() {
  if (!existsSync(REPORT)) {
    console.error("e2e: Playwright wrote no report, so nothing can be counted as passed.");
    return false;
  }
  const stats = JSON.parse(readFileSync(REPORT, "utf8")).stats ?? {};
  const passed = stats.expected ?? 0;
  const failed = stats.unexpected ?? 0;
  const skipped = stats.skipped ?? 0;
  const flaky = stats.flaky ?? 0;
  console.log(`\nE2E SUMMARY: ${passed} passed, ${failed} failed, ${skipped} skipped, ${flaky} flaky`);
  if (passed === 0) console.error("e2e: zero tests passed. That is a failure, not a skip.");
  if (skipped > 0) console.error("e2e: skipped tests are not allowed.");
  return passed > 0 && failed === 0 && skipped === 0 && flaky === 0;
}

let web = null;
let ok = false;
try {
  rmSync(REPORT, { force: true });
  const target = requireLocalDeployment("pnpm e2e");
  run("generate data", "node", ["scripts/gen-data.mjs"]);
  if (!(await portInUse(target.url))) throw new Error("Start pnpm dev in another terminal before pnpm e2e so the local Convex backend stays running.");
  run("set mock env on the local deployment", "node", ["scripts/setup-env.mjs", "--mode", "mock", "--site-url", WEB_URL]);
  if (await portInUse(WEB_URL)) throw new Error(`${WEB_URL} is already in use by another server. Stop it and run again.`);
  console.log(`\n> start Vite on ${WEB_URL}`);
  web = spawn("npx", ["vite", "--port", String(WEB_PORT), "--strictPort"], { stdio: "ignore", shell: win, detached: !win, env: { ...convexDevEnv(), VITE_CONVEX_URL: target.url } });
  await waitFor(WEB_URL, 60_000);
  const result = spawnSync("npx", ["playwright", "test", ...process.argv.slice(2)], { stdio: "inherit", shell: win, env: { ...convexDevEnv(), E2E_BASE_URL: WEB_URL } });
  if (result.status !== 0) console.error(`e2e: Playwright exited with code ${result.status}.`);
  ok = summarise();
} catch (error) {
  console.error(`e2e: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  stopTree(web);
}
process.exit(ok ? 0 : 1);
