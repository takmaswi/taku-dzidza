# Takudzidza by Taku - art batch 1

Created: 2026-10-29 (Africa/Harare).

## Generation and export

Generated with the built-in imagegen tool, one initial call per scene. Four scenes received a targeted imagegen edit. All identities are synthetic. No previous Amai or Takubasa portrait was used as an identity reference.

Final deliverables are six 2160x2700 RGB PNG masters and six 1080x1350 RGB WebP derivatives. The built-in generator returned lower-resolution images; the PNG masters are enlarged exports, not native 4K photographs. Source dimensions and scaling are recorded below. Export used Pillow Lanczos resampling with a centered aspect-ratio fit, no skin retouching, recoloring, invented detail, or sharpening. WebP uses method 6 and the highest integer quality from 95 down that stays strictly below 200,000 bytes. File sizes below are exact bytes; KB means 1,000 bytes.

## File inventory

| File | Dimensions | Bytes | KB | WebP quality |
| --- | --- | ---: | ---: | ---: |
| `art/assets/onboarding-1-secondary-student.png` | 2160x2700 | 4,307,935 | 4307.935 | - |
| `art/assets/onboarding-1-secondary-student.webp` | 1080x1350 | 180,968 | 180.968 | 94 |
| `art/assets/onboarding-2-senior-student.png` | 2160x2700 | 4,642,376 | 4642.376 | - |
| `art/assets/onboarding-2-senior-student.webp` | 1080x1350 | 194,284 | 194.284 | 92 |
| `art/assets/onboarding-3-professional.png` | 2160x2700 | 4,684,533 | 4684.533 | - |
| `art/assets/onboarding-3-professional.webp` | 1080x1350 | 180,742 | 180.742 | 91 |
| `art/assets/dashboard-hero-university.png` | 2160x2700 | 5,003,082 | 5003.082 | - |
| `art/assets/dashboard-hero-university.webp` | 1080x1350 | 193,538 | 193.538 | 90 |
| `art/assets/empty-notebook.png` | 2160x2700 | 4,594,883 | 4594.883 | - |
| `art/assets/empty-notebook.webp` | 1080x1350 | 199,140 | 199.140 | 94 |
| `art/assets/exam-coach.png` | 2160x2700 | 4,389,566 | 4389.566 | - |
| `art/assets/exam-coach.webp` | 1080x1350 | 181,166 | 181.166 | 93 |

## Source provenance

| Asset | Generated source | Native dimensions | Scale to master | SHA-256 of source |
| --- | --- | --- | ---: | --- |
| onboarding-1-secondary-student | `exec-c24507d1-2ef4-4a1a-8bca-0c68aaa6227d.png` | 1122x1402 | 1.9258x | `c9476dc5d2db62f86bd83135e20657ad5c28d57ce5179299d4d61aa1725b6046` |
| onboarding-2-senior-student | `exec-aece1ed5-bd3e-4496-8657-a16acbddd289.png` | 1122x1402 | 1.9258x | `7e81670a0da2e7d2e9d9afd888ced1783e6186a68b936ff73358e414d8c954cd` |
| onboarding-3-professional | `exec-4d802f22-4c9d-47f7-a4ee-00f475f1888c.png` | 1122x1402 | 1.9258x | `fee224a1219f129bbeeb2f065c1290c12a0e1a182b34f4a4a3c1cb7901fcd768` |
| dashboard-hero-university | `exec-ac60389c-91fb-46ee-a84d-fde75b171333.png` | 1122x1402 | 1.9258x | `65ea5f8c155c063a906fda832cafc6716322f9a15ddec2d4db7a0564900b9a3b` |
| empty-notebook | `exec-a71dec7e-2ccb-4cb0-9c61-822d92a249ed.png` | 1122x1402 | 1.9258x | `261668c601d8f3b0bc66076d6abb0c20a95ba2b19ef13b1decc1477882664954` |
| exam-coach | `exec-ee85bfc8-017a-41c2-89cb-c9ec16bba6ff.png` | 1122x1402 | 1.9258x | `4858857f3f0f8f68cba88bdcb679e079200735ee1f6c0f2963be4fe3b8d8b1e0` |

## Visual review

The six final images were inspected individually and as thumbnails, and shown in this chat before the requested commit. Review covered distinct faces and hairstyles, natural skin and fabric, modern settings, study actions, hands and props, crop safety, and absence of visible words, logos and crests. Page ruling and unlabelled diagrams remain. The phone capture scene uses an image-only preview without camera UI to satisfy the no-text requirement. Asset review does not certify any application integration.

## Exact initial prompts

Each code block below is the complete prompt sent to the built-in imagegen tool. All calls used transparent_background=false and omitted image references.

### 1. onboarding-1-secondary-student

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A bright, well kept contemporary urban secondary school classroom with pale cream walls and a softly blurred empty desk behind.
Subject: A Black Zimbabwean secondary school girl, age 14, deep warm brown skin, round youthful face, softly broad nose, fuller build, neat close cornrows ending at her nape. Plain short-sleeved pale butter school blouse with a simple charcoal skirt, no tie or crest. She is seated writing naturally with her right hand in a ruled exercise book, her left hand rests on the page. Her eyes look down at her own work with a small delighted closed-mouth smile, not toward the camera.
Framing: Three-quarter seated portrait from slightly above desk level, face, forearms and exercise book all visible. Soft daylight from a large classroom window. One pen, one plain textbook closed nearby. Age-appropriate, ordinary and believable.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

### 2. onboarding-2-senior-student

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A contemporary compact home study corner, well kept pale cream wall, light timber desk and a bright window to the side.
Subject: A Black Zimbabwean senior high school boy, age 18, medium umber skin, tall slim build, long angular face with a slightly wide-set gaze, short slender locs loosely falling away from his forehead. Plain honey cotton T-shirt with natural creases. Quiet serious concentration, lips relaxed and unsmiling. He looks down between a smartphone held in his left hand and an open textbook on the desk. Right index finger rests beside an unlabeled diagram on the page. Phone screen angled away from camera so no UI or text is visible.
Framing: Seated mid-shot at desk height, showing his distinct face, phone, textbook, and both hands. Scientific calculator rests face down beside a pen. Warm late afternoon window light, uncluttered contemporary home, no other people.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

### 3. onboarding-3-professional

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A clean contemporary urban office desk at early evening, last warm window light falling from one side, muted blue-grey dusk seen softly beyond window, a simple warm desk lamp providing believable gentle fill.
Subject: A Black Southern African woman, age 38, dark espresso skin, broad cheekbones, oval face, sturdy build, subtle natural under-eye texture, hair entirely covered by a plain softly folded ochre headwrap. Plain cream button-down shirt with sleeves rolled once. She is studying for a professional exam, leaning slightly forward and looking down attentively, with thoughtful gently pursed lips and no smile. Right hand holds a pen above a ruled notebook, left hand rests on an open exam-study textbook of unlabeled diagrams.
Framing: Intimate three-quarter seated portrait with face, hands and study materials clear. An unbranded laptop is open to one side with the back of its lid visible. Cream surfaces, small butter and honey accents, credible office rather than luxury or corporate boardroom.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

### 4. dashboard-hero-university

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A modern university library, bright diffused window light, clean light timber study table, softly blurred shelves of plain unlettered book spines.
Subjects: Exactly two clearly different university students revising together. On the left, a Black Southern African woman age 21, very dark cool brown skin, athletic build, heart-shaped face with a broad nose, a very short natural coily crop. Plain butter-yellow cotton cardigan over cream top. A subtle asymmetric open-mouth smile as she explains a point, eyes on the book. On the right, a South Asian man age 24, light olive-brown skin, slender build, narrow long face, prominent nose, straight thick black hair in a loose side part, clean shaven. Plain cream overshirt. He listens with an intent neutral expression and eyes on her pointing finger.
Interaction: Woman's right index finger points to an unlabeled geometric diagram in a shared open textbook, man's hands rest naturally beside his notebook. Neither faces camera. Distinct faces, no family resemblance, no duplicated expressions.
Framing: Vertical 4:5 medium two-shot that comfortably includes BOTH faces side by side and their hands and the shared book, crop-safe margins. Contemporary international campus feel, warm and friendly without posing.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

### 5. empty-notebook

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A contemporary home study desk in soft natural window light, clean pale cream tabletop, an open textbook and a pen.
Subject: Close photograph of only the two hands and partial forearms of a Black African adult learner with medium rich brown skin, short natural nails, no rings, plain cream cotton sleeves. No face, no body portrait. Hands hold an unbranded smartphone horizontally above an open textbook, photographing the spread. Exactly two anatomically credible hands, realistic grip, camera positioned physically above the page. We see the rear of the phone, its lens facing down toward the pages; no screen UI. Two small unlabeled line drawings on the textbook spread, soft page ruling and paper texture, absolutely no letters or numbers.
Framing: Oblique overhead close-up with phone, hands and textbook forming one clear study action, front and back pages realistically connected at the spine. Natural skin texture, knuckles, slight differences between fingers. Warm cream, butter paper and a tiny honey pen accent, minimal background. No invented interface overlays.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

### 6. exam-coach

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A contemporary urban cafe table near a large window, softly blurred pale cream wall and simple cafe furnishings, warm afternoon window light and gentle natural shadows, no signage or other people.
Subject: A Black African man age 29, warm medium-dark bronze skin, broad stocky build, square face with strong jaw, broad nose, completely shaved bald head, faint natural stubble. Plain soft olive cotton crew-neck shirt with real folds. Focused, slightly furrowed brows, lips slightly parted in concentration, no smile. He is revising notes next to a laptop, looking down at his notebook while holding a pen in his right hand. Left hand rests on the laptop trackpad in a credible working posture.
Framing: Seated three-quarter portrait showing face, shoulders, both hands, laptop and notebook, 50mm natural perspective. Laptop lid has no logo; screen turned away from camera. Notebook contains only faint ruled lines and indistinct nonverbal pencil traces, no letters or digits. Quiet cream and butter cafe backdrop with honey afternoon highlights, professional yet everyday.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

## Exact edit prompts

Each edit used transparent_background=false and the initial image for that scene as referenced_image_paths. The unedited initial outputs remain outside the repository in the generator output folder.

### onboarding-2-senior-student

Input: `C:\Users\Dell\.codex\generated_images\01a186e7-751a-7681-a681-2dc6b32ac06d\exec-ed73176f-fb30-40f5-9361-719b09871e05.png`

```text
Edit this photograph. Preserve the exact boy's identity, short locs, natural skin texture, clothing, focused expression, home study desk, window light and cream/honey color palette. Reframe the photo as a normal 4:5 portrait card, four units wide and five units high, not a tall banner: include his whole hair with breathing room, face, BOTH hands, smartphone and the open textbook together in that wider composition. Remove ALL lettering, tiny printed characters, pseudo-text and digits from every book page and note; retain only blank paper, page ruling and simple unlabelled geometric diagrams. Devices remain unbranded. No text, logos or watermarks anywhere. Natural editorial photographic detail, no smoothing, no artificial skin, no added people. Output one image, aspect ratio 4:5.
```

### onboarding-3-professional

Input: `C:\Users\Dell\.codex\generated_images\01a186e7-751a-7681-a681-2dc6b32ac06d\exec-07b4fd8e-2b7e-4463-8e48-f8f0cce3df00.png`

```text
Edit this photograph. Preserve this exact woman's identity, age in her thirties, ochre headwrap, cream shirt, natural skin texture, focused expression and early-evening office atmosphere with warm desk lamp and dusk window. Reframe into a normal 4:5 portrait card, four units wide and five units high, not a tall banner. Show entire headwrap, her face, BOTH hands, notebook, textbook and part of laptop comfortably within that composition. Remove ALL writing, printed letters, pseudo-text, digits and scribbles from book and notebook pages; keep page ruling and simple unlabelled geometric diagrams only. Keep warm cream/butter/honey palette, credible hands, natural fabric. No text, numbers, logo or watermark anywhere, including keyboard: use blank keycaps. Output one image, aspect ratio 4:5.
```

### dashboard-hero-university

Input: `C:\Users\Dell\.codex\generated_images\01a186e7-751a-7681-a681-2dc6b32ac06d\exec-78c25009-bdd2-48a0-9b3c-fd5f6f0b7204.png`

```text
Edit this photograph. Preserve both exact university students' faces, distinct skin tones and hairstyles, casual clothes, expressions, interaction and natural window-lit modern library. Reframe to a normal 4:5 portrait card, four units wide and five units high, not a tall banner. Widen the view enough that BOTH complete heads have breathing room, especially the man's hair on the right; show both students' faces, hands and shared textbook comfortably within the frame. Remove ALL letters, digits, tiny pseudo-text and writing from every page and book spine. Keep only paper ruling and simple unlabelled geometry diagrams. Laptop if visible must have no logos and blank keycaps. Preserve real skin and fabric texture and cream/butter/honey atmosphere. No text or watermark anywhere. One standalone photographic image, aspect ratio 4:5.
```

### empty-notebook

Input: `C:\Users\Dell\.codex\generated_images\01a186e7-751a-7681-a681-2dc6b32ac06d\exec-40141632-e18d-4126-8786-adf3ae6cb52c.png`

```text
Edit this photograph to correct only the smartphone's photographing orientation. Preserve the same two adult Black African hands, realistic skin, cream sleeves, desk, open textbook, camera angle and warm natural light. The learner is photographing the pages, so the rear camera MUST point DOWN at the book, and the visible side of the phone MUST be the front screen. Replace the currently visible phone back and lenses with a dark glass SCREEN showing a believable live camera preview of the same open book beneath it. No UI overlays at all: no icons, shutter button, letters, digits or logos. Maintain the natural horizontal grip with exactly two hands and correct fingers. All actual pages and preview pages contain only unlabelled geometric drawings and page ruling, no letters or numbers. Preserve the 4:5 portrait composition. Ultra realistic editorial photograph, no plastic skin or rendering.
```

## Batch 2 - existing Taku mark and study photographs

Created: 2026-11-05 (Africa/Harare).

Branch: `codex/art-batch-2`, created from `origin/claude/stoic-carson-k5yg19` at `bb8677b44a1fcd81becd5587d6ba205939399d78`. No merge into main is part of this work.

### Logo decision and fidelity

Takunda confirmed that the existing rounded tile, T and dot in `public/icon.svg` are the Taku family master. The new-logo proposals from 2026-11-04 were rejected and all four files in `art/brand/options/` were deleted at his explicit request. No new logo option was chosen. The approved production colourway is 1: Ink tile, Cream T, Honey dot. `public/icon.svg` remains byte-for-byte unchanged.

Master SHA-256: `de49f10d15f8f75996db44f798bb3e9226964c99fdc9806caa8563f33e100518`.

Geometry is unchanged: 512x512 tile with radius 112; dot centre (372,140), radius 56; T crossbar (128,160), 208x56, radius 28; T stem (204,160), 56x224, radius 28. Original element order is preserved. Only fill colours change in the three colourways. Monochrome versions use the same tile with the exact T and dot as transparent mask cutouts, allowing one-colour printing.

Lexend weight 600 is converted to path outlines in both lockups. Font source: `@fontsource-variable/lexend@5.2.0`, `files/lexend-latin-wght-normal.woff2`. FontTools instantiates and outlines the glyphs. Board labels use Lexend 400/600 and were also outlined before rendering. No font or image is embedded in the SVGs.

The colourway board shows all three colourways and both monochrome versions at 512, 64 and 16 pixels on Cream and Ink. The same-colour monochrome samples intentionally disappear into their matching background; the board labels this. Honey alone on Cream is not used for the wordmark. The board is a direct 2560x4060 RGB render, with no enlargement.

### Brand and public export inventory

| File | Generator / renderer | Native size / geometry | Upscale factor | Bytes |
| --- | --- | --- | --- | ---: |
| `art/brand/taku-mark-ink.svg` | Original SVG; fill substitution | 512x512 vector viewBox | N/A, vector | 319 |
| `art/brand/taku-mark-honey.svg` | Original SVG; fill substitution | 512x512 vector viewBox | N/A, vector | 319 |
| `art/brand/taku-mark-cream.svg` | Original SVG; fill substitution | 512x512 vector viewBox | N/A, vector | 319 |
| `art/brand/mono-ink.svg` | Original geometry; transparent cutout mask | 512x512 vector viewBox | N/A, vector | 640 |
| `art/brand/mono-cream.svg` | Original geometry; transparent cutout mask | 512x512 vector viewBox | N/A, vector | 640 |
| `art/brand/takudzidza-lockup.svg` | Original mark + FontTools Lexend outlines | 980x240 vector viewBox | N/A, vector | 10,665 |
| `art/brand/takudzidza-lockup-stacked.svg` | Original mark + FontTools Lexend outlines | 800x400 vector viewBox | N/A, vector | 10,668 |
| `art/brand/colourways.png` | Chromium via Playwright; Pillow RGB save | 2560x4060 | 1.0x render, or downsampled ICO | 356,076 |
| `public/icon-192.png` | Chromium from colourway 1 | 192x192 RGBA | 1.0x render, or downsampled ICO | 3,329 |
| `public/icon-512.png` | Chromium from colourway 1 | 512x512 RGBA | 1.0x render, or downsampled ICO | 10,128 |
| `public/icon-maskable-512.png` | Chromium from colourway 1 on solid Cream | 512x512 RGB | 1.0x render, or downsampled ICO | 7,032 |
| `public/apple-touch-icon.png` | Chromium from colourway 1 on solid Cream | 180x180 RGB, no transparency | 1.0x render, or downsampled ICO | 3,245 |
| `public/favicon.ico` | Pillow from the 512 px colourway 1 PNG | 16x16, 32x32 and 48x48 frames | 1.0x render, or downsampled ICO | 3,307 |

Maskable export: the exact mark is uniformly scaled to 64 percent (327.68 px) and translated to (92.16,92.16) on an opaque Cream background. All non-background pixels are within radius 202.294 px of the image centre, inside the 204.8 px radius of the 80 percent safe circle. The source geometry and internal proportions are not changed.

### Photographic generation and export

All 16 initial photographs used the built-in imagegen tool with `transparent_background=false`, no image references, and the exact prompt blocks from `art/ASSETS.md` reproduced below. All identities are synthetic. No Amai Learn, Takubasa or Batch 1 portrait was used as an identity reference.

Generation order: `style-locked-in`, `style-cook-mode`, `style-calm`, `tile-ask`, `tile-scroll`, `empty-flashcards`, `landing-form1`, `empty-quiz`, `audio-overview`, `class-share-teacher`, `guardian-consent`, `maths-hints`, `study-planner`, `offline-downloads`, `study-group-later`, `landing-hero-wide`.

Seven scenes received targeted imagegen edits to remove pseudo-text, including a wider crop for `study-group-later`. Each edit used only its own initial source as the reference. Exact edit prompts and source hashes are recorded below. Original and edited native sources remain outside the repo in the built-in generator folder.

All portrait sources are 1122x1402; the wide source is 1672x941. PNG masters are enlarged exports, not native 4K photographs. Export uses Pillow Lanczos, centred aspect-ratio fit, RGB, and no export-stage sharpening, skin retouching or recolouring. WebP uses method 6 and the highest integer quality from 95 down that stays strictly below its limit. Bytes are exact; KB means 1,000 bytes.

### Photo file inventory

| File | Dimensions | Bytes | WebP quality | Byte limit |
| --- | --- | ---: | ---: | ---: |
| `art/assets/style-locked-in.png` | 2160x2700 | 4,923,494 | - | - |
| `art/assets/style-locked-in.webp` | 1080x1350 | 170,560 | 92 | 200000 |
| `art/assets/style-cook-mode.png` | 2160x2700 | 5,262,918 | - | - |
| `art/assets/style-cook-mode.webp` | 1080x1350 | 186,390 | 91 | 200000 |
| `art/assets/style-calm.png` | 2160x2700 | 5,222,521 | - | - |
| `art/assets/style-calm.webp` | 1080x1350 | 187,716 | 91 | 200000 |
| `art/assets/tile-ask.png` | 2160x2700 | 4,679,208 | - | - |
| `art/assets/tile-ask.webp` | 1080x1350 | 179,252 | 93 | 200000 |
| `art/assets/tile-scroll.png` | 2160x2700 | 5,578,459 | - | - |
| `art/assets/tile-scroll.webp` | 1080x1350 | 185,884 | 89 | 200000 |
| `art/assets/empty-flashcards.png` | 2160x2700 | 5,053,678 | - | - |
| `art/assets/empty-flashcards.webp` | 1080x1350 | 191,578 | 91 | 200000 |
| `art/assets/landing-form1.png` | 2160x2700 | 4,708,496 | - | - |
| `art/assets/landing-form1.webp` | 1080x1350 | 190,704 | 94 | 200000 |
| `art/assets/empty-quiz.png` | 2160x2700 | 4,108,441 | - | - |
| `art/assets/empty-quiz.webp` | 1080x1350 | 172,838 | 95 | 200000 |
| `art/assets/audio-overview.png` | 2160x2700 | 5,342,906 | - | - |
| `art/assets/audio-overview.webp` | 1080x1350 | 199,510 | 91 | 200000 |
| `art/assets/class-share-teacher.png` | 2160x2700 | 4,294,463 | - | - |
| `art/assets/class-share-teacher.webp` | 1080x1350 | 185,764 | 95 | 200000 |
| `art/assets/guardian-consent.png` | 2160x2700 | 5,168,152 | - | - |
| `art/assets/guardian-consent.webp` | 1080x1350 | 187,006 | 91 | 200000 |
| `art/assets/maths-hints.png` | 2160x2700 | 5,302,511 | - | - |
| `art/assets/maths-hints.webp` | 1080x1350 | 198,754 | 92 | 200000 |
| `art/assets/study-planner.png` | 2160x2700 | 5,337,092 | - | - |
| `art/assets/study-planner.webp` | 1080x1350 | 197,152 | 92 | 200000 |
| `art/assets/offline-downloads.png` | 2160x2700 | 5,123,727 | - | - |
| `art/assets/offline-downloads.webp` | 1080x1350 | 181,750 | 92 | 200000 |
| `art/assets/study-group-later.png` | 2160x2700 | 7,035,759 | - | - |
| `art/assets/study-group-later.webp` | 1080x1350 | 198,772 | 80 | 200000 |
| `art/assets/landing-hero-wide.png` | 3840x2160 | 5,181,255 | - | - |
| `art/assets/landing-hero-wide.webp` | 1920x1080 | 242,176 | 94 | 250000 |
| `art/assets/og-default.webp` | 1200x630 | 116,948 | 94 | 120000 |

The social image is a full-width, top-aligned 1.91:1 crop from the final `landing-hero-wide.png` master, downsampled directly to 1200x630. The left third above the desk remains free of the learner and study props for code-added text. No text is baked into any photograph or the social crop.

### Final source provenance

Generator for every row: built-in imagegen. Scaling is to the PNG master.

| Asset | Final native source filename | Native dimensions | Scale to master | Source SHA-256 |
| --- | --- | --- | ---: | --- |
| style-locked-in | `exec-6563fe23-8a4c-4356-9d86-81e729c194be.png` | 1122x1402 | 1.925820x | `6ffabc899a36102401f2c1e2c1cbd18375c6e58444218fd0efb0eb6630def712` |
| style-cook-mode | `exec-b3de4fd7-e239-4898-abfe-e03bd35f710a.png` | 1122x1402 | 1.925820x | `105eec18ffedfdceabdfdd7411070afd047bb5211f1ad5fb50318734ebd9dd70` |
| style-calm | `exec-21b93037-6d0d-493c-a88e-eae1b08c3aa7.png` | 1122x1402 | 1.925820x | `24c927ee5022015d6fba4beca44e0154f6ac06f9420fd1bc22361cd8b41837b2` |
| tile-ask | `exec-008e4eb2-304f-407e-b3a8-1b7d593c9188.png` | 1122x1402 | 1.925820x | `d09a00349837086cf5146db023b0eebd2f9121e436eac7f3f0c3ad5834229b51` |
| tile-scroll | `exec-802e4bc6-7096-4ee0-af26-beb981551768.png` | 1122x1402 | 1.925820x | `6d2f10d19f4f85f26e07a56d63c6547c92bb487e386ac65720c2a389feda8187` |
| empty-flashcards | `exec-ace9359f-8c2e-432c-a0fd-70a238ea1113.png` | 1122x1402 | 1.925820x | `8f433986ccbe96a0e57d69dca12c995cc0f2fec8311f735259a357bb3f2ee89c` |
| landing-form1 | `exec-9c2ed523-5e6b-400d-a636-2635b4bc90b5.png` | 1122x1402 | 1.925820x | `b128ba27227543ad52bf38cd869bcfe2cb5dd7ddad0b07b60a432b7d900852d8` |
| empty-quiz | `exec-037743e5-64b1-4542-b79c-970330561099.png` | 1122x1402 | 1.925820x | `ad52d5515d70aaca358af1d270ac6e6f34102b204c9897e2bc929cbab7540876` |
| audio-overview | `exec-d3d3fa17-c068-4e2f-8a52-1ea34b08c547.png` | 1122x1402 | 1.925820x | `b0415c58b21a74ceb25e9f52516b3f80959a348c9e4b5912dadc6022771365fc` |
| class-share-teacher | `exec-9d3041e4-0ab3-4ed8-8081-6e9e1f9ca451.png` | 1122x1402 | 1.925820x | `c1f2017cf7a14ff47e724e1c1d0782ed12c5bc04d293b2015aa43832a3715379` |
| guardian-consent | `exec-e9f8f6ad-913e-4158-bed7-3a3195fdc6c7.png` | 1122x1402 | 1.925820x | `e3e54eb596b2056588b040f4abf6a841bd0a5c7cfc217b1c0b469313b11407b2` |
| maths-hints | `exec-a5844326-92a1-4378-86c1-78eb022529c9.png` | 1122x1402 | 1.925820x | `41b8677d9625104a48306f8668370e33d7da0954808f5bdc44f08138f3fea8e0` |
| study-planner | `exec-16de6c20-eaa7-46c5-89da-c6b364d37d5d.png` | 1122x1402 | 1.925820x | `63113480f3f8704e551fe8f71f4cd917b72a5a641a69e9415768d14bfdb38d7b` |
| offline-downloads | `exec-0978bf87-4378-443c-a14b-878f89062bea.png` | 1122x1402 | 1.925820x | `dfd93e51839d79b52d4a7778af3c72efad108cb93c3ca37d789afedf6375bf42` |
| study-group-later | `exec-67ac3b5c-c2d3-4fe0-a399-32c02db36f23.png` | 1122x1402 | 1.925820x | `7418a79f40675a512b959ffe934215c596d449324f6fdefb6edfa19f67b65062` |
| landing-hero-wide | `exec-6a498547-f01b-4f29-a73f-8be5b965ac9d.png` | 1672x941 | 2.296651x | `04b64f169d1252ed9dd8e87ef01edf9e0a6e787191381bb52309838d961fe4dd` |

Native source directory: `C:\Users\Dell\.codex\generated_images\01a1a88a-d3d3-78a0-9fa9-a101a4ed1f0e`.

### Visual and technical verification

The final photographs were inspected individually and together as a contact sheet for face repetition, hairstyles, ages, expressions, realistic hands and object contact, modern settings, warm lighting, crop margins, and visible text/branding. Suspect paper areas were checked at native pixel size and repaired before export. The final WebP contact sheet and social crop were shown in chat before commit. This is a visual asset review, not application or production certification.

Checks performed: PNG/WebP decoding, exact dimensions and RGB mode; all 17 WebPs below their strict byte limits; highest-quality search recorded, including the failing next quality where applicable; source hashes; unchanged original icon SVG; original geometry in all three colourways; outlined wordmarks; Apple icon opacity; ICO frame sizes; maskable safe circle; absence of rejected option files; git whitespace and staged-path checks.

No changes under `src/` or `convex/`. The original six Batch 1 photographs and their derivatives remain unchanged. The two existing untracked `docs/` files remain outside this commit. No application build, tests, E2E, deployment or app integration was performed for this asset-only task. No requested deliverable is omitted.

### Export hashes

| File | SHA-256 |
| --- | --- |
| `art/brand/taku-mark-ink.svg` | `717d9202911ca5cfa6bcaed56602f090f0d58b45ce9d6546b6a0442445577d89` |
| `art/brand/taku-mark-honey.svg` | `f9ea1715febf4db2d8be8c01175be370eedb5ffa9702aed0b8166bbb9c5a6f1f` |
| `art/brand/taku-mark-cream.svg` | `de6c00727af30ee55872fa30f7a9916d62412a95868fc960baefa3e71073b702` |
| `art/brand/mono-ink.svg` | `638fadc0a91d777deaa59794ff4e2d2060a489f1c20367a0141fd34e89fcc759` |
| `art/brand/mono-cream.svg` | `ff62ba780065d33b2e2082840fe40dc8aadfd3cc110a57d219c9b8589b127cbf` |
| `art/brand/takudzidza-lockup.svg` | `d45e3064c46ea784b97e52c7cc85614b49b51e885061c9f10ecc92ca17211b5e` |
| `art/brand/takudzidza-lockup-stacked.svg` | `69e22727c7edc3659534bd0e061851316c9523a18df5c8a99c9bcf925092e597` |
| `art/brand/colourways.png` | `45c962323a1af77b6df00be343d2b595aa58d22698bdb50140290cdf8ea86c52` |
| `public/icon-192.png` | `1e15fa1edfb972aef95d00932172316eaa868d1daa1889d61fa442da9d22e3f1` |
| `public/icon-512.png` | `1314c8834137e6569cc83055bb7cbda0d63bd24647f2c4da6e3f7711dc5926a0` |
| `public/icon-maskable-512.png` | `02fb6f936b97c5d756d55eb670ba4762c65b901273954279a2a10aeac7bdc922` |
| `public/apple-touch-icon.png` | `ac75ca2cec3ee7c647fcee2e8b1fe35fdf973143d8c4183d7e790583e539fe50` |
| `public/favicon.ico` | `53050ae834a7732e52b6ea188d2af5a65c4d182a6064ba882d977b9570631dae` |
| `art/assets/style-locked-in.png` | `9ce5c9752ec7700a1dab509bc5a6c490b8141d24aa746f0ae4fc3cfc8a34b49b` |
| `art/assets/style-locked-in.webp` | `85302fb0228090f04a7a080bba32e92ec3e02feb1972caea369aea6ebd56933a` |
| `art/assets/style-cook-mode.png` | `16945686de3b591ac40cc48c32181fa2ac7bad1b9ce7c76b322eeb0e782640ca` |
| `art/assets/style-cook-mode.webp` | `2cbf1410e888d89052e03d5143c47aef2b9680cc231e0c74b45a1fa9ea138082` |
| `art/assets/style-calm.png` | `6592f17c4413c6120b77619714e2e97b04004a73d3f635e549d72636fbfdc3ce` |
| `art/assets/style-calm.webp` | `0cce755b7bacb40f63cc1782a63bf435b5abc365fa47884db5583a50528228e7` |
| `art/assets/tile-ask.png` | `82942e8d9226b4521d3c0c3bd4a81784f1b40e403bac2eb15acb2bc3668cd49a` |
| `art/assets/tile-ask.webp` | `7ba3c0855ba41754275eb6d9a157fef699ed097d95d80ee1d28782d8291c9f5f` |
| `art/assets/tile-scroll.png` | `dd1841bf96af4a097656b107e85b49625c5ae5932007ab054388fea421612b28` |
| `art/assets/tile-scroll.webp` | `ec9713110e15abf7686caa2fce44fc863857e53ad176b878f6a6f71cfdd1c8c1` |
| `art/assets/empty-flashcards.png` | `c8f0e52343fb528ce91d266dedce330befc3fb439e5b235f1222f4e64aa08fc1` |
| `art/assets/empty-flashcards.webp` | `fffdd8ba9c60067e783bdc33cbaa1427d3596afac9327924d3a650712004115c` |
| `art/assets/landing-form1.png` | `de2e25022e8f52fca5c9314c914433e6eaaa8ec7f82f77035fb2c851f804a585` |
| `art/assets/landing-form1.webp` | `1fee2102a1c0ac701a6aa12a8655d573bb95dff2e0619aa301a9de4927f4ff60` |
| `art/assets/empty-quiz.png` | `15328a1393d47b7ef5e63e29a6ee5d0c2c3de63dec4d1ea68bd95b1040f20a6e` |
| `art/assets/empty-quiz.webp` | `9ec881c4e05091594dc2d42b7d65c09a17f6eab2d83189850d7f0e96aba0a8bf` |
| `art/assets/audio-overview.png` | `8d5935d9804ab944fdaad4ff0b94c1e93f8c7e7a0ff8dc73fa7d3c1f2f35bfb3` |
| `art/assets/audio-overview.webp` | `44aa71b7ef91bdd49e7ddd87924ea8bec99c9fe63968afe37adecbe029045c31` |
| `art/assets/class-share-teacher.png` | `0f41db3889a08c493c0a57db67ac33cef55877c3091b0ab47abd453cf15b6c6a` |
| `art/assets/class-share-teacher.webp` | `3d0b3dc76a4186cee78bf368a1d08520704830ed070aa520d0dc8b9b1a662444` |
| `art/assets/guardian-consent.png` | `89f6e3cb706bfbb3fce1e4bf39021500d603cc081be80db40c71978462b9a258` |
| `art/assets/guardian-consent.webp` | `3ffbdb1e6980d1426d072ab40f5e98ba209ed04e86907367d2efb5435f21ede9` |
| `art/assets/maths-hints.png` | `712c39284e55c2c01d3d0b46777ae3d0099d6984e0a8886b80f53f776d290668` |
| `art/assets/maths-hints.webp` | `a5033d28fed41dc335071bc9b156a9a1e1512f7fd2b4321298382e2d79685d29` |
| `art/assets/study-planner.png` | `897c69b1f632e624882ab03ec0378a69b846005c64e8a8818253ffa7782a4d63` |
| `art/assets/study-planner.webp` | `26050462a1f22fd4778a9a19daa600500054ca83ac9e9627b5d16564c4ec21db` |
| `art/assets/offline-downloads.png` | `ee5108d15f98cd88d7658d930a6fa5ac0cfb34f16c9e9a764b306f5765244b8d` |
| `art/assets/offline-downloads.webp` | `6c10c0f68a9469adf5a81f0ae87ec0a673dfb71f55fff23833d3167b836bcfd2` |
| `art/assets/study-group-later.png` | `8a521a3ef932cb3495492ce7c9a60e539887c4847fc5300523da6a0d89469ddd` |
| `art/assets/study-group-later.webp` | `2f8557634f14c4a9c2ea94a420caad1944cfea3fae264a905dbcfbeea90fddf8` |
| `art/assets/landing-hero-wide.png` | `72edd2cf7c267fa14483f1b12c5bff0f20ae4c8150d590d14469b57cb263558a` |
| `art/assets/landing-hero-wide.webp` | `566f6dd51ccd0a2c7f098aedbb6d3ba80fc62a3a6aa7b25b2c88f47ecc53145b` |
| `art/assets/og-default.webp` | `5ddb66d4798bc71d43fc2cca8fea52d2b27b588a239500b9ae8d5cdc602ce8e5` |

`art/CODEX_NOTES.md` is the accompanying provenance file. Together with the 46 exported assets above, this batch changes 47 repository files.

### Exact initial prompts

The following are the exact `art/ASSETS.md` prompts, in generation order. All calls used `transparent_background=false` and omitted image references.

#### 1. style-locked-in

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A minimal contemporary study desk in clean morning daylight, pale cream wall, nothing else on the desk but a closed plain textbook, one pen and a glass of water.
Subject: A Black Zimbabwean woman, age 27, deep brown skin, angular face, slim build, short tapered natural hair. Plain charcoal knit top. She reads a printed set of notes held in both hands, completely absorbed, neutral focused expression, posture upright and still.
Framing: Seated three-quarter portrait, face and both hands clear, calm uncluttered negative space. Notes show only ruling and indistinct tonal marks.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

#### 2. style-cook-mode

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A bright contemporary teenage bedroom study corner in vivid afternoon sun, butter yellow wall, a honey coloured beanbag, a few plain coloured sticky notes with no writing on the wall.
Subject: A Black Zimbabwean boy, age 15, warm brown skin, oval face, lanky build, short twists. Plain honey yellow hoodie, simple unbranded over-ear headphones around his neck. He holds an unbranded phone in one hand, screen turned away, and grins with genuine surprise as if he just got a quiz question right, other hand raised in a small celebratory fist.
Framing: Seated waist up portrait with energy and movement, face and both hands clear, warm saturated but natural colour.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

#### 3. style-calm

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A quiet contemporary living room corner at golden hour, soft window light, pale cream sofa, a small plant and a ceramic mug out of focus.
Subject: A Black Southern African man, age 31, medium brown skin, round face, medium build, neatly trimmed beard, close cropped hair. Plain sage green cotton shirt. He sits relaxed with a tablet resting on his knee, screen turned away, reading with a gentle unhurried expression.
Framing: Seated three-quarter portrait, face and hands clear, soft low contrast light, lots of calm space.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

#### 4. tile-ask

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A tidy contemporary bedroom desk at night, warm desk lamp pool of light, dark blue window behind, pale cream wall, a closed plain textbook and a mug.
Subject: A Black Zimbabwean secondary school girl, age 16, medium brown skin, oval face, slim build, long box braids tied up. Plain cream hoodie. She types a question on an unbranded phone held in both hands, screen turned away, with a small curious smile and raised eyebrows, as if the answer just clicked.
Framing: Seated three-quarter portrait, face and both hands clear, warm lamp light on her face, cosy and focused.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

#### 5. tile-scroll

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A bright modern living room sofa in afternoon sun, butter yellow cushions, honey throw, softly blurred plants.
Subject: A Black Zimbabwean man, age 19, deep brown skin, round face, medium build, short twists, plain honey T-shirt. He lies back casually on the sofa scrolling an unbranded phone held above him with one hand, screen turned away, a relaxed grin of recognition as if he just remembered a fact, other arm behind his head.
Framing: Waist up from slightly above, face and phone hand clear, relaxed and energetic, warm saturated natural colour.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

#### 6. empty-flashcards

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A contemporary university residence desk by a bright window, pale cream wall, light timber surface.
Subject: A Black Zimbabwean university student, age 20, warm mid brown skin, oval face, slim build, medium length twists tied back loosely. Plain sage green cotton sweatshirt. She holds a small stack of blank cream index cards in her left hand and turns one over with her right, a calm half smile of recall, eyes on the card, not the camera.
Framing: Seated three-quarter portrait at desk height, face, both hands and the cards clear. A closed unbranded laptop and a pen on the desk. Index cards are blank or show only soft indistinct pencil traces.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

#### 7. landing-form1

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A modern urban school corridor with large windows, pale cream walls, soft daylight, blurred lockers with no text.
Subject: A Black Zimbabwean boy, age 13, warm brown skin, round face, slim build, short neat hair, plain white short-sleeved school shirt and grey trousers, no tie or crest, a backpack on one shoulder. He holds an open plain exercise book against his chest with one arm and laughs naturally at something out of frame.
Framing: Standing waist up portrait, face clear, joyful and natural, crop safe for an arch shaped frame.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

#### 8. empty-quiz

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A quiet modern school library study carrel with soft daylight, pale cream partition, blurred plain shelves.
Subject: A Black Zimbabwean secondary school boy, age 16, deep brown skin, round face, stocky build, short neat high top fade. Plain white short-sleeved school shirt with no tie or crest. He is mid answer in a timed practice, pencil in right hand, left hand holding the page flat, brows lightly drawn in concentration, lips closed.
Framing: Three-quarter seated portrait from slightly above the desk, face, hands and answer sheet visible. A plain wristwatch on the desk face down. The answer sheet shows only ruling and indistinct pencil traces.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

#### 9. audio-overview

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A clean modern city bus shelter at mid morning, softly blurred contemporary buildings and trees, cream and butter tones, no signage, no adverts, no vehicles in focus.
Subject: A Black Southern African woman, age 24, light brown skin, long face, tall build, shoulder length braids. Plain honey cotton shirt, small backpack strap on one shoulder. She listens through simple unbranded wired earphones, eyes resting down and to the side, a relaxed focused expression, phone held loosely at waist height with screen turned away.
Framing: Standing waist up portrait, face, earphones and phone hand clear, shallow depth of field.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

#### 10. class-share-teacher

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A bright contemporary seminar room, pale cream walls, light timber tables, large window, softly blurred chairs.
Subject: A Black Zimbabwean man, age 45, dark brown skin, broad face, short greying hair and a neat short beard, medium build. Plain cream long sleeved shirt with sleeves folded once. He is a lecturer holding an unbranded tablet in his left hand, screen turned away, and gesturing gently with his right hand as he explains to students out of frame, warm attentive expression, mouth slightly open mid sentence.
Framing: Standing three-quarter portrait, face and both hands clear. Two blurred student shoulders at frame edge, no readable boards or screens.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

#### 11. guardian-consent

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A contemporary urban family kitchen table in soft afternoon window light, pale cream walls, simple tidy shelves out of focus.
Subjects: Exactly two people. A Black Zimbabwean mother, age 42, medium dark brown skin, oval face, full build, natural hair in a low bun, plain butter yellow blouse. Beside her, her son, age 13, warm brown skin, slim build, short cropped hair, plain grey T-shirt. They look together at an unbranded phone she holds, screen angled away from camera. She has a calm reassuring expression; he looks hopeful. Clearly related in skin tone and features, not duplicated faces.
Framing: Seated medium two-shot including both faces, her hands and the phone, crop safe margins.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

#### 12. maths-hints

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A contemporary home study desk in soft daylight, pale cream tabletop, cream wall.
Subject: Close photograph of only the hands and partial forearms of a Black African secondary learner with deep brown skin, short nails, plain white cotton sleeves. Right hand holds a pencil drawing a simple unlabeled triangle with a compass resting nearby; left hand steadies a squared paper exercise book. Exactly two anatomically credible hands. No face.
Framing: Oblique overhead close-up. A geometry set with plain protractor and ruler with no markings or numbers, a closed plain textbook. Paper shows only grid lines and unlabeled geometric shapes, absolutely no letters or numbers.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

#### 13. study-planner

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A modern co-working space corner in early morning light, pale cream wall, light timber desk, a small plant out of focus.
Subject: A Black Zimbabwean man, age 33, medium brown skin, narrow face, lean build, short neat locs tied back, thin metal frame glasses. Plain olive overshirt over a cream T-shirt. He is an adult studying for a professional accounting exam, writing in a blank week planner with only ruled boxes, an unbranded calculator face down beside it, thoughtful calm expression, eyes on the planner.
Framing: Seated three-quarter portrait, face, both hands, planner and calculator clear. Planner boxes empty or with indistinct pencil marks only.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

#### 14. offline-downloads

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A tidy modern bedroom study nook at dusk, warm desk lamp light mixed with blue window light, pale cream wall, bedspread out of focus.
Subject: A Black Zimbabwean secondary school girl, age 17, dark brown skin, heart shaped face, slim build, short natural afro. Plain butter yellow hoodie. She sits cross legged on a chair reading from an unbranded phone held in both hands, screen angled away, an open plain textbook on her knee, focused and calm.
Framing: Seated three-quarter portrait, face, both hands, phone and book visible, gentle lamp glow.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

#### 15. study-group-later

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, keep faces and important hands clear of edges. No graphic border.
Scene: A modern university campus courtyard table in open shade, pale stone and cream walls, soft green foliage blurred behind.
Subjects: Exactly three different students revising together. A Black Zimbabwean woman age 22, dark brown skin, round face, long box braids, plain cream shirt; a Black Zimbabwean man age 23, light brown skin, long face, short twists, plain sage T-shirt; a Southern African woman of mixed heritage age 21, olive brown skin, curly shoulder length hair, plain honey cardigan. One points to a shared unlabeled diagram in an open book, the others listen. Nobody looks at the camera.
Framing: Medium group shot including all three faces and the shared book, crop safe margins, distinct faces with no duplicated expressions.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

#### 16. landing-hero-wide

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. Horizontal 16:9 composition, target 3840x2160 pixels, subject placed in the right third leaving calm empty space on the left for page text, finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a wide banner crop, keep faces and important hands clear of edges. No graphic border.
Scene: A modern university library reading area with large windows, bright diffused light, light timber tables, softly blurred shelves of plain unlettered spines.
Subject: A Black Zimbabwean woman, age 19, warm deep brown skin, oval face, slim build, short natural coils with a small side part. Plain cream cotton shirt. She reads from an open textbook of unlabeled diagrams with an unbranded phone resting beside it, screen down, quiet confident half smile, eyes on the page.
Framing: Seated mid shot in the right third of the frame, face and both hands clear, the left two thirds calm window light and soft interior for headline text.
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact.
```

### Exact edit prompts

Each call used `transparent_background=false` and its own initial native source as the sole `referenced_image_paths` entry.

#### tile-scroll

Input: `C:\Users\Dell\.codex\generated_images\01a1a88a-d3d3-78a0-9fa9-a101a4ed1f0e\exec-bee15de6-6090-4790-96b1-362abb411ab9.png`.

Input SHA-256: `34afc5f2bf3cb640a4a777f2d4ae51e5a0b7c418bde364f591b598fa75c3b829`.

```text
Edit this exact photograph. Preserve the exact man's identity, short twists, relaxed grin, pose on the cream sofa, honey T-shirt, phone, hands, furnishings, warm light and 4:5 crop. Change only the visible paper surfaces: remove EVERY printed paragraph, tiny glyph, handwritten mark, mathematical label, digit and pseudo-text from the open textbook AND the spiral notebook at the bottom of the image. Make these pages plain blank cream paper with fine page ruling and at most two simple unlabelled geometric line drawings. No grey blocks or paragraph-like texture. Retain realistic paper fibres, page curvature and shadows. No text, letters, digits or logos anywhere, including blurred areas. Keep all other photographic details unchanged. Output one standalone 4:5 photograph.
```

#### empty-flashcards

Input: `C:\Users\Dell\.codex\generated_images\01a1a88a-d3d3-78a0-9fa9-a101a4ed1f0e\exec-a0c5585c-c0a8-4c19-9d0f-bc0c5c53e51e.png`.

Input SHA-256: `df3eb625625670713f1b4b47375f375c623c3cc5b16843d31a5fee719998be43`.

```text
Edit this exact photograph. Preserve the exact university woman's identity, tied-back twists, sage sweatshirt, expression, both hands turning blank index cards, laptop, desk, window light and 4:5 framing. Change only the paper surfaces at the bottom: remove EVERY printed paragraph, tiny glyph, handwritten mark, label, digit and pseudo-text from the open book AND spiral notebook. These pages must become plain cream paper with fine ruling and at most two simple unlabelled geometric line drawings. No grey blocks, no paragraph-like texture, no words or mathematical labels even blurred. Keep the index cards completely blank. Retain natural paper texture, book curvature and shadows. No text, numbers, logos or watermark anywhere. Everything else stays photographic and unchanged. Output one standalone 4:5 photograph.
```

#### class-share-teacher

Input: `C:\Users\Dell\.codex\generated_images\01a1a88a-d3d3-78a0-9fa9-a101a4ed1f0e\exec-8a2ea213-3026-403a-a592-83cec535f548.png`.

Input SHA-256: `2d52ca5e21881f93ac8078bc377a0bd3593d83957cf080543d3220b5a8c8dd6e`.

```text
Edit this exact photograph. Preserve the lecturer's exact identity, grey hair and beard, cream shirt, gesture, tablet, realistic hands, two blurred foreground students, seminar room, light and 4:5 framing. Change ONLY the open book and notebook visible along the bottom edge. Remove all printed paragraphs, labels beside diagrams, mathematical digits, letters, tiny glyphs and pseudo-text. Replace them with plain cream paper and fine ruling, plus at most one simple triangle and one circle with absolutely no labels or tick marks. Retain the book's curvature, paper texture, shadows and position. The tablet remains unbranded with screen facing away. No text or numbers anywhere, including blurry regions. Keep every other detail unchanged. Output one standalone realistic 4:5 photograph.
```

#### guardian-consent

Input: `C:\Users\Dell\.codex\generated_images\01a1a88a-d3d3-78a0-9fa9-a101a4ed1f0e\exec-7a1c516f-1c15-4a8e-928c-f5bbc22e27e4.png`.

Input SHA-256: `33b5699e61661fba45a2672cc86d11e344ec829e6ccfe57574844e19b45e3f4c`.

```text
Edit this exact photograph. Preserve the exact mother and son's faces, ages, hairstyles, clothes, calm expressions, phone, hands, positions, kitchen table and warm light. Change ONLY the visible open textbook and notebook. Remove EVERY printed paragraph, handwritten mark, tiny glyph, mathematical label, digit and pseudo-text from all their pages. Make the pages plain cream paper with fine ruling and at most three simple unlabelled geometric outlines: a triangle, a rectangle and a circle, without any labels, points, numerals, ticks or paragraph-like grey marks. Keep natural page curvature, paper fibres and shadows. No text or letters anywhere, even blurred. All other photographic details stay unchanged. One standalone 4:5 photograph.
```

#### empty-quiz

Input: `C:\Users\Dell\.codex\generated_images\01a1a88a-d3d3-78a0-9fa9-a101a4ed1f0e\exec-f544fa84-2cf2-4bc2-83e8-4713dac123fe.png`.

Input SHA-256: `d20614216acd298c66b55d587e23708e8d33afebd835a28513900f3c945d86a9`.

```text
Edit this exact photograph. Preserve the exact schoolboy's identity, round face, high-top fade, plain white shirt, focused expression, both hands, pencil grip, desk, face-down wristwatch, library and framing. Change only all visible paper surfaces. Remove every handwritten word-like squiggle, glyph, printed paragraph, letter, digit, label or pseudo-text from the answer sheet and foreground open book. The answer sheet has just fine ruling and a few faint simple nonverbal pencil lines, no handwriting. The open book has fine ruling and two unlabelled triangle or circle outlines only, with no ticks or labels. Retain natural paper texture, shading and the pencil touching the sheet. No text anywhere, even blurred. Everything else unchanged. One realistic 4:5 photograph.
```

#### study-group-later

Input: `C:\Users\Dell\.codex\generated_images\01a1a88a-d3d3-78a0-9fa9-a101a4ed1f0e\exec-723c8745-d9f1-4b95-84c8-209873222f7e.png`.

Input SHA-256: `f26f79ee6c7dc3109ce347b09fd2c05df77cd813c96f814a7c71d85e35a76ca6`.

```text
Edit this exact photograph. Preserve all THREE exact students' identities, distinct skin tones and hairstyles, clothes, expressions, shared diagram discussion, natural hands, warm campus courtyard light and realistic editorial style. Widen the view by about 15 percent while keeping a 4:5 vertical photograph: show each complete head and hairstyle with at least five percent image-width breathing room between the outer heads and each side edge. Keep all three faces together and the pointing hand and shared open book comfortably within the central crop-safe area. Include slightly more courtyard and table as needed. Clean every book and notebook page of ALL print, handwritten marks, tiny glyphs, paragraph-like texture, labels and digits. Pages contain plain fine ruling and at most two simple unlabelled triangle/circle line drawings, no symbols or lettering. No text, logos, numbers or watermark anywhere, even blurred. No added people. One standalone 4:5 photograph.
```

#### landing-hero-wide

Input: `C:\Users\Dell\.codex\generated_images\01a1a88a-d3d3-78a0-9fa9-a101a4ed1f0e\exec-a46d1a60-3b2c-4ea1-8b39-1112209de4ca.png`.

Input SHA-256: `af7d2bb47ea20894ff4f6d278942e2ebf66a2eb08933a671d2a3030ae0965a7f`.

```text
Edit this exact wide photograph. Preserve this exact university woman's identity, short natural coils, cream shirt, quiet half smile, both hands, phone face down, modern library, light and horizontal 16:9 framing. Keep her in the RIGHT THIRD and retain the existing calm empty LEFT side for later code-added text, especially the whole left third. Change ONLY the visible book and notebook pages: remove every printed paragraph, handwritten mark, tiny glyph, mathematical label, digit and pseudo-text. Replace these with blank cream paper, fine ruling and at most two unlabelled simple geometric line drawings such as a triangle and circle. No paragraph-like grey texture, labels or numerals anywhere, even blurred. Retain paper curvature, fibres, natural shadows and all other photographic details. Absolutely no text, logo, watermark or UI. One standalone horizontal 16:9 photograph.
```


## Batch 3 - background textures

Created: 2026-11-05 (Africa/Harare).

Branch: `codex/textures`, created from `main` at `bc5cc40`. No merge into main is part of this work.

### Generator

Procedural, not an image model. Python 3.13, NumPy 2.4.6, SciPy 1.17.1, Pillow 12.2.0. The script below ran from a temporary folder outside the repo and only its output files are committed. It is deterministic: a second run produced byte-identical WebPs. Script SHA-256: `7ebd3331c3070983556ceb67b66f7231b585542206b4d654b45da2e68e570700`.

There are no PNG masters, because the brief asked for WebP only and the script regenerates every file. All sizes are native renders with no upscaling. WebP uses method 6 and the highest integer quality from 95 down that stays strictly below the limit; every file passed at 95, so no quality was traded for size. KB means 1,000 bytes.

The board was rendered in Chromium 145 through Playwright, so the WebPs are decoded and tiled as a browser does. Board type is Lexend 400, 500 and 600. The board is the only file containing text.

### File inventory

| File | Use | Dimensions | Bytes | Byte limit | WebP quality | SHA-256 |
| --- | --- | --- | ---: | ---: | ---: | --- |
| `art/textures/paper-grain.webp` | Seamless tile | 1024x1024 | 60,604 | 80,000 | 95 | `4406626ee4407ccadd63e496263be79b505f9c6b6ad34180a1833fdb5536cff7` |
| `art/textures/honey-waves.webp` | Desktop | 2560x1600 | 146,644 | 200,000 | 95 | `a1cc94cd0951d74206ac3734b909b4e52d1ccb5f5279f4d8b8810dd16db38ab1` |
| `art/textures/honey-waves-phone.webp` | Phone | 1080x2340 | 92,668 | 150,000 | 95 | `ec2879af96c330d4401a0dea66cf0018b10c71c102462b41e3d33b28cd462be9` |
| `art/textures/honey-waves-dark.webp` | Dark desktop | 2560x1600 | 112,654 | 200,000 | 95 | `ed4c5ab87348758d7017fbcf061192d93d6df3eb4b0d38111d5b71c1ff8b35d7` |
| `art/textures/honey-waves-dark-phone.webp` | Dark phone | 1080x2340 | 71,238 | 150,000 | 95 | `8070cd0e64db48070df54dd465aacf0c4cdd2cc7c1a9c185ebec3ec7244279b3` |
| `art/textures/board.png` | Preview board | 2560x3284 | 2,541,157 | none | - | `8b18969f334fcc67ea8c9f4f50aae5d447e1a807f644247c129fb9c9e1ba4868` |

### How the images are built

- paper-grain: FFT filtered noise (fibres at seven angles, fine grain, tooth, mottle) on `#FFF3DC`. FFT noise wraps by construction. No feature is larger than about 110 px, so repeats do not read at 1024 px.
- honey-waves: one wave field, sampled in world coordinates so desktop and phone are windows on the same shapes. Colour runs through a PCHIP ramp over `#FFF3DC`, `#FFE6AE`, `#F8E2A8`, `#FCD99A`, which avoids Mach bands at the stops.
- honey-waves-dark: the same field through `#2B2D42`, `#262940`, `#1E2030`. Crests map to the lightest charcoal. Teal `#2A9D8F` is mixed in soft lobes at a measured peak of 7.5 percent.
- Banding control: multi scale monochrome grain (standard deviation about 1.3 levels on the light set) is added before encoding. Coarse octaves survive lossy WebP and break up contour lines.

### Measurements on the decoded WebPs

| Check | paper-grain | honey-waves | honey-waves-phone | honey-waves-dark | honey-waves-dark-phone |
| --- | ---: | ---: | ---: | ---: | ---: |
| Flat 16x16 luma blocks | 0.00% | 0.01% | 0.03% | 0.06% | 0.04% |
| Longest flat luma run | 54 px | 68 px | 71 px | 84 px | 68 px |
| Steepest slope after 16 px blur, luma levels per 100 px | 3.0 | 17.5 | 15.0 | 13.2 | 15.3 |
| Worst text contrast (0.1 percentile pixel) | 11.83:1 Ink | 9.83:1 Ink | 9.83:1 Ink | 11.64:1 Cream | 11.61:1 Cream |
| White card against darkest / lightest area | 1.14 / 1.07 | 1.37 / 1.08 | 1.37 / 1.08 | 12.29 at lightest | 12.26 at lightest |

Contrast uses Ink as `#2B2D42` and Cream as `#FFF8EC`. Paper-grain mean colour decodes to RGB 254.55, 243.20, 220.19 against the target 255, 243, 220.

Banding baseline: the same desktop field with no grain, at the same encoder settings, decodes with 38.92 percent flat blocks on the light set and 60.47 percent on the dark set.

Palette: median RGB distance from the allowed colour set is 1.05 on the light files and 0.83 on the dark files, which is the grain. The 99.9th percentile is under 4.5. The single worst sampled pixel is 9.43 away.

Same shapes: blurred luma correlation between light and dark is 0.90 on desktop and 0.88 on phone. Both use the same field; the difference comes from the different ramps and the teal glow.

Tile seam: the raw tile is exactly periodic (neighbour difference 1.04 across the wrap, 1.00 inside). WebP smooths inside the frame but cannot smooth across the wrap, so the decoded file differs by 1.28 levels across the x seam and 1.20 across the y seam, against 0.47 inside. The seam has no persistent offset: its largest 32 px running mean is 1.38, against 1.34 on an interior column. No seam was visible in a four tile corner crop at 6x contrast.

### Known limits

- A white card has very low contrast against the light textures (1.07 to 1.37:1), so card edges depend on a shadow or border. The board uses a soft shadow.
- `#FFF3DC`, `#FFE6AE`, `#FCD99A` and the dark tones come from the task brief, not `art/STYLE.md`. The app's `--ink` is `#111111`; the board button uses the brief's charcoal `#2B2D42`.
- Visual review covered the board, native pixel crops and 6x contrast crops in Chromium's and Pillow's decoders only. Not checked on a physical phone or a calibrated display.
- No changes under `src/`, `convex/` or `public/`. No application build, tests or integration were run for this asset-only task.

### Generator source

```python
"""Procedural background textures for Takudzidza. Deterministic: same seeds, same pixels.

Usage: python make_textures.py <output_dir>
"""
import io
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.interpolate import PchipInterpolator
from scipy.ndimage import gaussian_filter

KB = 1000  # same convention as the earlier batches in CODEX_NOTES.md


def hex_rgb(value):
    return np.array([int(value[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float64)


# Ordered from crest (t=0) to trough (t=1).
HONEY_STOPS = [(0.00, "#FFF3DC"), (0.40, "#FFE6AE"), (0.68, "#F8E2A8"), (1.00, "#FCD99A")]
DARK_STOPS = [(0.00, "#2B2D42"), (0.50, "#262940"), (1.00, "#1E2030")]
TEAL = hex_rgb("#2A9D8F")
TEAL_STRENGTH = 0.11  # peak mix towards teal, crest and glow lobe both at full

DESKTOP = (2560, 1600, 1600.0)  # width, height, pixels per world unit
PHONE = (1080, 2340, 1560.0)
FIELD_SEED = 20261105


def ramp(t, stops):
    positions = [p for p, _ in stops]
    colours = np.stack([hex_rgb(c) for _, c in stops])
    return np.stack(
        [np.clip(PchipInterpolator(positions, colours[:, i])(t), 0, 255) for i in range(3)],
        axis=-1,
    )


def smoothstep(a, b, x):
    u = np.clip((x - a) / (b - a), 0, 1)
    return u * u * u * (u * (6 * u - 15) + 10)


class Rff:
    """Random Fourier field: smooth, defined on the whole plane, resolution independent."""

    def __init__(self, seed, count, fmin, fmax):
        rng = np.random.default_rng(seed)
        angle = rng.uniform(0, 2 * np.pi, count)
        freq = rng.uniform(fmin, fmax, count)
        self.fx = freq * np.cos(angle) * 2 * np.pi
        self.fy = freq * np.sin(angle) * 2 * np.pi
        self.phase = rng.uniform(0, 2 * np.pi, count)
        self.amp = 1 / (freq / fmin) / np.sqrt(count / 2)

    def __call__(self, x, y):
        out = np.zeros_like(x)
        for fx, fy, phase, amp in zip(self.fx, self.fy, self.phase, self.amp):
            out = out + amp * np.sin(fx * x + fy * y + phase)
        return out


def world_grid(size):
    width, height, ppu = size
    xs = (np.arange(width, dtype=np.float64) + 0.5 - width / 2) / ppu
    ys = (np.arange(height, dtype=np.float64) + 0.5 - height / 2) / ppu
    return np.meshgrid(xs, ys)


def wave_field(size):
    """Returns t in [0,1] (0 crest, 1 trough) and a glow mask, from one shared world field."""
    x, y = world_grid(size)
    warp_a = Rff(FIELD_SEED + 1, 6, 0.18, 0.5)
    warp_b = Rff(FIELD_SEED + 2, 6, 0.18, 0.5)
    warp_c = Rff(FIELD_SEED + 3, 6, 0.22, 0.62)
    px = x + 0.22 * warp_a(x, y)
    py = y + 0.22 * warp_b(x, y)

    theta = np.deg2rad(-17)
    v = -x * np.sin(theta) + y * np.cos(theta)
    u = x * np.cos(theta) + y * np.sin(theta)

    # Main swell: about 800 px per cycle on desktop. The warp gradient stays below the
    # base gradient so contours never close into ovals. The skew gives each dune a long
    # lee slope and a shorter, still very soft, rise.
    phase = 2 * np.pi * (2.0 * v + 0.10 * u + 0.30 * warp_c(px, py))
    main = 0.5 + 0.5 * np.sin(phase + 0.45 * np.sin(phase))

    # A slower crossing swell lifts and sinks the crests along their length.
    cross_phase = 2 * np.pi * (0.42 * u - 0.16 * v + 0.14 * warp_a(px + 0.7, py - 0.4))
    cross = 0.5 + 0.5 * np.sin(cross_phase)

    t = 0.78 * main + 0.22 * cross
    t = (t - t.min()) / (t.max() - t.min())
    t = gaussian_filter(t, 6, mode="nearest")
    # Widen the light crests: more area in the lighter tones, troughs stay as accents.
    t = t ** 1.45

    lobes = Rff(FIELD_SEED + 4, 6, 0.3, 0.7)(x + 0.2, y - 0.1)
    lobes = smoothstep(-0.25, 0.85, lobes)
    glow = lobes * smoothstep(0.05, 0.75, 1 - t)
    return t, glow


def organic_grain(shape, seed, octaves):
    """Multi scale monochrome grain. Coarse octaves survive lossy WebP and break contour lines."""
    rng = np.random.default_rng(seed)
    out = np.zeros(shape, dtype=np.float64)
    for sigma, amplitude in octaves:
        layer = rng.standard_normal(shape)
        if sigma > 0:
            layer = gaussian_filter(layer, sigma, mode="wrap")
        out = out + amplitude * layer / layer.std()
    return out


def to_uint8(rgb, seed):
    # TPDF dither at rounding keeps sub level gradient information before encoding.
    rng = np.random.default_rng(seed)
    dither = rng.uniform(-0.5, 0.5, rgb.shape[:2]) + rng.uniform(-0.5, 0.5, rgb.shape[:2])
    return np.clip(np.floor(rgb + dither[..., None] + 0.5), 0, 255).astype(np.uint8)


def encode_under(image, limit, start=95, floor=40):
    """Project rule: method 6, highest integer quality from 95 down strictly under the limit."""
    for quality in range(start, floor - 1, -1):
        buffer = io.BytesIO()
        image.save(buffer, "WEBP", quality=quality, method=6)
        if buffer.tell() < limit:
            return buffer.getvalue(), quality
    raise RuntimeError(f"nothing under {limit} bytes at quality >= {floor}")


def tileable_noise(n, seed, spectrum):
    rng = np.random.default_rng(seed)
    fy = np.fft.fftfreq(n)[:, None]
    fx = np.fft.rfftfreq(n)[None, :]
    white = np.fft.rfft2(rng.standard_normal((n, n)))
    field = np.fft.irfft2(white * spectrum(fx, fy), s=(n, n))
    return field / field.std()


def paper_grain():
    n = 1024
    base = hex_rgb("#FFF3DC")

    def band(lo_px, hi_px):
        def spectrum(fx, fy):
            f = np.hypot(fx, fy)
            return np.exp(-((f * lo_px) ** 2)) * (1 - np.exp(-((f * hi_px) ** 2)))
        return spectrum

    def fibre(angle):
        ca, sa = np.cos(angle), np.sin(angle)

        def spectrum(fx, fy):
            along = fx * ca + fy * sa
            across = -fx * sa + fy * ca
            f = np.hypot(fx, fy)
            return np.exp(-((along * 36) ** 2)) * np.exp(-((across * 3.2) ** 2)) * (f > 1 / 256)
        return spectrum

    fibres = np.zeros((n, n))
    for i, angle in enumerate(np.linspace(0, np.pi, 7, endpoint=False) + 0.21):
        fibres = fibres + tileable_noise(n, 900 + i, fibre(angle))
    fibres = fibres / fibres.std()

    fine = tileable_noise(n, 880, band(2.4, 8))
    tooth = tileable_noise(n, 881, band(6, 26))
    # Mottle stops at 110 px, so nothing large enough to read as a repeat at 1024 px.
    mottle = tileable_noise(n, 882, band(26, 110))
    height = 1.05 * fibres + 0.95 * fine + 0.55 * tooth + 0.45 * mottle
    height = height - height.mean()

    # Warm shift: darker specks lean towards honey, so grain is colour, not grey.
    rgb = np.stack([
        base[0] + 0.55 * height,
        base[1] + 1.00 * height,
        base[2] + 1.55 * height,
    ], axis=-1)
    # No per pixel dither: the encoder drops it, and it decorrelates the tile edges.
    return np.clip(np.round(rgb), 0, 255).astype(np.uint8)


def honey_rgb(t, grain):
    rgb = ramp(t, HONEY_STOPS)
    return rgb + grain[..., None] * np.array([0.65, 1.0, 1.35])


def dark_rgb(t, glow, grain):
    rgb = ramp(t, DARK_STOPS)
    strength = (TEAL_STRENGTH * glow)[..., None]
    rgb = rgb * (1 - strength) + TEAL * strength
    return rgb + grain[..., None] * np.array([0.9, 1.0, 1.25])


LIGHT_GRAIN = [(1.0, 0.75), (2.4, 0.75), (6.0, 0.6), (18.0, 0.55)]
DARK_GRAIN = [(1.0, 0.55), (2.4, 0.7), (6.0, 0.6), (18.0, 0.42)]


def main():
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    report = []

    def ship(name, array, limit):
        data, quality = encode_under(Image.fromarray(array, "RGB"), limit)
        (out / name).write_bytes(data)
        report.append((name, array.shape[1], array.shape[0], len(data), quality, limit))

    ship("paper-grain.webp", paper_grain(), 80 * KB)
    for size, suffix, limit, seed in (
        (DESKTOP, "", 200 * KB, 101),
        (PHONE, "-phone", 150 * KB, 102),
    ):
        t, glow = wave_field(size)
        shape = t.shape
        ship(f"honey-waves{suffix}.webp",
             to_uint8(honey_rgb(t, organic_grain(shape, seed, LIGHT_GRAIN)), seed + 10), limit)
        ship(f"honey-waves-dark{suffix}.webp",
             to_uint8(dark_rgb(t, glow, organic_grain(shape, seed + 1, DARK_GRAIN)), seed + 11), limit)

    for name, width, height, size_bytes, quality, limit in report:
        print(f"{name:32} {width}x{height:<5} {size_bytes:>8,} bytes  q{quality}  limit {limit:,}")


if __name__ == "__main__":
    main()
```

## Visuals 2 - authoritative Education kit and page cutouts

Created 2026-11-05, Africa/Harare. Branch `codex/visuals-2`, created after `git fetch origin` directly from `origin/codex/textures`. Asset-only handoff. This section supersedes earlier logo, font, teal-glow and framed-photo directions above for this batch. The only authoritative Taku mark is the exact three-pill Education kit. Old art brand files are legacy and are not inputs to this batch. Product lockups in `proposed/` require Takunda's approval before any app use.

### People, background removal and native sizes

Twenty-two unique original photo masters were used as identity/pose references. The existing social crop `og-default` uses an exact alias of the final `landing-hero-wide` cutout, giving 23 filenames. Multi-person photographs remain joined groups. `empty-notebook` and `maths-hints` originally contain only hands and props; those remain hand/prop cutouts. A waist-up portrait cannot preserve an unseen original face, so none was invented.

Each unique cutout used a separate built-in imagegen background-extraction edit with `transparent_background=true`. The model identifier was not exposed by the tool. No CLI/API fallback, external identity references, chroma key or rembg was used. These are reference-based generative extractions, not pixel-exact masks; source identity, action, clothing, expression and props were visually compared. The two hero cutouts received an additional alpha-background cleanup edit. Full original prompts are in `art/review/cutout-sources.json`; final prompts, previous-source references and alias provenance are in `cutout-sources-final.json`. Generated sources remain at the recorded local paths, with SHA-256 in `art/assets/cutouts/manifest.json`.

PNG masters crop the returned alpha bounding box with 12 px clear margin, no upscaling, colour replacement, skin retouching or sharpening. WebPs use method 6 and highest integer quality from 95 down below 200,000 bytes (portrait) or 250,000 bytes (landscape). Decoded WebP alpha equals the PNG alpha exactly. Some landscape model outputs use alpha 254 for fully covered subject interiors (99.6% coverage); this is preserved, not silently normalized. Zero-alpha background remains transparent. Native size means the returned generator canvas; crop size is separately listed.

Each `-shadow.webp` is an independent, translucent #4A3010 contact ellipse with Gaussian softening, generated by Pillow. It has no person pixels, uses the same canvas and aligns to the subject's bottom. Place shadow and person in the same box. Shadows do not claim a physically reconstructed lighting pass.

| Stem (each has PNG, WebP and -shadow.webp) | Native generated source | PNG/WebP/shadow canvas | WebP q / bytes |
| --- | --- | --- | --- |
| `audio-overview` | 1121x1403 | 1134x1427 | 83 / 199,188 |
| `class-share-teacher` | 1127x1396 | 1134x1419 | 89 / 191,036 |
| `dashboard-hero-university` | 1536x1024 | 1546x1041 | 87 / 244,570 |
| `empty-flashcards` | 1143x1376 | 1167x1385 | 81 / 193,766 |
| `empty-notebook` | 1121x1403 | 1145x1394 | 90 / 193,426 |
| `empty-quiz` | 1128x1394 | 1123x1403 | 92 / 193,402 |
| `exam-coach` | 1374x1145 | 1377x1147 | 91 / 242,688 |
| `guardian-consent` | 1431x1099 | 1455x1110 | 84 / 249,320 |
| `landing-form1` | 1121x1403 | 1113x1411 | 91 / 197,786 |
| `landing-hero-wide` | 1536x1024 | 1412x1048 | 94 / 239,906 |
| `maths-hints` | 1536x1024 | 1560x1038 | 92 / 248,700 |
| `offline-downloads` | 1123x1401 | 1132x1424 | 87 / 197,880 |
| `onboarding-1-secondary-student` | 1122x1402 | 1146x1370 | 86 / 192,606 |
| `onboarding-2-senior-student` | 1378x1141 | 1358x1165 | 92 / 249,526 |
| `onboarding-3-professional` | 1179x1334 | 1202x1341 | 85 / 197,236 |
| `study-group-later` | 1536x1024 | 1560x1035 | 79 / 240,684 |
| `study-planner` | 1312x1199 | 1306x1223 | 88 / 242,616 |
| `style-calm` | 1121x1403 | 1145x1394 | 87 / 189,952 |
| `style-cook-mode` | 1123x1401 | 1133x1425 | 81 / 198,840 |
| `style-locked-in` | 1143x1376 | 1167x1400 | 81 / 196,854 |
| `tile-ask` | 1121x1403 | 1127x1427 | 87 / 196,270 |
| `tile-scroll` | 1150x1367 | 1174x1372 | 86 / 199,806 |
| `og-default` | 1536x1024 | 1412x1048 | 94 / 239,906 |

### Edge review and exceptions

Independent visual review covered original comparisons and cream #FFF8F0 / charcoal #2B2D42 composites for all 22 unique sources, with 56 manually selected semantic hair/head/hand crop pairs enlarged exactly 200 percent using nearest neighbour. Full evidence, source hashes and coordinates: `art/review/people-qa.md` and `art/review/people-qa/`. Exporter-generated automatic boundary samples are additional evidence, not a substitute for semantic crops. The complete batch is shown in `art/assets/cutouts/board.png` on light and dark surfaces with preserved aspect ratios.

Unhappy edge list: none blocking after review. Natural warm hair rims already present in original lighting remain. Fine hair detail is finite at generator resolution. Raw PNG viewers may display hidden RGB behind alpha zero as a glow; actual alpha-composited light/dark review is the evidence used here. No broad backdrop, visible matte halo, furniture scrap, detached hand, repeated replacement face or missing held prop was identified in the sampled review. This does not certify every pixel or every downstream size/device.

### Composed page scenes

Three separate built-in imagegen reference-compositing calls used an existing cutout plus `honey-waves.webp`; no scene frames, arches, text, logos or UI. Their matching contact shadows are baked into these opaque compositions. These scenes interpret the supplied texture photographically rather than retaining its exact pixel array. Prompts and references are in `art/review/scene-sources.json`; native source paths/hashes and export scale are in `art/assets/scenes/manifest.json`. Export uses Pillow Lanczos centred aspect fit; no sharpening or retouching. Scene WebP budget is 250,000 bytes.

| File stem (PNG + WebP) | Subject reference | Native generator size | Requested export | Scale | WebP q |
| --- | --- | --- | --- | --- | --- |
| `art/assets/scenes/landing-hero` | `offline-downloads` | 1586x992 | 2560x1600 | 1.6141x | 92 |
| `art/assets/scenes/home-dashboard` | `study-group-later` | 1672x941 | 1600x900 | 0.9569x | 91 |
| `art/assets/scenes/empty-notebook` | `style-calm` | 1448x1086 | 1200x900 | 0.8287x | 95 |

The landing scene is enlarged, not native 2560x1600 generation. Dashboard and notebook scenes are downsampled. All three compositions were visually inspected for identity, seated contact, props, natural light/shadows, empty page space and absence of text/frames. `art/assets/scenes/board.png` previews the final WebP exports.

`art/.gitattributes` disables text line-ending conversion for the seven copied kit files and two upstream OFL license copies, so authoritative source bytes survive Windows checkouts. The unmodified upstream licenses retain their original trailing space; only their trailing-space diff warning is disabled. Other files retain the repository's existing line-ending handling. Inventory hashes describe files at generation time.

### Verification and delivery limits

`python art/review/verify_visuals.py` passed: all23 expected cutout filenames, all69 cutout/shadow exports, exact alpha identity, clear padding, byte budgets, three exact scene sizes, seven byte-identical kit copies, four outlined proposals with exact approved rectangle geometry/colours, seven transparent raster decor pairs, seven single-stroke SVGs, unchanged light/paper texture bytes, and empty protected-path diff. Ruff passed on all six production/export helpers and the asset verifier. Independent people review and board review are asset checks, not app acceptance.

No src/, convex/, public/, Claude setup or unrelated audit file edits. No app integration, app E2E, deployment, physical-device or calibrated-display checks. No merge. No unavailable asset category: all requested categories were made. Limits: two originals remain hands-only; generative identity fidelity is visual, not pixel-exact; the hero composition is upscaled; proposed brand lockups await approval. Photographic decor uses the requested warm materials with natural tonal shading, not a strict indexed palette of only exact hex-valued pixels.

### Detailed Part B/C production record

# Visuals 2 - Parts B and C

Created 2026-11-05 (Africa/Harare). Asset-only work on `codex/visuals-2`.

## Result

Seven raster decor objects with transparent PNG masters and WebP exports, seven clean SVG marks, a honey-waves decor board, and warm replacements for both dark textures. No files under src/, convex/ or public/ were edited. No application integration, application tests or physical-device validation was performed.

## Decor generator and background method

Each distinct raster was generated by its own built-in `image_gen` call with `transparent_background=true`. Full exact prompts, returned source paths and source hashes are in `art/decor/generation-prompts.json` and `manifest.json`. The tool did not expose a model identifier. No CLI or API fallback was used.

The generated PNGs already contained real alpha. No secondary segmentation, chroma key, matting, or colour replacement was applied. PNG masters are exact byte copies of the returned source files. WebPs use Pillow 12.2.0 Lanczos aspect fit to a maximum 720 px edge, WebP method 6 at quality 95, retaining alpha. No upscaling. Every exported WebP is below the voluntary 200,000 byte decor ceiling. Decoded WebP alpha was verified exactly equal to the resized PNG alpha for every file.

| Raster stem (PNG + WebP) | Native PNG canvas | WebP canvas | WebP bytes | Method |
| --- | --- | --- | ---: | --- |
| `torn-paper-cream` | 1774x887 | 720x360 | 51,342 | Built-in generated alpha, preserved through Lanczos export |
| `torn-paper-amber` | 1928x815 | 720x304 | 50,782 | Built-in generated alpha, preserved through Lanczos export |
| `sticky-note-butter` | 1263x1246 | 720x710 | 67,060 | Built-in generated alpha, preserved through Lanczos export |
| `pencil-honey` | 1536x1024 | 720x480 | 28,060 | Built-in generated alpha, preserved through Lanczos export |
| `highlighter-stroke` | 2172x724 | 720x240 | 27,992 | Built-in generated alpha, preserved through Lanczos export |
| `page-corner-curl` | 1536x1024 | 720x480 | 39,186 | Built-in generated alpha, preserved through Lanczos export |
| `book-stack` | 1536x1024 | 720x480 | 81,706 | Built-in generated alpha, preserved through Lanczos export |

Seven native transparent SVGs were authored with deterministic paths in `art/decor/build_decor.py`. Each has one inherited `stroke="currentColor"`, `fill="none"`, rounded caps and joins. No embedded fonts or raster content. The board previews the marks in deep amber #8A5A1F. The margin formula uses a right triangle and a square-area relation in 3:4:5 proportions, with no letters or digits.

| SVG | Native viewBox |
| --- | --- |
| `underline-swoop.svg` | 480x100 |
| `underline-double.svg` | 480x120 |
| `circle-loop.svg` | 360x220 |
| `stars.svg` | 360x180 |
| `sparks.svg` | 300x180 |
| `arrow-curved.svg` | 380x220 |
| `margin-formula.svg` | 540x220 |

Board type is Inter 400/500/600 only. `source-inter.ttf` is a decoded copy of the installed Inter variable WOFF2 at `C:\Users\Dell\.codex\worktrees\payroll-ui-20260930\Taku-Payroll\public\fonts\inter.woff2`; its name table identifies Inter Regular, weight axis 100-900. The decoded source file supports reproducible Pillow board rendering. FontTools 4.61.1 and PyMuPDF 1.27.1 were used. The palette controls material colours and warm tonal shading, rather than reducing photographic pixels to an indexed swatch palette. No teal was observed in visual review; a visible-pixel green-dominance check found zero suspect pixels in all seven generated rasters.

## Decor visual checks

Reviewed `board.png`, the complete generation contact sheet, and top/bottom silhouette edge crops at 200 percent on cream #FFF8F0 and charcoal #2B2D42. Paper fibres, pencil graphite, lifted note corner, page curl and book cover edges read cleanly. No visible checkerboard, external background, lettering, logo, watermark or teal. No blocking edge defects identified. Soft paper fibres and tiny natural highlight rims are intentional. The highlighter has transparent surroundings and variable pigment, with some opaque pigment regions.

The two edge sheets are 1300x2400 PNGs with source-pixel crops enlarged exactly 2x using nearest neighbour. They are review evidence rather than app assets. `generation-review.png` is 1600x1460; the final `board.png` is 2400x2200, composited over the existing honey-waves texture. Board and review lettering use Inter.

## Dark texture fix

`art/textures/make_warm_dark.py` copies the original Batch 3 deterministic world-space wave equations, all coordinates, seed 20261105, shape sampling, blur and grain seeds. The old coloured lobe mix was removed. The replacement is a smooth ramp between charcoal #2B2D42, a 22 percent mix toward deep #8A5A1F at the crests, and a 55 percent mix toward ink #4A3010 at the troughs, with the original low-strength grain. No new hues were introduced. There is no background removal for procedural textures.

| File | Native size | Bytes | Limit | Quality |
| --- | --- | ---: | ---: | ---: |
| `honey-waves-dark.webp` | 2560x1600 | 120,844 | <200,000 | 95 |
| `honey-waves-dark-phone.webp` | 1080x2340 | 76,754 | <150,000 | 95 |

The new desktop and phone wave arrays were compared against the original Python generator embedded in CODEX_NOTES.md and were exactly equal element by element. Field SHA-256 hashes are recorded in `warm-dark-manifest.json`. Existing paper-grain, light desktop and light phone WebPs retain their prior SHA-256 hashes. Native dimensions are retained with no resize or upscaling.

The texture board remains 2560x3284 and was rebuilt using Pillow and Inter. All five existing textures are shown, including native grain tiled on the bottom. Cream reading panels demonstrate foreground visibility. It is a review board, not an application screenshot. The two dark outputs and board were visually reviewed. Byte limits, dimensions and Python syntax checks passed.

## Complete file inventory

Every image file and its size, bytes, SHA-256 and image mode are listed in `art/decor/file-inventory.json`. Generator source and prompt metadata are committed beside the assets.

| File | Canvas / type | Generator / background method |
| --- | --- | --- |
| `art/decor/arrow-curved.svg` | SVG viewBox | Native SVG paths; transparent canvas |
| `art/decor/board.png` | 2400x2200 | Pillow composition, Inter labels; opaque review canvas |
| `art/decor/book-stack.png` | 1536x1024 | image_gen PNG alpha; Pillow WebP export |
| `art/decor/book-stack.webp` | 720x480 | image_gen PNG alpha; Pillow WebP export |
| `art/decor/build_decor.py` | Text metadata / source | Recorded provenance or Python generator; no background |
| `art/decor/circle-loop.svg` | SVG viewBox | Native SVG paths; transparent canvas |
| `art/decor/edges-200pct-dark.png` | 1300x2400 | Pillow composition, Inter labels; opaque review canvas |
| `art/decor/edges-200pct-light.png` | 1300x2400 | Pillow composition, Inter labels; opaque review canvas |
| `art/decor/file-inventory.json` | Text metadata / source | Recorded provenance or Python generator; no background |
| `art/decor/generation-prompts.json` | Text metadata / source | Recorded provenance or Python generator; no background |
| `art/decor/generation-review.png` | 1600x1460 | Pillow composition, Inter labels; opaque review canvas |
| `art/decor/highlighter-stroke.png` | 2172x724 | image_gen PNG alpha; Pillow WebP export |
| `art/decor/highlighter-stroke.webp` | 720x240 | image_gen PNG alpha; Pillow WebP export |
| `art/decor/manifest.json` | Text metadata / source | Recorded provenance or Python generator; no background |
| `art/decor/margin-formula.svg` | SVG viewBox | Native SVG paths; transparent canvas |
| `art/decor/page-corner-curl.png` | 1536x1024 | image_gen PNG alpha; Pillow WebP export |
| `art/decor/page-corner-curl.webp` | 720x480 | image_gen PNG alpha; Pillow WebP export |
| `art/decor/pencil-honey.png` | 1536x1024 | image_gen PNG alpha; Pillow WebP export |
| `art/decor/pencil-honey.webp` | 720x480 | image_gen PNG alpha; Pillow WebP export |
| `art/decor/source-inter.ttf` | Inter variable font | FontTools WOFF2 decoding; no background |
| `art/decor/sparks.svg` | SVG viewBox | Native SVG paths; transparent canvas |
| `art/decor/stars.svg` | SVG viewBox | Native SVG paths; transparent canvas |
| `art/decor/sticky-note-butter.png` | 1263x1246 | image_gen PNG alpha; Pillow WebP export |
| `art/decor/sticky-note-butter.webp` | 720x710 | image_gen PNG alpha; Pillow WebP export |
| `art/decor/torn-paper-amber.png` | 1928x815 | image_gen PNG alpha; Pillow WebP export |
| `art/decor/torn-paper-amber.webp` | 720x304 | image_gen PNG alpha; Pillow WebP export |
| `art/decor/torn-paper-cream.png` | 1774x887 | image_gen PNG alpha; Pillow WebP export |
| `art/decor/torn-paper-cream.webp` | 720x360 | image_gen PNG alpha; Pillow WebP export |
| `art/decor/underline-double.svg` | SVG viewBox | Native SVG paths; transparent canvas |
| `art/decor/underline-swoop.svg` | SVG viewBox | Native SVG paths; transparent canvas |
| `art/textures/honey-waves-dark.webp` | 2560x1600 | Deterministic procedural field / Pillow board; no background removal |
| `art/textures/honey-waves-dark-phone.webp` | 1080x2340 | Deterministic procedural field / Pillow board; no background removal |
| `art/textures/board.png` | 2560x3284 | Deterministic procedural field / Pillow board; no background removal |
| `art/textures/make_warm_dark.py` | Python source / JSON metadata | Deterministic procedural field / Pillow board; no background removal |
| `art/textures/warm-dark-manifest.json` | Python source / JSON metadata | Deterministic procedural field / Pillow board; no background removal |

This report is `art/review/texture-decor-report.md`. An untracked Python import cache under `art/textures/__pycache__/` was created during the field comparison; it is disposable verification output and must be excluded from the commit. No git commit, push or branch switching was performed by this delegated task.

## Remaining boundaries

No requested Part B or Part C content remains missing. Visual checks cover this desktop decoder and sampled source edge regions. Physical phones, calibrated displays, app rendering, accessibility in a live page, and product acceptance were not tested.

### Detailed Part D production record

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

### Complete changed-file inventory

Every changed delivery/support file is listed below. Source-native dimensions and scale for generated assets are recorded in the tables above and manifests; dimensions below are each file canvas or vector viewBox. Exact bytes and hashes are in `art/review/file-inventory.json` (self and NOTES hashes omitted to avoid circular records). Untracked Python cache is scratch and excluded from delivery.

| File | Canvas / viewBox | Generator | Background method |
| --- | --- | --- | --- |
| `art/.gitattributes` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/CODEX_NOTES.md` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/assets/cutouts/audio-overview-shadow.webp` | 1134x1427 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/audio-overview.png` | 1134x1427 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/audio-overview.webp` | 1134x1427 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/board.png` | 2400x1600 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/assets/cutouts/class-share-teacher-shadow.webp` | 1134x1419 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/class-share-teacher.png` | 1134x1419 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/class-share-teacher.webp` | 1134x1419 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/dashboard-hero-university-shadow.webp` | 1546x1041 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/dashboard-hero-university.png` | 1546x1041 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/dashboard-hero-university.webp` | 1546x1041 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/empty-flashcards-shadow.webp` | 1167x1385 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/empty-flashcards.png` | 1167x1385 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/empty-flashcards.webp` | 1167x1385 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/empty-notebook-shadow.webp` | 1145x1394 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/empty-notebook.png` | 1145x1394 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/empty-notebook.webp` | 1145x1394 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/empty-quiz-shadow.webp` | 1123x1403 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/empty-quiz.png` | 1123x1403 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/empty-quiz.webp` | 1123x1403 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/exam-coach-shadow.webp` | 1377x1147 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/exam-coach.png` | 1377x1147 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/exam-coach.webp` | 1377x1147 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/guardian-consent-shadow.webp` | 1455x1110 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/guardian-consent.png` | 1455x1110 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/guardian-consent.webp` | 1455x1110 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/landing-form1-shadow.webp` | 1113x1411 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/landing-form1.png` | 1113x1411 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/landing-form1.webp` | 1113x1411 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/landing-hero-wide-shadow.webp` | 1412x1048 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/landing-hero-wide.png` | 1412x1048 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/landing-hero-wide.webp` | 1412x1048 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/manifest.json` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/assets/cutouts/maths-hints-shadow.webp` | 1560x1038 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/maths-hints.png` | 1560x1038 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/maths-hints.webp` | 1560x1038 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/offline-downloads-shadow.webp` | 1132x1424 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/offline-downloads.png` | 1132x1424 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/offline-downloads.webp` | 1132x1424 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/og-default-shadow.webp` | 1412x1048 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/og-default.png` | 1412x1048 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/og-default.webp` | 1412x1048 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/onboarding-1-secondary-student-shadow.webp` | 1146x1370 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/onboarding-1-secondary-student.png` | 1146x1370 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/onboarding-1-secondary-student.webp` | 1146x1370 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/onboarding-2-senior-student-shadow.webp` | 1358x1165 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/onboarding-2-senior-student.png` | 1358x1165 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/onboarding-2-senior-student.webp` | 1358x1165 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/onboarding-3-professional-shadow.webp` | 1202x1341 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/onboarding-3-professional.png` | 1202x1341 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/onboarding-3-professional.webp` | 1202x1341 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/study-group-later-shadow.webp` | 1560x1035 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/study-group-later.png` | 1560x1035 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/study-group-later.webp` | 1560x1035 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/study-planner-shadow.webp` | 1306x1223 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/study-planner.png` | 1306x1223 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/study-planner.webp` | 1306x1223 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/style-calm-shadow.webp` | 1145x1394 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/style-calm.png` | 1145x1394 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/style-calm.webp` | 1145x1394 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/style-cook-mode-shadow.webp` | 1133x1425 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/style-cook-mode.png` | 1133x1425 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/style-cook-mode.webp` | 1133x1425 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/style-locked-in-shadow.webp` | 1167x1400 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/style-locked-in.png` | 1167x1400 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/style-locked-in.webp` | 1167x1400 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/tile-ask-shadow.webp` | 1127x1427 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/tile-ask.png` | 1127x1427 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/tile-ask.webp` | 1127x1427 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/tile-scroll-shadow.webp` | 1174x1372 | Pillow contact-shadow generator | Transparent procedural alpha |
| `art/assets/cutouts/tile-scroll.png` | 1174x1372 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/cutouts/tile-scroll.webp` | 1174x1372 | Built-in imagegen + export_cutouts.py | Generated alpha preserved; tight native crop; see cutout native table |
| `art/assets/scenes/board.png` | 1600x1660 | Built-in imagegen + export_scenes.py | Opaque composition; native size in scene table |
| `art/assets/scenes/empty-notebook.png` | 1200x900 | Built-in imagegen + export_scenes.py | Opaque composition; native size in scene table |
| `art/assets/scenes/empty-notebook.webp` | 1200x900 | Built-in imagegen + export_scenes.py | Opaque composition; native size in scene table |
| `art/assets/scenes/home-dashboard.png` | 1600x900 | Built-in imagegen + export_scenes.py | Opaque composition; native size in scene table |
| `art/assets/scenes/home-dashboard.webp` | 1600x900 | Built-in imagegen + export_scenes.py | Opaque composition; native size in scene table |
| `art/assets/scenes/landing-hero.png` | 2560x1600 | Built-in imagegen + export_scenes.py | Opaque composition; native size in scene table |
| `art/assets/scenes/landing-hero.webp` | 2560x1600 | Built-in imagegen + export_scenes.py | Opaque composition; native size in scene table |
| `art/assets/scenes/manifest.json` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/brand/takudzidza/board.png` | 2720x3980 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/brand/takudzidza/build_brand.py` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/brand/takudzidza/kit/palette.css` | - | Exact Education kit copy | Unmodified vector alpha / CSS; no removal |
| `art/brand/takudzidza/kit/taku-education-horizontal.svg` | 2000x400 / 0 0 2000 400 | Exact Education kit copy | Unmodified vector alpha / CSS; no removal |
| `art/brand/takudzidza/kit/taku-education-mark-inverse.svg` | 1024x1024 / 0 0 100 100 | Exact Education kit copy | Unmodified vector alpha / CSS; no removal |
| `art/brand/takudzidza/kit/taku-education-mark-on-cream.svg` | 1024x1024 / 0 0 100 100 | Exact Education kit copy | Unmodified vector alpha / CSS; no removal |
| `art/brand/takudzidza/kit/taku-education-mark-on-mid.svg` | 1024x1024 / 0 0 100 100 | Exact Education kit copy | Unmodified vector alpha / CSS; no removal |
| `art/brand/takudzidza/kit/taku-education-mark.svg` | 1024x1024 / 0 0 100 100 | Exact Education kit copy | Unmodified vector alpha / CSS; no removal |
| `art/brand/takudzidza/kit/taku-education-stacked.svg` | 1000x1200 / 0 0 1000 1200 | Exact Education kit copy | Unmodified vector alpha / CSS; no removal |
| `art/brand/takudzidza/manifest.json` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/brand/takudzidza/proposed/takudzidza-horizontal-by-taku.svg` | 1400x480 / 0 0 1400 480 | build_brand.py + outlined Inter | Native vector alpha; no removal |
| `art/brand/takudzidza/proposed/takudzidza-horizontal.svg` | 1400x480 / 0 0 1400 480 | build_brand.py + outlined Inter | Native vector alpha; no removal |
| `art/brand/takudzidza/proposed/takudzidza-stacked-by-taku.svg` | 1200x1100 / 0 0 1200 1100 | build_brand.py + outlined Inter | Native vector alpha; no removal |
| `art/brand/takudzidza/proposed/takudzidza-stacked.svg` | 1200x1000 / 0 0 1200 1000 | build_brand.py + outlined Inter | Native vector alpha; no removal |
| `art/brand/takudzidza/source/Inter-Variable.ttf` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/brand/takudzidza/source/OFL.txt` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/decor/OFL.txt` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/decor/arrow-curved.svg` | 380x220 / 0 0 380 220 | build_decor.py | Native single-stroke currentColor vector |
| `art/decor/board.png` | 2400x2200 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/decor/book-stack.png` | 1536x1024 | Built-in imagegen + build_decor.py | Generated alpha preserved; source native sizes in decor table |
| `art/decor/book-stack.webp` | 720x480 | Built-in imagegen + build_decor.py | Generated alpha preserved; source native sizes in decor table |
| `art/decor/build_decor.py` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/decor/circle-loop.svg` | 360x220 / 0 0 360 220 | build_decor.py | Native single-stroke currentColor vector |
| `art/decor/edges-200pct-dark.png` | 1300x2400 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/decor/edges-200pct-light.png` | 1300x2400 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/decor/file-inventory.json` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/decor/generation-prompts.json` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/decor/generation-review.png` | 1600x1460 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/decor/highlighter-stroke.png` | 2172x724 | Built-in imagegen + build_decor.py | Generated alpha preserved; source native sizes in decor table |
| `art/decor/highlighter-stroke.webp` | 720x240 | Built-in imagegen + build_decor.py | Generated alpha preserved; source native sizes in decor table |
| `art/decor/manifest.json` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/decor/margin-formula.svg` | 540x220 / 0 0 540 220 | build_decor.py | Native single-stroke currentColor vector |
| `art/decor/page-corner-curl.png` | 1536x1024 | Built-in imagegen + build_decor.py | Generated alpha preserved; source native sizes in decor table |
| `art/decor/page-corner-curl.webp` | 720x480 | Built-in imagegen + build_decor.py | Generated alpha preserved; source native sizes in decor table |
| `art/decor/pencil-honey.png` | 1536x1024 | Built-in imagegen + build_decor.py | Generated alpha preserved; source native sizes in decor table |
| `art/decor/pencil-honey.webp` | 720x480 | Built-in imagegen + build_decor.py | Generated alpha preserved; source native sizes in decor table |
| `art/decor/source-inter.ttf` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/decor/sparks.svg` | 300x180 / 0 0 300 180 | build_decor.py | Native single-stroke currentColor vector |
| `art/decor/stars.svg` | 360x180 / 0 0 360 180 | build_decor.py | Native single-stroke currentColor vector |
| `art/decor/sticky-note-butter.png` | 1263x1246 | Built-in imagegen + build_decor.py | Generated alpha preserved; source native sizes in decor table |
| `art/decor/sticky-note-butter.webp` | 720x710 | Built-in imagegen + build_decor.py | Generated alpha preserved; source native sizes in decor table |
| `art/decor/torn-paper-amber.png` | 1928x815 | Built-in imagegen + build_decor.py | Generated alpha preserved; source native sizes in decor table |
| `art/decor/torn-paper-amber.webp` | 720x304 | Built-in imagegen + build_decor.py | Generated alpha preserved; source native sizes in decor table |
| `art/decor/torn-paper-cream.png` | 1774x887 | Built-in imagegen + build_decor.py | Generated alpha preserved; source native sizes in decor table |
| `art/decor/torn-paper-cream.webp` | 720x360 | Built-in imagegen + build_decor.py | Generated alpha preserved; source native sizes in decor table |
| `art/decor/underline-double.svg` | 480x120 / 0 0 480 120 | build_decor.py | Native single-stroke currentColor vector |
| `art/decor/underline-swoop.svg` | 480x100 / 0 0 480 100 | build_decor.py | Native single-stroke currentColor vector |
| `art/review/brand-report.md` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/review/build_overviews.py` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/review/cutout-sources-final.json` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/review/cutout-sources.json` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/review/cutouts-overview.png` | 2400x1600 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/document_visuals.py` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/review/edges/audio-overview-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/audio-overview-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/class-share-teacher-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/class-share-teacher-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/dashboard-hero-university-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/dashboard-hero-university-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/empty-flashcards-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/empty-flashcards-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/empty-notebook-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/empty-notebook-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/empty-quiz-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/empty-quiz-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/exam-coach-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/exam-coach-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/guardian-consent-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/guardian-consent-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/landing-form1-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/landing-form1-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/landing-hero-wide-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/landing-hero-wide-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/maths-hints-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/maths-hints-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/offline-downloads-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/offline-downloads-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/og-default-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/og-default-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/onboarding-1-secondary-student-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/onboarding-1-secondary-student-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/onboarding-2-senior-student-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/onboarding-2-senior-student-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/onboarding-3-professional-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/onboarding-3-professional-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/study-group-later-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/study-group-later-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/study-planner-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/study-planner-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/style-calm-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/style-calm-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/style-cook-mode-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/style-cook-mode-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/style-locked-in-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/style-locked-in-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/tile-ask-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/tile-ask-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/tile-scroll-200pct.png` | 880x1592 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/edges/tile-scroll-contact.png` | 960x640 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/export_cutouts.py` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/review/export_scenes.py` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/review/file-inventory.json` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/review/final-review.md` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/review/people-qa.md` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/review/people-qa/audio-overview-200pct.png` | 1080x1140 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/class-share-teacher-200pct.png` | 1080x1710 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/dashboard-hero-university-final-200pct.png` | 1080x2280 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/empty-flashcards-200pct.png` | 1080x1140 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/empty-notebook-200pct.png` | 1080x1140 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/empty-quiz-200pct.png` | 1080x1140 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/exam-coach-200pct.png` | 1080x1140 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/full-1.png` | 1500x2400 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/full-2.png` | 1500x2400 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/full-3.png` | 1500x2400 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/full-4.png` | 1500x2400 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/full-5.png` | 1500x2400 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/full-6-final-heroes.png` | 1500x1300 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/guardian-consent-200pct.png` | 1080x1710 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/hero-final-coordinates.json` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/review/people-qa/landing-form1-200pct.png` | 1080x1140 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/landing-hero-wide-final-200pct.png` | 1080x1710 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/maths-hints-200pct.png` | 1080x1140 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/offline-downloads-200pct.png` | 1080x1140 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/onboarding-1-secondary-student-200pct.png` | 1080x1140 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/onboarding-2-senior-student-200pct.png` | 1080x1710 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/onboarding-3-professional-200pct.png` | 1080x1140 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/sample-coordinates.json` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/review/people-qa/study-group-later-200pct.png` | 1080x2280 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/study-planner-200pct.png` | 1080x1140 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/style-calm-200pct.png` | 1080x1710 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/style-cook-mode-200pct.png` | 1080x1710 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/style-locked-in-200pct.png` | 1080x1710 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/tile-ask-200pct.png` | 1080x1140 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/people-qa/tile-scroll-200pct.png` | 1080x1710 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/scene-sources.json` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/review/source-people.png` | 2400x1600 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/review/texture-decor-report.md` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/review/verification.json` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/review/verify_visuals.py` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/textures/board.png` | 2560x3284 | Pillow/PyMuPDF review composition; Inter labels | Review evidence; no background removal |
| `art/textures/honey-waves-dark-phone.webp` | 1080x2340 | make_warm_dark.py | Native deterministic opaque raster; no removal |
| `art/textures/honey-waves-dark.webp` | 2560x1600 | make_warm_dark.py | Native deterministic opaque raster; no removal |
| `art/textures/make_warm_dark.py` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |
| `art/textures/warm-dark-manifest.json` | - | Production helper, provenance, license or documentation | Not applicable; no background removal |

## Redesign 2: web sizes and app icons (2026-11-05)

Script: `art/web/build_web.py` (Pillow, deterministic, no generation). It reads the existing cutout and scene masters and writes:

- `art/web/cutouts/<slug>-480.webp`, `-800.webp` and `<slug>-shadow.webp` for 22 cutouts: Lanczos resize of the existing alpha cutouts and their existing shadow layers.
- `art/web/scenes/<slug>-<width>.webp` for landing-hero (640, 1280, 1920), home-dashboard (640, 1280, 1600) and empty-notebook (640, 1200): Lanczos resize only.
- `art/web/og-landing.jpg`: a 1200x630 crop of the landing hero scene for link previews.
- `art/web/manifest.json`: sizes for `src/art.generated.ts`.
- The app icons in `public/` (`icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon.ico`): drawn from the three rectangles of `art/brand/takudzidza/kit/taku-education-mark-on-cream.svg` at 8x on Cream `#FFF8F0` and downsampled. `icon.svg` is a byte copy of the kit file. The maskable icon keeps the mark inside the 80% safe circle (asserted by the script).

No pixel of any person was edited. The old tile T logo files were removed from `art/brand/` and archived outside the repo.
