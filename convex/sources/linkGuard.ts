/**
 * What the link reader may fetch (SPEC.md 3.2). Plain TypeScript with no
 * imports from the rest of the app, so convex/sources/text.ts can use it too.
 * Unit tested in tests/unit/linkGuard.test.ts. The network side is
 * convex/sources/linkFetch.ts.
 */

export const MAX_LINK_HOPS = 3;

/** First two octets and the prefix length of every IPv4 range that is not the public internet. */
const PRIVATE_V4: readonly [number, number, number][] = [
  [0, 0, 8], // this network
  [10, 0, 8], // private
  [100, 64, 10], // carrier grade NAT
  [127, 0, 8], // loopback
  [169, 254, 16], // link local, including cloud metadata addresses
  [172, 16, 12], // private
  [192, 168, 16], // private
  [198, 18, 15], // benchmarking
  [224, 0, 4], // multicast
  [240, 0, 4], // reserved and broadcast
];

function v4Parts(address: string): number[] | null {
  const parts = address.split(".");
  if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p))) return null;
  const nums = parts.map(Number);
  return nums.every((n) => n <= 255) ? nums : null;
}

function isPublicV4(parts: readonly number[]): boolean {
  const value = ((parts[0] << 24) >>> 0) + (parts[1] << 16);
  const privateRange = PRIVATE_V4.some(([a, b, bits]) => {
    const mask = (0xffffffff << (32 - bits)) >>> 0;
    const start = ((a << 24) >>> 0) + (b << 16);
    return (value & mask) >>> 0 === (start & mask) >>> 0;
  });
  return !privateRange && !(parts[0] === 192 && parts[1] === 0 && parts[2] === 0);
}

/** Expands an IPv6 address to its eight groups, or null when it is not one. */
function v6Groups(raw: string): number[] | null {
  let text = raw.split("%")[0].toLowerCase();
  if (!text.includes(":") || !/^[0-9a-f:.]+$/.test(text)) return null;
  const lastColon = text.lastIndexOf(":");
  const tail = text.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = v4Parts(tail);
    if (v4 === null) return null;
    text = `${text.slice(0, lastColon + 1)}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] === "" ? [] : halves[0].split(":");
  const right = halves.length === 1 || halves[1] === "" ? [] : halves[1].split(":");
  const missing = 8 - left.length - right.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...left, ...Array<string>(halves.length === 1 ? 0 : missing).fill("0"), ...right];
  if (groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => parseInt(g, 16));
}

/**
 * True only for an address on the public internet. Anything that cannot be
 * read as an address counts as not public, so a surprise never gets through.
 */
export function isPublicAddress(address: string): boolean {
  const v4 = v4Parts(address);
  if (v4 !== null) return isPublicV4(v4);
  const g = v6Groups(address);
  if (g === null) return false;
  // Forms that carry an IPv4 address: judge the address inside.
  const inside = (hi: number, lo: number) => isPublicV4([hi >> 8, hi & 255, lo >> 8, lo & 255]);
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return inside(g[6], g[7]); // ::ffff:a.b.c.d
  if (g.slice(0, 6).every((x) => x === 0)) return false; // :: and ::1, and the old ::a.b.c.d
  if (g[0] === 0x64 && g[1] === 0xff9b) return inside(g[6], g[7]); // NAT64
  if (g[0] === 0x2002) return inside(g[1], g[2]); // 6to4
  // Only global unicast 2000::/3, and not the documentation range 2001:db8::/32.
  if ((g[0] & 0xe000) !== 0x2000) return false;
  return !(g[0] === 0x2001 && g[1] === 0x0db8);
}

export type LinkResponse = { status: number; location: string | null; contentType: string; body: string };
export type LinkOutcome = { ok: true; url: string; response: LinkResponse } | { ok: false; error: string };

export const LINK_ERRORS = {
  blocked: "That address cannot be read.",
  tooManyHops: "That address redirects too many times.",
  badRedirect: "That address redirects somewhere that cannot be read.",
  unreachable: "The page could not be reached.",
} as const;

/**
 * Follows a link one hop at a time, checking the public address rule on every
 * hop before it is fetched. fetchOnce makes exactly one request and never
 * follows a redirect itself. linkProblem is passed in so this file stays free
 * of imports (text.ts imports isPublicAddress from here).
 */
export async function followLink(start: string, linkProblem: (url: string) => string | null, fetchOnce: (url: string) => Promise<LinkResponse>): Promise<LinkOutcome> {
  let url = start;
  for (let hop = 0; ; hop++) {
    if (linkProblem(url) !== null) return { ok: false, error: hop === 0 ? LINK_ERRORS.blocked : LINK_ERRORS.badRedirect };
    const response = await fetchOnce(url);
    if (response.status < 300 || response.status >= 400) return { ok: true, url, response };
    if (response.location === null) return { ok: false, error: LINK_ERRORS.badRedirect };
    if (hop >= MAX_LINK_HOPS) return { ok: false, error: LINK_ERRORS.tooManyHops };
    try {
      url = new URL(response.location, url).toString();
    } catch {
      return { ok: false, error: LINK_ERRORS.badRedirect };
    }
  }
}
