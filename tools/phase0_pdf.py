"""Builds docs/Takudzidza-Phase0.pdf, Takunda's copy of SPEC.md.

Run: python3 tools/phase0_pdf.py
User facing copy rule: no hyphens, en dashes or em dashes outside URLs. The script refuses to build if any slip in.
"""
import re
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "Takudzidza-Phase0.pdf"

CREAM, BUTTER, HONEY, INK, SOFT, MSASA, SAGE = (HexColor(h) for h in ("#FFF8EC", "#F8E2A8", "#F2B33D", "#111111", "#5C5346", "#B4452F", "#4F6B54"))

# Lexend could not be downloaded in the build environment; DejaVu Sans is the stand in for this PDF only.
pdfmetrics.registerFont(TTFont("Body", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("Bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))

H1 = ParagraphStyle("h1", fontName="Bold", fontSize=22, leading=27, textColor=INK, spaceAfter=8)
H2 = ParagraphStyle("h2", fontName="Bold", fontSize=14, leading=18, textColor=INK, spaceBefore=10, spaceAfter=5)
P = ParagraphStyle("p", fontName="Body", fontSize=9.6, leading=13.6, textColor=INK, alignment=TA_LEFT, spaceAfter=5)
SMALL = ParagraphStyle("s", parent=P, fontSize=8, leading=11, textColor=SOFT)
CELL = ParagraphStyle("c", parent=P, fontSize=8.4, leading=11.2, spaceAfter=0)
CELLB = ParagraphStyle("cb", parent=CELL, fontName="Bold")

ALL_TEXT: list[str] = []


def t(s: str) -> str:
    ALL_TEXT.append(s)
    return s


def para(s, style=P):
    return Paragraph(t(s), style)


def bullets(items):
    return [para("• " + i) for i in items]


def table(rows, widths, header=True):
    data = [[Paragraph(t(str(c)), CELLB if (header and r == 0) else CELL) for c in row] for r, row in enumerate(rows)]
    tb = Table(data, colWidths=[w * mm for w in widths], repeatRows=1 if header else 0)
    style = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, HexColor("#E6D6B0")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("BACKGROUND", (0, 1), (-1, -1), HexColor("#FFFDF8")),
    ]
    if header:
        style.append(("BACKGROUND", (0, 0), (-1, 0), BUTTER))
    tb.setStyle(TableStyle(style))
    return tb


def page_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    canvas.setFillColor(SOFT)
    canvas.setFont("Body", 7.5)
    canvas.drawString(18 * mm, 10 * mm, "Takudzidza by Taku  ·  Agreed plan  ·  29 October 2026")
    canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, str(doc.page))
    canvas.restoreState()


s = []
s += [Spacer(1, 8 * mm), para("Takudzidza by Taku", H1),
      para("The agreed plan", ParagraphStyle("sub", parent=H2, textColor=SOFT, spaceBefore=0)),
      Spacer(1, 4 * mm),
      para("For Takunda Maswi, 29 October 2026. This is what we agreed in chat. The full technical version for agents is SPEC.md in the repo."),
      para("In one paragraph", H2),
      para("Takudzidza is a set of study tools for anyone from Form 1 upward, for any course or exam: ZIMSEC, Cambridge, ACCA, CTA, university. Learners add their own notes, photos, PDFs and links, "
           "and Taku, the tutor, turns them into summaries, flashcards, quizzes, mock exams, mind maps, audio and a scroll feed. Every answer links to the page it came from and is checked before it is shown. "
           "It is built for Zimbabwe first: cheap Android phones, offline downloads, low data, ChiShona, guardian consent for under 18s."),
      para("What you decided", H2),
      table([["Topic", "Decision"],
             ["Tutor", "Called Taku. One tutor voice inside every tool. No character picture."],
             ["Answers", "The learner chooses. Default: the answer with full working. A Guide me toggle makes Taku coach with hints instead."],
             ["Exams", "Any course works from the learner’s own material. Built in syllabus lists start with ZIMSEC O and A Level and Cambridge, then ACCA."],
             ["Study styles", "Locked In (all business, no faff), Cook Mode (vibrant, for teens), Calm (subtle, like NotebookLM). An optional short quiz picks one; skipping gives a default."],
             ["Accessibility", "A separate mode for dyslexia and slow reading: bigger spacing, read aloud with highlighting, shorter chunks, high contrast."],
             ["Learning from feedback", "Thumbs and quick chips like too long or too hard adjust each learner’s settings. Learner content never trains AI models."],
             ["Scroll", "The doom scroll feed for notes, with marketing style hooks. Free."],
             ["Paid extras", "Reels, podcast and story mode. AI comics and video later, your call."],
             ["Artifacts", "Interactive graphs, simulations, timelines and mind maps first; custom artifacts later."],
             ["Accuracy", "No Python engine. Checks underneath the AI: a maths checker, a number check, a quote check on every source, and a second AI opinion on marking keys."],
             ["Music", "Later: study music made with music models, shared playlists."],
             ["Get help", "A section always one tap away. Childline 116 for under 18s; adult numbers once verified."],
             ["Look", "Your palette and Lexend, plus one dark brown for small text."],
             ["Tests", "I design them from your Amai Learn tests to look like a real exam board paper. You approve a sample first."],
             ["Platform", "Installable web app on Android first, Play Store later."],
             ["Pricing", "Open. Free at launch; no payment code until you decide."],
             ["Photos", "I build with labelled placeholders; you run Codex whenever suits you. Prompts are in art/ASSETS.md, including three for the study style quiz."]], [36, 138]),
      para("Build order", H2),
      para("Every phase passes all its tests with the AI mocked before the next starts. Live AI only runs with a spending cap stated first."),
      table([["Phase", "What gets built"],
             ["1 Foundation", "App shell, look, study styles, accessibility, accounts, guardian consent, delete account, safety filter, Get help"],
             ["2 Notebooks", "Add sources, ask Taku, page citations with quote checks, Only my material or My material plus Taku’s ideas"],
             ["3 Study outputs", "Summaries, flashcards, quizzes and mock exams, mind maps, read aloud, Scroll with hooks"],
             ["4 Dashboard", "Goals, study plan, progress without streaks, weak topics"],
             ["5 Checks and exams", "Maths checker, number check, second opinion, Guide me, syllabus practice, uploaded past papers"],
             ["6 Reach and media", "Class sharing, offline, low data, ChiShona, interactive visuals, podcast, reels, story mode"],
             ["7 Business", "Payments by EcoCash once pricing is set, school licences, admin"],
             ["8 Later", "Study music, custom artifacts, study groups, comics and video if approved"]], [36, 138]),
      para("Target before the credit ends (5 November, 09:59 Harare): phases 1 and 2 working and tested, phase 3 started.", SMALL),
      para("What I need from you", H2)]
s += bullets(["Add the Convex deploy key, the Vercel project and the OpenRouter key in this environment’s settings (environment menu in the session title bar, then Edit). Never paste keys into chat. A new session picks them up.",
              "Run Codex for batch 2 whenever you can. Nothing waits on it.",
              "Decide pricing when you are ready."])
s += [para("Sources", H2),
      para("Evidence and links are in SPEC.md section 13 and docs/SOURCES.md. Key study: Bastani and others, PNAS 122(26), 2025: plain GPT 4 lifted practice scores 48 percent "
           "but cut later unaided grades by 17 percent; a hint giving version largely removed that harm. https://knowledge.wharton.upenn.edu/article/without-guardrails-generative-ai-can-harm-education/", SMALL)]

# Copy rule: no hyphen, en dash or em dash outside URLs.
for text in ALL_TEXT:
    bare = re.sub(r"https?://\S+", "", text)
    bad = [ch for ch in ("-", "–", "—", "‑") if ch in bare]
    if bad:
        raise SystemExit(f"Dash or hyphen in copy: {bad} in: {text[:120]}")

doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
                        title="Takudzidza by Taku: agreed plan", author="Takudzidza by Taku")
doc.build(s, onFirstPage=page_bg, onLaterPages=page_bg)
print("wrote", OUT.relative_to(ROOT))
