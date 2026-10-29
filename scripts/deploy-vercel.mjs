// pnpm deploy:prod: deploy the Convex functions to production, build the site
// against them (scripts/build-vercel.mjs), then publish dist to Vercel as a
// prebuilt output. Needs CONVEX_DEPLOY_KEY, VERCEL_TOKEN, VERCEL_PROJECT_ID
// and VERCEL_ORG_ID in the environment. Production Convex settings are set
// separately (docs/DEPLOY.md).
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

for (const name of ["CONVEX_DEPLOY_KEY", "VERCEL_TOKEN", "VERCEL_PROJECT_ID", "VERCEL_ORG_ID"]) {
  if (!process.env[name]) {
    console.error(`${name} is not set.`);
    process.exit(1);
  }
}
function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run("node", ["scripts/build-vercel.mjs"]);
rmSync(".vercel", { recursive: true, force: true });
mkdirSync(".vercel/output/static", { recursive: true });
cpSync("dist", ".vercel/output/static", { recursive: true });
writeFileSync(".vercel/output/config.json", JSON.stringify({ version: 3, routes: [{ handle: "filesystem" }, { src: "/(.*)", dest: "/index.html" }] }));
writeFileSync(".vercel/project.json", JSON.stringify({ projectId: process.env.VERCEL_PROJECT_ID, orgId: process.env.VERCEL_ORG_ID }));
run("npx", ["-y", "vercel@48.2.0", "deploy", "--prebuilt", "--prod", "--yes", "--token", process.env.VERCEL_TOKEN]);
