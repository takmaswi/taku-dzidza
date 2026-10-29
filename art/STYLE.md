# Takudzidza art style

For Codex and build agents. Matches batch 1 (`art/CODEX_NOTES.md`). The asset list and full prompts are in `art/ASSETS.md`.

## Never
- Never generate images inside this repo or from the app. Takunda runs Codex on his PC and commits the files; agents only wire them in.
- No text, letters, digits, readable handwriting, logos, crests, watermarks or signage anywhere in an image, including books, devices, clothing and keyboards (blank keycaps). UI words are added in code.
- No rural scenes, poverty imagery, flags, safari or tourism motifs, staged luxury.
- No cartoon, 3D, illustration or mascot. No visible Chris character unless Takunda chooses one (SPEC.md decision D7).
- No camera facing advertising pose, no stock grin, no glamour retouching or plastic skin.
- No reuse of Amai Learn or Takubasa portraits as identity references. Every identity is synthetic and new.

## Always
- Realistic, modern, international photography of secondary, university and professional learners with a quiet African warmth. Mostly Black Zimbabwean and Southern African learners, with some international diversity (batch 1 includes a South Asian student).
- Editorial, candid, a study action in progress: writing, reading, recalling, explaining, listening.
- 50mm full frame feel, soft natural window light, restrained warmth.
- Settings: contemporary urban classrooms, libraries, homes, offices, cafes, campus spaces.
- Palette in the scene: Cream `#FFF8EC` and Butter `#F8E2A8` surroundings, small Honey `#F2B33D` highlights; clothing in cream, butter, honey, sage, olive, ochre, charcoal.
- Distinct faces, skin tones, builds and hairstyles across the set; describe each person specifically in the prompt (age, skin tone, face shape, build, hair).
- Ages: secondary learners 13 to 18 in plain uniforms without ties or crests; university 19 to 25; professionals 26 and up.
- Crop safe: faces and key hands clear of edges, room for a large rounded card crop (radius about 32 px at 1080 wide).
- Pages show only ruling and unlabelled geometric diagrams. Phone screens face away or show an image only preview with no UI.

## Files
- Paths: `art/assets/<slug>.png` (master) and `art/assets/<slug>.webp` (shipped). Slugs are lower case with hyphens (file names only).
- Masters may be enlarged from the generator's native size; say so in `art/CODEX_NOTES.md` with native size, scale and SHA 256 of the source, as batch 1 did. Do not call them native 4K.
- Export: Pillow Lanczos, centred aspect fit, no sharpening, no skin retouching, no recolouring. WebP limits per shape are in `art/ASSETS.md`.
- Commit message: `Art batch <n>`.

## In the app
- Photos sit in large rounded cards on Cream or Butter. Never put text directly on a photo; captions go below or beside on a solid token colour.
- Every image has meaningful alt text in English and ChiShona.
- Low data mode replaces photos with a Butter card and the alt text.
- Missing images render the `ImageSlot` placeholder: a Butter card with a dashed Ink Soft border and the slug, so pages never break while Codex batches are pending.
