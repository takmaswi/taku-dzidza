// Run by `convex deploy --cmd` (scripts/build-vercel.mjs) with VITE_CONVEX_URL
// set to the deployment it just pushed to. Builds the site, records the URL in
// .cache/convex-url for scripts/deploy-vercel.mjs, and checks the bundle uses it.
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const url = process.env.VITE_CONVEX_URL;
if (url === undefined || !/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.convex\.cloud$/.test(url)) {
  console.error(`build-site: VITE_CONVEX_URL is not a Convex cloud address (${url ?? "unset"}).`);
  process.exit(1);
}
const result = spawnSync("pnpm", ["build"], { stdio: "inherit", shell: process.platform === "win32", env: process.env });
if (result.status !== 0) process.exit(result.status ?? 1);

const bundle = readdirSync("dist/assets")
  .filter((name) => name.endsWith(".js"))
  .map((name) => readFileSync(`dist/assets/${name}`, "utf8"))
  .join("\n");
if (!bundle.includes(`"${url}"`)) {
  console.error(`build-site: the bundle does not contain ${url}.`);
  process.exit(1);
}
if (/127\.0\.0\.1:3210|localhost:3210/.test(bundle)) {
  console.error("build-site: the bundle still points at the local backend.");
  process.exit(1);
}
mkdirSync(".cache", { recursive: true });
writeFileSync(".cache/convex-url", url);
console.log(`build-site: built against ${url}.`);
