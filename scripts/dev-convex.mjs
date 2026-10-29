import { spawnSync } from "node:child_process";
import { requireLocalDeployment } from "./lib/convex-target.mjs";
import { convexDevEnv } from "./lib/local-backend.mjs";

requireLocalDeployment("pnpm dev:convex", { allowCloud: true });
const result = spawnSync("npx", ["convex", "dev"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: convexDevEnv(),
});
process.exit(result.status ?? 1);
