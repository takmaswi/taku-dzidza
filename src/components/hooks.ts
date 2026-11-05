import { useCallback, useState, useSyncExternalStore } from "react";

/** The width where the notebook shows its sources rail beside the chat, and the bottom tab bar gives way to the side rail. */
export const WIDE = "(min-width: 900px)";
/** The width where the Study tools panel sits beside the chat instead of over it. */
export const XWIDE = "(min-width: 1200px)";

/** True while a media query matches, kept in step with the window. */
export function useMedia(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** A small preference kept in this browser (localStorage), such as a folded panel. Null until set. */
export function useStored(key: string): [string | null, (value: string) => void] {
  const [state, setState] = useState(() => ({ key, value: readStored(key) }));
  // A different key (another notebook) reads its own value.
  const current = state.key === key ? state.value : readStored(key);
  if (state.key !== key) setState({ key, value: current });
  const save = (next: string) => {
    setState({ key, value: next });
    try {
      localStorage.setItem(key, next);
    } catch {
      // Private mode: the preference lasts for this visit only.
    }
  };
  return [current, save];
}
