# Takudzidza by Taku

"Takudzidza" is ChiShona for "we are learning". A study platform for anyone from Form 1 upward: ZIMSEC and Cambridge secondary learners, university and college students, and adults studying for professional exams. Taku is the tutor voice inside every study tool.

## Status

Phase 1 (foundation) done 29 October 2026: see `docs/closeouts/phase-1-foundation.md`. Phase 2 (notebooks) next.

- `docs/Takudzidza-Phase0.pdf` is the plan for Takunda (built by `tools/phase0_pdf.py`).
- `SPEC.md` is the same plan for build agents, with the reuse map and phase gates.
- `art/STYLE.md` and `art/ASSETS.md` set the photography rules and list every image with its Codex prompt. Batch 1 is in `art/assets/` (see `art/CODEX_NOTES.md`).
- `docs/archive/2026-07/` holds the July 2026 design. SPEC.md section 1.1 says what carries over.
- Develop: `pnpm install`, then `npx convex dev` (local deployment) and `pnpm dev`. Checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm e2e`.
