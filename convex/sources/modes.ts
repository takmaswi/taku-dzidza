import { quoteOnPage } from "./text";

/**
 * Source modes and the server side citation check (SPEC.md 3.2). Ported in
 * idea from Amayi Learn (convex/sources/modes.ts at ec3496e) and tightened:
 * a citation counts only when its quote is found on the cited page.
 *
 *   only_mine  "Only my material": every part must be cited and verified;
 *              anything else is dropped and the answer says what is missing.
 *   mine_plus  "My material plus Taku's ideas": unverified parts are kept and
 *              marked as Taku's.
 */

export const SOURCE_MODES = ["only_mine", "mine_plus"] as const;
export type SourceMode = (typeof SOURCE_MODES)[number];

/** One part of Taku's answer as the model returns it. ref is a source label like "S2", or "" for none. */
export type RawPart = { text: string; ref: string; page: number; quote: string };

export type Origin = { kind: "source"; sourceId: string; page: number; quote: string } | { kind: "added" };
export type SettledPart = { text: string; origin: Origin };

export type PageLookup = (ref: string, page: number) => { sourceId: string; text: string } | null;

/**
 * The same rule for the items of a study tool (cards, quiz questions,
 * summary points, mind map leaves, Scroll cards): each item's ref, page and
 * quote become its origin, or the item is dropped in only_mine.
 */
export function settleItems<T extends { ref: string; page: number; quote: string }>(
  items: readonly T[],
  mode: SourceMode,
  lookup: PageLookup,
): { kept: (Omit<T, "ref" | "page" | "quote"> & { origin: Origin })[]; dropped: number } {
  const kept: (Omit<T, "ref" | "page" | "quote"> & { origin: Origin })[] = [];
  let dropped = 0;
  for (const item of items) {
    const { ref, page, quote, ...rest } = item;
    const found = ref === "" ? null : lookup(ref, page);
    if (found !== null && quoteOnPage(quote, found.text)) kept.push({ ...rest, origin: { kind: "source", sourceId: found.sourceId, page, quote: quote.trim().slice(0, 400) } });
    else if (mode === "mine_plus") kept.push({ ...rest, origin: { kind: "added" } });
    else dropped += 1;
  }
  return { kept, dropped };
}

export function settleParts(parts: readonly RawPart[], mode: SourceMode, lookup: PageLookup): { kept: SettledPart[]; dropped: number } {
  const kept: SettledPart[] = [];
  let dropped = 0;
  for (const part of parts) {
    const text = part.text.trim();
    if (text.length === 0) continue;
    const found = part.ref === "" ? null : lookup(part.ref, part.page);
    if (found !== null && quoteOnPage(part.quote, found.text)) {
      kept.push({ text, origin: { kind: "source", sourceId: found.sourceId, page: part.page, quote: part.quote.trim().slice(0, 400) } });
    } else if (mode === "mine_plus") {
      kept.push({ text, origin: { kind: "added" } });
    } else {
      dropped += 1;
    }
  }
  return { kept, dropped };
}
