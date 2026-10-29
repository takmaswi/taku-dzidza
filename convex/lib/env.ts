/**
 * Environment readers. Every operational number has a conservative default so
 * an unset variable never means unlimited. Ported from Takubasa
 * (convex/lib/env.ts at cca941e), keeping what Amayi Learn reads.
 */

export function envString(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.trim() === "" ? undefined : value.trim();
}

export function envNumber(name: string, fallback: number): number {
  const raw = envString(name);
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export type AiMode = "live" | "mock";

export function aiMode(): AiMode {
  return envString("AI_MODE") === "mock" ? "mock" : "live";
}

export function adminEmails(): string[] {
  return (envString("ADMIN_EMAILS") ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}
