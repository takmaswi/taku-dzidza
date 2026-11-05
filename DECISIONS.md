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

## MVP hardening (5 November 2026)

Rollback point: annotated tag `checkpoint-before-mvp` (commit bb8677b).

### Provenance

| Here | From | Changes |
|---|---|---|
| `scripts/redteam.mjs`, `scripts/redteam/cases.json`, `convex/safety/redteam.ts` | amayi-learn `scripts/kids-redteam.mjs` at ec3496e (pattern: a fixed case list, each stating the reply kind it must get; a cap on live runs; results file) | Rewritten for Takudzidza's groups (answer leak in Guide me, companion requests, unsafe topics for under 18s); mock fixtures run in vitest and CI; live refuses to run without `--cap` and works only on the local deployment |
| `katex`, `katex/contrib/mhchem`, `mathjs/number`, `@sentry/react` | npm packages, added at the versions in package.json | Maths and chemistry drawing, line checking, error reports |
| Audit findings | `Takudzidza-Audit-2026-11-04.pdf`, read from the sibling worktree `../taku-dzidza/docs/`, untracked there | Read for context; the numbered build list in the brief was the scope |

### Decisions

- **Tutor name:** Taku. It matches the code. The audit raised Chris; no rename was needed.
- **Link reader (A1):** every hop goes through `linkProblem` plus an address check in the connection's own DNS lookup, so a host cannot resolve to a public address for the check and a private one for the fetch. Three hops at most. The fetch moved to a `"use node"` action, because only Node exposes that lookup.
- **Email codes (A2):** Convex Auth email codes through Resend. Three modes in `convex/accounts/mail.ts`: `resend` when `RESEND_API_KEY` is set, `mock` when `AI_MODE=mock`, otherwise `off`. Off means sign up works with no verification and no password reset, so deploying before the key exists locks nobody out. A real account's mail is never sent in mock mode; codes go to a mock outbox that refuses writes outside mock mode.
- **requireAdmin (A2)** now needs a verified email as well as a listed one. No function calls it yet, so nothing changes today.
- **Google sign in (A3):** configured only when both `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set; the button is hidden otherwise. Only id, email and verified flag are taken from Google's profile.
- **Guardian consent (A4):** consent needs the 6 digit code. Codes are hashed with the request and phone, so a code works only for the phone it went to. Five sends a day per learner and per phone, one per minute, five tries, ten minutes. The link stays. **Consequence: with no SMS provider, a new under 18 cannot finish consent in production.** The guardian's page says so plainly. This follows the brief ("consent completes only with code", "real provider unconfigured"). Limit of the check, raised again by the security review: it proves control of a phone, not who the person is. A learner holds the link and could type their own number. Decide how to handle this before adding a real SMS provider.
- **Per learner USD cap (B5):** call counts are gone. `LEARNER_DAILY_USD_CAP` defaults to USD 0.05 a day. **That number is an assumption, not a measurement.** `AI_DAILY_USD_CAP` keeps its USD 0.50 default; at that level very few learners can use the app in one day. Takunda should set both; production settings were not touched here. Cost is recorded per learner, per deployment and per tool; alerts are rows in `spendAlerts` at 50 and 80 percent, read with `npx convex run ai/usage:alerts`.
- **Parallel calls and the caps (security review):** cost is known only after a model answers, so parallel calls could all pass the check. `admit` is a mutation, so Convex runs each in turn, and it limits starts: 12 a minute per learner, 20 a minute for reading photos and scans. This bounds the overshoot rather than ending it: a learner can pass the cap by what one minute of starts costs, and many learners at once can pass the deployment cap by a little. A reservation system would close it fully; not worth the cost at this size.
- **HTML to text (security review):** rewritten as one pass with indexOf, because the old regexes went quadratic on 2 MB of open tags from a hostile page. An unclosed tag now drops the rest of the page.
- **Model chains (B5):** `MODEL_MAIN` and `MODEL_FAST` take comma lists. The default chain is unchanged; no new ids were invented. Fallback across providers is still limited by the zero data retention provider rule in the router.
- **Mock mode is priced.** Mock calls cost the default model's price for the fixture's token counts, so caps and alerts can be exercised. These are modelled numbers, never a real cost.
- **Second opinion (B6):** fast tier, on Taku's ideas in summaries, flashcards and answers, and on quiz marking schemes. Rejected items are dropped. If the check itself fails, items stay marked "not checked" and a paper shows a note: a failed check should not empty a paper. It is skipped for Guide me hints, where the extra call buys little. It catches errors a second model can see, and it is not proof of correctness.
- **Maths (C7):** LaTeX between $ signs with a money guard ("$5 and $10" stays text). KaTeX and mhchem load only when a page has maths. `trust: false` and `throwOnError: false`, so source text can never make a link or crash a page.
- **Widgets (C8):** packages under `widgets/<slug>/`, same shape as `modes/`. Taku supplies data; the app renders and a deterministic checker marks. Equation steps uses mathjs with a whitelist of node types (nothing else is evaluated) and a hint that states the answer is removed. Long division takes only two numbers from Taku and works out every step itself. Fill in the blanks drops any blank whose quote is not on the cited page or does not hold the answer, whatever the source mode. The checkers are shared TypeScript in `convex/widgets/`, used by server and browser.
- **Streaming (D11):** the chat row exists from the start and is patched as text arrives, using Convex subscriptions rather than an HTTP stream, which keeps auth and storage in one place. Rows left unfinished for more than three minutes show as failed on the client. A half written widget block never shows.
- **Sign out (D10):** Settings. Guardian, Setup and too young screens keep their own button, since Settings cannot be reached from them.
- **Landing (D15):** the page's HTML is rendered into `dist/index.html` at build time, and the build fails if the copy goes missing. It is removed before paint for anyone with a saved session or on another address. `/art/og-default.webp` comes from the art batch; WebP support in link preview crawlers varies and has not been tested, because nothing is deployed.
- **Sentry (E16):** loaded only when `VITE_SENTRY_DSN` is set. No user info, no breadcrumbs, no bodies, and guardian link tokens are cut from URLs before an event leaves.
- **Analytics (E16):** a daily count per event in this deployment's own table, with no vendor, no user id and no content. Off until an adult switches it on; the server refuses under 18s whatever the browser sends.
- **Privacy notice and terms (E17):** drafts, marked "Draft for legal review" on the page, written only from what the code does. They claim compliance with no law. A lawyer has not read them.
- **Red team (E18):** the mock run proves the app's own layers route each case; its replies were written by hand, so it says nothing about what a model would do. **The live run has not been done.** No held answer output filter was added; that is still Phase 5.
- **Attribution:** commits in this work carry no co author line, because the brief forbids model identifiers in commits.

### Follow ups

- Accounts that sign up and never verify are not swept yet.
- Choose an SMS provider and implement `SmsSender`.
- Measure real cost per learner, then set the caps from data.
- Run `pnpm redteam --cap 0.10` before under 18s use the app.
