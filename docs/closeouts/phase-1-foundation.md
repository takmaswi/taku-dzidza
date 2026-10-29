# Phase 1 closeout: foundation

Date: 29 October 2026. Scope: SPEC.md section 8, Phase 1.

## Built
- App scaffold from Amayi Learn: Vite, React 19, React Router 7, TypeScript, PWA (installable, icons), Convex with Convex Auth, Vitest, Playwright.
- Design tokens and self hosted Lexend; study styles Locked In, Cook Mode, Calm; accessibility settings (dyslexia friendly, larger text, high contrast, less motion live now; read aloud and shorter chunks stored for Phase 2).
- Landing, sign in and sign up, set up (name, birth month and year), under 12 page, guardian consent (learner link with WhatsApp share, guardian page with give and withdraw), optional style quiz with result, home shell, settings (name, style, Show me the answer or Guide me, accessibility, delete account), Get help (public, one tap from every page).
- AI router in mock mode (no live calls in Phase 1), safety prefilter retuned, account deletion, retention cron, access scan.
- ImageSlot: batch 1 photos are used; missing ones show a labelled placeholder.
- July 2026 docs moved to `docs/archive/2026-07/`.

## Checks (all in mock mode, no AI spend)
- `pnpm lint`: clean.
- `pnpm typecheck`: clean.
- `pnpm test`: 58 passed (unit: prefilter, age, styles, copy rule, contrast; Convex: accounts, consent, deletion, retention, router mock, access scan).
- `pnpm build`: passes; PWA service worker generated.
- `pnpm e2e`: 6 passed (3 journeys on a 360 px phone and on desktop): adult sign up to quiz, settings and delete; 14 year old with guardian consent from a second browser; under 12 pointed to Amai Learn.

Run e2e in this environment with `E2E_CHROMIUM=/opt/pw-browsers/chromium CONVEX_AGENT_MODE=anonymous pnpm e2e` while `npx convex dev` runs against the local deployment.

## Not done here
- No deploy to Vercel or the production Convex deployment yet (waiting for Takunda's go ahead).
- No live AI calls.
- Codex batch 2 images (placeholders show the slugs).
