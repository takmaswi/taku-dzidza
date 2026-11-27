"""Rebuild the three approved brand composites from the batch 7 source photos."""

from __future__ import annotations

import subprocess
from hashlib import sha256
from io import BytesIO
from pathlib import Path

import fitz
import numpy as np
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "art/assets/landing"
MARK = ROOT / "art/brand/takudzidza/kit/taku-education-mark-on-cream.svg"
FONT = ROOT / "node_modules/@fontsource/inter/files/inter-latin-600-normal.woff"
GROUP_SOURCE = (
    Path(__file__).with_name("batch-7-brand-sources") / "spot-study-groups.png"
)
WORKED = ASSETS / "market-worked-example.png"
INK = (43, 33, 24)
WORKED_ORIGINAL_SHA256 = (
    "87de8aee99804a23d4bd0be5c1e9d2bed929d73cbdbd63b54dc741e85f508f62"
)


def official_mark() -> Image.Image:
    with fitz.open(stream=MARK.read_bytes(), filetype="svg") as svg:
        pixmap = svg[0].get_pixmap(alpha=True)
        # MuPDF's PNG output converts its premultiplied samples to straight alpha.
        with Image.open(BytesIO(pixmap.tobytes("png"))) as png:
            mark = png.convert("RGBA")
    return mark.crop(mark.getchannel("A").getbbox())


def inter_font(size: int) -> ImageFont.FreeTypeFont:
    data = BytesIO()
    with TTFont(FONT) as font:
        font.flavor = None
        font.save(data)
    data.seek(0)
    return ImageFont.truetype(data, size)


def lockup(size: tuple[int, int], type_size: int, mark: Image.Image) -> Image.Image:
    image = Image.new("RGBA", size)
    font = inter_font(type_size)
    word = "Takudzidza"
    left, top, right, bottom = font.getbbox(word)
    mark_height = bottom - top + 3
    mark_width = round(mark_height * mark.width / mark.height)
    gap = round(type_size * 0.36)
    x = (size[0] - mark_width - gap - (right - left)) // 2
    image.alpha_composite(
        mark.resize((mark_width, mark_height), Image.Resampling.LANCZOS),
        (x, (size[1] - mark_height) // 2),
    )
    ImageDraw.Draw(image).text(
        (x + mark_width + gap - left, (size[1] - (bottom - top)) // 2 - top),
        word,
        font=font,
        fill=INK,
    )
    return image


def corners(size):
    width, height = size
    return ((0, 0), (width, 0), (width, height), (0, height))


def project(image, output_size, source, destination):
    """Map a flat header into the photograph with an inverse homography."""
    matrix, values = [], []
    for (x, y), (u, v) in zip(destination, source, strict=True):
        matrix.extend(
            ([x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y])
        )
        values.extend((u, v))
    coefficients = np.linalg.solve(matrix, values)
    return image.transform(
        output_size, Image.Transform.PERSPECTIVE, coefficients, Image.Resampling.BICUBIC
    )


def original_worked_example() -> Image.Image:
    path = WORKED.relative_to(ROOT).as_posix()
    commit = subprocess.check_output(
        ["git", "log", "-1", "--diff-filter=A", "--format=%H", "--", path],
        cwd=ROOT,
        text=True,
    ).strip()
    source = subprocess.check_output(["git", "show", f"{commit}:{path}"], cwd=ROOT)
    if sha256(source).hexdigest() != WORKED_ORIGINAL_SHA256:
        raise ValueError(
            "The original worked-example master is required. Check the full Git history."
        )
    with Image.open(BytesIO(source)) as image:
        return image.convert("RGBA")


def worked_header(photo, quad, size, mark):
    """Retain the photograph's existing navigation glyphs on a cream app bar."""
    original = project(photo, size, quad, corners(size)).convert("L")
    height, width = size[1], size[0]
    side_light = np.linspace(1.5, -1.5, width)[None, :, None]
    falloff = np.linspace(1.6, -1.6, height)[:, None, None]
    base = (np.array([247, 239, 224]) + falloff + side_light).astype(np.uint8)
    light_panel = Image.fromarray(base).convert("RGBA")

    alpha = np.clip((np.asarray(original, dtype=float) - 65) / 165, 0, 1)
    # Only the existing back, search and menu glyphs survive the change of bar.
    alpha[:, 75:426] = 0
    alpha[:14] = 0
    alpha[67:] = 0
    glyphs = Image.new("RGBA", size, INK)
    glyphs.putalpha(Image.fromarray(np.round(alpha * 255).astype(np.uint8)))
    light_panel.alpha_composite(glyphs)
    light_panel.alpha_composite(lockup(size, 37, mark))
    return light_panel


def main() -> None:
    mark = official_mark()
    photo = original_worked_example()
    quad = ((286, 133), (845, 134), (845, 222), (286, 221))
    header = worked_header(photo, quad, (559, 88), mark)
    photo.alpha_composite(project(header, photo.size, corners(header.size), quad))
    photo.convert("RGB").save(WORKED, optimize=True)

    with Image.open(GROUP_SOURCE) as source:
        photo = source.convert("RGBA")
    header = lockup((242, 76), 25, mark)
    for quad in (
        ((99, 286), (341, 287), (340, 363), (99, 362)),
        ((1105, 287), (1347, 286), (1347, 362), (1106, 363)),
    ):
        photo.alpha_composite(project(header, photo.size, corners(header.size), quad))
    photo.convert("RGB").save(ASSETS / "spot-study-groups.png", optimize=True)


if __name__ == "__main__":
    main()
