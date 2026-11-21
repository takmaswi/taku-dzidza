import type { Doc } from "../convex/_generated/dataModel";

/** Applies a profile's study style and accessibility settings to <html> (src/styles/tokens.css). */
/** Light is the default. Dark is only ever the learner's own choice, kept on this device. */
export type ThemeMode = "light" | "dark";
const THEME_KEY = "takudzidza-theme";
const THEME_EVENT = "takudzidza-theme";

export function getThemeMode(): ThemeMode {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function setThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    // Storage can be blocked; the choice still holds for this visit.
  }
  const apply = () => {
    document.documentElement.dataset.theme = mode;
    window.dispatchEvent(new Event(THEME_EVENT));
  };
  // A 300 ms crossfade of the whole page (src/styles/polish.css), where the browser can and the learner wants motion.
  const still = document.documentElement.dataset.motion === "off" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  if (!still && typeof document.startViewTransition === "function") document.startViewTransition(apply);
  else apply();
}

export function onThemeChange(listener: () => void): () => void {
  window.addEventListener(THEME_EVENT, listener);
  return () => window.removeEventListener(THEME_EVENT, listener);
}

export function applyTheme(profile: Pick<Doc<"profiles">, "studyStyle" | "accessibility"> | null): void {
  const root = document.documentElement;
  const a = profile?.accessibility;
  root.dataset.theme = root.dataset.theme ?? getThemeMode();
  root.dataset.style = profile?.studyStyle ?? "calm";
  root.dataset.dyslexia = String(a?.dyslexia ?? false);
  root.dataset.large = String(a?.largeText ?? false);
  root.dataset.contrast = String(a?.highContrast ?? false);
  root.dataset.motion = a?.reducedMotion ? "off" : "on";
}

/** The two looks. Warm is the default; high contrast lives in the account's accessibility settings. Each has light and dark. */
export type Look = "warm" | "contrast";
const PICKED_KEY = "takudzidza-look-chosen";

/** True once the learner has chosen a look on this device (the first run picker shows until then). */
export function lookPicked(): boolean {
  try {
    return localStorage.getItem(PICKED_KEY) === "yes";
  } catch {
    return true;
  }
}

export function markLookPicked(): void {
  try {
    localStorage.setItem(PICKED_KEY, "yes");
  } catch {
    // Storage blocked: the picker may show again next visit, which is harmless.
  }
}

/** Shows a look at once, before the account copy comes back. */
export function previewLook(look: Look): void {
  document.documentElement.dataset.contrast = String(look === "contrast");
}
