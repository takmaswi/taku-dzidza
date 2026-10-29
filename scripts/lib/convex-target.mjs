import { existsSync, readFileSync } from "node:fs";

export function selectedDeployment(envText) {
  const match = envText.match(/^CONVEX_DEPLOYMENT=([^\r\n#]+)/m);
  return match?.[1].trim() ?? "";
}

export function classifyDeployment(envText) {
  const deployment = selectedDeployment(envText);
  const url = envText.match(/^VITE_CONVEX_URL=([^\r\n#]+)/m)?.[1].trim() ?? "";
  const local = (deployment.startsWith("local:") || deployment.startsWith("anonymous:")) && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url);
  return { deployment, url, local };
}

export function requireLocalDeployment(command, options = {}) {
  const envText = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
  const { deployment, url, local } = classifyDeployment(envText);
  if (local) return { deployment, url, local };
  if (options.allowCloud && process.env.TAKU_ALLOW_CLOUD_DEV === "1" && deployment.startsWith("dev:")) {
    return { deployment, url, local: false };
  }
  throw new Error(`${command} requires the local Convex deployment. Run "npx convex deployment select local" first.${options.allowCloud ? " To deliberately use cloud dev, set TAKU_ALLOW_CLOUD_DEV=1 for this command." : ""}`);
}
