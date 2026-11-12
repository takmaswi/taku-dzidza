"""Builds docs/Polish-2-Report.pdf: before and after screenshots of Polish 2.

Run from the repo root:
  python tools/polish2_report_pdf.py <before dir> <after dir> <extras dir> <unit tests line> <e2e line> [<2b dir> <2b unit line> <2b e2e line>]

The before and after dirs come from scripts/screens-polish.mjs (light-desktop,
light-phone, dark-desktop, dark-phone). The extras dir holds objects.png,
motion-crossfade-mid.png (Home just after the switch to dark) and motion-confetti.png. The optional
2b dir (scripts/screens-polish.mjs <dir> all short) adds the Polish 2b addendum at the end. Copy rule: no hyphens, en
dashes or em dashes in the text; the script refuses to build if any slip in.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image as RLImage
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "Polish-2-Report.pdf"
BEFORE, AFTER, EXTRAS = (Path(a) for a in sys.argv[1:4])
UNIT, E2E = sys.argv[4], sys.argv[5]
ADDENDUM = Path(sys.argv[6]) if len(sys.argv) > 6 else None
UNIT_2B, E2E_2B = (sys.argv[7], sys.argv[8]) if ADDENDUM else ("", "")
TMP = EXTRAS / "pdf-images"
TMP.mkdir(parents=True, exist_ok=True)

CREAM, BUTTER, INK, SOFT, LINE = (
    HexColor(h) for h in ("#FFF8EC", "#F8E2A8", "#111111", "#5C5346", "#E4D9C4")
)
FONTS = Path("C:/Windows/Fonts")
pdfmetrics.registerFont(TTFont("Body", FONTS / "arial.ttf"))
pdfmetrics.registerFont(TTFont("Bold", FONTS / "arialbd.ttf"))
pdfmetrics.registerFontFamily(
    "Body", normal="Body", bold="Bold", italic="Body", boldItalic="Bold"
)

H1 = ParagraphStyle(
    "h1", fontName="Bold", fontSize=24, leading=29, textColor=INK, spaceAfter=6
)
H2 = ParagraphStyle(
    "h2", fontName="Bold", fontSize=15, leading=19, textColor=INK, spaceAfter=3
)
P = ParagraphStyle(
    "p", fontName="Body", fontSize=10, leading=14.2, textColor=INK, spaceAfter=4
)
NOTE = ParagraphStyle("note", parent=P, fontSize=9.6, leading=13.4, textColor=INK)
BULLET = ParagraphStyle("b", parent=P, leftIndent=11, bulletIndent=0, spaceAfter=2.5)
LABEL = ParagraphStyle(
    "label", fontName="Bold", fontSize=8, leading=10, textColor=SOFT, alignment=1
)

ALL_TEXT: list[str] = []
PAGE_W, PAGE_H = landscape(A4)
MARGIN = 12 * mm
USABLE_W = PAGE_W - 2 * MARGIN


def t(text: str) -> str:
    ALL_TEXT.append(text)
    return text


def para(text: str, style: ParagraphStyle = P) -> Paragraph:
    return Paragraph(t(text), style)


def bullets(items: list[str]) -> list[Paragraph]:
    return [Paragraph(t(i), BULLET, bulletText="\u2022") for i in items]


def picture(path: Path, width: float, height: float) -> RLImage | Paragraph:
    """The screenshot, scaled to fit the box, saved as a JPEG so the PDF stays small."""
    if not path.exists():
        return para("Not in this set.", LABEL)
    im = Image.open(path).convert("RGB")
    scale = min(width / im.width, height / im.height)
    w, h = im.width * scale, im.height * scale
    px = max(1, round(w / mm * 6))  # about 150 dpi
    small = im.resize((px, round(px * im.height / im.width)), Image.Resampling.LANCZOS)
    out = TMP / f"{path.parent.parent.name}-{path.parent.name}-{path.stem}.jpg"
    small.save(out, "JPEG", quality=84)
    img = RLImage(str(out), width=w, height=h)
    return img


def framed(cells: list[list], col_w: float) -> Table:
    table = Table(cells, colWidths=[col_w] * len(cells[0]))
    table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    return table


def desktop_page(
    title: str,
    shot: str,
    note: str,
    before: bool = True,
    left: Path = BEFORE,
    right: Path = AFTER,
    names: tuple[str, str] = ("Before", "After"),
) -> list:
    """Light and dark at 1280 wide, before on the left, after on the right."""
    col = USABLE_W / 2
    img_w, img_h = col - 8, 62 * mm
    rows = []
    for theme in ("light", "dark"):
        b = (
            picture(left / f"{theme}-desktop" / f"{shot}.png", img_w, img_h)
            if before
            else para("New in this set.", LABEL)
        )
        a = picture(right / f"{theme}-desktop" / f"{shot}.png", img_w, img_h)
        rows.append(
            [para(f"{names[0]}, {theme}", LABEL), para(f"{names[1]}, {theme}", LABEL)]
        )
        rows.append([b, a])
    return [
        para(f"{title}: computer, 1280 wide", H2),
        para(note, NOTE),
        Spacer(1, 2 * mm),
        framed(rows, col),
        PageBreak(),
    ]


def phone_page(
    title: str,
    shot: str,
    note: str,
    before: bool = True,
    left: Path = BEFORE,
    right: Path = AFTER,
    names: tuple[str, str] = ("Before", "After"),
) -> list:
    """Light and dark at 390 wide: before light, after light, before dark, after dark."""
    col = USABLE_W / 4
    img_w, img_h = col - 8, 150 * mm
    labels, pics = [], []
    for theme in ("light", "dark"):
        for when, base in ((names[0], left), (names[1], right)):
            labels.append(para(f"{when}, {theme}", LABEL))
            pics.append(
                picture(base / f"{theme}-phone" / f"{shot}.png", img_w, img_h)
                if (before or base is right)
                else para("New in this set.", LABEL)
            )
    return [
        para(f"{title}: phone, 390 wide", H2),
        para(note, NOTE),
        Spacer(1, 2 * mm),
        framed([labels, pics], col),
        PageBreak(),
    ]


SCREENS = [
    (
        "Home",
        "1-home-returning",
        "The honey wave wallpaper is gone. The page is cotton paper with a fine tooth, and the panels are near white card with a soft edge. "
        "The photo of three students is replaced by the sky for the time of day: a sun before 12:00, a low sun in the afternoon and a moon after 17:00 (these were taken in the evening). "
        "The word under the greeting sits on a strip of honey book cloth. Cards due today has a small stack of index cards instead of the sticky note, so the card never looks empty. "
        "Dark mode is near black linen with honey accents. The Ask button before you type was a faded grey in light and a muddy brown in dark; it is now a quiet warm fill.",
        True,
    ),
    (
        "Ask Taku, empty",
        "7-chat-empty",
        "The cutout of a student is replaced by a cut paper speech bubble. Everything else keeps its place. The send button now rests in the quiet fill until you type.",
        True,
    ),
    (
        "Ask Taku, with an answer",
        "7-chat",
        "Same layout. The changes are the paper page, the card stock side list and the honey cloth behind Ask Taku in the rail.",
        True,
    ),
    (
        "Notebooks, empty",
        "2-notebooks-empty",
        "Before, a person stood in the corner and a single line of text sat alone under the buttons. Now the message sits in a centred card with an open book, so the screen reads as a clear first step.",
        True,
    ),
    (
        "Notebooks, one notebook",
        "2-notebooks",
        "The notebook card is card stock on the paper page. Cards lift a little on hover and press in on click.",
        True,
    ),
    (
        "A new notebook",
        "3-notebook-empty",
        "The scene of a learner is replaced by the open book. The four add tiles lift on hover. On a phone the book sits under the heading at a smaller size.",
        True,
    ),
    (
        "A notebook, chatting",
        "4-notebook",
        "The working screen keeps its layout. Paper page, card stock panes, honey cloth on the active rail item.",
        True,
    ),
    (
        "Flashcards",
        "5-review",
        "No people in focus mode either. The card itself is unchanged.",
        True,
    ),
    (
        "Flashcards, done",
        "6-review-done",
        "The cutout is replaced by a star medal. When a review finishes, the medal settles in and a short burst of honey paper confetti falls from it, once. "
        "It never plays when Less motion is on or the phone asks for less motion (these screenshots were taken that way; the motion page shows it playing).",
        True,
    ),
    (
        "Settings",
        "8-settings",
        "Study style choices now stack in one column, so the text no longer wraps into a thin tower. "
        "The switches were hard to read: off was a dark track that looked almost like on. Now off is an outlined track with a small knob, and on is filled with a full knob on the other side. "
        "The selected choice is honey book cloth in light mode and a dark card with a honey edge in dark mode.",
        True,
    ),
    (
        "Study style cards (first run)",
        "0-style-cards",
        "New in this set, so there is no before. The three cards had a person each; they now have a desk lamp for Locked In, a spark for Cook Mode and a cup of tea for Calm. "
        "The objects and names line up across the row. The spark twinkles once when you point at it. The landing page keeps its people, as asked.",
        False,
    ),
    (
        "Ask a parent or guardian",
        "9-guardian",
        "New in this set. A key sits beside the heading. Make the link and Sign out used to touch; Sign out now has its own line.",
        False,
    ),
]


def cover() -> list:
    flow = [
        para("Polish 2: textures, objects, motion", H1),
        para(
            "Takudzidza, signed in app. Light and dark, computer and phone. 12 November 2026.",
            P,
        ),
        Spacer(1, 3 * mm),
        para("What changed", H2),
        *bullets(
            [
                "Real surfaces instead of gradients. Three textures made by a script in the tools folder: cotton paper for the page, honey book cloth for selected things, near black linen for dark mode. Each tiles with no seam and no light patches; the grain is measured and kept subtle.",
                "No people inside the app. Photos of people stay on the landing page, sign in and setup only. A test fails if a person ever appears inside the app again.",
                "Thirteen cut paper objects drawn in code, in cream, butter, honey and ink: sun, low sun, moon, speech bubble, open book, index cards, star medal, hourglass, lamp, spark, tea cup, key and seedling. When the real images arrive they drop in through one list (art/objects/manifest.json) with no code change.",
                "Tasteful motion: content rises in a little at a time, cards and buttons lift and press, the sun's rays turn once a minute, the moon floats, confetti once at the end of a review, and light and dark crossfade over 300 ms while the toggle's moon turns into a sun. All of it stops with Less motion.",
                "Fixes found while checking every screen: clearer switches, stacked study style choices in Settings, a proper empty Notebooks card, quiet disabled buttons with no brown in dark mode, and a visible active tab in dark mode on phones.",
            ]
        ),
        para("Checks", H2),
        *bullets(
            [
                UNIT,
                E2E,
                "Typecheck and lint pass. The palette test (no blue leaning colour) and the contrast tests pass, with new pairs for the card stock and the book cloth.",
            ]
        ),
        PageBreak(),
        para("Things I was unsure about", H2),
        *bullets(
            [
                "There is no empty quiz screen in the app, so the hourglass shows while a study tool is being made instead. There is no study plan screen either, so the seedling is drawn and ready but not used yet.",
                "The old wave and grain textures are still in art/textures but no longer ship with the app. I did not move them. Say if you want them in an archive folder.",
                "One unit test (the brand check) fails on this computer only, because of an empty folder, art/brand/options, that is not in git. I left it alone. Say if you want it archived.",
                "The paper texture tiles perfectly as made. After WebP compression the edge of each tile is measurably a touch crisper than the inside, because the format never smooths across the image edge. I could not see it even at four times zoom, so I left it.",
                "The paper averages #FCF8EC rather than exactly #FFF8EC, because the lightest grains cannot go brighter than white.",
                "The light and dark crossfade uses a browser feature that current Chrome, Edge and Safari have. Where it is missing the switch is instant, which is fine.",
                "To take the screenshots I pointed this folder at the local test backend that the build copy of the app was already running (the same server code), and installed the packages from the lock file. Nothing was deployed.",
            ]
        ),
        PageBreak(),
        para("The objects, light and dark", H2),
        para(
            "All thirteen, drawn in code. Top: on cream. Middle: on near black. Bottom: at the small size they use inside cards. The lamp's light shows softer in the app than here.",
            NOTE,
        ),
        picture(EXTRAS / "objects.png", USABLE_W, 150 * mm),
        PageBreak(),
        para("The three surfaces", H2),
        para(
            "Each square shows nine tiles side by side, at the size the app draws them, so any seam or repeat would show. Left to right: cotton paper, honey book cloth, near black linen.",
            NOTE,
        ),
        framed(
            [
                [
                    picture(
                        ROOT / "art" / "textures" / "tile-tests" / f"{n}-3x3.png",
                        USABLE_W / 3 - 8,
                        88 * mm,
                    )
                    for n in ("paper-cotton", "bookcloth-honey", "linen-charcoal")
                ]
            ],
            USABLE_W / 3,
        ),
        PageBreak(),
        para("Motion, caught in the act", H2),
        para(
            "Left: Home a moment after switching to dark; the toggle now shows the sun, and the sun on Home turns once a minute. Right: the confetti 0.4 seconds after the last card.",
            NOTE,
        ),
        framed(
            [
                [
                    picture(
                        EXTRAS / "motion-crossfade-mid.png", USABLE_W / 2 - 8, 85 * mm
                    ),
                    picture(EXTRAS / "motion-confetti.png", USABLE_W / 2 - 8, 85 * mm),
                ]
            ],
            USABLE_W / 2,
        ),
        PageBreak(),
    ]
    return flow


ADDENDUM_SCREENS = [
    (
        "Home",
        "1-home",
        "The sun, low sun or moon is now the hero: about 185 px on a computer, to the right of the greeting where the old scene stood, with a soft honey glow behind it "
        "(a faint warm glow in dark mode). On a phone it is 72 px beside the greeting. A light butter wash over the top of Home brings back the warmth, "
        "so light mode reads white and yellow, and the cotton paper still shows through it. The Polish 2 shots were taken in the evening (moon), these in the morning (sun).",
    ),
    (
        "Ask Taku, empty",
        "7-chat-empty",
        "The speech bubble is 168 px on a computer so it holds the empty space; on a phone it stays at 112 px so the starters stay in view.",
    ),
    (
        "Notebooks, empty",
        "2-notebooks-empty",
        "The open book is 196 px on a computer and 148 px on a phone, with a little more room in the card. The finished review medal grew the same way (188 px on a computer), and its confetti still starts from the medal.",
    ),
]


def addendum() -> list:
    assert ADDENDUM is not None
    flow = [
        PageBreak(),
        para("Addendum: Polish 2b, hero object, warmth, cleanup", H1),
        para("13 November 2026. Left is Polish 2 as first reported, right is now.", P),
        Spacer(1, 3 * mm),
        para("What changed", H2),
        *bullets(
            [
                "Home: the time of day object is hero size with a soft glow behind it, and a light butter wash over the top of the page.",
                "Empty states with an object (Ask Taku, Notebooks, a finished review) now show it large enough to fill the space.",
                "Cleanup: the empty folder art/brand/options is removed, so the brand test passes. The old wave and grain textures, their script and manifest and the board image are in art/archive/textures, moved with git so their history stays. Leftover caches are deleted.",
            ]
        ),
        para("Checks", H2),
        *bullets(
            [
                UNIT_2B,
                E2E_2B,
                "Typecheck and lint pass. A new browser test checks the sky is hero size beside the greeting on a computer and small beside it on a phone. A new unit test checks the wash is on Home only, stays see through, and is off in high contrast mode.",
            ]
        ),
        PageBreak(),
    ]
    for title, shot, note in ADDENDUM_SCREENS:
        pages = dict(left=AFTER, right=ADDENDUM, names=("Polish 2", "Polish 2b"))
        flow += desktop_page(title, shot, note, True, **pages)
        flow += phone_page(title, shot, note, True, **pages)
    return flow


def background(canvas, doc) -> None:  # noqa: ANN001
    canvas.saveState()
    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    canvas.setFont("Body", 8)
    canvas.setFillColor(SOFT)
    canvas.drawRightString(PAGE_W - MARGIN, 7 * mm, f"Polish 2 report, page {doc.page}")
    canvas.restoreState()


def main() -> None:
    story = cover()
    for title, shot, note, before in SCREENS:
        story += desktop_page(title, shot, note, before)
        story += phone_page(title, shot, note, before)
    if ADDENDUM is not None:
        story.pop()
        story += addendum()
    story.pop()  # no blank last page
    bad = [s for s in ALL_TEXT if any(ch in s for ch in ("-", "\u2013", "\u2014"))]
    if bad:
        raise SystemExit("Dashes in the report text:\n" + "\n".join(bad))
    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=landscape(A4),
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=12 * mm,
        title="Polish 2 report",
        author="Takudzidza",
    )
    doc.build(story, onFirstPage=background, onLaterPages=background)
    print(f"{OUT.relative_to(ROOT)}: {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
