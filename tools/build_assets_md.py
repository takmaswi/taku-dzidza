"""Writes art/ASSETS.md from the shared batch 1 prompt blocks. Run: python3 tools/build_assets_md.py"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PREAMBLE_45 = (
    "Use case: photorealistic-natural.\n"
    "Create ONE standalone photograph for Takudzidza by Taku, an international study app launching in Zimbabwe. "
    "Ultra realistic editorial photography with the authenticity of a candid education magazine shoot. "
    "Vertical 4:5 composition, target 2160x2700 pixels, finest available photographic detail. "
    "50mm full-frame lens feel, natural perspective, soft natural window light, believable exposure and restrained warmth. "
    "Cream #FFF8EC and butter #F8E2A8 surroundings with small honey #F2B33D highlights. "
    "Quiet African warmth, modern international urban life. Real skin pores, subtle imperfections, natural asymmetry, "
    "real fabric creases, relaxed unposed posture. Clean soft background, enough breathing room for a large rounded card crop, "
    "keep faces and important hands clear of edges. No graphic border."
)
PREAMBLE_WIDE = PREAMBLE_45.replace(
    "Vertical 4:5 composition, target 2160x2700 pixels",
    "Horizontal 16:9 composition, target 3840x2160 pixels, subject placed in the right third leaving calm empty space on the left for page text",
).replace("enough breathing room for a large rounded card crop", "enough breathing room for a wide banner crop")
CONSTRAINTS = (
    "Strict constraints: absolutely no text, lettering, digits, readable handwriting, logos, brand marks, school crests, "
    "watermarks or signage anywhere, including clothing, books and devices. Textbook pages can contain only unlabeled geometric "
    "diagrams and soft indistinct tonal marks, with no letter-like glyphs; notes and exercise books show ruling and a few "
    "indistinct pencil traces, never readable writing. No camera-facing advertising pose, no generic stock-photo grin, no glamour "
    "makeup or retouching, no plastic or airbrushed skin, no cartoon, no 3D rendering, no rural or poverty imagery, no flags or "
    "tourism motifs, no staged luxury. Realistic hands, correct fingers and credible object contact."
)

# (slug, where it is used, shape, scene/subject/framing text)
ASSETS = [
    ("empty-flashcards", "Flashcards screen, empty state", "45",
     "Scene: A contemporary university residence desk by a bright window, pale cream wall, light timber surface.\n"
     "Subject: A Black Zimbabwean university student, age 20, warm mid brown skin, oval face, slim build, medium length twists tied back loosely. "
     "Plain sage green cotton sweatshirt. She holds a small stack of blank cream index cards in her left hand and turns one over with her right, "
     "a calm half smile of recall, eyes on the card, not the camera.\n"
     "Framing: Seated three-quarter portrait at desk height, face, both hands and the cards clear. A closed unbranded laptop and a pen on the desk. "
     "Index cards are blank or show only soft indistinct pencil traces."),
    ("empty-quiz", "Quiz and mock exam screen, empty state", "45",
     "Scene: A quiet modern school library study carrel with soft daylight, pale cream partition, blurred plain shelves.\n"
     "Subject: A Black Zimbabwean secondary school boy, age 16, deep brown skin, round face, stocky build, short neat high top fade. "
     "Plain white short-sleeved school shirt with no tie or crest. He is mid answer in a timed practice, pencil in right hand, left hand holding the page flat, "
     "brows lightly drawn in concentration, lips closed.\n"
     "Framing: Three-quarter seated portrait from slightly above the desk, face, hands and answer sheet visible. A plain wristwatch on the desk face down. "
     "The answer sheet shows only ruling and indistinct pencil traces."),
    ("audio-overview", "Audio overview player and read aloud intro", "45",
     "Scene: A clean modern city bus shelter at mid morning, softly blurred contemporary buildings and trees, cream and butter tones, no signage, no adverts, no vehicles in focus.\n"
     "Subject: A Black Southern African woman, age 24, light brown skin, long face, tall build, shoulder length braids. Plain honey cotton shirt, small backpack strap on one shoulder. "
     "She listens through simple unbranded wired earphones, eyes resting down and to the side, a relaxed focused expression, phone held loosely at waist height with screen turned away.\n"
     "Framing: Standing waist up portrait, face, earphones and phone hand clear, shallow depth of field."),
    ("class-share-teacher", "Class sharing screen for teachers and lecturers", "45",
     "Scene: A bright contemporary seminar room, pale cream walls, light timber tables, large window, softly blurred chairs.\n"
     "Subject: A Black Zimbabwean man, age 45, dark brown skin, broad face, short greying hair and a neat short beard, medium build. "
     "Plain cream long sleeved shirt with sleeves folded once. He is a lecturer holding an unbranded tablet in his left hand, screen turned away, "
     "and gesturing gently with his right hand as he explains to students out of frame, warm attentive expression, mouth slightly open mid sentence.\n"
     "Framing: Standing three-quarter portrait, face and both hands clear. Two blurred student shoulders at frame edge, no readable boards or screens."),
    ("guardian-consent", "Guardian consent screen for learners under 18", "45",
     "Scene: A contemporary urban family kitchen table in soft afternoon window light, pale cream walls, simple tidy shelves out of focus.\n"
     "Subjects: Exactly two people. A Black Zimbabwean mother, age 42, medium dark brown skin, oval face, full build, natural hair in a low bun, plain butter yellow blouse. "
     "Beside her, her son, age 13, warm brown skin, slim build, short cropped hair, plain grey T-shirt. They look together at an unbranded phone she holds, screen angled away from camera. "
     "She has a calm reassuring expression; he looks hopeful. Clearly related in skin tone and features, not duplicated faces.\n"
     "Framing: Seated medium two-shot including both faces, her hands and the phone, crop safe margins."),
    ("maths-hints", "Maths engine and hint ladder screen", "45",
     "Scene: A contemporary home study desk in soft daylight, pale cream tabletop, cream wall.\n"
     "Subject: Close photograph of only the hands and partial forearms of a Black African secondary learner with deep brown skin, short nails, plain white cotton sleeves. "
     "Right hand holds a pencil drawing a simple unlabeled triangle with a compass resting nearby; left hand steadies a squared paper exercise book. "
     "Exactly two anatomically credible hands. No face.\n"
     "Framing: Oblique overhead close-up. A geometry set with plain protractor and ruler with no markings or numbers, a closed plain textbook. "
     "Paper shows only grid lines and unlabeled geometric shapes, absolutely no letters or numbers."),
    ("study-planner", "Study plan and goals setup", "45",
     "Scene: A modern co-working space corner in early morning light, pale cream wall, light timber desk, a small plant out of focus.\n"
     "Subject: A Black Zimbabwean man, age 33, medium brown skin, narrow face, lean build, short neat locs tied back, thin metal frame glasses. "
     "Plain olive overshirt over a cream T-shirt. He is an adult studying for a professional accounting exam, writing in a blank week planner with only ruled boxes, "
     "an unbranded calculator face down beside it, thoughtful calm expression, eyes on the planner.\n"
     "Framing: Seated three-quarter portrait, face, both hands, planner and calculator clear. Planner boxes empty or with indistinct pencil marks only."),
    ("offline-downloads", "Offline downloads and low data mode screen", "45",
     "Scene: A tidy modern bedroom study nook at dusk, warm desk lamp light mixed with blue window light, pale cream wall, bedspread out of focus.\n"
     "Subject: A Black Zimbabwean secondary school girl, age 17, dark brown skin, heart shaped face, slim build, short natural afro. Plain butter yellow hoodie. "
     "She sits cross legged on a chair reading from an unbranded phone held in both hands, screen angled away, an open plain textbook on her knee, focused and calm.\n"
     "Framing: Seated three-quarter portrait, face, both hands, phone and book visible, gentle lamp glow."),
    ("study-group-later", "Study groups (later phase); also general marketing", "45",
     "Scene: A modern university campus courtyard table in open shade, pale stone and cream walls, soft green foliage blurred behind.\n"
     "Subjects: Exactly three different students revising together. A Black Zimbabwean woman age 22, dark brown skin, round face, long box braids, plain cream shirt; "
     "a Black Zimbabwean man age 23, light brown skin, long face, short twists, plain sage T-shirt; a Southern African woman of mixed heritage age 21, olive brown skin, "
     "curly shoulder length hair, plain honey cardigan. One points to a shared unlabeled diagram in an open book, the others listen. Nobody looks at the camera.\n"
     "Framing: Medium group shot including all three faces and the shared book, crop safe margins, distinct faces with no duplicated expressions."),
    ("landing-hero-wide", "Landing page hero on tablet and desktop", "wide",
     "Scene: A modern university library reading area with large windows, bright diffused light, light timber tables, softly blurred shelves of plain unlettered spines.\n"
     "Subject: A Black Zimbabwean woman, age 19, warm deep brown skin, oval face, slim build, short natural coils with a small side part. Plain cream cotton shirt. "
     "She reads from an open textbook of unlabeled diagrams with an unbranded phone resting beside it, screen down, quiet confident half smile, eyes on the page.\n"
     "Framing: Seated mid shot in the right third of the frame, face and both hands clear, the left two thirds calm window light and soft interior for headline text."),
]

def prompt(shape, body):
    pre = PREAMBLE_WIDE if shape == "wide" else PREAMBLE_45
    return f"{pre}\n{body}\n{CONSTRAINTS}"

out = [
    "# Takudzidza art asset list",
    "",
    "For Codex on Takunda's PC. Rules are in `art/STYLE.md`. Batch 1 (six files) is already in `art/assets/` with full provenance in `art/CODEX_NOTES.md`.",
    "Generated by `tools/build_assets_md.py`; edit the script, not this file.",
    "",
    "## Output sizes",
    "",
    "| Shape | Master (PNG, not shipped) | App file (WebP, shipped) | WebP rule |",
    "| --- | --- | --- | --- |",
    "| Card 4:5 | 2160x2700 | 1080x1350 | method 6, highest quality from 95 down that stays under 200,000 bytes |",
    "| Wide 16:9 | 3840x2160 | 1920x1080 | method 6, highest quality from 95 down that stays under 250,000 bytes |",
    "| Social 1.91:1 | crop of the wide master | 1200x630 | method 6, under 120,000 bytes; text is added in code, never in the image |",
    "",
    "Record native generator dimensions and scale to master in `art/CODEX_NOTES.md`, as batch 1 did.",
    "",
    "## Batch 1 (done)",
    "",
    "| File | Used on |",
    "| --- | --- |",
    "| `art/assets/onboarding-1-secondary-student.webp` | Onboarding step 1 (secondary) |",
    "| `art/assets/onboarding-2-senior-student.webp` | Onboarding step 2 (A Level and university) |",
    "| `art/assets/onboarding-3-professional.webp` | Onboarding step 3 (professional exams) |",
    "| `art/assets/dashboard-hero-university.webp` | Dashboard welcome card |",
    "| `art/assets/empty-notebook.webp` | Notebooks, empty state and add source |",
    "| `art/assets/exam-coach.webp` | Exam coach intro |",
    "",
    "## Batch 2 (to make)",
    "",
    "| File | Used on | Shape |",
    "| --- | --- | --- |",
]
for slug, use, shape, _ in ASSETS:
    sz = "1920x1080 (+ 1200x630 social crop `art/assets/og-default.webp`)" if shape == "wide" else "1080x1350"
    out.append(f"| `art/assets/{slug}.webp` and `.png` | {use} | {sz} |")
out += ["", "Until a file exists the app shows a labelled placeholder card (`ImageSlot` component, Phase 1) with the slug, so nothing breaks.", ""]
for i, (slug, use, shape, body) in enumerate(ASSETS, 1):
    out += [f"### {i}. {slug}", "", f"Used on: {use}.", "", "```text", prompt(shape, body), "```", ""]
(ROOT / "art" / "ASSETS.md").write_text("\n".join(out), encoding="utf-8")
print("wrote art/ASSETS.md with", len(ASSETS), "prompts")
