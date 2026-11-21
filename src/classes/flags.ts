import { useQuery } from "convex/react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
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

/** Sends a signed in learner to the join page if they opened a join link before signing in. */
export function useStoredJoin(): void {
  const navigate = useNavigate();
  useEffect(() => {
    const code = window.localStorage.getItem(JOIN_KEY);
    if (code === null) return;
    window.localStorage.removeItem(JOIN_KEY);
    navigate(`/join/${encodeURIComponent(code)}`, { replace: true });
  }, [navigate]);
}
