/**
 * Age rules (SPEC.md 3.8). Plain TypeScript, shared with the browser.
 *   under MIN_AGE  Takudzidza is not for them yet; Amai Learn is.
 *   under 18       a child under the Cyber and Data Protection Act: a guardian
 *                  must consent before Taku or uploads open.
 */

export const MIN_AGE = 12;
export const ADULT_AGE = 18;
export const OLDEST_BIRTH_YEAR = 1920;

/** Whole years on the first day of the birth month; exact enough without a day. */
export function ageOn(birthYear: number, birthMonth: number, now: Date): number {
  const months = (now.getUTCFullYear() - birthYear) * 12 + (now.getUTCMonth() + 1 - birthMonth);
  return Math.floor(months / 12);
}

export type AgeVerdict = { ok: true; minor: boolean; age: number } | { ok: false; reason: "invalid" | "too_young" };

export function checkBirth(birthYear: number, birthMonth: number, now: Date): AgeVerdict {
  if (!Number.isInteger(birthYear) || !Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12) return { ok: false, reason: "invalid" };
  if (birthYear < OLDEST_BIRTH_YEAR || birthYear > now.getUTCFullYear()) return { ok: false, reason: "invalid" };
  const age = ageOn(birthYear, birthMonth, now);
  if (age < MIN_AGE) return { ok: false, reason: "too_young" };
  return { ok: true, minor: age < ADULT_AGE, age };
}
