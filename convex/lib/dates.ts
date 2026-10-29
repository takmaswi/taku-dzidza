/**
 * Date helpers. ISO strings throughout, and "today" means today in Zimbabwe.
 *
 * Not UTC, and not the phone's timezone either. A plan that shifts by a day
 * depending on the handset is a plan nobody trusts, but plain UTC was worse: it
 * put every fare recorded between midnight and 2am in Harare on the previous
 * day, which is two hours of wrong dates every single night in the only market
 * this product serves.
 *
 * Zimbabwe is UTC+2 all year and has no daylight saving, so a fixed offset is
 * exact. It needs no timezone database and it is deterministic on the server,
 * which is the property the original UTC choice was protecting.
 */

/** CAT, Central Africa Time. Fixed, no daylight saving. */
export const ZIMBABWE_UTC_OFFSET_MINUTES = 120;

const OFFSET_MS = ZIMBABWE_UTC_OFFSET_MINUTES * 60 * 1000;

export function isoDay(ms: number = Date.now()): string {
  return new Date(ms + OFFSET_MS).toISOString().slice(0, 10);
}

export function isoMonth(ms: number = Date.now()): string {
  return new Date(ms + OFFSET_MS).toISOString().slice(0, 7);
}

export function daysAgo(days: number, ms: number = Date.now()): string {
  return isoDay(ms - days * 24 * 60 * 60 * 1000);
}

export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

export function endOfMonth(day: string): string {
  const [year, month] = day.slice(0, 7).split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0));
  return last.toISOString().slice(0, 10);
}

export function addDaysIso(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Sunday-to-Saturday week index of a date relative to an anchor day. */
export function weekIndex(anchorDay: string, day: string): number {
  const a = new Date(`${anchorDay}T00:00:00Z`).getTime();
  const b = new Date(`${day}T00:00:00Z`).getTime();
  return Math.floor((b - a) / (7 * 24 * 60 * 60 * 1000));
}

/** The Monday (Harare) of the week `ms` falls in, as an ISO day. */
export function weekStartIso(ms: number = Date.now()): string {
  const day = isoDay(ms);
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addDaysIso(day, -((weekday + 6) % 7));
}

export function isValidIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
