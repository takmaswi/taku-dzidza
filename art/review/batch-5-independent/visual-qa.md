# Batch 5 independent visual QA

Reviewed 2026-11-24, Africa/Harare. Final visual result: PASS, no blocking defect identified in the accepted five people, scene, six ceramic objects or six bookcloth covers. This is asset review, not app integration or device acceptance.

## Accepted people

| Slug | Accepted generated source | Native canvas | SHA-256 |
| --- | --- | --- | --- |
| learner-snap-notes | exec-660ede2a-801b-4385-9124-5d5fa1453b4b.png | 1122x1402 | `46b7d9e857c3e91b7a3be76a49c676ad43433c90c31ca43099b042b4f4003169` |
| learner-listening | exec-db30e1cc-4d4a-4da8-9bad-4dfae6d666c5.png | 1122x1402 | `49fe574d083f1221bab52db3bacdc110d9d6a3348718e87393a5f3609c3e91c8` |
| learner-flashcards | exec-0ee1dcf8-83e8-4ee6-a2e9-cd43e009d1dc.png | 1123x1401 | `2f63ffc45a681cc692be89d63a1c3b6a1b6ae6190ec250b30113660ab565e149` |
| seller-notes | exec-eb859bd9-99be-4d67-a32d-fbf67bdab37f.png | 1122x1402 | `f5210dfe9cee97323aa0fc56a2ea8cc894db15d9e56a993f2ac28c18395e3c83` |
| lecturer-class | exec-8f928ebd-7e2c-4dc2-a793-5b85f05b0f4c.png | 1122x1402 | `bb3839c98a49aacb7057028bfafec73ec238e34f1626be38bba3c4e785417d3a` |

Every accepted cutout was viewed full-subject on actual cream #FFF8EC and near-black #121212 alpha composites. Semantic hair/head and hand/prop regions were viewed as native 256x256 patches enlarged exactly 2x with nearest neighbour. Final crop coordinates are in semantic-crops-final.json; seller-latest-coordinates.json supersedes the seller coordinates and seller-latest-200pct.png supersedes earlier seller sheets. Source-original comparisons cover extraction fidelity for snap-notes and flashcards. Listening, seller and lecturer were regenerated as new synthetic identities from the same brief after extraction artefacts; their rejected first originals are not identity targets for the accepted replacements.

- Snap-notes: freckles, curly hair, skin, both phone grips and corrected screen-up photographing orientation read naturally. Brown flyaway curl edges remain on both surfaces; no broad retained matte halo. The isolated notes page is intended to sit at desk-height in the consuming composition.
- Listening: the replacement has random natural skin texture, plausible headphones and two notebook/pen hands. No dark ink-like squiggles from the rejected extraction remain.
- Flashcards: distinct chin-length bob and fringe, upward recall gaze, believable raised hand and card grip. Cards contain ruling only. The pseudo-text foreground notebook from the rejected original is absent.
- Seller: the final wide generation has a complete outer silhouette, natural skin texture and believable page contact. The laptop naturally occludes part of the page-gripping hand. The fully visible opposite hand reads anatomically. No clipped visible fingers or readable keycaps.
- Lecturer: distinct angular face, natural silver streak, credible open-hand explanation and tablet grip. Hair alpha is soft and strand-like, not a pale contour matte. Skin and fabric retain natural variation.

identity-accepted-1.png through identity-accepted-5.png put the final five people beside all 22 existing art/assets PNG photographs, including the existing joined groups and hands-only files. The corresponding thumbnail sheets were inspected. No duplicate face was identified. Similar role props and hair categories, such as locs plus wire glasses, remain visually distinguishable through face proportions, build, age, skin tone and expression.

## Scene

The accepted final art/assets/scenes/landing-ensemble.png was viewed at full canvas and as the centred x15%-85% crop (scene-centred-70pct.png). All four complete faces survive that crop. Left copy space contains no face. The quiet scene blends into an actual paper-cotton surface. This composition uses a reduced photo field; it is not a native 2560x1600 generation.

Nine native semantic regions from the accepted raw scene df5071d0-86f3-4191-a973-48935e0e3553 were inspected at 200 percent: four heads plus pointing, marker, pen, report and index-card hands. Coordinates are in scene-semantic-crops.json and scene-semantic-200pct-1.png through -3.png. Faces, age range and expressions are distinct; nobody faces the camera. No visible text, pseudo-text, logo, incorrect digit count or impossible prop contact was identified in the reviewed regions. The ochre-wrap woman's dark hairline curls are styled hair, not the rejected etched skin pattern.

## Objects and covers

All six ceramic source images and all six cover source images were viewed individually at native canvas and as actual alpha composites on cream and #121212. object-board.png and cover-board.png show both surfaces. The ceramic family uses consistent cream/honey satin material, soft upper-left light and restrained geometry, with blank surfaces. No face motif, logo, text, blue/chrome or retained backdrop was visible. The six covers are front-on cloth notebooks with rounded corners, a visible fine weave, a narrow right page-block hint, blank fronts and soft contact shadows. They read as one shoot. Apparent RGB glow in raw transparent image previews is not visible in their actual alpha composites.

## Rejections retained as evidence

The initial listening extraction was rejected for dark etched/squiggle skin texture confirmed on both alpha composites. The seller margin edit 0b9a2800-a002-4edf-80fd-3fdcd1ee81e9 was rejected for fingerprint-like forehead contour lines; seller-margin-final-200pct.png retains that evidence. The earlier seller64f5 source had a clipped left hand/forearm silhouette. These are superseded by the accepted source table above. Initial full sheets and crop sheets remain as historical QA evidence and do not define the accepted deliverables.

## Limits

This review covers generated PNG sources, actual composite evidence and the final scene PNG. It does not certify every pixel, all derivative encodings, live app layout, physical phones, calibrated displays, audio, licensing, deployment or user acceptance. No source pixels or alpha masks were edited by this QA subtask. Only review compositions and this report were written under art/review/batch-5-independent/.
