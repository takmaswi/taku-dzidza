"""Copy-free vector construction and deterministic review board for Part D.

Run from any directory with Python, fontTools, Pillow and PyMuPDF installed.
Kit files are read only. The four proposed lockups require Takunda's approval.
"""

from __future__ import annotations

import hashlib
import io
import json
from pathlib import Path
import xml.etree.ElementTree as ET

import fitz
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from PIL import Image, ImageDraw, ImageFont

BASE = Path(__file__).resolve().parent
ART = BASE.parents[1]
FONT = BASE / "source/Inter-Variable.ttf"
CREAM = "#FFF8F0"
DARK_PAGE = "#1E1710"
INK = "#4A3010"
SUFFIX = "#B0822F"
NS = {"s": "http://www.w3.org/2000/svg"}
VARIANTS = (
    ("Default", "taku-education-mark.svg"),
    ("On cream", "taku-education-mark-on-cream.svg"),
    ("On mid", "taku-education-mark-on-mid.svg"),
    ("Inverse", "taku-education-mark-inverse.svg"),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def font_instance(weight: int) -> TTFont:
    return instantiateVariableFont(
        TTFont(FONT), {"wght": weight, "opsz": 14}, inplace=False
    )


def outlined_text(text: str, font: TTFont, size: float, tracking: float) -> tuple[str, float]:
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    scale = size / font["head"].unitsPerEm
    cursor = 0.0
    paths = []
    for index, char in enumerate(text):
        name = cmap[ord(char)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        commands = pen.getCommands()
        if commands:
            paths.append(
                f'<path transform="translate({cursor:.6f},0) scale({scale:.8f},-{scale:.8f})" '
                f'd="{commands}"/>'
            )
        cursor += font["hmtx"][name][0] * scale
        if index < len(text) - 1:
            cursor += size * tracking
    return "\n".join(paths), cursor


def mark_group(x: float, y: float, scale: float) -> str:
    root = ET.parse(BASE / "kit/taku-education-mark-on-cream.svg").getroot()
    rects = []
    for element in root.findall(".//s:rect", NS):
        attrs = " ".join(f'{key}="{value}"' for key, value in element.attrib.items())
        rects.append(f"<rect {attrs}/>")
    return f'<g id="approved-on-cream-mark" transform="translate({x},{y}) scale({scale})">' + "".join(rects) + "</g>"


def build_proposals() -> list[Path]:
    semibold = font_instance(600)
    regular = font_instance(400)
    word, word_width = outlined_text("TAKUDZIDZA", semibold, 86, 0.15)
    byline, byline_width = outlined_text("by Taku", regular, 32, 0)
    outputs = []
    for stacked in (False, True):
        for endorsed in (False, True):
            if stacked:
                width, height = 1200, 1100 if endorsed else 1000
                mark = mark_group(350, 80, 5)
                x, baseline = (width - word_width) / 2, 780
                bx, by = (width - byline_width) / 2, 856
            else:
                width, height = 1400, 480
                mark = mark_group(60, 60, 3.2)
                x, baseline = 430, 250 if endorsed else 270
                bx, by = x, 316
            body = mark + f'<g fill="{SUFFIX}" transform="translate({x:.6f},{baseline})">{word}</g>'
            if endorsed:
                body += f'<g fill="{SUFFIX}" transform="translate({bx:.6f},{by})">{byline}</g>'
            name = "takudzidza-" + ("stacked" if stacked else "horizontal")
            name += "-by-taku" if endorsed else ""
            path = BASE / "proposed" / f"{name}.svg"
            svg = (
                f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
                f'viewBox="0 0 {width} {height}" role="img" aria-label="Proposed Takudzidza product lockup">\n'
                '<title>PROPOSED - Takudzidza product lockup, pending Takunda approval</title>\n'
                '<desc>Approved Education on-cream mark unchanged; TAKUDZIDZA in outlined Inter 600, '
                'uppercase, 0.15em letter spacing, #B0822F. Optional by Taku in outlined Inter 400. '
                'Clear space: one quarter of painted mark width. Never use before approval.</desc>\n'
                + body + "\n</svg>\n"
            )
            path.write_text(svg, encoding="utf-8")
            outputs.append(path)
    return outputs


def render_svg(path: Path, width: int) -> Image.Image:
    doc = fitz.open(stream=path.read_bytes(), filetype="svg")
    page = doc[0]
    pixmap = page.get_pixmap(matrix=fitz.Matrix(width / page.rect.width, width / page.rect.width), alpha=True)
    result = Image.open(io.BytesIO(pixmap.tobytes("png"))).convert("RGBA")
    doc.close()
    return result


def board_font(size: int, weight: int = 400) -> ImageFont.FreeTypeFont:
    font = ImageFont.truetype(str(FONT), size)
    font.set_variation_by_axes([14, weight])
    return font


def build_board(proposals: list[Path]) -> None:
    width, height = 2720, 3980
    board = Image.new("RGB", (width, height), CREAM)
    draw = ImageDraw.Draw(board)
    draw.text((80, 48), "TAKUDZIDZA / EDUCATION MARK REVIEW", font=board_font(44, 600), fill=INK)
    draw.text((80, 112), "Approved kit assets copied unchanged. Actual mark viewports: 512, 64 and 32 px.", font=board_font(27), fill=INK)
    draw.text((80, 155), "Each mark keeps the original 100 x 100 geometry. Proposed product lockups require approval.", font=board_font(27), fill=INK)
    honey = Image.open(ART / "textures/honey-waves.webp").convert("RGB")
    surfaces = (
        ("CREAM #FFF8F0", CREAM, "BEST: ON CREAM", INK),
        ("HONEY WAVES / EXISTING TEXTURE", None, "BEST: ON CREAM", INK),
        ("DARK PAGE #1E1710", DARK_PAGE, "BEST: INVERSE", CREAM),
    )
    for row, (label, colour, best, text_colour) in enumerate(surfaces):
        top = 235 + row * 850
        if colour:
            draw.rectangle((0, top, width, top + 850), fill=colour)
        else:
            patch = honey.resize((width, 1700), Image.Resampling.LANCZOS)
            board.paste(patch.crop((0, 200, width, 1050)), (0, top))
        draw.text((80, top + 28), label, font=board_font(30, 600), fill=text_colour)
        draw.text((1680, top + 28), best, font=board_font(30, 600), fill=text_colour)
        for col, (name, filename) in enumerate(VARIANTS):
            left = 80 + col * 640
            draw.text((left + 64, top + 100), name.upper(), font=board_font(26, 600), fill=text_colour)
            for size, offset, y in ((512, 64, 155), (64, 238, 700), (32, 356, 716)):
                mark = render_svg(BASE / "kit" / filename, size)
                board.paste(mark, (left + offset, top + y), mark)
            draw.text((left + 64, top + 774), "512 px", font=board_font(23), fill=text_colour)
            draw.text((left + 224, top + 774), "64 px", font=board_font(23), fill=text_colour)
            draw.text((left + 344, top + 774), "32 px", font=board_font(23), fill=text_colour)
    top = 2835
    draw.rectangle((0, top, width, height), fill=CREAM)
    draw.text((80, top + 30), "PROPOSED / PRODUCT LOCKUPS", font=board_font(38, 600), fill=INK)
    draw.text((80, top + 90), "Unchanged approved on-cream mark + outlined Inter 600. Approval required before app use.", font=board_font(27), fill=INK)
    for index, path in enumerate(proposals):
        stacked = "stacked" in path.name
        endorsed = "by-taku" in path.name
        left = 80 + (index % 2) * 1320
        y = top + 165 + (index // 2) * 440
        draw.text((left, y), "PROPOSED / " + ("STACKED" if stacked else "HORIZONTAL") + (" / by Taku" if endorsed else ""), font=board_font(25, 600), fill=SUFFIX)
        image = render_svg(path, 390 if stacked else 1180)
        board.paste(image, (left + (420 if stacked else 0), y + 48), image)
    draw.text((80, 3900), "Best variants are visual recommendations. All four approved marks remain unchanged. No local recolours.", font=board_font(25), fill=INK)
    board.save(BASE / "board.png", optimize=True)


def verify_and_manifest() -> None:
    source_kit = ART.parent.parent / "Taku brand/TAKU/brand/education"
    kit = sorted((BASE / "kit").iterdir())
    assert len(kit) == 7
    for path in kit:
        assert path.read_bytes() == (source_kit / path.name).read_bytes(), path
    expected = [
        {"x": "12", "y": "16", "width": "40", "height": "24", "rx": "12", "fill": "#D6B879"},
        {"x": "48", "y": "16", "width": "40", "height": "24", "rx": "12", "fill": "#B0822F"},
        {"x": "38", "y": "28", "width": "24", "height": "60", "rx": "12", "fill": "#8A5A1F"},
    ]
    for path in sorted((BASE / "proposed").glob("*.svg")):
        root = ET.parse(path).getroot()
        assert not root.findall(".//s:text", NS), path
        assert [el.attrib for el in root.findall(".//s:rect", NS)] == expected, path
        assert root.findall(".//s:path", NS), path
    entries = []
    for path in sorted(BASE.rglob("*")):
        if not path.is_file() or path.name == "manifest.json":
            continue
        size = None
        if path.suffix == ".png":
            size = list(Image.open(path).size)
        elif path.suffix == ".svg":
            root = ET.parse(path).getroot()
            size = [int(root.attrib["width"]), int(root.attrib["height"])]
        entries.append({"file": path.relative_to(ART.parent).as_posix(), "bytes": path.stat().st_size, "native_size": size, "sha256": sha256(path)})
    manifest = {
        "generator": "fontTools 4.61.1 + Pillow 12.2.0 + PyMuPDF 1.27.1; build_brand.py",
        "font_source": "https://github.com/google/fonts/blob/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf",
        "font_version": TTFont(FONT)["name"].getDebugName(5),
        "font_instance": {"suffix": {"wght": 600, "opsz": 14, "tracking_em": 0.15}, "byline": {"wght": 400, "opsz": 14}},
        "background_removal": "Not applicable: original vectors and procedural board composition.",
        "checks": {"kit_byte_identical_count": 7, "outlined_proposals_count": 4, "mark_geometry_and_colours_unchanged": True},
        "files": entries,
    }
    (BASE / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    build_board(build_proposals())
    verify_and_manifest()
