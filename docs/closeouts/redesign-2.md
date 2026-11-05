# Redesign 2 closeout

Date: 5 November 2026. Scope: the Redesign 2 brief (Taku Education brand, workspace layout, surfaces). Rollback tag: `checkpoint-before-redesign` (df9569d). Takunda's copy: `docs/Redesign-2-Report.pdf`.

## Built

- Brand: the Education mark from `art/brand/takudzidza/kit/`, unchanged (`src/components/brand.ts`, `BrandMark.tsx`, checked against the kit SVGs by `tests/unit/brand.test.ts`). The approved horizontal "by Taku" lockup heads the public pages and sign in. The lockup file is used as is; a viewBox keeps the artwork and its clear space and drops the empty canvas. Public icons are redrawn from the on cream mark by `art/web/build_web.py`. The old tile T is gone from `art/brand/` and `public/`; copies are archived outside the repo in `Idea Hub/Claude/_to_delete/takudzidza-old-tile-logo-2026-11-05/`. No teal (unit test).
- Type: Inter 400, 500 and 600 and JetBrains Mono 500, self hosted. Lexend removed.
- Tokens: the brief's palette in `src/styles/tokens.css`. Every text pair in use, light and dark, is held to 4.5 by `tests/unit/contrast.test.ts`. Honey, suffix amber and mid are kept off text, and the test checks they really are too light for it.
- Surfaces: honey waves texture fixed behind the app (dark set in dark mode), three levels (page, panel, raised) with warm shadows, frosted top bar. Cutouts with shadows, scenes for landing, home and empty notebook that fade out on every edge, no photo frames. Decor at most two per screen.
- Layout: the app is a 100dvh shell that never scrolls; panes scroll. Desktop notebook: 76 px rail, 64 px bar (breadcrumb, inline rename, sources chip, Get help, more menu), 280 px sources rail that folds to a 56 px strip (open with no answers, folded once chatting, remembered per notebook), chat up to 720 px with a docked question box, 340 px Study tools panel. Phone: chat first, Sources and Study tools sheets, tab bar hides while typing. Ask Taku has the same layout with past chats. Home dashboard, focus mode for flashcards, practice papers and Scroll, Settings in two columns of grouped cards.
- Question box chips: "Only my notes" or "My notes plus Taku's ideas", and "Show me the answer" or "Guide me", each with a one line explanation. Under each answer: Quiz me on this, Make 5 flashcards, Explain it simpler, copy, read aloud.
- Performance: KaTeX, mhchem and the equation checker load on first maths use and stay out of the service worker precache, as do the art files (cached at runtime). Inter loads the latin subset only.

## First visit download

Measured with `scripts/first-visit.mjs` (production build, fresh browser, service worker allowed, 6 s).

| | Before | After |
| --- | ---: | ---: |
| Page requests | 1302.3 KB | 687.0 KB |
| Service worker precache | 662.8 KB | 133.1 KB |
| Total | 1965.1 KB | 820.1 KB |

## Checks

All in mock AI mode, with no live AI call.

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (286 tests, including the contrast, brand and copy tests), `pnpm build`.
- `pnpm e2e`: 44 browser journeys on the phone and desktop projects, 0 failed, 0 skipped. New: where the sources live (phone sheet, desktop rail that folds and remembers), the question box after six answers at 360 by 640 and 1280 by 800, the citation opening the source page, focus mode open and exit, and no image in an arch, circle or box frame (`e2e/design.spec.ts`).
- Found and fixed on the way: a tap on send or a question box chip missed on phones (the box jumped as focus moved), the paste form showed twice in an empty desktop notebook, the guardian and under 12 pages were squashed into the rail column on desktop, and the phone Get help button had no name.

## Not done or not verified

- Exam countdown on Home: there is no exam date in the data, so it is not shown. It needs a field and a place to set it.
- "Explain it simpler" sends a new question ("Explain more simply: ..."). There is no mock fixture for it, so it is not covered by the browser journeys.
- Dark mode applies to the signed in app only. Public pages stay light because the lockup exists for cream only.
- The "by Taku" line in the lockup is small in the header (about 5 px tall), as drawn in the approved file. A larger lockup or a header variant is a brand decision.
- Bundles at first visit include the honey waves texture (144 KB) and paper grain (59 KB). They could be smaller.
