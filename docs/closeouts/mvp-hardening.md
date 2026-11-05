# MVP hardening closeout

Date: 5 November 2026. Scope: the 18 item build list in the brief. Rollback tag: `checkpoint-before-mvp` (bb8677b). Takunda's copy: `docs/MVP-Report.pdf`. Decisions and provenance: `DECISIONS.md`.

## Built

- A. Accounts: link reader checks every hop and each connection's address (`convex/sources/linkGuard.ts`, `linkFetch.ts`). Email codes for verification and reset (`convex/accounts/mail.ts`, Resend behind `RESEND_API_KEY`, mock outbox in tests). Google behind `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. Guardian consent needs a 6 digit code (`convex/accounts/consent.ts`, `sms.ts`). `requireAdmin` needs a verified email.
- B. Caps: per learner and deployment USD caps, starts per minute, cost per tool, alert rows at 50 and 80 percent (`convex/ai/usage.ts`). Model chains take several ids. Second opinion on Taku's ideas and marking schemes (`convex/ai/secondOpinion.ts`, `convex/study/opinion.ts`).
- C. Maths: KaTeX and mhchem (`src/components/math.ts`, `MathText.tsx`). Widget engine: packages in `widgets/<slug>/`, checkers in `convex/widgets/`, views in `src/widgets/`, wired into Guide me and the Study tools tab.
- D. UI: composer at 360 by 640, sign out in Settings, streaming chat and notebook stages, phone Sources sheet, first run checklist (`convex/accounts/progress.ts`), compact style picker, meta tags and prerendered landing (`scripts/prerender.mjs`).
- E. Trust: Sentry behind `VITE_SENTRY_DSN` (`src/observability.ts`), consent based counts (`convex/analytics.ts`), draft privacy notice and terms (`src/copy/legal.ts`), red team (`scripts/redteam.mjs`).
- Also: `.github/workflows/ci.yml`; the print layout now hides the app shell.

## Checks

All in mock AI mode, with no live AI call. Final numbers are in the commit's report (`docs/MVP-Report.pdf`).

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm redteam`, `pnpm build`, `pnpm e2e` on phone and desktop projects.
- A read only security review ran on the auth, consent, link, cap and maths code. Fixed: parallel calls past the caps (narrowed by a limit on starts), withdraw after re consent, quadratic HTML parsing, bad character codes.

## Not done or not verified

- No text message provider, so **new under 18s cannot finish consent in production**.
- Resend, Google, Sentry: code paths never reached the real services.
- Live red team not run. No real model has seen the widget or second opinion prompts.
- USD 0.05 learner cap is an assumption. Mock costs are modelled.
- Not deployed. Production env vars untouched.
- Open decision: the phone code proves control of a phone, not identity.
- Follow up: unverified abandoned accounts are not swept.
- CI workflow has not run yet.
- `og-default.webp` comes from Codex on `codex/art-batch-2`. Art, public icons and `src/art.generated.ts` were not touched.
