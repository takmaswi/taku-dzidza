# Takudzidza art batch 4: materials and objects

For Codex. This brief replaces the people first direction in `art/STYLE.md` and `art/ASSETS.md` wherever they disagree. Read all of it before generating anything.

## What went wrong and what changes

1. Every screen got a person. A cropped girl looking at her phone sits in the Ask Taku empty state, a group of students on the home dashboard. They say nothing about the screen. From now on people appear ONLY on the landing page and sign in / setup (who the app is for). Everywhere else the app speaks through objects.
2. The page background (`honey-waves`) is a blurred colour gradient. It reads as cheap AI wallpaper. `paper-grain` is so faint it does nothing. Replace both with real material surfaces: fine, even, tileable, with physical fibre and tooth, no blotches, no light falloff, no waves.
3. The old decor (torn paper, sticky note, pencil, book stack) is generic stationery clipart. Retire it.

The target feel: warm, happy and premium, as if an expert UI and UX designer chose every asset. Realistic is good; stylised is fine when it makes sense; shoddy or obviously AI made is never fine. Think a well made physical object. Think heavyweight cotton paper, bookcloth, letterpress, a ceramic desk object. Expensive because it is restrained and consistent, not because it is busy.

## Pilot first (stop after this and wait for Takunda)

Make the pilot only. Do NOT make the full set until Takunda picks.

- Textures: T1, T2, T3 below, each with its 3x3 tile test.
- Objects: `sun`, `moon`, `open-book`, `hourglass`, each in BOTH material A and material B (8 images).
- One contact sheet `art/review/batch-4-pilot.png`: textures tiled at 100% in the top row, the 8 objects on cream `#FFF8EC` in the middle row, the same 8 on near black `#121212` in the bottom row. Label each with its file name (labels on the sheet only, never in an asset).
- Commit as `Art batch 4 pilot`. Stop.

## Textures

Global rules for every texture:
- 2048x2048 master PNG, made seamless. Shipped as 1024x1024 WebP, under 180,000 bytes, plus a 2048 version under 450,000 bytes for large screens.
- Flat field: remove all low frequency variation so the tile never shows a light patch, gradient or vignette. Method: convert to Lab, subtract a Gaussian blur of L (sigma 48 px) and add back the mean L, keep a and b constant at the target colour. Only fine detail survives.
- Grain strength: standard deviation of L between 1.5 and 3.0 on the light textures, 2.0 to 3.5 on the dark one. Record the measured value.
- Seamless: offset by half, heal the cross shaped seam with inpainting, then prove it with a 3x3 tile test image (`<slug>-tiletest.png`). No visible seam, no repeating blob a viewer can spot within the 3x3.
- No text, no shapes, no objects, no stains, no folds.

T1 `paper-cotton` (light page background)
Prompt: macro photograph of heavyweight cold pressed cotton rag paper, perfectly flat, lit evenly from straight above with no shadows or light falloff, fine natural paper tooth and a few soft cotton fibres, warm ivory white, colour close to #FFF8EC, photographed for a seamless texture library, extremely even exposure, no vignette, no stains, no edges.

T2 `bookcloth-honey` (honey surfaces: highlighted cards, Cook Mode accents, tab indicator)
Prompt: macro photograph of fine woven bookbinding cloth, tight plain weave, warm honey yellow close to #F2C766, perfectly flat, lit evenly from above, visible thread texture but no wrinkles, seamless texture library photograph, no vignette, no fading.

T3 `linen-charcoal` (dark mode page background)
Prompt: macro photograph of fine charcoal black linen bookcloth, tight weave, colour close to #161514 with no blue tint, perfectly flat, lit evenly from above, subtle thread texture, seamless texture library photograph, no vignette, no sheen hotspots.

## Objects

One family. Every object must look like it came from the same studio session: same material, same camera, same light, same shadow.

Shared rules:
- Single object, centred, three quarter view from slightly above (about 30 degrees), 85mm product photo look, soft key light from top left, gentle fill, no hard reflections.
- Plain seamless backdrop for removal, then cut out to transparent PNG (as batch 2 cutouts were made). Master 1536x1536 with the object filling about 70% of the frame. Separate soft contact shadow file `<slug>-shadow.webp`, made by script the same way for every object.
- Shipped WebP at 160, 320 and 640 px square, each under 60,000 bytes.
- Palette only: cream `#FFF8EC`, butter `#F8E2A8`, honey `#F2B33D`, ink black `#111111`, a touch of sage `#4F6B54` allowed on two objects at most. No brown, no blue, no chrome, no rainbow.
- No text, digits, numbers, clock faces with numerals, logos or letters anywhere.
- Not cartoon, not glossy plastic 3D, not emoji, no faces on the sun or moon.

Material A, `paper`: layered cut paper sculpture. Thick matte cotton card in the palette, visible paper edges and layer depth, tiny shadows between layers, handmade precision.
Material B, `ceramic`: matte glazed ceramic desk object, soft satin glaze in the palette, slight hand made irregularity, smooth and heavy looking.

Prompt template (fill the object line):
Studio product photograph of a single [OBJECT], made as [MATERIAL A or B text above], colours limited to ivory cream, butter yellow, honey yellow and ink black, three quarter view from slightly above, centred on a plain warm ivory seamless backdrop, soft diffused key light from the top left, gentle shadow, 85mm lens, crisp focus across the object, minimal, premium, no text, no numbers, no logo, no face.

Full object list (after Takunda picks a material). File `art/objects/<slug>.png`:

| Slug | Object line for the prompt | Used for |
| --- | --- | --- |
| sun | a round sun disc with short rays | Home greeting before 12:00, light mode switch |
| sun-low | a half sun setting behind a gentle horizon line | Home greeting 12:00 to 17:00 |
| moon | a crescent moon with two small stars | Home greeting after 17:00, dark mode switch |
| open-book | an open hardback book, blank pages | Notebooks empty state, Notebook with no sources |
| speech-bubble | a rounded speech bubble resting on its tail | Ask Taku empty state |
| index-cards | a small fanned stack of blank index cards | Flashcards empty state |
| star-medal | a star shaped medal on a short ribbon | Review done, all cards cleared |
| hourglass | an hourglass with honey sand | Quiz and mock exam empty state, timers |
| headphones | over ear headphones | Audio overview |
| compass-tool | a geometry compass and a short ruler, blank | Maths hints |
| paper-plane | a folded paper plane | Offline downloads, send / share |
| lamp | a small desk lamp with a warm glow | Style card: Locked In |
| spark | a cluster of three bright sparks | Style card: Cook Mode |
| tea-cup | a cup of tea with a thin curl of steam | Style card: Calm |
| key | a simple key | Guardian consent, account security |
| seedling | a seedling in a small pot | Study plan and goals |

## Files and notes
- Textures: `art/textures/<slug>.png` (master), `<slug>-1024.webp`, `<slug>-2048.webp`, `<slug>-tiletest.png`.
- Objects: `art/objects/<slug>.png` (master, transparent), `<slug>-160.webp`, `<slug>-320.webp`, `<slug>-640.webp`, `<slug>-shadow.webp`.
- `art/objects/manifest.json` and `art/textures/manifest.json`: slug, sizes, bytes, SHA 256 of the source, generator native size, measured grain value for textures.
- Record every prompt exactly as sent, scripts used and any rejects in `art/CODEX_NOTES.md` under Batch 4.
- Reject and regenerate any object that does not match the others in light, angle, material or palette. Consistency matters more than any single pretty image.
- Do not touch `src/`. Wiring into the app is done separately.
