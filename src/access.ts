import type { Doc } from "../convex/_generated/dataModel";

/** Mirrors canStudy in convex/lib/access.ts; the server is the one that enforces it. */
export function canStudyState(state: Doc<"profiles">["consentState"]): boolean {
  return state === "not_needed" || state === "given";
}

export function errorText(error: unknown, fallback: string): string {
  const data = (error as { data?: unknown } | null)?.data;
  if (typeof data === "string" && data.length > 0) return data;
  return fallback;
}
