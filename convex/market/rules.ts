/**
 * Marketplace rules in plain TypeScript, shared with the browser
 * (DECISIONS.md, Notes marketplace).
 */

/** Takudzidza keeps 20%; the seller gets 80%. */
export const COMMISSION_PERCENT = 20;
/** The owner can refund a sale within this many days; until then the seller's share is pending. */
export const REFUND_DAYS = 7;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const RENT_DAYS = [7, 30, 90] as const;
export type RentDays = (typeof RENT_DAYS)[number];
export const MAX_PREVIEW_PAGES = 3;
/** Highest price in US cents ($500). */
export const MAX_PRICE_CENTS = 50_000;
export const SELLER_TERMS_VERSION = "2026-11-21";

export function split(amountCents: number): { commissionCents: number; sellerCents: number } {
  const commissionCents = Math.round((amountCents * COMMISSION_PERCENT) / 100);
  return { commissionCents, sellerCents: amountCents - commissionCents };
}

export function rentKey(days: RentDays): "d7" | "d30" | "d90" {
  return days === 7 ? "d7" : days === 30 ? "d30" : "d90";
}

export function isRentDays(days: number): days is RentDays {
  return (RENT_DAYS as readonly number[]).includes(days);
}

export type Prices = { buyCents?: number; rentCents?: { d7?: number; d30?: number; d90?: number } };

/** The price of one option, or null when the listing does not offer it. */
export function priceOf(p: Prices, kind: "buy" | "rent", days?: number): number | null {
  if (kind === "buy") return p.buyCents ?? null;
  if (days === undefined || !isRentDays(days)) return null;
  return p.rentCents?.[rentKey(days)] ?? null;
}

/** The lowest price on offer, for sorting and the price filter. */
export function lowestPrice(p: Prices): number | null {
  const all = [p.buyCents, p.rentCents?.d7, p.rentCents?.d30, p.rentCents?.d90].filter((n): n is number => n !== undefined);
  return all.length === 0 ? null : Math.min(...all);
}

export function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** The label on a practice paper made from a seller's notes, on the listing and in the reader. */
export function authorLabel(author: string): string {
  return `Written by ${author}, not an exam board paper`;
}

const BOARDS = /\b(zimsec|cambridge|caie|cie|acca|cima|edexcel|pearson|aqa|ocr|hexco|ib)\b/i;
const PAPER_WORDS = /\b(mark(ing)? schemes?|question papers?|past papers?)\b/i;
const SESSION = /\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)(\s*\/\s*[a-z]+)?\s+(19|20)\d{2}\b/i;

/**
 * Flags notes for the owner's extra review when they name an exam board
 * together with "mark scheme", "question paper", "past paper" or an exam
 * session date. A flag is a prompt to look closely, not a verdict.
 */
export function examPaperFlag(text: string): string | null {
  const board = text.match(BOARDS);
  if (board === null) return null;
  const words = text.match(PAPER_WORDS);
  if (words !== null) return `Names ${board[0]} and "${words[0].toLowerCase()}"`;
  const session = text.match(SESSION);
  if (session !== null) return `Names ${board[0]} and the exam session ${session[0]}`;
  return null;
}
