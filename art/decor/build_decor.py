"""Export generated transparent decor and build Inter-only review boards.

Raster source pixels and generated alpha are preserved without recolouring.
"""

import hashlib
import io
import json
import shutil
from pathlib import Path

import fitz
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
FONT_SOURCE = Path(r"C:\Users\Dell\.codex\worktrees\payroll-ui-20260930\Taku-Payroll\public\fonts\inter.woff2")
INK = "#4A3010"
CREAM = "#FFF8F0"
SVG_MARKS = {
    "underline-swoop": (480, 100, '<path d="M18 53 C118 72 282 22 457 45"/>'),
    "underline-double": (480, 120, '<path d="M20 42 Q210 20 459 39 M46 80 Q260 51 431 73"/>'),
    "circle-loop": (360, 220, '<path d="M291 38 C224 2 87 10 35 75 C-11 139 49 193 169 192 C288 191 354 140 329 81 C311 36 246 16 196 21"/>'),
    "stars": (360, 180, '<path d="M105 23 L121 68 L168 76 L129 106 L133 154 L94 127 L49 146 L63 100 L33 64 L80 65 Z M264 27 L273 55 L302 57 L280 76 L287 105 L262 90 L237 104 L244 76 L223 57 L253 54 Z"/>'),
    "sparks": (300, 180, '<path d="M94 16 L94 58 M94 120 L94 161 M22 88 L62 88 M126 88 L167 88 M43 37 L66 60 M122 116 L146 140 M44 140 L67 116 M123 60 L146 37 M232 42 L232 73 M215 58 L249 58 M247 123 L247 148 M234 136 L260 136"/>'),
    "arrow-curved": (380, 220, '<path d="M26 187 C68 47 207 28 330 71 M285 31 L334 73 L281 103"/>'),
    "margin-formula": (540, 220, '<path d="M18 151 L18 71 L78 151 Z M18 137 L32 137 L32 151 M134 91 H164 V121 H134 Z M194 105 H228 M211 88 V122 M263 81 H303 V121 H263 Z M337 96 H370 M337 112 H370 M410 71 H460 V121 H410 Z"/>'),
}


def font(size: int, weight: int = 400) -> ImageFont.FreeTypeFont:
    face = ImageFont.truetype(str(ROOT / "source-inter.ttf"), size)
    face.set_variation_by_axes([weight])
    return face


def label(image: Image.Image, xy: tuple, text: str, size: int = 26, weight: int = 400, fill: str = INK) -> None:
    ImageDraw.Draw(image).text(xy, text, font=font(size, weight), fill=fill)


def raster_fit(image: Image.Image, max_size: tuple) -> Image.Image:
    return ImageOps.contain(image, max_size, Image.Resampling.LANCZOS)


def build_exports() -> list:
    records = json.loads((ROOT / "generation-prompts.json").read_text(encoding="utf-8"))
    output = []
    for record in records:
        png = ROOT / f"{record['name']}.png"
        source = Path(record["source"])
        if not source.is_file():
            source = png
        webp = png.with_suffix(".webp")
        if source.resolve() != png.resolve():
            shutil.copyfile(source, png)
        image = Image.open(source).convert("RGBA")
        # Small decor ships at max 720 px. PNG masters keep native source pixels.
        webp_image = raster_fit(image, (720, 720))
        for quality in range(95, 39, -1):
            buffer = io.BytesIO()
            webp_image.save(buffer, "WEBP", quality=quality, method=6, exact=True)
            if buffer.tell() < 200000:
                webp.write_bytes(buffer.getvalue())
                break
        else:
            raise RuntimeError(f"Cannot encode {record['name']} below 200 KB")
        output.append({**record, "native_size": list(image.size),
                       "export_size": list(webp_image.size), "upscaled": False,
                       "alpha_extrema": image.getchannel("A").getextrema(),
                       "webp_quality": quality, "webp_limit": 200000,
                       "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                       "png_bytes": png.stat().st_size, "webp_bytes": webp.stat().st_size,
                       "webp_sha256": hashlib.sha256(webp.read_bytes()).hexdigest()})
    for name, (width, height, paths) in SVG_MARKS.items():
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">{paths}</svg>\n'
        (ROOT / f"{name}.svg").write_text(svg, encoding="utf-8")
        output.append({"name": name, "native_size": [width, height],
                       "generator": "Native SVG paths, build_decor.py",
                       "background_removal": "Not applicable: transparent SVG canvas",
                       "stroke": "currentColor", "fill": "none"})
    (ROOT / "manifest.json").write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    return records


def svg_image(name: str, width: int) -> Image.Image:
    data = (ROOT / f"{name}.svg").read_text().replace('stroke="currentColor"', 'stroke="#8A5A1F"')
    document = fitz.open(stream=data.encode(), filetype="svg")
    page = document[0]
    pixmap = page.get_pixmap(matrix=fitz.Matrix(width/page.rect.width, width/page.rect.width), alpha=True)
    return Image.frombytes("RGBA", (pixmap.width, pixmap.height), pixmap.samples)


def build_decor_board(records: list) -> None:
    board = ImageOps.fit(Image.open(ROOT.parent / "textures/honey-waves.webp").convert("RGBA"), (2400, 2200))
    label(board, (110, 90), "TAKUDZIDZA / DETAIL LIBRARY", 46, 600)
    label(board, (112, 158), "Tactile paper and stationery. Single-colour SVG marks.", 28)
    placements = [(120, 295, 680, 340), (880, 295, 620, 340), (1710, 260, 450, 420),
                  (110, 830, 640, 370), (850, 830, 660, 330), (1710, 810, 450, 390),
                  (130, 1340, 570, 390)]
    for record, (x, y, width, height) in zip(records, placements):
        im = raster_fit(Image.open(ROOT / f"{record['name']}.png").convert("RGBA"), (width, height))
        board.alpha_composite(im, (x + (width-im.width)//2, y + (height-im.height)//2))
        label(board, (x, y+height+28), record["name"], 25, 500)
    label(board, (870, 1345), "A few marks in the margin", 30, 600)
    marks = list(SVG_MARKS)
    for i, name in enumerate(marks):
        x = 860 + (i % 3) * 460
        y = 1435 + (i // 3) * 215
        im = raster_fit(svg_image(name, 360), (350, 140))
        board.alpha_composite(im, (x, y))
        label(board, (x, y+150), name, 22)
    label(board, (110, 2120), "Raster objects: transparent PNG + WebP. Line marks: currentColor, no fill.", 25)
    board.convert("RGB").save(ROOT / "board.png")


def build_texture_board() -> None:
    out = ROOT.parent / "textures"
    board = Image.new("RGB", (2560, 3284), CREAM)
    samples = [("honey-waves.webp", (72, 100, 1840, 1150)),
               ("honey-waves-phone.webp", (1952, 100, 536, 1150)),
               ("honey-waves-dark.webp", (72, 1330, 1840, 1150)),
               ("honey-waves-dark-phone.webp", (1952, 1330, 536, 1150))]
    for name, (x, y, width, height) in samples:
        im = Image.open(out / name).convert("RGB").resize((width, height), Image.Resampling.LANCZOS)
        board.paste(im, (x, y))
        label(board, (x, y-47), f"{name} / {Image.open(out/name).width} x {Image.open(out/name).height}", 26, 500)
        # A cream reading panel demonstrates contrast on both light and dark.
        box_w = 710 if width > 1000 else 460
        box_h = 290 if width > 1000 else 340
        px, py = x+(width-box_w)//2, y+(height-box_h)//2
        panel = Image.new("RGB", (box_w, box_h), CREAM)
        label(panel, (40, 34), "Revise: plant biology", 31 if width>1000 else 27, 600)
        lines = ["Photosynthesis turns light, water and", "carbon dioxide into glucose. Write", "the equation from memory, then", "check it against your notes."]
        for j, line in enumerate(lines):
            label(panel, (40, 88+j*30), line, 24 if width>1000 else 19)
        ImageDraw.Draw(panel).rounded_rectangle((40, box_h-69, 220, box_h-25), radius=22, fill=INK)
        label(panel, (65, box_h-62), "Start quiz", 23, 600, CREAM)
        board.paste(panel, (px, py))
    label(board, (72, 2535), "paper-grain.webp / 1024 x 1024 native tile, repeated", 26, 500)
    tile = Image.open(out / "paper-grain.webp").convert("RGB")
    for x in range(72, 2488, 1024):
        for y in range(2590, 3150, 1024):
            patch = tile.crop((0,0,min(1024,2488-x),min(1024,3150-y)))
            board.paste(patch, (x,y))
    label(board, (72, 3205), "Dark: warm browns #1E1710 and #2A2118, a little ink #4A3010, faint deep amber #8A5A1F. Original wave field and sizes.", 26)
    board.save(out / "board.png")


def main() -> None:
    existing = ROOT / "source-inter.ttf"
    face = TTFont(existing if existing.is_file() else FONT_SOURCE)
    face.flavor = None
    face.save(ROOT / "source-inter.ttf")
    records = build_exports()
    build_decor_board(records)
    build_texture_board()


if __name__ == "__main__":
    main()
