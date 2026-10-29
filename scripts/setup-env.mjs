// Sets Convex environment variables on the local deployment (default) or the
// production deployment (--prod). Ported from Amayi Learn (scripts/setup-env.mjs
// at ec3496e). Secrets are generated or read from .env.local and passed
// through a temporary file that is deleted at once. Nothing secret is printed.
//
//   node scripts/setup-env.mjs --mode mock
//   node scripts/setup-env.mjs --prod --mode live --site-url https://<site>
//
// Existing Convex Auth keys are kept unless --rotate is set, so running this
// twice does not sign everyone out.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { requireLocalDeployment } from "./lib/convex-target.mjs";
import { convexDevEnv } from "./lib/local-backend.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};

const prod = flag("--prod");
if (!prod) requireLocalDeployment("setup-env", { allowCloud: true });
const mode = option("--mode", prod ? "live" : "mock");
if (!["live", "mock"].includes(mode)) throw new Error('--mode takes "live" or "mock".');
const siteUrl = option("--site-url", prod ? undefined : "http://localhost:5173");
const rotate = flag("--rotate");
const target = prod ? ["--prod"] : [];

function readEnvLocal() {
  const out = {};
  if (!existsSync(".env.local")) return out;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/\s+#.*$/, "").replace(/^"(.*)"$/, "$1");
  }
  return out;
}

function npx(cmdArgs, input) {
  return execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", cmdArgs, {
    encoding: "utf8",
    input,
    shell: process.platform === "win32",
    stdio: ["pipe", "pipe", "pipe"],
    // Local runs must never see the production deploy key; --prod needs it.
    env: prod ? process.env : convexDevEnv(),
  });
}

function existingNames() {
  const listed = npx(["convex", "env", "list", ...target]);
  return new Set(
    listed
      .split(/\r?\n/)
      .map((l) => l.match(/^([A-Z0-9_]+)(=|$)/)?.[1])
      .filter(Boolean),
  );
}

const local = readEnvLocal();
const have = existingNames();
const values = {
  AI_MODE: mode,
  OPENROUTER_APP_NAME: "Takudzidza by Taku",
  ADMIN_EMAILS: local.ADMIN_EMAILS || "takmaswi@gmail.com",
};
if (siteUrl !== undefined) {
  values.SITE_URL = siteUrl;
  values.OPENROUTER_SITE_URL = siteUrl;
}
if (!prod && local.OPENROUTER_API_KEY) values.OPENROUTER_API_KEY = local.OPENROUTER_API_KEY;
if (rotate || !have.has("JWT_PRIVATE_KEY") || !have.has("JWKS")) {
  const keys = await generateKeyPair("RS256", { extractable: true });
  const privateKey = await exportPKCS8(keys.privateKey);
  const publicKey = await exportJWK(keys.publicKey);
  values.JWT_PRIVATE_KEY = privateKey.trimEnd().replace(/\n/g, " ");
  values.JWKS = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });
}

const dir = mkdtempSync(join(tmpdir(), "takudzidza-env-"));
const file = join(dir, "env");
try {
  const body = Object.entries(values)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => {
      const text = String(value);
      if (text.includes("'") || text.includes("\n")) throw new Error(`${name} cannot be written safely to an env file.`);
      return `${name}='${text}'`;
    })
    .join("\n");
  writeFileSync(file, `${body}\n`, { mode: 0o600 });
  npx(["convex", "env", "set", ...target, "--force", "--from-file", file]);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(`Set ${Object.keys(values).length} variables on the ${prod ? "production" : "local"} deployment: ${Object.keys(values).sort().join(", ")}`);
