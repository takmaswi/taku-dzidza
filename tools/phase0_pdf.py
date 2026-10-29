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
    canvas.drawString(18 * mm, 10 * mm, "Takudzidza by Taku  ·  Phase 0 for approval  ·  29 October 2026")
    canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, str(doc.page))
    canvas.restoreState()


s = []
s += [Spacer(1, 30 * mm), para("Takudzidza by Taku", H1),
      para("Phase 0: product spec and build plan", ParagraphStyle("sub", parent=H2, textColor=SOFT, spaceBefore=0)),
      Spacer(1, 6 * mm),
      para("For Takunda Maswi. Prepared 29 October 2026. Nothing has been built yet. This document asks for your approval and eleven decisions (page "
           "“Decisions for you”). The full technical version for agents is SPEC.md in the repo."),
      Spacer(1, 6 * mm), para("What I am asking", H2)]
s += bullets([
    "Approve the direction: tools first, with Chris as the one tutor voice inside every tool.",
    "Answer decisions D1 to D11, or reply “go with your recommendations”.",
    "Send your test making skill file. Quizzes and mock exams wait for it.",
    "Set up the Convex project and deploy key, the Vercel project and the OpenRouter key as environment variables on this cloud environment. Until then I build in mock mode.",
])
s += [para("Credit window: this cloud session ends 5 November 2026 at 09:59 Harare time. If you approve today, the target is the foundation and notebooks fully working and tested, "
           "with study outputs started. I will not promise more than what passes its tests.", SMALL), PageBreak()]

s += [para("1. What Takudzidza is", H2),
      para("A study platform for anyone from Form 1 upward: ZIMSEC O Level and A Level and Cambridge learners, university and college students, and adults studying for professional exams. "
           "It launches in Zimbabwe and is built so exam boards, languages and currencies are settings, not rewrites. Amai Learn hands children over at Form 1. Takubasa stays the adult work platform."),
      para("What changes from the July design", H2),
      para("July planned an offline tutor running small models on the phone, with lesson packs written by teachers. This plan puts the learner’s own material at the centre, like NotebookLM, "
           "in a web app that installs on Android and downloads notebooks for offline use. Kept from July: the teaching rules live in code, the maths engine holds the answer, "
           "level controls, no past paper sharing, and cheap phones as a hard limit. Phone models and the school hub are paused, not dropped. The July documents move to an archive folder."),
      para("2. Chris, the tutor", H2),
      para("Recommendation: the app is a set of study tools, and Chris is the single tutor voice inside each one. Not a mascot, not a companion, no character picture unless you choose one."),
      para("Why hints first: in a trial with about 1,000 high school maths students (Bastani and others, PNAS, 2025), students given plain GPT 4 scored 48 percent better in practice but 17 percent "
           "lower than students with no AI once it was taken away. A version built to give hints instead of answers largely removed that harm. I checked the paper’s details through RePEc, SSRN and "
           "Wharton’s write up; the PNAS site itself was blocked from this session. Note the wording: “largely removed”, not “did no harm”."),
      para("The rule in the app: every notebook is marked Studying or Homework and tests. For homework and tests Chris gives hints and questions, never the final answer or a finished essay. "
           "For studying Chris can explain fully. Maths always goes through the maths engine, which keeps the answer away from the AI."),
      para("Chris modes, each built like a Takubasa agent so new ones can be added the same way:", P)]
s += [table([["Mode", "What it does"],
             ["Summarise", "Summary or study guide from your sources, each point linked to its page"],
             ["Explain it simply", "Plain explanation at your level"],
             ["Quiz me", "Quiz or mock exam at your chosen difficulty, with a marking key"],
             ["Flashcards", "Cards from your sources with Got it and Try again"],
             ["Exam coach", "Syllabus aligned practice, marked against a key"],
             ["Essay feedback", "Comments and questions on your draft; never rewrites work you will hand in"],
             ["Audio overview", "A spoken overview of your sources, plus read aloud"],
             ["Study planner", "A plan from your exam dates, subjects and hours per week"]], [40, 134]), PageBreak()]

s += [para("3. The core product", H2)]
s += bullets([
    "<b>Dashboard first.</b> Exam dates, subjects and hours per week; a study plan; progress without streaks or guilt; weak topics from your quiz and card results.",
    "<b>Notebooks.</b> Add PDFs, Word files, phone photos of notes and textbook pages, pasted text and web links. Every answer links to the page it came from. "
    "Choose “Only my material” or “My material plus Chris’s ideas”; every addition from Chris is marked.",
    "<b>Stronger citation check than Amai Learn.</b> Amai Learn checks that a cited page belongs to the topic. Takudzidza also checks that a short quote really appears on that page, and drops or marks anything that fails.",
    "<b>Study outputs.</b> Summaries, study guides, flashcards with spaced repetition, quizzes and mock exams with marking keys, mind maps, audio overviews, read aloud and print packs.",
    "<b>Exam focus.</b> Practice aligned to ZIMSEC and Cambridge syllabus topics. Past paper practice only from papers you upload yourself; papers are never shared.",
    "<b>Maths and science.</b> I found your earlier maths tutor in taku‑dzidza‑local".replace("‑", " ") + ": a SymPy solver that solves, factors, simplifies and expands, with a simple router. "
    "Recommendation: rebuild that logic in TypeScript so it runs on the server and offline on the phone, and keep its cases as tests.",
    "<b>Sharing.</b> A teacher or lecturer shares a notebook with a class as view only. Study groups come later.",
    "<b>Access.</b> English first, ChiShona next, offline downloads of notebooks and audio, a low data mode, and a speed budget tested on a low end Android profile.",
    "<b>Safety.</b> Under 18s need a guardian’s consent before a profile exists (Cyber and Data Protection Act, section 26 according to DLA Piper’s summary; to be checked against the gazetted text). "
    "Amai Learn’s safety layers, retuned so normal school topics pass. Childline 116 shown to under 18s in distress. No companion behaviour, no ads, no training on learner data, zero data retention AI routes only.",
])
s += [para("4. Look and feel", H2),
      para("Warm cream and butter, black pill buttons, large rounded cards, generous spacing, and the Lexend typeface (made for easy reading). The colours sit right beside Amai Learn’s cream, gold, "
           "coral and leaf, so the two products look related. I added one colour, Ink Soft, for secondary text.")]
sw = Table([[""] * 7, [t(x) for x in ("Cream", "Butter", "Honey", "Ink", "Ink Soft", "Msasa Red", "Sage")],
            [t(x) for x in ("#FFF8EC", "#F8E2A8", "#F2B33D", "#111111", "#5C5346", "#B4452F", "#4F6B54")]],
           colWidths=[24.8 * mm] * 7, rowHeights=[14 * mm, 6 * mm, 5 * mm])
sw.setStyle(TableStyle([("BACKGROUND", (i, 0), (i, 0), c) for i, c in enumerate((CREAM, BUTTER, HONEY, INK, SOFT, MSASA, SAGE))] +
                       [("BOX", (0, 0), (0, 0), 0.4, SOFT), ("FONT", (0, 1), (-1, 1), "Bold", 7.5), ("FONT", (0, 2), (-1, 2), "Body", 7), ("ALIGN", (0, 1), (-1, -1), "CENTER")]))
s += [sw, Spacer(1, 3 * mm),
      para("Contrast check (WCAG AA needs 4.5 for normal text, 3 for large text):"),
      table([["Text colour", "On Cream", "On Butter", "On Honey"],
             ["Ink", "17.89 pass", "14.78 pass", "10.15 pass"],
             ["Ink Soft", "7.15 pass", "5.91 pass", "4.06 large text only"],
             ["Msasa Red", "5.19 pass", "4.29 large text only", "2.95 fail"],
             ["Sage", "5.58 pass", "4.61 pass", "3.17 large text only"],
             ["Honey", "1.76 fail", "1.46 fail", ""]], [40, 44, 45, 45]),
      Spacer(1, 2 * mm),
      para("Rules that follow: Honey is a fill only, never text. Only Ink sits on Honey. Msasa Red body text never sits on Butter. Cream text on Ink, Msasa Red or Sage passes. A test will enforce these.", SMALL),
      para("Photography: realistic, modern learners with quiet African warmth, no rural scenes, no cartoons, no generated images in the app. Codex batch 1 (six photos) is in the repo. "
           "I wrote the style rules and ten new prompts in the repo (art/STYLE.md and art/ASSETS.md) for you to run on your PC. Until each photo lands, the app shows a labelled placeholder.", P)]

s += [para("5. What we reuse", H2),
      table([["Need", "Taken from"],
             ["Reading PDFs, Word files and photos; source modes; citation check", "Amai Learn"],
             ["AI router with zero data retention and strict structured answers", "Amai Learn"],
             ["Safety filter, model checks, red team script", "Amai Learn"],
             ["Consent records, account delete, retention clean up", "Amai Learn, Takubasa learner consent record"],
             ["Read aloud, print packs, offline downloads", "Amai Learn"],
             ["Agent package format for Chris modes", "Takubasa"],
             ["Study agent tests (past paper refusal, syllabus honesty), humaniser rules", "Takubasa"],
             ["Number checking against sources", "Takubasa"],
             ["Budgets, usage, brains console, sign offs, admin console", "Takubasa (later phase)"],
             ["Maths solver", "taku dzidza local (rebuilt in TypeScript)"],
             ["Not reused now", "TAKU dzidza v2 desktop app and phone model, Takubasa image brains and Studio"]], [110, 64]),
      para("6. Competitors and local options", H2),
      para("Prices come mostly from third party listings; the official Knowt and Khanmigo pages were blocked from this session, so treat them as indicative.", SMALL),
      table([["Product", "Strength", "Price seen", "Our gap to fill"],
             ["NotebookLM", "Own sources, cited answers, audio overviews, cards and quizzes", "Free tier; paid via Google AI plans, figures conflict", "No exam focus, no hint mode, no guardian consent, no EcoCash"],
             ["Quizlet", "Flashcards, Learn mode", "About USD 7.99 a month or 35.99 a year", "AI modes paywalled, not syllabus aware"],
             ["Knowt", "Free notes to flashcards", "Listings conflict", "Not cited to page, not local"],
             ["Studocu", "Shared course documents, AI summaries", "Varies by country", "Built on shared documents, which we will not do"],
             ["Khanmigo", "Tutor that holds back answers", "About USD 4 a month for learners", "US curriculum, not your own sources"],
             ["Skoolie Zimbabwe", "ZIMSEC and Cambridge video lessons", "Not seen", "Video only"],
             ["Dzidzo paDen", "Free ZIMSEC papers and notes on WhatsApp", "Free", "No tutor or tools"],
             ["Wagona Maths", "ZIMSEC and IGCSE maths", "Not seen", "Maths only"]], [27, 50, 45, 52]),
      PageBreak()]

s += [para("7. Build plan", H2),
      para("Every phase must pass lint, type checks, unit tests, the production build and browser tests, all with the AI mocked. Live AI calls only run with a spending cap I state first. One commit per phase."),
      table([["Phase", "What gets built", "Gate"],
             ["0", "This plan, the PDF, art rules and prompts", "Your approval and decisions"],
             ["1 Foundation", "App shell from Amai Learn, colours and type, accounts, guardian consent, delete account, safety filter, mocked AI", "All checks green, consent tested"],
             ["2 Notebooks", "Add sources, ask Chris, page citations with quote check, source mode toggle", "No uncited claim in Only my material"],
             ["3 Study outputs", "Chris modes, summaries, cards with spaced repetition, quizzes and mocks, mind maps, read aloud", "Red team pass; you review 10 tests"],
             ["4 Dashboard", "Goals, study plan, progress, weak topics", "Onboarding to first plan tested"],
             ["5 Maths and exams", "Maths engine, hint ladder, syllabus practice, uploaded past papers", "No answer leaks in red team"],
             ["6 Reach", "Class sharing, offline downloads, low data mode, ChiShona, audio overviews", "Offline and low end phone tests"],
             ["7 Business", "Plans, EcoCash payments, school licences, admin and budgets", "Capped live payment test; you sign"]], [26, 100, 48]),
      para("8. Pricing proposal", H2),
      para("What I could verify: Khanmigo charges learners about USD 4 a month; Quizlet Plus about USD 35.99 a year; Econet has advertised 1 GB of data for USD 1 (offer date to recheck), and Paynow lists "
           "a 30 day private WiFi bundle of 4 GB plus 1 GB off peak for USD 9. I found no public price for a Zimbabwean revision app paid by EcoCash. The AI cost per learner is unknown until we measure it in Phase 2."),
      para("Proposal to test with about 20 learner interviews before any billing code:")]
s += bullets(["<b>Free:</b> 3 notebooks, a daily allowance of Chris, unlimited flashcards, 1 offline notebook.",
              "<b>Student:</b> USD 2 a month or USD 5 a term by EcoCash. Term pricing matches how families budget school costs.",
              "<b>Schools and universities:</b> per learner per year, quoted per institution; teacher accounts free.",
              "<b>Zero rating:</b> approach Econet and NetOne once a pilot shows real use."])
s += [PageBreak(), para("9. Decisions for you", H2),
      table([["#", "Decision", "My recommendation"],
             ["D1", "Chris as tutor voice inside tools, or tools only", "Tutor voice inside tools"],
             ["D2", "Pricing", "As in section 8, after interviews"],
             ["D3", "First exam boards", "ZIMSEC O Level and A Level, plus Cambridge IGCSE topic lists"],
             ["D4", "Launch subjects for syllabus practice", "Mathematics, Combined Science, English Language; every subject works through notebooks"],
             ["D5", "Palette and Lexend", "Approve, with Ink Soft added"],
             ["D6", "Maths engine", "Rebuild your SymPy solver in TypeScript"],
             ["D7", "Visible Chris character", "None"],
             ["D8", "Search inside notebooks", "Use a zero data retention embeddings route, checked on the day of building"],
             ["D9", "Platform", "Installable web app first, Android wrapper later, phone models paused"],
             ["D10", "Your test making skill file", "Please send it"],
             ["D11", "Adult distress helpline", "You name one; until then a general line to seek a doctor or emergency services"]], [12, 66, 96]),
      Spacer(1, 4 * mm), para("10. Risks", H2)]
s += bullets(["Quote checks on scanned pages may miss due to reading errors; we will tune the match on real test files.",
              "AI cost per learner is not known yet; spending caps and a cheaper model fallback limit exposure.",
              "I read summaries of the data protection law, not the full gazetted text; it must be checked before launch.",
              "Learners may mark homework as studying; maths hints are enforced by the engine regardless."])
s += [para("Sources", H2),
      para("Checked 29 October 2026. Full list with links is in SPEC.md section 13 and docs/SOURCES.md.", SMALL)]
for src in [
    "Bastani and others, Generative AI without guardrails can harm learning, PNAS 122(26), 2025. https://econpapers.repec.org/RePEc:nas:journl:v:122:y:2025:p:e2422633122 and https://knowledge.wharton.upenn.edu/article/without-guardrails-generative-ai-can-harm-education/",
    "NotebookLM limits: https://freeacademy.ai/blog/notebooklm-free-vs-plus-2026",
    "Quizlet: https://nibble-app.com/blog/quizlet-cost  ·  Khanmigo: https://toolradar.com/tools/khanmigo/pricing  ·  Knowt: https://toolradar.com/tools/knowt/pricing",
    "Studocu: https://apps.apple.com/app/id1460235511  ·  Skoolie Zimbabwe: https://mwm.ai/apps/skoolie-zimbabwe/6782972508",
    "Econet data: https://techzim.co.zw/econet-now-offering-1-gb-for-1-in-latest-data-bundle-adjustment and https://paynow.co.zw/blog/econet-private-wifi-bundles-cost-validity-and-how-to-buy-online/",
    "Children’s data: https://www.dlapiperdataprotection.com/index.html?c=zw&t=law  ·  Childline 116: https://www.unicef.org/zimbabwe/stories/zimbabwe-free-helpline-116-spells-hope-children",
]:
    s.append(para(src, SMALL))

# Copy rule: no hyphen, en dash or em dash outside URLs.
for text in ALL_TEXT:
    bare = re.sub(r"https?://\S+", "", text)
    bad = [ch for ch in ("-", "–", "—", "‑") if ch in bare]
    if bad:
        raise SystemExit(f"Dash or hyphen in copy: {bad} in: {text[:120]}")

doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
                        title="Takudzidza by Taku: Phase 0", author="Takudzidza by Taku")
doc.build(s, onFirstPage=page_bg, onLaterPages=page_bg)
print("wrote", OUT.relative_to(ROOT))
