import { useCallback, useSyncExternalStore } from "react";

/**
 * The landing page's local layer. Global is the default, and what the
 * prerendered page shows. In the browser the time zone gives a first guess;
 * the footer's picker overrides it and is remembered. The region changes only
 * the order of the curriculum strip, nothing else.
 */

export const REGIONS = ["GLOBAL", "ZW", "ZA", "KE", "NG", "GB"] as const;
export type Region = (typeof REGIONS)[number];

const ZONES: Record<string, Region> = {
  "Africa/Harare": "ZW",
  "Africa/Johannesburg": "ZA",
  "Africa/Nairobi": "KE",
  "Africa/Lagos": "NG",
  "Europe/London": "GB",
};
const KEY = "takudzidza-region";
const EVENT = "takudzidza-region";

export function regionForZone(zone: string | undefined): Region {
  return (zone !== undefined && ZONES[zone]) || "GLOBAL";
}

function isRegion(value: unknown): value is Region {
  return typeof value === "string" && (REGIONS as readonly string[]).includes(value);
}

function stored(): Region | null {
  try {
    const value = localStorage.getItem(KEY);
    return isRegion(value) ? value : null;
  } catch {
    return null;
  }
}

function guess(): Region {
  try {
    return regionForZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return "GLOBAL";
  }
}

/** The choice made in this visit, so it holds even where storage is blocked. */
let chosen: Region | null = null;

function current(): Region {
  return chosen ?? stored() ?? guess();
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useRegion(): [Region, (region: Region) => void] {
  const region = useSyncExternalStore(subscribe, current, () => "GLOBAL" as const);
  const choose = useCallback((next: Region) => {
    chosen = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Storage can be blocked; the choice still holds for this visit.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [region, choose];
}

/** The curriculum strip: the region's own exams first, then the rest in the global order. */
export const STRIP_ORDER = ["igcse", "alevel", "ib", "gcse", "zimsec", "nsc", "ieb", "kcse", "waec", "acca", "cima", "cfa", "uni", "pro"] as const;
export type StripItem = (typeof STRIP_ORDER)[number];
const FIRST: Record<Region, readonly StripItem[]> = {
  GLOBAL: ["igcse"],
  ZW: ["zimsec"],
  ZA: ["nsc", "ieb"],
  KE: ["kcse"],
  NG: ["waec"],
  GB: ["gcse", "alevel"],
};

export function stripOrder(region: Region): StripItem[] {
  const first = FIRST[region];
  return [...first, ...STRIP_ORDER.filter((x) => !first.includes(x))];
}
