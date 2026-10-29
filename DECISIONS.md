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

## Phase 2: notebooks (29 October 2026)

### Provenance

| Here | From | Changes |
|---|---|---|
| `convex/sources/docx.ts` | amayi-learn, same path | None (runs in the Node action `convex/sources/fileText.ts`, where DecompressionStream is available) |
| `convex/sources/limits.ts` | amayi-learn, same path | Widened from teacher schemes to any study material; adds text and link kinds |
| `convex/sources/modes.ts` | amayi-learn, same path (idea) | Rewritten: a citation counts only when its quote is found on the cited page (`quoteOnPage`) |

### Decisions

- **Search without embeddings (D8, for now).** Notebook chunks use a Convex full text search index filtered by notebook. A notebook of 12 chunks or fewer is sent whole. This needs no extra AI provider and costs nothing per question. Embeddings can be added later if answers miss relevant pages.
- **Reading costs nothing where it can.** Pasted text, links, Word files and PDFs with a text layer are read with no AI call (pdf.js in a Node action). Photos and PDFs that are mostly scans go to the model (`source_read`), which costs money; they are capped at 20 pages per source.
- **Quote check.** Every cited part must carry a 5 to 25 word quote. The server normalises words (case, punctuation, quotes) and accepts the quote when at least 85 percent of its words match in place on the cited page, which allows a few misread words in photos. Quotes under 3 words never count.
- **Source modes.** Only my material drops every part whose quote fails, and the answer says how many points were left out and what is missing. My material plus Taku's ideas keeps them, marked "Taku's idea, not from your notes". New notebooks start in My material plus Taku's ideas.
- **Answer mode** comes from the learner's profile and can be switched on the notebook screen. Guide me tells Taku to give one hint or question at a time and never a finished essay. The held answer filter for maths comes with the maths check layer in Phase 5.
- **Safety.** The prefilter runs on every question. Distress opens Get help with no model call. Under 18s: personal details are not sent to any model, and a fast model input check runs first and fails closed. Adults: prefilter only, to keep cost down; revisit with the red team in Phase 3.
- **Copy rule in answers.** Taku is told not to use em or en dashes, and the server replaces any that slip through with commas.
- **Links** are fetched server side: http and https only, no local or private addresses, HTML and plain text only, 2 MB cap.
- **The chat belongs to the learner**: questions and answers are stored in the notebook and deleted with it or with the account.
- A newer Chromium returns a promise from `scrollIntoView`; effects in this app use braces so they never return a value.

## Phase 3: study outputs (29 October 2026)

### Provenance

| Here | From | Changes |
|---|---|---|
| `convex/modes/package.ts`, `modes/<slug>/` | takubasa `convex/agents/package.ts` and `agents/<slug>/` (shape) | Cut down to study modes: output kind, tier, guide support, citations, options (count, difficulty, minutes), token allowance |
| Quiz rules in `modes/quiz/mode.md` | takubasa `agents/taku-study/agent.md` (command words, marks, marking guide, no past papers) and amayi-learn term test approach | Rewritten for an exam board paper with a separate marking scheme |

### Decisions

- **Six launch modes:** Summary, Study guide, Flashcards, Quiz, Mind map, Scroll. Each is a package; adding a mode means adding a folder. Audio overviews and essay feedback come later (Phase 6).
- **Every item is cited** with ref, page and quote, settled by the same quote check as answers (`settleItems`). Only my material drops unverified items; the tool says how many.
- **Spaced repetition** uses ts-fsrs (MIT, the open FSRS algorithm, default parameters). "Got it" is Good, "Try again" is Again. A review session freezes its set of cards when it starts.
- **Test style (D10):** numbered questions, marks in brackets, command words, time and total marks, serif paper layout, a separate marking scheme, print layout with the scheme on its own page. Multiple choice is marked by the app; written answers are marked by the learner against the marking scheme and saved for weak topics (Phase 4).
- **Read aloud** uses the phone's own voice (Web Speech API): free, no data. Shown on answers and summaries when Read aloud is on in Settings.
- **Scroll** is a full screen snap feed with hooks; sets end with an end card, no endless autoplay.
- **Spending caps** also cover study tools and photo reading.
- **Production deploy** was blocked by this session's permission rules; see the Phase 3 closeout.
