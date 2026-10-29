import type { Doc } from "../convex/_generated/dataModel";

/** Applies a profile's study style and accessibility settings to <html> (src/styles/tokens.css). */
export function applyTheme(profile: Pick<Doc<"profiles">, "studyStyle" | "accessibility"> | null): void {
  const root = document.documentElement;
  const a = profile?.accessibility;
  root.dataset.style = profile?.studyStyle ?? "calm";
  root.dataset.dyslexia = String(a?.dyslexia ?? false);
  root.dataset.large = String(a?.largeText ?? false);
  root.dataset.contrast = String(a?.highContrast ?? false);
  root.dataset.motion = a?.reducedMotion ? "off" : "on";
}
