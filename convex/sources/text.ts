/**
 * Pages, chunks and quote checks for notebook sources (SPEC.md 3.2). Plain
 * TypeScript, unit tested in tests/unit/sources.test.ts.
 */

import { SOURCE_LIMITS } from "./limits";

/** Splits long text into pages of about SOURCE_LIMITS.pageChars, at paragraph or sentence ends where it can. */
export function splitPages(text: string, size: number = SOURCE_LIMITS.pageChars): string[] {
  const clean = text.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length === 0) return [];
  const pages: string[] = [];
  let rest = clean;
  while (rest.length > size) {
    const window = rest.slice(0, size);
    let cut = window.lastIndexOf("\n\n");
    if (cut < size * 0.5) cut = Math.max(window.lastIndexOf(". "), window.lastIndexOf("\n"));
    if (cut < size * 0.5) cut = window.lastIndexOf(" ");
    if (cut <= 0) cut = size;
    pages.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest.length > 0) pages.push(rest);
  return pages.slice(0, SOURCE_LIMITS.maxPages);
}

export const CHUNK_CHARS = 900;
const CHUNK_OVERLAP = 150;

/** Overlapping chunks of one page, for search. Each chunk keeps its page number. */
export function chunkPage(text: string): string[] {
  const t = text.trim();
  if (t.length <= CHUNK_CHARS) return t.length === 0 ? [] : [t];
  const out: string[] = [];
  let start = 0;
  while (start < t.length) {
    let end = Math.min(start + CHUNK_CHARS, t.length);
    if (end < t.length) {
      const space = t.lastIndexOf(" ", end);
      if (space > start + CHUNK_CHARS / 2) end = space;
    }
    out.push(t.slice(start, end).trim());
    if (end >= t.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }
  return out;
}

/** Lower case words with punctuation, quotes and spacing removed, for comparing a quote with a page. */
export function words(text: string): string[] {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d'"`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 0);
}

export const MIN_QUOTE_WORDS = 3;
/** Share of a quote's words that must match in place, to allow for small reading errors in photos and scans. */
export const QUOTE_MATCH = 0.85;

/**
 * True when the quote really is on the page: the same words in the same
 * order, allowing a few misread words. Stricter than Amayi Learn, which only
 * checked that the cited page belonged to the topic.
 */
export function quoteOnPage(quote: string, page: string): boolean {
  const q = words(quote);
  if (q.length < MIN_QUOTE_WORDS) return false;
  const p = words(page);
  if (p.length < q.length) return false;
  const needed = Math.ceil(q.length * QUOTE_MATCH);
  for (let i = 0; i + q.length <= p.length; i++) {
    if (p[i] !== q[0] && p[i + 1] !== q[1]) continue;
    let hits = 0;
    for (let j = 0; j < q.length; j++) if (p[i + j] === q[j]) hits++;
    if (hits >= needed) return true;
  }
  return false;
}

/** Visible text of an HTML page: scripts, styles and tags removed, entities decoded, blocks kept as lines. */
export function htmlToText(html: string): { title: string; text: string } {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const body = html
    .replace(/<(script|style|noscript|svg|nav|footer|header|form)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|br)\s*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return { title: decodeEntities(title), text: decodeEntities(body).replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*/g, "\n\n").trim() };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

/** Only public http(s) addresses: no local names or private address literals. */
export function linkProblem(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return "That does not look like a web address.";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "Use a web address that starts with http or https.";
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || !host.includes(".")) return "That address cannot be read.";
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host.startsWith("[")) return "That address cannot be read.";
  return null;
}
