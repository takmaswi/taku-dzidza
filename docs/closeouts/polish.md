# Polish pass closeout

Date: 6 November 2026. Commit `8872345` ("Polish: warm palette and layout fixes"). Rollback tag: `checkpoint-before-polish` (7fc38f4). Takunda's copy: pages 11 to 15 of `docs/Redesign-2-Report.pdf`.

## Built

- Palette: `--ink` #2A2118, new `--heading` and `--dark-fill` on `--brown` #4A3010, `--grey` #6B5A45, dark set #1E1710 page, #2A2118 panel, #382B1F raised, #54432F line. Sage warmed to #556B47 (dark #BCCBA8). `tests/unit/palette.test.ts` fails on #2B2D42, #5C677D or their rgb forms in `src/` or `public/`, and on any style colour with more blue than red. Dark mode keeps honey primary buttons with ink text.
- Art: `art/textures/make_warm_dark.py` rerun with warm browns (record in `art/CODEX_NOTES.md`); texture board and brand board rebuilt; inverse mark checked on #1E1710.
- Layout: short chip labels on phones (`Composer.tsx`), `AppShell tabs={false}` for notebooks and Ask Taku, Study tools folded while a notebook has no source, footer on the latest answer only (older ones fold and open on hover or focus), `InfoNote` for the answer check note, 32 px citation hit area and focus ring, wrapping action chips, header lockup without the byline, unpinned empty Ask Taku state with a 112 px cutout on phones.

## Checks

Mock AI mode only. Lint, typecheck, 299 unit tests, build. E2E: full run 50 passed and 2 failed (the 360 by 640 Ask Taku check measured unclipped boxes; it now measures only what the pane shows, and both then passed). After the older footer change, `polish.spec.ts` and `notebooks.spec.ts`: 14 passed, 0 failed, 0 skipped.

## Deployed

6 November 2026 from 8872345 with the stored Vercel CLI login (no tokens). No Convex code changed since the last deploy, so only the site was built (`TAKU_GEN_FIXTURES=0`, `VITE_CONVEX_URL` set to the production URL read from the live bundle) and published as a prebuilt output to project `takudzidza`. The bundle was checked for the production URL, no local URL and no fixtures. The deploy command ran twice with the same build; the second holds the alias. Production Convex settings were not touched.

Live check: https://takudzidza.vercel.app serves `index-DeKUOqwX.js` (was `index-CecaYIIP.js`) and the new `honey-waves-dark.webp`; the landing page loads with no console errors or failed requests at 1280 by 800 and 390 by 844. No account was made on production.
