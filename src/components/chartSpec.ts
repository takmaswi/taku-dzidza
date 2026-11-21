/**
 * Charts in Taku's replies. Taku writes a fenced block that starts with
 * ```chart and holds JSON; the app draws it. Everything is checked here, so a
 * bad block shows nothing instead of a broken picture. Plain TypeScript, no
 * React, so tests can use it.
 *
 *   {"type": "bar", "title": "...", "unit": "points", "max": 5,
 *    "labels": ["Trophies", "Big moments"],
 *    "series": [{"name": "Pele", "values": [5, 4]}]}
 *
 * bar: one bar per label for each series, side by side (comparisons).
 * line: values over the labels in order (change over time).
 * pie: shares of a whole, one series only.
 */

export type ChartType = "bar" | "line" | "pie";
export type ChartSeries = { name: string; values: number[] };
export type ChartSpec = { type: ChartType; title: string; unit: string; max: number | null; note: string; labels: string[]; series: ChartSeries[] };

const MAX_LABELS = 24;
const MAX_SERIES = 6;
const text = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function parseChart(raw: string): ChartSpec | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  const type: ChartType = d.type === "line" || d.type === "pie" ? d.type : "bar";
  const labels = Array.isArray(d.labels) ? d.labels.slice(0, MAX_LABELS).map((l) => text(String(l ?? ""), 60)) : [];
  if (labels.length === 0 || labels.some((l) => l === "")) return null;
  const rawSeries = Array.isArray(d.series) ? d.series.slice(0, type === "pie" ? 1 : MAX_SERIES) : [];
  const series: ChartSeries[] = [];
  for (const s of rawSeries) {
    if (typeof s !== "object" || s === null) return null;
    const o = s as Record<string, unknown>;
    const values = Array.isArray(o.values) ? o.values.slice(0, labels.length).map(Number) : [];
    if (values.length !== labels.length || values.some((v) => !Number.isFinite(v))) return null;
    if (type === "pie" && values.some((v) => v < 0)) return null;
    series.push({ name: text(o.name, 40) || `Series ${series.length + 1}`, values });
  }
  if (series.length === 0) return null;
  if (type === "pie" && series[0].values.reduce((a, b) => a + b, 0) <= 0) return null;
  const max = typeof d.max === "number" && Number.isFinite(d.max) && d.max > 0 ? d.max : null;
  return { type, title: text(d.title, 120), unit: text(d.unit, 40), max, note: text(d.note, 200), labels, series };
}

/** Round axis steps (1, 2, 2.5 or 5 times a power of ten) from zero, or from the lowest value when some are negative. */
export function niceScale(values: number[], fixedMax: number | null, steps = 5): { min: number; max: number; ticks: number[] } {
  const lo = Math.min(0, ...values);
  const hi = Math.max(fixedMax ?? 0, ...values, lo + 1e-9);
  if (fixedMax !== null && lo === 0 && fixedMax >= Math.max(...values)) {
    const step = niceStep(fixedMax / steps);
    const ticks: number[] = [];
    for (let t = 0; t <= fixedMax + 1e-9; t += step) ticks.push(round(t));
    if (ticks[ticks.length - 1] !== fixedMax) ticks.push(fixedMax);
    return { min: 0, max: fixedMax, ticks };
  }
  const step = niceStep((hi - lo) / steps);
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let t = min; t <= max + step / 2; t += step) ticks.push(round(t));
  return { min: round(min), max: round(max), ticks };
}

function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const f = raw / power;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * power;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

/** 1234567 as 1.2M, 0.25 as 0.25, 12 as 12. */
export function shortNumber(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `${trim(n / 1e9)}B`;
  if (a >= 1e6) return `${trim(n / 1e6)}M`;
  if (a >= 1e4) return `${trim(n / 1e3)}k`;
  return trim(n);
}
const trim = (n: number) => String(Math.round(n * 100) / 100);

/** What copy and read aloud use instead of the block: the chart as plain sentences. */
export function chartAsText(spec: ChartSpec): string {
  const unit = spec.unit === "" ? "" : ` ${spec.unit}`;
  const lines = spec.series.map((s) => `${spec.series.length > 1 || spec.type !== "pie" ? `${s.name}: ` : ""}${spec.labels.map((l, i) => `${l} ${s.values[i]}${unit}`).join(", ")}.`);
  return [spec.title === "" ? "Chart." : `Chart: ${spec.title}.`, ...lines].join("\n");
}

const FENCE = /```chart[^\n]*\n([\s\S]*?)(```|$)/g;

/** A whole reply with each chart block turned into plain text, for copying and reading aloud. */
export function withChartsAsText(reply: string): string {
  return reply.replace(FENCE, (_all, body: string, close: string) => {
    if (close === "") return "";
    const spec = parseChart(body);
    return spec === null ? "" : `${chartAsText(spec)}\n`;
  });
}
