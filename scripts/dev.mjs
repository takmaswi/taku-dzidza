// pnpm dev: runs `convex dev` and Vite together and stops both on Ctrl+C.
// Ported from Amayi Learn (scripts/dev.mjs at ec3496e), without the kids art step.

import { spawn, spawnSync } from "node:child_process";
import { requireLocalDeployment } from "./lib/convex-target.mjs";
import { convexDevEnv } from "./lib/local-backend.mjs";

try {
  requireLocalDeployment("pnpm dev", { allowCloud: true });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const win = process.platform === "win32";
const gen = spawnSync("node", ["scripts/gen-data.mjs"], { stdio: "inherit" });
if (gen.status !== 0) process.exit(gen.status ?? 1);
const children = [
  spawn("npx", ["convex", "dev"], { stdio: "inherit", shell: win, env: convexDevEnv() }),
  spawn("npx", ["vite"], { stdio: "inherit", shell: win, env: convexDevEnv() }),
];

function stopAll(code) {
  for (const child of children) {
    if (child.exitCode !== null) continue;
    if (win) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill("SIGTERM");
  }
  process.exit(code);
}

for (const child of children) child.on("exit", (code) => stopAll(code ?? 0));
process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
