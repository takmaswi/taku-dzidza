/**
 * Error tracking with Sentry, only when VITE_SENTRY_DSN is set at build time,
 * and loaded only then. Learner content must never leave: no default personal
 * data, no breadcrumbs (they can hold what was typed), no account on the event,
 * and guardian links are cut out because the token in them gives access.
 */

type SentryEvent = { request?: { url?: string; headers?: unknown; cookies?: unknown; query_string?: unknown; data?: unknown }; user?: unknown; breadcrumbs?: unknown; transaction?: string; extra?: unknown };

export function scrubUrl(url: string): string {
  return url.replace(/\/consent\/[^/?#]+/g, "/consent/[link]").replace(/[?#].*$/, "");
}

export function scrubEvent<T extends SentryEvent>(event: T): T {
  const { request, transaction, user: _user, breadcrumbs: _breadcrumbs, extra: _extra, ...rest } = event;
  const clean = { ...rest } as T;
  if (request !== undefined) clean.request = request.url === undefined ? {} : { url: scrubUrl(request.url) };
  if (transaction !== undefined) clean.transaction = scrubUrl(transaction);
  return clean;
}

export async function startErrorTracking(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (dsn === undefined || dsn === "") return;
  const Sentry = await import("@sentry/react");
  Sentry.init({
    dsn,
    dataCollection: { userInfo: false, httpBodies: [] },
    maxBreadcrumbs: 0,
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event),
  });
}
