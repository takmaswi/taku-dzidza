# Handoff prompt: Takudzidza Phase 1

Paste everything in the block below into a new Claude Code cloud session that has these repos: takmaswi/taku-dzidza, takmaswi/amayi-learn, takmaswi/takubasa, takmaswi/taku-dzidza-local, takmaswi/TAKU-dzidza-v2.

```text
You are continuing the Takudzidza build for Takunda Maswi (Harare, full stack developer and AI specialist). Repo: takmaswi/taku-dzidza. Phase 0 is done and approved on 29 October 2026.

READ FIRST, IN ORDER
1. SPEC.md (the agreed spec; section 10 lists every decision, section 6 the reuse map, section 8 the phase gates).
2. art/STYLE.md and art/ASSETS.md (images; never generate images, use labelled ImageSlot placeholders until Takunda commits Codex files).
3. The source repos named in SPEC.md section 6, especially amayi-learn (scaffold, router, sources, safety, consent, deletion, retention, speech, offline) and takubasa (agent package format, verify.ts grounding, budgets).

KEY DECISIONS (details in SPEC.md)
The tutor is Taku. Tools first; Taku is the one tutor voice in every tool; no character picture. Learner toggle: default "Show me the answer" with full working, optional "Guide me" hint mode. Any course or exam works from uploaded material; syllabus packs start with ZIMSEC O and A Level and Cambridge. Study styles Locked In, Cook Mode, Calm with an optional quiz, plus a separate accessibility mode. Scroll feed with hooks is free; reels, podcast and story mode are paid later. Checking layers instead of a Python engine (JS CAS, number check, quote check, second opinion). Get help section always one tap away (Childline 116 for under 18s). PWA first. Pricing is open: no billing code.

STANDING RULES
Be concise and direct. Never invent facts or numbers. No em dashes, en dashes or hyphens in any user facing copy (UI, PDFs, listings); code identifiers and URLs are exempt; add a copy test like takubasa tests/copy/dashes.test.ts. Anything Takunda reads is a PDF; Markdown only for agents. Every claim in docs must be true and sourced. Mock AI mode for all tests; live AI calls only in a named script with an explicit USD cap. lint, typecheck, test, build and e2e green per phase; one commit per phase with a closeout in docs/closeouts/. Record provenance of every ported file in DECISIONS.md. Do not include model identifiers in commits or code.

YOUR TASK NOW: PHASE 1 FOUNDATION (SPEC.md section 8)
Scaffold from amayi-learn (Vite, React 19, React Router 7, TypeScript, vite-plugin-pwa, Convex, Convex Auth, pnpm, Vitest, Playwright). Move the July docs to docs/archive/2026-07/ with a pointer to SPEC.md. Design tokens and self hosted Lexend; contrast test for every token pair used. Study styles and accessibility settings, optional style quiz. AI router in mock mode. Auth, profiles with birth year, guardian consent for under 18s, account delete, retention cron, safety prefilter retuned for teens and adults, Get help section, ImageSlot placeholders, CI. Then Phase 2 Notebooks.

INFRASTRUCTURE
Read CONVEX_DEPLOY_KEY and OPENROUTER_API_KEY from the environment if present; Takunda adds them in the environment settings, never in chat. If absent, build and test in mock mode and say what is blocked. Check with Takunda before any deploy or live spend.

Credit window ends 5 November 2026, 09:59 Harare time. Target: Phases 1 and 2 green, Phase 3 started. Report progress to Takunda in short plain messages.
```
