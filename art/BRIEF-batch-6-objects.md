# Takudzidza art batch 6: real object photography

For Codex. This replaces every object from batch 4 and batch 5 (the matte ceramic clay set). Those read as toys and make the app look childish. The new set is real objects, photographed like a premium product catalogue (think Aesop, Muji, Apple accessories). Write only under `art/`. Same object pipeline as before: `art/objects/<slug>.png` master with transparency, `<slug>-160.webp`, `-320.webp`, `-640.webp`, `<slug>-shadow.webp`, entries in `art/objects/manifest.json`, then run `art/web/build_web.py`.

## Shared preamble (start every prompt with this, word for word)

```text
Use case: photorealistic product still life.
Create ONE studio product photograph for a premium study app. Real physical object, real materials, shot like a high end design catalogue. Pure white seamless background #FFFFFF. Soft large daylight source from the upper left, gentle fill from the right, one natural soft contact shadow directly under the object. Camera at a three quarter view from about 30 degrees above, 85mm lens feel, no distortion, whole object in frame with generous white space around it. Finest available photographic detail: real surface texture, tiny imperfections, true reflections, accurate geometry. Colours restrained: natural material colours with honey yellow #F2B33D accents only where the object would really have them.
```

## Shared constraints (end every prompt with this, word for word)

```text
Strict constraints: photographic realism only. No cartoon, no illustration, no 3D render look, no clay, no plastic toy look, no glossy CGI sheen, no faces on objects, no glow effects, no gradients in the background, no props other than the object described. Absolutely no text, letters, digits, logos or brand marks anywhere, including on paper, packaging and labels. Paper is blank or has only faint ruling. Geometry must be physically correct: symmetric where real objects are symmetric, straight edges straight, teeth, hinges and joints exactly as a real object would have them.
```

## The objects (slug: subject)

Keep the slugs exactly, so the app swaps them in with no code change.

| Slug | Subject (goes between preamble and constraints) |
|---|---|
| `sun` | A solid polished brass sun paperweight, a disc with short tapered rays, about 8 cm across, resting flat on the white surface, warm highlights on the rays. |
| `sun-low` | The same brass sun paperweight standing on its edge in a small walnut stand, lit by low warm late afternoon light from the left with a longer soft shadow. |
| `moon` | A small spherical moon lamp with a realistic pale cratered surface, switched on, glowing softly warm from inside, on a minimal walnut base. |
| `speech-bubble` | A small square pad of pale butter yellow sticky notes, the top note slightly lifted at one corner, a black fine liner pen lying diagonally across it. |
| `open-book` | A hardback book lying open flat, cream pages with faint printed lines that are not readable, a honey yellow ribbon bookmark across the right page, cloth spine. |
| `index-cards` | A loose fanned stack of real white and pale butter index cards with faint blue ruling, held together at one corner by a black binder clip. |
| `star-medal` | A solid brass medal with a simple raised star, on a short folded honey yellow grosgrain ribbon, lying flat. |
| `hourglass` | A clear glass hourglass in a light oak frame, fine golden sand mid flow, sand stream visible, half in each bulb. |
| `lamp` | A modern matte black adjustable desk lamp with a brass joint, switched on, casting a warm pool of light on the white surface. |
| `spark` | A small clear glass prism on the white surface catching daylight and throwing a short soft rainbow onto the surface beside it. |
| `tea-cup` | A handmade stoneware mug with a honey yellow glaze and natural speckles, on a small light oak coaster, a thin wisp of real steam. |
| `key` | An old style solid brass key with a round bow, lying diagonally, worn edges, warm reflections. |
| `seedling` | A small young seedling with two real green leaves in a matte white ceramic pot with soil, natural and fresh. |
| `headphones` | Premium over ear headphones in warm cream fabric and matte black, ear cushions visible, lying at a natural angle. |
| `highlighter` | A real yellow highlighter, cap off and lying beside it, with one clean straight stroke of yellow highlight on a blank white card under the tip. |

## Consistency rules

- Every object from one shoot: same background, same light direction, same camera angle, same shadow softness, same white balance. Reject any image that breaks the set, however good it is alone.
- Real objects in Zimbabwe and anywhere else. Nothing that looks like an emoji, toy or game asset.
- At 160 px every object must still read clearly. Check the small size.

## Reject list (regenerate if any appear)

Plastic or wax looking surfaces, melted or bent geometry, uneven key teeth or lamp joints that could not work, extra cables or legs, fake text or glyphs, glowing outlines, background that is not pure white, shadows going in different directions across the set.

## Delivery

1. Contact sheet `art/review/batch-6-objects.png`: all 15 on white at 320 px, then the same 15 at 160 px, then all 15 on near black `#121212`.
2. Record exact prompts, native sizes and SHA 256 in `art/CODEX_NOTES.md` under Batch 6.
3. Run `art/web/build_web.py`, update `art/objects/manifest.json`.
4. Commit `Art batch 6 objects` straight to `main` and push. No branch, no PR. Report in 4 lines or fewer.
