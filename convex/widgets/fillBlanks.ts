import { z } from "zod";
import type { PageLookup } from "../sources/modes";
import { quoteOnPage, words } from "../sources/text";

/**
 * Fill in the blanks from the learner's own notes. Every blank is cited: its
 * quote must be found on the cited page and must contain the answer, or the
 * blank is left out whatever the source mode. Plain TypeScript, shared with
 * the browser, which marks each blank.
 */

const rawItem = z.object({
  before: z.string().max(300),
  answer: z.string().min(1).max(80),
  after: z.string().max(300),
  alternatives: z.array(z.string().max(80)).max(5),
  hint: z.string().max(200),
  ref: z.string(),
  page: z.number(),
  quote: z.string(),
});
export const dataSchema = z.object({ title: z.string().min(1).max(120), items: z.array(rawItem).min(1).max(20) });

export type BlankItem = { before: string; answer: string; after: string; alternatives: string[]; hint: string; origin: { kind: "source"; sourceId: string; page: number; quote: string } };
export type BlanksData = { title: string; items: BlankItem[] };

export const jsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { before: { type: "string" }, answer: { type: "string" }, after: { type: "string" }, alternatives: { type: "array", items: { type: "string" } }, hint: { type: "string" }, ref: { type: "string" }, page: { type: "integer" }, quote: { type: "string" } },
        required: ["before", "answer", "after", "alternatives", "hint", "ref", "page", "quote"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "items"],
  additionalProperties: false,
};

function contains(haystack: readonly string[], needle: readonly string[]): boolean {
  if (needle.length === 0) return false;
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    if (needle.every((w, j) => haystack[i + j] === w)) return true;
  }
  return false;
}

/** Same words ignoring case and punctuation, against the answer or an accepted alternative. */
export function checkBlank(item: Pick<BlankItem, "answer" | "alternatives">, typed: string): boolean {
  const got = words(typed).join(" ");
  return got !== "" && [item.answer, ...item.alternatives].some((a) => words(a).join(" ") === got);
}

export function prepare(raw: unknown, lookup: PageLookup | undefined): BlanksData | null {
  if (lookup === undefined) return null;
  const parsed = dataSchema.safeParse(raw);
  if (!parsed.success) return null;
  const items: BlankItem[] = [];
  for (const item of parsed.data.items) {
    const found = item.ref === "" ? null : lookup(item.ref, item.page);
    if (found === null || !quoteOnPage(item.quote, found.text) || !contains(words(item.quote), words(item.answer))) continue;
    const { ref: _ref, page, quote, ...rest } = item;
    items.push({ ...rest, origin: { kind: "source", sourceId: found.sourceId, page, quote: quote.trim().slice(0, 400) } });
  }
  return items.length === 0 ? null : { title: parsed.data.title, items };
}
