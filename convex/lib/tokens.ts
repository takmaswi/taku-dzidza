/** Random link tokens and their hashes. Only hashes are stored. Ported from Amayi Learn (convex/learners/pin.ts at ec3496e). */

export function randomToken(bytes = 32): string {
  const raw = new Uint8Array(bytes);
  crypto.getRandomValues(raw);
  return btoa(String.fromCharCode(...raw)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function tokenHash(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** A code of random digits with no bias towards low digits. */
export function randomDigits(length: number): string {
  let out = "";
  while (out.length < length) {
    const [n] = crypto.getRandomValues(new Uint8Array(1));
    if (n < 250) out += String(n % 10);
  }
  return out;
}
