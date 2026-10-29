import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const ACCESS_HELPERS = ["requireUser(", "requireProfile(", "requireLearner(", "requireAdmin("];

export function walk(dir: string, predicate: (path: string) => boolean): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path, predicate));
    else if (predicate(path)) out.push(path);
  }
  return out;
}

export type PublicFunction = { name: string; guarded: boolean };

/** Find every exported public query, mutation and action in one source file. */
export function scanSource(modulePath: string, source: string): PublicFunction[] {
  const found: PublicFunction[] = [];
  const re = /export const (\w+)\s*=\s*(query|mutation|action)\s*\(/g;
  const starts: { name: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) starts.push({ name: m[1], index: m.index });
  const exportRe = /\nexport /g;
  for (const start of starts) {
    exportRe.lastIndex = start.index + 1;
    const next = exportRe.exec(source);
    const block = source.slice(start.index, next === null ? source.length : next.index);
    found.push({
      name: `${modulePath}:${start.name}`,
      guarded: ACCESS_HELPERS.some((h) => block.includes(h)),
    });
  }
  // Convex Auth's destructured exports.
  const authMatch = source.match(/export const \{([^}]+)\}\s*=\s*convexAuth\(/);
  if (authMatch !== null) {
    for (const name of authMatch[1].split(",").map((s) => s.trim())) {
      if (["signIn", "signOut", "isAuthenticated"].includes(name)) {
        found.push({ name: `${modulePath}:${name}`, guarded: false });
      }
    }
  }
  return found;
}

export function scanConvex(root: string): PublicFunction[] {
  const convexDir = join(root, "convex");
  const files = walk(convexDir, (p) => p.endsWith(".ts") && !p.includes("_generated") && !p.endsWith(".d.ts"));
  return files.flatMap((file) => {
    const modulePath = relative(convexDir, file).split("\\").join("/").replace(/\.ts$/, "");
    return scanSource(modulePath, readFileSync(file, "utf8"));
  });
}
