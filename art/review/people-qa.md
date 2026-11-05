# People cutout visual QA

Reviewed 2026-11-05 (Africa/Harare). Independent review of all 22 unique generated source PNG cutouts and all 23 asset filenames. The repaired `dashboard-hero-university` and `landing-hero-wide` outputs were added after the initial 20-source review. `og-default` is a derived alias of the final landing-hero-wide source, with no separate generation.

## Result

- Pass: no additional blocking retained background, furniture slab, frame, broad coloured halo, severed visible fingers, or facial identity mismatch found in all 22 unique cutouts (23 filenames including the derived alias).
- Pass: original faces, hairstyles, expressions, clothes, props and study actions remain visually consistent in side-by-side comparisons. These are image-model extractions/rerenders; this does not assert source-pixel identity.
- Review limit: this checks the generated source PNGs listed in `art/review/cutout-sources.json`. It does not certify the exported WebPs, scene compositions or physical screens. Final hero sources were checked against `art/review/cutout-sources-final.json`; the other 20 source paths are unchanged from the initial reviewed manifest.

## Method

Five full-subject comparison sheets (`full-1.png` through `full-5.png`) each show four original photographs beside the corresponding source cutouts on cream #FFF8F0 and charcoal #2B2D42. These were inspected via view_image. Original input files were `art/assets/<name>.png`. All twenty initial full figures were checked. `full-6-final-heroes.png` adds the two final repaired hero sources beside their originals on cream and charcoal. The og-default original was also viewed and confirms the same landing-hero woman.

For each person or joined group, semantic hair/head and hand/prop regions were selected manually. Each native 256x256 crop was enlarged exactly 2x to 512x512 using nearest-neighbour and separately alpha-composited onto cream and charcoal. Each `<name>-200pct.png` sheet was inspected via view_image. There are 56 region pairs: 49 for the initial twenty sources and seven for the two final repaired heroes. Multi-person groups include multiple heads. The hands-only originals have two hand regions instead of a hair region. Headwrap or bald-head edges replace hair where appropriate. Many hands touch the shirt, page or device; those regions check finger anatomy/contact rather than an exterior alpha boundary.

No changes were made to generated source PNGs, exported cutouts, alpha, colour or props. Pillow was used only to prepare review composites. Labels use Inter from `art/decor/source-inter.ttf`.

## Observations

Hair detail is naturally soft at fine flyaway edges. In the reviewed samples it reads as hair rather than a uniform pale or coloured outer border. No broad retained setting or glow appears on the properly alpha-composited cream/charcoal sheets. The small gold detail among `empty-flashcards` twists also appears in its original photograph, so it was not classified as background contamination.

A raw image preview can display RGB content stored beneath zero alpha. For example, the `study-group-later` source has warm brown RGB in the space between the heads, but sampled pixels (900,100), (900,200), (1300,80), and (1000,300) all have alpha 0. These pixels disappear completely in actual composites. Hidden RGB under zero alpha is not a visible retained background. This report judges the composited evidence, not that raw RGB preview.

All phone, card, paper and tablet grips sampled read plausibly. No new digits or text were found in the full-subject comparisons. Waist and seated endings avoid rectangular desk scraps. Group/table cutouts preserve open study books while removing tables. Seated leg completion changes the visible crop extent but remains consistent with the original action.

## Per-cutout outcome and inspected source

| Name | Source native size | Review | Source SHA-256 |
| --- | --- | --- | --- |
| `audio-overview` | 1121x1403 | Pass sampled edges and original comparison | `7888aa47e33952c4f130e505c735e0c639882ac25c4b871fbd6a803c37ff81ba` |
| `class-share-teacher` | 1127x1396 | Pass sampled edges and original comparison | `aa4f51fe87b6c4baf51ff4932c6251141c28f8a81b3c81afbd29c260f9656afb` |
| `empty-flashcards` | 1143x1376 | Pass sampled edges and original comparison | `8faec8756e5957cc5fb88366c4e868d1f550a35ebc92c7acea73ee330be2ff6b` |
| `empty-notebook` | 1121x1403 | Pass sampled edges and original comparison | `f305239723ea6ee2219441d145f73f60b56af609258fd2f7a74f055d0b893d82` |
| `empty-quiz` | 1128x1394 | Pass sampled edges and original comparison | `21b676bc03a605abad2dca645fbefe3c83df01353253b50f40dfa085029abd54` |
| `exam-coach` | 1374x1145 | Pass sampled edges and original comparison | `d00725b794d7ff4e9af5405e5698cdc9286f40b27d51d15de535088e51ae2c19` |
| `guardian-consent` | 1431x1099 | Pass sampled edges and original comparison | `b89794d19892af0f922064cbaa94f4cb865baddb48956683d461fae2e470b7ec` |
| `landing-form1` | 1121x1403 | Pass sampled edges and original comparison | `8f23fd957ee7527e937b27f124ec77bb4baa589a4b9bd8dee4cf6f47e6786fb4` |
| `maths-hints` | 1536x1024 | Pass sampled edges and original comparison | `c66931569db44c60e9d0ea318c44fc974e07038076ac9744bc36cc1e4bfbc438` |
| `offline-downloads` | 1123x1401 | Pass sampled edges and original comparison | `0614b71b34ea8a8a804a2affde23db5e89d838af933c6ef1bc16bf58bd039bd0` |
| `onboarding-1-secondary-student` | 1122x1402 | Pass sampled edges and original comparison | `b635b906958a5b748287b05baba1dfa31fa5f6a7fdeaf6c7936d8e3e62fe1eb9` |
| `onboarding-2-senior-student` | 1378x1141 | Pass sampled edges and original comparison | `54cf45a7c48853c21ed8dd39d2dbedcd50cbf75be349b0ca3b69d0c7f97bb4bd` |
| `onboarding-3-professional` | 1179x1334 | Pass sampled edges and original comparison | `019027146a4f24b98a59ef5a9ce641e2e83628698e3243119d7c4ba2ccb036ba` |
| `study-group-later` | 1536x1024 | Pass sampled edges and original comparison | `de5d8de2950a49c5a555743003a5110664011af10fc2d59e05940d6e2f32b6be` |
| `study-planner` | 1312x1199 | Pass sampled edges and original comparison | `ebfe2ae3b600beee2ae3b218ef9ce75160897ec457e6bcfc64b366ad6957ef60` |
| `style-calm` | 1121x1403 | Pass sampled edges and original comparison | `3533b2b02d4a46b1d52467ea2fbc742699d615021712cece6c2303b251165ba5` |
| `style-cook-mode` | 1123x1401 | Pass sampled edges and original comparison | `fac71dc3e0bf5c6e92a7d61d42b8119cf71af3dbaef6c329d0ec3e6e9f4cb26e` |
| `style-locked-in` | 1143x1376 | Pass sampled edges and original comparison | `ed0231980c0f2d2e1fc91cc4bf50f4f450b34b81db8a09d1f184a7b3565591be` |
| `tile-ask` | 1121x1403 | Pass sampled edges and original comparison | `50158145646391fd5379bfdf212d8d414b1f0fc5287e6b2867dfcee95b79417b` |
| `tile-scroll` | 1150x1367 | Pass sampled edges and original comparison | `2df9d137b70690d09e7ef2586b2e6268c427fc1cecfe7d0cf0c65631178a11cd` |

## Exact semantic crop coordinates

Coordinates are in the generated source PNG, before export trimming or resizing: `(left, top, right, bottom)`, right and bottom exclusive. Every row is shown on both cream and charcoal in its named 200 percent sheet.

| Cutout | Semantic region | Source box |
| --- | --- | --- |
| `audio-overview` | hair | `(330, 20, 586, 276)` |
| `audio-overview` | phone hand | `(440, 1030, 696, 1286)` |
| `class-share-teacher` | hair | `(325, 20, 581, 276)` |
| `class-share-teacher` | gesture hand | `(180, 610, 436, 866)` |
| `class-share-teacher` | tablet hand | `(770, 900, 1026, 1156)` |
| `empty-flashcards` | twist edges | `(340, 20, 596, 276)` |
| `empty-flashcards` | card hand | `(460, 690, 716, 946)` |
| `empty-notebook` | left phone grip | `(50, 250, 306, 506)` |
| `empty-notebook` | right phone grip | `(700, 530, 956, 786)` |
| `empty-quiz` | hair | `(340, 20, 596, 276)` |
| `empty-quiz` | writing hand | `(300, 1060, 556, 1316)` |
| `exam-coach` | head edge | `(440, 100, 696, 356)` |
| `exam-coach` | writing hand | `(320, 760, 576, 1016)` |
| `guardian-consent` | mother hair | `(280, 20, 536, 276)` |
| `guardian-consent` | son hair | `(930, 80, 1186, 336)` |
| `guardian-consent` | phone hand | `(430, 600, 686, 856)` |
| `landing-form1` | hair | `(300, 20, 556, 276)` |
| `landing-form1` | book hand | `(380, 900, 636, 1156)` |
| `maths-hints` | left fingers | `(180, 620, 436, 876)` |
| `maths-hints` | pen hand | `(980, 220, 1236, 476)` |
| `offline-downloads` | hair | `(420, 20, 676, 276)` |
| `offline-downloads` | phone hands | `(370, 590, 626, 846)` |
| `onboarding-1-secondary-student` | cornrow edge | `(400, 40, 656, 296)` |
| `onboarding-1-secondary-student` | writing hand | `(140, 1000, 396, 1256)` |
| `onboarding-2-senior-student` | loc edges | `(370, 0, 626, 256)` |
| `onboarding-2-senior-student` | phone hand | `(970, 650, 1226, 906)` |
| `onboarding-2-senior-student` | page finger | `(320, 850, 576, 1106)` |
| `onboarding-3-professional` | wrap edge | `(300, 20, 556, 276)` |
| `onboarding-3-professional` | writing hand | `(280, 900, 536, 1156)` |
| `study-group-later` | left braids | `(150, 60, 406, 316)` |
| `study-group-later` | middle locs | `(700, 10, 956, 266)` |
| `study-group-later` | right curls | `(1100, 60, 1356, 316)` |
| `study-group-later` | book finger | `(850, 570, 1106, 826)` |
| `study-planner` | loc edges | `(430, 20, 686, 276)` |
| `study-planner` | writing hand | `(400, 870, 656, 1126)` |
| `style-calm` | hair | `(400, 20, 656, 276)` |
| `style-calm` | pointing hand | `(350, 740, 606, 996)` |
| `style-calm` | tablet hand | `(770, 840, 1026, 1096)` |
| `style-cook-mode` | loc edges | `(350, 0, 606, 256)` |
| `style-cook-mode` | raised fist | `(850, 500, 1106, 756)` |
| `style-cook-mode` | phone hand | `(360, 840, 616, 1096)` |
| `style-locked-in` | curls | `(350, 0, 606, 256)` |
| `style-locked-in` | left paper grip | `(100, 950, 356, 1206)` |
| `style-locked-in` | right paper grip | `(510, 995, 766, 1251)` |
| `tile-ask` | braid edges | `(380, 0, 636, 256)` |
| `tile-ask` | phone hands | `(630, 740, 886, 996)` |
| `tile-scroll` | loc edges | `(400, 50, 656, 306)` |
| `tile-scroll` | raised arm edge | `(20, 120, 276, 376)` |
| `tile-scroll` | phone grip | `(790, 530, 1046, 786)` |

## Review files

- `art/review/people-qa/full-1.png` through `full-5.png`: full-subject original/cream/charcoal comparisons, each 1500x2400.
- `art/review/people-qa/<name>-200pct.png`: twenty semantic edge/contact sheets, 1080 pixels wide and 1140, 1710 or 2280 pixels high depending on the region count.
- `art/review/people-qa/sample-coordinates.json`: the 49 crop coordinates and native dimensions as machine-readable review metadata.

No changes were made outside this report and its review-helper folder for this QA subtask.

## Final hero and derived alias review

The final dashboard and landing hero sources pass the full original/cream/charcoal comparison and their semantic hair and hand regions at 200 percent. No broad retained backdrop or glow is visible on the actual composites. Finger silhouettes, book contact and hair boundaries read naturally. Both original dashboard students and the landing woman remain visually consistent with their original photographs.

| Asset | Final source native canvas | Source SHA-256 | Outcome |
| --- | --- | --- | --- |
| `dashboard-hero-university` | 1536x1024 | `1e7d7edaca691e8812d912a68ac6e7571b4e1a69c90f59d0781cd80ac48ecae6` | Pass sampled hair/hands and original comparison |
| `landing-hero-wide` | 1536x1024 | `4a9f33a0dd29c9ed153c928401bfdec0aa1102132ccc7693cf1e6410ff5894cd` | Pass sampled hair/hands and original comparison |
| `og-default` | 1536x1024 | `4a9f33a0dd29c9ed153c928401bfdec0aa1102132ccc7693cf1e6410ff5894cd` | Pass: exact source alias of final landing hero; no separate generation |

`og-default` and `landing-hero-wide` reference exactly the same generated source path in the final source manifest. Alias coverage relies on the already reviewed source; this does not claim their downstream export sizes or encodings are identical.

| Hero | Semantic region | Native source box |
| --- | --- | --- |
| `dashboard-hero-university` | woman curls | `(200, 40, 456, 296)` |
| `dashboard-hero-university` | man hair | `(900, 40, 1156, 296)` |
| `dashboard-hero-university` | pointing hand | `(420, 650, 676, 906)` |
| `dashboard-hero-university` | man hands | `(1040, 650, 1296, 906)` |
| `landing-hero-wide` | loc edges | `(600, 70, 856, 326)` |
| `landing-hero-wide` | left book hand | `(250, 690, 506, 946)` |
| `landing-hero-wide` | right book hand | `(1040, 690, 1296, 946)` |

Final evidence: `art/review/people-qa/full-6-final-heroes.png`, `dashboard-hero-university-final-200pct.png`, `landing-hero-wide-final-200pct.png`, and `hero-final-coordinates.json`. All 22 unique sources / 23 filenames now have visual review coverage. No repair blocker remains from this independent source-PNG review.
