import { dollars } from "../../convex/market/rules";

/** Money and dates as the marketplace shows them. */

export { dollars };

export function day(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** "5", "5.50" or "$5" as US cents; blank as undefined; anything else as NaN. */
export function parseDollars(text: string): number | undefined {
  const t = text.trim().replace(/^\$/, "");
  if (t === "") return undefined;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return Number.NaN;
  return Math.round(Number(t) * 100);
}

export function centsText(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? "" : (cents / 100).toFixed(2).replace(/\.00$/, "");
}

/** A tiny CSV writer: every value quoted, quotes doubled. */
export function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "";
  const head = Object.keys(rows[0]);
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return [head.map(cell).join(","), ...rows.map((r) => head.map((k) => cell(r[k] ?? "")).join(","))].join("\r\n");
}
