import { useMutation, useQuery } from "convex/react";
import { useCallback } from "react";
import { api } from "../convex/_generated/api";
import type { ANALYTICS_EVENTS } from "../convex/analytics";

type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

/** Counts a feature's use for adults who said yes. The server checks again, so this is only to avoid needless calls. */
export function useTrack(): (event: AnalyticsEvent) => void {
  const me = useQuery(api.accounts.profiles.me);
  const track = useMutation(api.analytics.track);
  const consent = me?.profile?.analyticsConsent === true;
  return useCallback(
    (event: AnalyticsEvent) => {
      if (consent) void track({ event }).catch(() => undefined);
    },
    [consent, track],
  );
}
