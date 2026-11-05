/**
 * Pages, chunks and quote checks for notebook sources (SPEC.md 3.2). Plain
 * TypeScript, unit tested in tests/unit/sources.test.ts.
 */

import { isPublicAddress } from "./linkGuard";
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
  // One pass with indexOf, never backtracking regexes: a hostile page of 2 MB of open tags must not eat the server's time.
  // Only A to Z are lowered, so every position in lower is the same position in html.
  const lower = html.replace(/[A-Z]+/g, (s) => s.toLowerCase());
  let title = "";
  let out = "";
  let i = 0;
  while (i < html.length) {
    const open = lower.indexOf("<", i);
    if (open < 0) {
      out += html.slice(i);
      break;
    }
    out += html.slice(i, open);
    if (lower.startsWith("<!--", open)) {
      const end = lower.indexOf("-->", open + 4);
      if (end < 0) break;
      out += " ";
      i = end + 3;
      continue;
    }
    const close = lower.indexOf(">", open);
    // An unclosed tag or block drops the rest of the page.
    if (close < 0) break;
    const name = lower.slice(open + 1, Math.min(close, open + 12)).match(/^(\/?)([a-z0-9]+)/);
    const isClosing = name?.[1] === "/";
    const tag = name?.[2] ?? "";
    if (!isClosing && (tag === "title" || HIDDEN_TAGS.has(tag))) {
      const end = lower.indexOf(`</${tag}`, close);
      if (end < 0) break;
      if (tag === "title" && title === "") title = html.slice(close + 1, end).replace(/\s+/g, " ").trim();
      const after = lower.indexOf(">", end);
      if (after < 0) break;
      out += " ";
      i = after + 1;
      continue;
    }
    out += tag === "br" || (isClosing && LINE_TAGS.has(tag)) ? "\n" : " ";
    i = close + 1;
  }
  return { title: decodeEntities(title), text: decodeEntities(out).replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*/g, "\n\n").trim() };
}

const HIDDEN_TAGS = new Set(["script", "style", "noscript", "svg", "nav", "footer", "header", "form"]);
const LINE_TAGS = new Set(["p", "div", "li", "h1", "h2", "h3", "h4", "h5", "h6", "tr", "section", "article"]);

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d{1,7});/g, (_, n) => (Number(n) <= 0x10ffff ? String.fromCodePoint(Number(n)) : " "));
}

/** Only public http(s) addresses: no local names, no private address literals, no passwords in the address. */
export function linkProblem(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return "That does not look like a web address.";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "Use a web address that starts with http or https.";
  if (url.username !== "" || url.password !== "") return "That address cannot be read.";
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || !host.includes(".")) return "That address cannot be read.";
  // URL has already turned odd forms such as 2130706433 or 0x7f.1 into dotted numbers.
  if (host.startsWith("[")) return "That address cannot be read.";
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) && !isPublicAddress(host)) return "That address cannot be read.";
  return null;
}
