// pnpm deploy:prod: deploy the Convex functions to production, build the site
// against them (scripts/build-vercel.mjs), then publish dist to Vercel as a
// prebuilt output with the security headers. Production Convex settings are
// set separately (docs/DEPLOY.md).
//
// Credentials, in this order:
//   Convex  CONVEX_DEPLOY_KEY, else the stored CLI login with
//           CONVEX_DEPLOYMENT=prod:<PROD_DEPLOYMENT>.
//   Vercel  VERCEL_TOKEN with VERCEL_PROJECT_ID and VERCEL_ORG_ID, else the
//           stored CLI login with the project and team below.
// `--dry-run` confirms both targets and changes nothing.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { securityHeaders } from "./lib/security-headers.mjs";

const PROD_DEPLOYMENT = process.env.TAKU_PROD_DEPLOYMENT ?? "disciplined-condor-946";
const VERCEL_PROJECT = { projectId: process.env.VERCEL_PROJECT_ID ?? "prj_VXSP2nXy5izpDyRZydbsIIe41bV5", orgId: process.env.VERCEL_ORG_ID ?? "team_1VHQZXdpbaqhVdy5JbGxZHOq" };
const dryRun = process.argv.includes("--dry-run");
const win = process.platform === "win32";

function run(command, args, env = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: win, env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Never let a local URL from .env.local reach the build; convex deploy sets the right one.
const convexEnv = process.env.CONVEX_DEPLOY_KEY ? {} : { CONVEX_DEPLOYMENT: `prod:${PROD_DEPLOYMENT}` };
const vercelArgs = process.env.VERCEL_TOKEN ? ["--token", process.env.VERCEL_TOKEN] : [];
const vercel = process.env.VERCEL_TOKEN ? ["npx", ["-y", "vercel@48.2.0"]] : ["vercel", []];

if (dryRun) {
  run("pnpm", ["exec", "convex", "deploy", "--dry-run", "-y", "--codegen", "disable"], { ...convexEnv, VITE_CONVEX_URL: "" });
  run(vercel[0], [...vercel[1], "project", "inspect", "takudzidza", ...vercelArgs]);
  console.log(`deploy: dry run done. Convex ${convexEnv.CONVEX_DEPLOYMENT ?? "from CONVEX_DEPLOY_KEY"}, Vercel project ${VERCEL_PROJECT.projectId}.`);
  process.exit(0);
}

rmSync(".cache/convex-url", { force: true });
run("node", ["scripts/build-vercel.mjs"], { ...convexEnv, VITE_CONVEX_URL: "" });
if (!existsSync(".cache/convex-url")) {
  console.error("deploy: the build did not record its Convex address.");
  process.exit(1);
}
const convexUrl = readFileSync(".cache/convex-url", "utf8").trim();
rmSync(".vercel", { recursive: true, force: true });
mkdirSync(".vercel/output/static", { recursive: true });
cpSync("dist", ".vercel/output/static", { recursive: true });
// The policy names the exact Convex origin the build uses (audit S7).
const headers = Object.fromEntries(securityHeaders(convexUrl));
writeFileSync(".vercel/output/config.json", JSON.stringify({ version: 3, routes: [{ src: "/(.*)", headers, continue: true }, { handle: "filesystem" }, { src: "/(.*)", dest: "/index.html" }] }));
writeFileSync(".vercel/project.json", JSON.stringify(VERCEL_PROJECT));
run(vercel[0], [...vercel[1], "deploy", "--prebuilt", "--prod", "--yes", ...vercelArgs]);
// The production build writes the generated data without test fixtures; put the test version back.
run("node", ["scripts/gen-data.mjs"]);
console.log(`deploy: published, built against ${convexUrl}.`);
