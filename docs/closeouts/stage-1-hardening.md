# Stage 1 closeout: hardening

Date: 16 November 2026. Scope: Stage 1 of the five stage brief (audit items S1, S3, S4, S5, S6, S7, S9, S10, S11, U1, U2, U7 from `docs/AUDIT-2026-11-16.md`). Decisions and provenance: DECISIONS.md, "Stage 1: hardening".

## Built

- S1 deletion: an account, notebook or source is hidden and signed out first (`deletingAt`), sessions and tokens are revoked at once, then rows go in batches of 200 through scheduled steps (`convex/privacy/purge.ts`). The retention sweep takes one account per step. Tested with ten sources of 300 pages each.
- S3 uploads: every upload starts with a ticket bound to the uploader (`uploads` table). A file is accepted only by its own ticket, within the hour, and only once. Unclaimed files are swept hourly. 500 MB per account (`STORAGE_QUOTA_MB`), 30 uploads a minute.
- S4 consent: data goes 30 days after a guardian withdraws consent. A guardian can delete the account at once from the consent link. Unverified accounts with nothing in them are swept after 14 days once email sign in is live.
- S5 and S6 safety: a fast input check for every learner. For under 18s: no streaming, an output check on every answer and study tool, and fail closed when a check cannot run. Source text added by an under 18 is screened when it is read.
- S7 headers: CSP (scripts from the site and one hashed inline script only; Convex over https and wss), HSTS, nosniff, frame denial, no referrer, permissions policy. One module makes them for `vercel.json` and the deploy. `pnpm csp-check` drives the main journeys under the real policy.
- S9, S10, S11: usage counters spread over 16 shards; unknown models priced high (USD 15 and 75 per million tokens); chat list paginated.
- U1 study tools: choose sources, a chapter or a page range. A whole notebook is done section by section and merged. Every tool says which pages it was made from.
- U2 search by meaning: embeddings on a zero data retention route, a Convex vector index, fused with keyword search. Fake vectors in mock mode. Behind `EMBEDDINGS_MODE` (see Deployed).
- U7: several files in one drop or picker.

Takunda approved the three assumptions on 16 November: 30 days after withdrawal, 500 MB per account, the high default price.

## Checks

All in mock AI mode, with no live AI call except the capped embedding check below.

- `pnpm lint` (one older warning), `pnpm typecheck`, `pnpm test` (362 tests), `pnpm redteam` (24 cases, 0 leaks), `pnpm build`.
- `pnpm csp-check`: landing, sign up, notebook answer, upload, chat with maths, privacy page, all under the production policy with no violations.
- `pnpm e2e`: 62 journeys on the phone and desktop projects, 0 failed, 0 skipped, 0 flaky. New in `e2e/stage1.spec.ts`: several files in one drop, choosing a source and seeing the pages used, and a guardian deleting the account from the consent link.

## Found on the way: production could not sign in since 13 November

The site published on 13 November was built against `https://happy-otter-123.convex.cloud`, the example address in the Convex client docs, which answers 404. The real production address has a region label (`disciplined-condor-946.eu-west-1.convex.cloud`). Landing and sign in pages loaded, so the live check that day passed, but sign in and sign up failed. The deploy now takes the address from `convex deploy` itself and refuses a bundle without it (DECISIONS.md, Stage 1). Nobody could have signed up in that window, so no data was affected.

## Deployed

DEPLOYED

## Not done or not verified

- Unverified account sweep stays off until email sign in is live (blocked on the email key and sending domain).
- Guardian phone codes need an SMS provider (blocked).
- The input check is one fast call per message; its cost shows under `safety_check` in the owner page.
