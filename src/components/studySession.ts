import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { defaultStudyMode, STUDY_MODES, type StudyMode, type SupportNeed } from "../../convex/accounts/voices";

/**
 * The study mode and any running sprint, kept on this device (localStorage).
 * Every screen reads the same copy, so the notebook page can fold its panels
 * for a sprint started from the question box.
 */

const MODE_KEY = "takudzidza-study-mode";
const SPRINT_KEY = "takudzidza-sprint";
const EVENT = "takudzidza-session";

export const SPRINT_MINUTES = [10, 15] as const;
export type Sprint = { endsAt: number; minutes: number };

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private mode: the choice lasts for this visit only.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The mode this device studies in. Before the learner picks one, Sprint for someone who loses focus easily, else Learn. */
export function useStudyMode(profile: { support?: readonly SupportNeed[] }): [StudyMode, (mode: StudyMode) => void] {
  const stored = useSyncExternalStore(subscribe, () => read(MODE_KEY), () => null);
  const mode = (STUDY_MODES as readonly string[]).includes(stored ?? "") ? (stored as StudyMode) : defaultStudyMode(profile);
  const set = useCallback((next: StudyMode) => {
    write(MODE_KEY, next);
    if (next !== "sprint") write(SPRINT_KEY, null);
  }, []);
  return [mode, set];
}

function parseSprint(raw: string | null): Sprint | null {
  if (raw === null) return null;
  try {
    const s = JSON.parse(raw) as Partial<Sprint>;
    return typeof s.endsAt === "number" && typeof s.minutes === "number" ? { endsAt: s.endsAt, minutes: s.minutes } : null;
  } catch {
    return null;
  }
}

/** The running sprint, if any, with the time now (ticking each second while one runs). */
export function useSprint(): { sprint: Sprint | null; now: number; start: (minutes: number) => void; stop: () => void } {
  const raw = useSyncExternalStore(subscribe, () => read(SPRINT_KEY), () => null);
  const sprint = parseSprint(raw);
  const [now, setNow] = useState(() => Date.now());
  const running = sprint !== null && now < sprint.endsAt;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  const start = useCallback((minutes: number) => {
    const at = Date.now();
    setNow(at);
    write(SPRINT_KEY, JSON.stringify({ endsAt: at + minutes * 60_000, minutes }));
  }, []);
  const stop = useCallback(() => write(SPRINT_KEY, null), []);
  return { sprint, now, start, stop };
}

/** True while a sprint is under way: the side panels stay folded. */
export function useSprinting(mode: StudyMode): boolean {
  const { sprint, now } = useSprint();
  return mode === "sprint" && sprint !== null && now < sprint.endsAt;
}
