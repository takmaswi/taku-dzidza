/**
 * Class, staff and child codes. Ported from Amayi Learn
 * (convex/accounts/rules.ts at 290e4b4, "names, PINs and codes"). Plain
 * TypeScript, shared with the browser.
 */

/** Letters and digits that cannot be confused when read aloud or copied from a board. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

export function normaliseCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function validCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}

export function randomCode(random: (n: number) => number): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) out += CODE_ALPHABET[random(CODE_ALPHABET.length)];
  return out;
}

export function cryptoRandom(n: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % n;
}

/** What a teacher sees of a learner: the first word of their display name. */
export function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? "";
}

const FIRST_NAME = /^[\p{L}' ]{1,30}$/u;

/** A first name only: letters, spaces and apostrophes, up to 30 characters, at most two words. */
export function validFirstName(name: string): boolean {
  const trimmed = name.trim();
  return FIRST_NAME.test(trimmed) && trimmed.split(/\s+/).length <= 2;
}

/** The link a learner opens to join, and the text a teacher shares on WhatsApp. */
export function joinLink(origin: string, code: string): string {
  return `${origin.replace(/\/$/, "")}/join/${code}`;
}

export function shareText(className: string, origin: string, code: string): string {
  return `Join my class ${className} on Takudzidza. Open ${joinLink(origin, code)} or type the class code ${code}.`;
}

/** An organisation's learner or staff code, shared by its admin. The same join page takes every kind of code. */
export function orgShareText(orgName: string, origin: string, code: string, role: "learner" | "teacher" | "admin"): string {
  const as = role === "learner" ? "" : ` as ${role === "admin" ? "an admin" : "a teacher"}`;
  return `Join ${orgName}${as} on Takudzidza. Open ${joinLink(origin, code)} or type the code ${code}.`;
}

export function whatsAppLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
