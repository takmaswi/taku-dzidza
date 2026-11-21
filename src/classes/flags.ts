import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";

/** TEACHER_MODE and BOOKS_MODE for the app (convex/flags.ts), and the join link kept across sign in. */

export const JOIN_KEY = "taku.joinCode";

export type Flags = { teacher: boolean; books: boolean };

export function useFlags(): Flags {
  return useQuery(api.flags.get) ?? { teacher: false, books: false };
}

/** The flags, or null while they load (routes wait, so a join link is not sent home). */
export function useFlagsLoaded(): Flags | null {
  return useQuery(api.flags.get) ?? null;
}

/**
 * A join link opened before signing in: the code waiting in storage, read
 * while rendering so the routes send the learner there before any other
 * redirect runs. The join page clears it once open (clearStoredJoin).
 */
export function storedJoinCode(): string | null {
  return window.localStorage.getItem(JOIN_KEY);
}

export function useClearStoredJoin(when = true): void {
  useEffect(() => {
    if (when) window.localStorage.removeItem(JOIN_KEY);
  }, [when]);
}