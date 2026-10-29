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
