// pnpm live-check --cap 0.10: a capped live check of the real model against
// the LOCAL Convex deployment (convex/notebooks/liveCheck.ts). Switches the
// local deployment to live mode with OPENROUTER_API_KEY from this shell,
// runs the check, then always switches back to mock and removes the key.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { requireLocalDeployment } from "./lib/convex-target.mjs";
import { convexDevEnv } from "./lib/local-backend.mjs";

const args = process.argv.slice(2);
const capIndex = args.indexOf("--cap");
const cap = capIndex >= 0 ? Number(args[capIndex + 1]) : NaN;
if (!Number.isFinite(cap) || cap <= 0 || cap > 1) {
  console.error("Pass a spending cap in US dollars, for example --cap 0.10 (at most 1).");
  process.exit(1);
}
requireLocalDeployment("live-check");
const key = process.env.OPENROUTER_API_KEY;
if (!key) {
  console.error("OPENROUTER_API_KEY is not set in this shell.");
  process.exit(1);
}
const env = convexDevEnv();
const npx = (cmd, input) => execFileSync("npx", cmd, { encoding: "utf8", env, input, stdio: ["pipe", "pipe", "inherit"] });
const photo = readFileSync("tests/fixtures/sources/geography-photo.jpg").toString("base64");
try {
  npx(["convex", "env", "set", "AI_MODE", "live"]);
  npx(["convex", "env", "set", "OPENROUTER_API_KEY"], key);
  const out = npx(["convex", "run", "notebooks/liveCheck:run", JSON.stringify({ capUsd: cap, photoBase64: photo })]);
  console.log(out);
} finally {
  npx(["convex", "env", "set", "AI_MODE", "mock"]);
  try {
    npx(["convex", "env", "remove", "OPENROUTER_API_KEY"]);
  } catch {
    // Already gone.
  }
  console.log("Local deployment is back in mock mode with no key.");
}
