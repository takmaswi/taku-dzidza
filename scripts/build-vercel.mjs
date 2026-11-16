// The Vercel build: generate data without test fixtures, then deploy the
// Convex functions and build the site against that deployment's URL. Ported
// from Amayi Learn (scripts/build-vercel.mjs at ec3496e).
//
// The target is CONVEX_DEPLOY_KEY when set, otherwise CONVEX_DEPLOYMENT (the
// stored Convex CLI login; scripts/deploy-vercel.mjs sets it to production).
// The URL convex deploy hands the build is written to .cache/convex-url, so
// the deploy script uses that exact address and never has to guess it from
// the bundle (the 13 November deploy guessed wrong: DECISIONS.md, Stage 1).
import { spawnSync } from "node:child_process";

function run(command, args, env = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("pnpm", ["gen"], { TAKU_GEN_FIXTURES: "0" });
run("pnpm", ["exec", "convex", "deploy", "-y", "--cmd-url-env-var-name", "VITE_CONVEX_URL", "--cmd", "node scripts/build-site.mjs"], { TAKU_GEN_FIXTURES: "0" });
