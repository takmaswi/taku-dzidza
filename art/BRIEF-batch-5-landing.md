# Takudzidza art batch 5: the new landing page (people, objects, covers, voices)

For Codex. Read `art/STYLE.md`, `art/BRIEF-batch-4.md`, `art/CODEX_NOTES.md` (batch 1 prompts) and `art/review/people-qa.md` first. This brief overrides them wherever they differ, for the landing page only. Write only under `art/` and `public/audio/landing/`. Do not touch `src/` or `convex/`.

## Why this batch exists

The landing page opens on a girl who reads as 10 years old on the retired honey-waves gradient, then a uniformed schoolboy, then a parent with a child. Visitors read it as a children's homework app for one country. Takudzidza is for learners about 15 to 40, senior secondary through university and professional exams, in Zimbabwe and anywhere. The new set must look like that, and must look like a real editorial photo shoot, never like AI.

Retire from the landing (keep the files): `landing-hero`, `landing-form1`, `guardian-consent`.

## What makes images look AI made (reject any image that has these)

- Same face shape, same smile, same hairline repeated across people. Every person is described differently below; keep them different.
- Plastic or airbrushed skin, glowing rim light on every edge, perfect symmetry, glossy teeth.
- Everyone looking at camera, or everyone smiling the same amount.
- Hands with wrong fingers, objects floating instead of being held, pens that pass through fingers.
- Over saturated orange, teal shadows, heavy blur that makes a cardboard cutout look.
- Gibberish text on books, screens, clothes or walls.
- Overly tidy staged sets. Real study spaces have a mug, a charger cable, a few loose pages.

## Shared preamble (start every people prompt with this, word for word)

```text
Use case: photorealistic-natural.
Create ONE standalone photograph for Takudzidza by Taku, an international study app made in Zimbabwe and used worldwide. Ultra realistic editorial photography with the authenticity of a candid magazine shoot for a premium university or learning brand. Finest available photographic detail. 50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warm colour. Real skin texture with pores and natural variation, real fabric creases, credible depth of field. The person is mid study and unaware of the camera.
```

## Shared constraints (end every people prompt with this, word for word)

```text
Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, watermarks or signage anywhere, including clothing, books, screens and devices. Pages show only ruling, unlabeled geometric diagrams and soft indistinct tonal marks, never letter-like glyphs. Phone and laptop screens face away or show a blank warm glow. No camera-facing advertising pose, no generic stock-photo grin, no glamour makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or tourism motifs, no staged luxury. Every person reads clearly as 15 or older. Realistic hands, correct fingers and credible object contact.
```

## 1. Scene: `landing-ensemble` (16:10, target 2560x1600)

```text
[PREAMBLE]
Wide horizontal 16:10 composition, target 2560x1600 pixels.
Scene: A sunlit modern university library, long warm oak table, cream walls, tall window light from the right, a few softly blurred shelves. Lived-in detail: a ceramic mug, a charger cable, loose printed pages, a closed hardback.
Subjects, four distinct people sharing the table, each doing something different:
1. A Black Zimbabwean woman, age 22, deep espresso skin, oval face, high cheekbones, short natural coily hair, slim build, cream ribbed knit. Laptop open with lid facing camera, she points at a passage in a printed page, mid sentence, explaining to the man beside her.
2. A South Asian man, age 19, light brown skin, narrow face, wavy black hair falling across his forehead, slight stubble, olive overshirt over a white tee. He listens, highlighter uncapped over printed notes.
3. A West African woman, age 34, dark brown skin, strong jaw, tall, long braids gathered up in a plain ochre wrap, small gold studs, ochre blouse. Wireless headphones around her neck, reading a bound report with a pen in hand, quietly focused.
4. A European teen, age 17, fair skin with light freckles, soft round face, shoulder length light brown hair tucked behind one ear, butter yellow crewneck jumper. Holding a short stack of index cards, eyes up and to the side, recalling an answer.
Framing: Eye level from the far end of the table. Keep the left 42 percent of the frame as quiet softly lit wall and shelf with no faces so text can sit there. All four faces inside the central 70 percent so a centred mobile crop keeps them. Nobody looks at the camera. Only two of them smile slightly.
[CONSTRAINTS]
```

Then composite the scene so its quiet left side blends into the `paper-cotton` surface, as batch 1 did for scenes, never into a gradient.

## 2. Cutouts (4:5 portrait, target 2160x2700, plain warm grey background with soft even light so they cut out cleanly, then cut out with the batch 3 method and a separate contact shadow)

### `learner-snap-notes`
```text
[PREAMBLE]
Vertical 4:5, target 2160x2700, plain warm light grey studio background, soft even light, designed for clean background removal.
Subject: A Black South African woman, age 20, medium brown skin, heart-shaped face, freckles across her nose, curly shoulder length hair with a few loose strands, sage green linen shirt, thin silver ring. She stands over a desk-height surface, holding her phone flat above a page of handwritten notes to photograph it, both hands clearly visible, the notes page visible below the phone.
Framing: Waist up, three-quarter angle from her left, face in focus, slight concentration in her brow.
[CONSTRAINTS]
```

### `learner-listening`
```text
[PREAMBLE]
Vertical 4:5, target 2160x2700, plain warm light grey studio background, soft even light, designed for clean background removal.
Subject: A Kenyan man, age 27, very dark skin, long lean face, close cropped hair, short neat beard, charcoal chore jacket over a cream tee. Over-ear matte headphones on, seated, an open notebook on his knee, pen resting in his right hand, eyes half closed listening, a faint pleased expression.
Framing: Seated three-quarter body, slightly from his right, hands and notebook fully in frame.
[CONSTRAINTS]
```

### `learner-flashcards`
```text
[PREAMBLE]
Vertical 4:5, target 2160x2700, plain warm light grey studio background, soft even light, designed for clean background removal.
Subject: A Korean woman, age 18, light warm skin, straight black chin length bob with a blunt fringe, small build, honey coloured hoodie with sleeves pushed up. Holding a small fan of blank index cards in her left hand, right hand lifted mid gesture, eyes up and away recalling an answer, lips slightly parted.
Framing: Waist up, front three-quarter, cards and both hands clear.
[CONSTRAINTS]
```

### `seller-notes`
```text
[PREAMBLE]
Vertical 4:5, target 2160x2700, plain warm light grey studio background, soft even light, designed for clean background removal.
Subject: A Black Zimbabwean man, age 31, rich umber skin, broad build, round face, short neat locs, thin wire glasses, cream oxford shirt with rolled sleeves, a simple watch. Seated, arranging a neat ring binder of printed notes beside an unbranded laptop whose lid faces the camera. Reads as an accountant or tutor who is proud of his notes. Calm half smile.
Framing: Seated mid shot, binder and both hands clear.
[CONSTRAINTS]
```

### `lecturer-class`
```text
[PREAMBLE]
Vertical 4:5, target 2160x2700, plain warm light grey studio background, soft even light, designed for clean background removal.
Subject: A Lebanese woman, age 42, olive skin, angular face, dark wavy hair to the shoulder with a natural silver streak at the front, olive blazer over a cream top. Standing, explaining to an unseen class with an open right hand, holding a tablet against her body with the left, screen facing her.
Framing: Waist up, slightly low angle, confident and warm, not posed.
[CONSTRAINTS]
```

## 3. Objects (existing pipeline: `art/objects/<slug>.png` plus `-160`, `-320`, `-640` and `-shadow` WebPs, entries in `art/objects/manifest.json`)

Use the batch 4 finish Takunda chose. If no finish was chosen, use matte glazed ceramic in cream and honey. Make, as one consistent family with the same light, angle and shadow: `sun`, `moon`, `open-book`, `headphones`, `highlighter`, `index-cards`. Skip any that already exist.

## 4. Notebook covers (`cover-honey`, `cover-sage`, `cover-olive`, `cover-ochre`, `cover-charcoal`, `cover-cream`)

Closed hardback notebooks in real bookcloth, front on, soft contact shadow, transparent background, 3:4, 1200 px tall master. Blank fronts, no text, no embossing, visible cloth weave at 100 percent, slightly rounded corners, a hint of page block on the right edge. All six from the same shoot, same light.

## 5. Voices with ElevenLabs (marketing samples for the landing page)

Takunda's key must come from the environment variable `ELEVENLABS_API_KEY`. Never write the key into any file, script, log or commit. If the variable is missing, stop this part and say so.

Check the current ElevenLabs API docs for the best text to speech model and for the multi speaker dialogue endpoint before calling anything. Pick voices from the voice library that sound natural and unforced. Check that Takunda's plan allows commercial use of the voices chosen.

Make these files in `public/audio/landing/`, MP3, mono, 64 kbps:

**a. `summary-calm.mp3`**: a calm, warm British female voice, unhurried.
**b. `summary-upbeat.mp3`**: an upbeat, friendly young male voice with a Southern African accent if the library has a good one, otherwise a neutral international accent.
Both read this exact script:

```text
Here's the short version of your biology notes. Plants make their own food through photosynthesis. Chlorophyll, the green pigment in the chloroplasts, absorbs light energy. The plant uses that energy to turn carbon dioxide and water into glucose, and it gives off oxygen along the way. Leaves look green because chlorophyll reflects green light instead of absorbing it. That's page one, in thirty seconds.
```

**c. `overview-duo.mp3`**: a two host audio overview, about 50 seconds, natural back and forth, light laughter allowed, no music. Host A is the calm British woman, host B is the upbeat young man. Script:

```text
A: So today we're looking at one page of biology notes. Photosynthesis.
B: The classic. Plants basically cooking their own lunch.
A: Pretty much. The key player is chlorophyll. It sits inside the chloroplasts and it soaks up light energy.
B: Which is why leaves are green, right? It's the colour they don't want.
A: Exactly. Chlorophyll reflects green light, so green is what bounces back to your eyes.
B: Okay, and what does the plant actually do with all that energy?
A: It takes carbon dioxide from the air and water from the soil, and turns them into glucose.
B: And oxygen comes out the other side. Which, honestly, we should thank them for more often.
A: If this comes up in a paper, remember the inputs, the outputs, and the role of chlorophyll. That's usually three easy marks.
B: Inputs, outputs, chlorophyll. Got it.
```

Write a `public/audio/landing/manifest.json` with each file name, voice names, model, duration, bytes and the exact script. Record the method in `art/CODEX_NOTES.md` under Batch 5, with no key or secret anywhere.

## Delivery

1. One contact sheet `art/review/batch-5-landing.png`: the scene on top, the five cutouts on cream `#FFF8EC`, objects on cream and on near black `#121212`, the six covers in a row. File name labels on the sheet only.
2. Run the people QA from `art/review/people-qa.md` on every person, plus the reject list above. Regenerate anything that fails. Put the five cutouts side by side with every existing person in `art/assets` and reject any face that looks like someone already in the set.
3. Record every exact prompt, native size, scale and SHA 256 in `art/CODEX_NOTES.md` under Batch 5.
4. Run `art/web/build_web.py` so web sizes land in `public/art`, and add the new slugs to the scene, cutout and object manifests.
5. Commit as `Art batch 5 landing` and push. No pilot stop: ship the full set. Report in 6 lines or fewer, including total audio size.
