# Part D - Takudzidza Education brand assets

Created 2026-11-05, Africa/Harare. These assets are a proposal handoff, not app integration or brand approval.

## Source and method

- Authoritative source: `../Taku brand/TAKU/brand/README.md`, `_shared/GEOMETRY.md`, and every file in `education/`. Read all six Education SVGs, README and palette. No old logo source was used.
- Seven kit files were copied byte for byte into `art/brand/takudzidza/kit/`. SHA-256 and byte equality were checked against the authoritative Education folder. The original kit SVGs, including their existing text nodes, remain untouched.
- Proposed product lockups use the approved on-cream Education mark. Its original three rectangle attribute dictionaries and colours are reproduced exactly, inside uniform scale and translation only. No mark recolouring, reshaping, clipping or effects.
- Suffix: TAKUDZIDZA, Inter 600, uppercase, 0.15em spacing between glyph advances, #B0822F. Byline: by Taku, Inter 400, #B0822F, set smaller below the suffix. All lettering in all four proposed SVGs is converted to paths. No live text or font dependency in proposed lockups.
- Genuine Inter was downloaded from the official Google Fonts repository: https://github.com/google/fonts/blob/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf . License: https://github.com/google/fonts/blob/main/ofl/inter/OFL.txt . Source font and OFL are retained in `source/`. Font version: Version 4.001;git-66647c0bb. FontTools instances fixed optical size at 14, weight at 600 for suffix / 400 for byline. Board labels also use this Inter font, weights 400 and 600.
- Generator: `art/brand/takudzidza/build_brand.py`, fontTools 4.61.1, Pillow 12.2.0, PyMuPDF 1.27.1. Run `python art/brand/takudzidza/build_brand.py`. No image-generation model was used. Background removal: not applicable; the marks and lockups are original SVG vectors with transparent backgrounds.
- Native dimensions: kit mark SVGs 1024 x 1024 with the unmodified 100 x 100 viewBox; kit horizontal 2000 x 400; kit stacked 1000 x 1200. Proposed horizontal variants 1400 x 480; proposed stacked 1200 x 1000, stacked by Taku 1200 x 1100. Board 2720 x 3980 native procedural composition, not upscaled. Board displays each approved mark at actual 512, 64 and 32 pixel viewports on each surface. Honey-waves texture is a resized crop of the existing texture, not regenerated artwork.
- Clear space: proposals leave at least one quarter of painted mark width around the mark. Mark geometry, 4-unit crossbar overlap and y28 stem start remain exact. Kit minimum mark size remains 32 px; horizontal minimum 240 px wide; stacked minimum 160 px tall. The larger lockup byline still needs real usage testing near minimum sizes.

## Review and surface recommendations

- Visually inspected the complete generated board, including all 36 approved-mark placements and all four proposed product lockups. Board labels PROPOSED appear beside every proposed lockup; SVG title/description also state pending Takunda approval.
- Cream #FFF8F0: approved on-cream variant reads best. Default top-left is too close to cream, while inverse loses its stem.
- Honey-waves: approved on-cream variant reads best across the sampled texture. Its pale amber top-left remains the weakest edge in the brightest areas; retain clear space and check the actual placement when integrated. Do not locally darken the mark.
- Charcoal #2B2D42: approved inverse reads best. Its paper stem and pale pills preserve the whole mark; default/on-cream have substantially weaker stems.
- All three requested surfaces have an existing approved variant that reads well in this board. No request for an additional mark variant is needed for these samples. These recommendations are visual judgement, not a universal contrast guarantee for all possible texture crops or displays.
- Proposed lockups are deliberately shown only on cream. Their suffix colour is fixed by the brief; no dark-surface product lockup variant has been invented.
- Checked: generator completed; seven exact kit-copy assertions; four outlined-only proposal assertions; every proposal's mark rectangle attributes and colours matched approved on-cream; Inter instance reports weight 600; Ruff passed. No app test, integration, public icon replacement, physical-display check, commit or push performed by this subtask.

## File inventory

`manifest.json` records generator, font provenance and checks. The table includes every Part D output; hashes below are exact file hashes after generation. Source/support files are not app assets. SVG sizes are their declared native dimensions; raster board size is native pixels.

| File | Native dimensions | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `art/brand/takudzidza/board.png` | 2720 x 3980 | 809,806 | `47c90bd57ad868b42013d376c191ad2d122033b409b3713e31e4ee494491ca6e` |
| `art/brand/takudzidza/build_brand.py` | - | 10,327 | `ad729e810efce7fc46f9405bfec75e05250edead4793dee32a9110b58aa30eee` |
| `art/brand/takudzidza/kit/palette.css` | - | 269 | `5c09f603113fa280596665e961680e846bd483e842bafcf95b6537ce1f540302` |
| `art/brand/takudzidza/kit/taku-education-horizontal.svg` | 2000 x 400 | 541 | `978e00dccdb9df07996fc73bdf45e690076ba658551622c66a3ac0d8ff380e0a` |
| `art/brand/takudzidza/kit/taku-education-mark-inverse.svg` | 1024 x 1024 | 361 | `3f8c01ba34ab9c98045da5dce0777cb5bf09e0a3367f2b5321a448a47ca0750c` |
| `art/brand/takudzidza/kit/taku-education-mark-on-cream.svg` | 1024 x 1024 | 361 | `4adf328f4c59d6e2105371bf825b9766acaaee8040c0509c0879c41fee833325` |
| `art/brand/takudzidza/kit/taku-education-mark-on-mid.svg` | 1024 x 1024 | 361 | `75bd08c4bdbe6ef2237bacdbd9218a1027f93e3ad7a6d3f7dc93145c3a6587ce` |
| `art/brand/takudzidza/kit/taku-education-mark.svg` | 1024 x 1024 | 361 | `1a46d904d55ff8fe300c349c6cbd403211bcfc26408a5221814ebd8987568d8a` |
| `art/brand/takudzidza/kit/taku-education-stacked.svg` | 1000 x 1200 | 562 | `1dcc15f238d858a454ced9eacc26077523741fa5c5b45577496a2277c112030b` |
| `art/brand/takudzidza/proposed/takudzidza-horizontal-by-taku.svg` | 1400 x 480 | 10,392 | `133df8121a385b7bd45d4f4347128f908305fc802046b8556bece877057b0a43` |
| `art/brand/takudzidza/proposed/takudzidza-horizontal.svg` | 1400 x 480 | 7,903 | `8ef6b2284684f2bc11c5bdc45755486428d721004c9fa3eac0b8b6add1a44fd2` |
| `art/brand/takudzidza/proposed/takudzidza-stacked-by-taku.svg` | 1200 x 1100 | 10,393 | `f6c116b59a348c68a6872d1460eb2b58ff1913697fbe1fc46bf0c6868b8b2a7e` |
| `art/brand/takudzidza/proposed/takudzidza-stacked.svg` | 1200 x 1000 | 7,904 | `529066258b50f8d18bce9bee1ee2bda0b04cf963a2b6a7682f97b01a6bd3bcf6` |
| `art/brand/takudzidza/source/Inter-Variable.ttf` | - | 876,576 | `29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031` |
| `art/brand/takudzidza/source/OFL.txt` | - | 4,377 | `5b9321a4298cfeb6b34354164a1c3afc3db114569984c502b9b35d988fd58c57` |
| `art/brand/takudzidza/manifest.json` | - | 4,312 | `4c152b2eb5722aa5ee9723c1fe14922e8ff7a278fc59fc7e3b4a5f307ef6b3f8` |
