// node scripts/first-visit.mjs [dir]: serves a built site (default dist) and
// reports what a first visit to the landing page downloads, including what the
// service worker precaches on install. Used for the before and after numbers
// in docs/closeouts/redesign-2.md.
import { spawn, spawnSync } from "node:child_process";
import { chromium } from "@playwright/test";

const dir = process.argv[2] ?? "dist";
const port = 4188;
const url = `http://localhost:${port}/`;
const win = process.platform === "win32";
const server = spawn("npx", ["vite", "preview", "--outDir", dir, "--port", String(port), "--strictPort"], { stdio: "ignore", shell: win, detached: !win });

async function waitUp() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("preview server did not start");
}

const rows = [];
try {
  await waitUp();
  const browser = await chromium.launch();
  const context = await browser.newContext({ serviceWorkers: "allow", viewport: { width: 1280, height: 800 } });
  context.on("requestfinished", async (request) => {
    const sizes = await request.sizes().catch(() => null);
    if (sizes === null || !request.url().startsWith(url)) return;
    rows.push({ path: new URL(request.url()).pathname, bytes: sizes.responseBodySize + sizes.responseHeadersSize, sw: request.serviceWorker() !== null });
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  // Give the service worker time to install and precache.
  await page.waitForTimeout(6000);
  await browser.close();
} finally {
  if (win) spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  else process.kill(-server.pid);
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const page = rows.filter((r) => !r.sw);
const sw = rows.filter((r) => r.sw);
const sum = (list) => list.reduce((a, r) => a + r.bytes, 0);
console.log(`page requests: ${page.length}, ${kb(sum(page))}`);
console.log(`service worker requests: ${sw.length}, ${kb(sum(sw))}`);
console.log(`first visit total: ${kb(sum(rows))}`);
for (const r of [...rows].sort((a, b) => b.bytes - a.bytes).slice(0, 12)) console.log(`  ${kb(r.bytes).padStart(10)}  ${r.sw ? "sw  " : "page"}  ${r.path}`);
