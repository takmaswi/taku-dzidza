// Environment for `npx convex dev` against the local backend. On Windows the
// backend's Node executor needs directory symlinks, which fail with EPERM
// without Developer Mode, so a preload turns them into junctions.
import { fileURLToPath } from "node:url";

export function convexDevEnv(input = process.env) {
  // Never let a development run see the production deploy key.
  // The production URL may also be set for deploys; Vite must read .env.local instead.
  const base = { ...input };
  delete base.CONVEX_DEPLOY_KEY;
  delete base.VITE_CONVEX_URL;
  if (process.platform !== "win32") return base;
  // Forward slashes: NODE_OPTIONS treats a backslash inside quotes as an escape.
  const preload = fileURLToPath(new URL("./win-junction-preload.cjs", import.meta.url)).replaceAll("\\", "/");
  const require = `--require "${preload}"`;
  const current = base.NODE_OPTIONS ?? "";
  return current.includes(preload) ? base : { ...base, NODE_OPTIONS: `${current} ${require}`.trim() };
}
