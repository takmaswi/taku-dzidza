# Phase 3 closeout: study outputs

Date: 29 October 2026. Scope: SPEC.md section 8, Phase 3.

## Built
- Taku mode packages in `modes/` (Takubasa package format): Summary, Study guide, Flashcards, Quiz, Mind map, Scroll.
- Study tools tab on each notebook: pick a tool, set count, difficulty and minutes where the mode allows, and open anything made before.
- Flashcards with FSRS spaced repetition and Got it or Try again; a due cards banner on the notebook.
- Quiz papers in exam board style with marking, saved scores, and print layout with a marking scheme.
- Mind map view, cited summaries and study guides, the Scroll feed with hooks, true or false and tap to reveal.
- Read aloud with the phone's voice.
- Daily spending caps (deployment USD cap and per learner calls) on answers, tools and photo reading.

## Checks
- `pnpm lint`, `pnpm typecheck`: clean.
- `pnpm test`: 108 passed (adds mode package checks, content building, quiz clean up, FSRS scheduling, tools in Convex: summary, flashcards and review, quiz and marks, mind map, Scroll, option limits, ownership, deletion, spending caps).
- `pnpm build`: passes.
- `pnpm e2e`: 10 passed on phone and desktop, adding flashcards and review, a quiz paper with marking, Scroll and a summary.
- Live checks (capped, real model): cited answer, photo read and quizzes, USD 0.0032 in total (`docs/closeouts/evidence/live-check-2026-10-29.md`). The quiz check found and fixed two real problems.

## Not done
- Production deploy: blocked by the session's permission rules for production deploys; needs Takunda's permission (see the final report).
- Red team script and a sample paper for Takunda to approve (the Phase 3 gate) are next.
