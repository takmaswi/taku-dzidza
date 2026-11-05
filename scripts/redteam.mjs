// pnpm redteam: attacks answer leakage in Guide me, companion requests and
// unsafe topics for under 18s (scripts/redteam/cases.json). Pattern ported from
// Amayi Learn (scripts/kids-redteam.mjs at ec3496e): a fixed set of cases, each
// stating the reply kind it must get.
//
//   pnpm redteam              mock fixtures (tests/convex/redteam.test.ts), no AI spend, runs in CI
//   pnpm redteam --cap 0.10   the real model, against the LOCAL deployment only
//
// The mock run proves the app's own layers route each case correctly; the
// replies it checks were written by hand. Only the live run tests the model.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { requireLocalDeployment } from "./lib/convex-target.mjs";
import { convexDevEnv } from "./lib/local-backend.mjs";

const args = process.argv.slice(2);
const capIndex = args.indexOf("--cap");

if (capIndex < 0) {
  const result = spawnSync("npx", ["vitest", "run", "tests/convex/redteam.test.ts"], { stdio: "inherit", shell: process.platform === "win32" });
  process.exit(result.status ?? 1);
}

const cap = Number(args[capIndex + 1]);
if (!Number.isFinite(cap) || cap <= 0 || cap > 1) {
  console.error("Pass a spending cap in US dollars, for example --cap 0.10 (at most 1).");
  process.exit(1);
}
requireLocalDeployment("redteam");
const key = process.env.OPENROUTER_API_KEY;
if (!key) {
  console.error("OPENROUTER_API_KEY is not set in this shell.");
  process.exit(1);
}
const env = convexDevEnv();
const convex = (cmd, input) => execFileSync(process.execPath, ["node_modules/convex/bin/main.js", ...cmd], { encoding: "utf8", env, input, stdio: ["pipe", "pipe", "inherit"] });
const cases = JSON.parse(readFileSync("scripts/redteam/cases.json", "utf8"));
let report;
try {
  convex(["env", "set", "AI_MODE", "live"]);
  convex(["env", "set", "OPENROUTER_API_KEY"], key);
  report = JSON.parse(convex(["run", "safety/redteam:run", JSON.stringify({ capUsd: cap, cases })]));
} finally {
  convex(["env", "set", "AI_MODE", "mock"]);
  try {
    convex(["env", "remove", "OPENROUTER_API_KEY"]);
  } catch {
    // Already gone.
  }
  console.log("Local deployment is back in mock mode with no key.");
}
for (const r of report.results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.group.padEnd(26)} ${r.got.padEnd(10)} ${r.input}`);
mkdirSync("eval-results", { recursive: true });
writeFileSync("eval-results/redteam.json", JSON.stringify({ ranAt: new Date().toISOString(), ...report }, null, 2));
const passed = report.results.filter((r) => r.pass).length;
console.log(`\n${passed} of ${report.results.length} passed, ${report.skipped} skipped by the cap, USD ${report.spentUsd} spent. Details: eval-results/redteam.json`);
process.exit(passed === report.results.length && report.skipped === 0 ? 0 : 1);
