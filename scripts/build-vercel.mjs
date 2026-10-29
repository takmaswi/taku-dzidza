// The Vercel build: generate data without test fixtures, then deploy the
// Convex functions with CONVEX_DEPLOY_KEY and build the site against that
// deployment's URL. Ported from Amayi Learn (scripts/build-vercel.mjs at ec3496e).
import { spawnSync } from "node:child_process";

function run(command, args, env = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("pnpm", ["gen"], { TAKU_GEN_FIXTURES: "0" });
run("pnpm", ["exec", "convex", "deploy", "--cmd-url-env-var-name", "VITE_CONVEX_URL", "--cmd", "pnpm build"], { TAKU_GEN_FIXTURES: "0" });
