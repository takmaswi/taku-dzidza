import type { PageLookup } from "../sources/modes";
import { prepare as prepareEquation } from "./equationSteps";
import { prepare as prepareBlanks } from "./fillBlanks";
import { prepare as prepareDivision } from "./longDivision";

/**
 * The widget engine's server side: Taku's structured data goes through the
 * widget's own check before it is stored. Bad data means no widget, never a
 * broken one. Each slug has a package under widgets/<slug>/ and a React
 * component under src/widgets/ (tests/unit/widgets.test.ts holds them together).
 */

export const WIDGET_SLUGS = ["equation-steps", "fill-blanks", "long-division"] as const;
export type WidgetSlug = (typeof WIDGET_SLUGS)[number];
export type StoredWidget = { slug: string; data: unknown };

export function prepareWidget(slug: string, raw: unknown, lookup?: PageLookup): StoredWidget | null {
  let data: unknown = null;
  if (slug === "equation-steps") data = prepareEquation(raw);
  else if (slug === "long-division") data = prepareDivision(raw);
  else if (slug === "fill-blanks") data = prepareBlanks(raw, lookup);
  return data === null ? null : { slug, data };
}

/** Text of the form {"slug": "...", "data": ...}, where data may itself be a JSON string. */
export function widgetFromText(text: string, allowed: readonly WidgetSlug[], lookup?: PageLookup): StoredWidget | null {
  try {
    const parsed = JSON.parse(text) as { slug?: unknown; data?: unknown };
    if (typeof parsed.slug !== "string" || !(allowed as readonly string[]).includes(parsed.slug)) return null;
    const data = typeof parsed.data === "string" ? (JSON.parse(parsed.data) as unknown) : parsed.data;
    return prepareWidget(parsed.slug, data, lookup);
  } catch {
    return null;
  }
}

const OPEN = "```widget";

/** A chat reply is plain text, so a widget travels in a fenced block at its end. */
export function extractWidget(reply: string): { text: string; raw: string | null } {
  const start = reply.indexOf(OPEN);
  if (start < 0) return { text: reply, raw: null };
  const rest = reply.slice(start + OPEN.length);
  const end = rest.indexOf("```");
  return { text: (reply.slice(0, start) + (end < 0 ? "" : rest.slice(end + 3))).trim(), raw: (end < 0 ? rest : rest.slice(0, end)).trim() };
}

/** While a reply streams in, nothing of the block shows, not even its first backticks. */
export function stripWidgetBlock(partial: string): string {
  const start = partial.indexOf(OPEN);
  if (start >= 0) return partial.slice(0, start);
  const held = partial.match(/`{1,3}w?i?d?g?e?t?$/);
  return held === null ? partial : partial.slice(0, held.index);
}
