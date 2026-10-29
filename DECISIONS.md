# DECISIONS

Decisions taken while building Takudzidza, and where each ported file came from. Product decisions are in SPEC.md section 10.

## Phase 1: foundation (29 October 2026)

### Provenance

Source commits: amayi-learn `ec3496e`, takubasa `33f0abc`.

| Here | From | Changes |
|---|---|---|
| `tsconfig*.json`, `vitest.config.ts`, `convex.json`, `vercel.json` | amayi-learn, same paths | None |
| `playwright.config.ts` | amayi-learn | Optional `E2E_CHROMIUM` executable path for machines with a preinstalled browser |
| `eslint.config.js` | amayi-learn | Kids file exceptions removed; OpenRouter rule kept (only `convex/ai/router.ts` may name it) |
| `scripts/gen-data.mjs` | amayi-learn | `TAKU_GEN_FIXTURES`; also copies `art/assets/*.webp` to `public/art` and writes `src/art.generated.ts` |
| `scripts/e2e.mjs`, `setup-env.mjs`, `build-vercel.mjs`, `dev-convex.mjs`, `lib/*` | amayi-learn | Local runs strip `CONVEX_DEPLOY_KEY` and `VITE_CONVEX_URL` (both are set in the cloud environment for deploys); anonymous local deployments accepted; Vite stopped by process group |
| `scripts/dev.mjs` | amayi-learn | No kids art step; runs `gen` first |
| `scripts/check-env.mjs` | amayi-learn | Reports the deploy key instead of refusing, because local runs strip it |
| `convex/ai/router.ts`, `models.ts`, `prices.ts` | amayi-learn | Chain per tier (`MODEL_MAIN`, `MODEL_FAST`), Takudzidza purposes, music removed until SPEC.md 3.12, structured JSON always limited to schema enforcing providers |
| `convex/lib/canonical.ts`, `dates.ts`, `env.ts` | amayi-learn | None |
| `convex/lib/access.ts` | amayi-learn | Rewritten for learners: `requireUser`, `requireProfile`, `requireLearner`, `requireAdmin` |
| `convex/lib/tokens.ts` | amayi-learn `convex/learners/pin.ts` | Token and hash helpers only |
| `convex/auth.ts`, `auth.config.ts`, `http.ts` | amayi-learn | No 18 or older declaration: learners from 12 sign up themselves |
| `convex/safety/prefilter.ts` | amayi-learn `convex/kids/prefilter.ts` | Retuned for 12 to adult (see below) |
| `convex/accounts/deletion.ts` | amayi-learn | Learner profile, consent rows and sign in rows |
| `convex/privacy/retention.ts` | amayi-learn | Expired consent links; under 18 accounts without consent after 30 days |
| `tests/convex/scan-helpers.ts`, `access-scan.test.ts`, `setup.ts`, `router.test.ts` | amayi-learn | Takudzidza helpers and allowlist |
| `docs/ACCESS.md` | amayi-learn | Takudzidza allowlist |

### Decisions

- **Age and consent.** Sign up asks birth month and year. Under 12 is pointed to Amai Learn. 12 to 17 need guardian consent before studying (`requireLearner`). The learner makes a link and sends it (WhatsApp share built in); the guardian opens it on their own phone, confirms they are the parent or guardian and 18 or older, gives a name, relationship and contact, and agrees to `CONSENT_TEXT_VERSION` 2026-10-29. The same link withdraws consent for 400 days. Only the link's SHA 256 hash is stored. Verification is the separate device and the recorded contact; no email or SMS is sent yet (no provider configured). This is a reasonable first step, to be checked against the gazetted Act before launch (SPEC.md 12).
- **No consent, no data.** An under 18 account whose guardian never consents is deleted after 30 days by the retention sweep.
- **Prefilter retuning.** Biology, history and literature words pass (tested). Redirected for everyone: explicit content, romance and companion roleplay, weapons, violence instructions, getting drugs, rule overrides. Redirected for under 18s only: alcohol and smoking, betting apps, secrets from guardians. Personal details are flagged for under 18s only. Distress always wins and opens Get help.
- **Get help** lists only Childline 116, which is verified (UNICEF Zimbabwe, findahelpline.com). WhatsApp numbers and adult hotlines are left out until verified from an official source.
- **Study styles** are applied as `data-style` on `<html>`; accessibility settings as `data-dyslexia`, `data-large`, `data-contrast`, `data-motion`. "Read aloud" and "Shorter chunks" are stored now and used from Phase 2, when Taku answers.
- **Copy rule** is enforced by keeping all UI copy in `src/copy/en.ts` and the consent text in `convex/accounts/consentText.ts`, both tested for hyphens and dashes.
- **Default model** stays Amayi Learn's checked chain until live calls start; re check on that day.
- **Icons** are drawn in code (`public/icon.svg` and PNGs): a geometric mark, not a generated image.
- **Local e2e** uses an anonymous local Convex backend (`CONVEX_AGENT_MODE=anonymous`). The CLI's optional dashboard download fails through this network's proxy; a cached dashboard config skips it.
