"""Web sizes of the committed art, the Open Graph image and the app icons.

Procedural only: resizes and crops existing files with Pillow and draws the
approved Education mark from its exact kit geometry. No image model.
Run from the repo root: python art/web/build_web.py

Outputs (all committed):
  art/web/cutouts/<slug>-480.webp, -800.webp and <slug>-shadow.webp
  art/web/scenes/<slug>-640.webp, -1280.webp, -1920.webp (never above native)
  art/web/og-landing.jpg (1200x630, from the landing hero scene)
  art/web/manifest.json (sizes, read by scripts/gen-data.mjs)
  public/icon.svg, icon-192.png, icon-512.png, icon-maskable-512.png,
  apple-touch-icon.png, favicon.ico
"""

from __future__ import annotations

import json
import math
import shutil
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "art"
WEB = ART / "web"
PUBLIC = ROOT / "public"
KIT = ART / "brand" / "takudzidza" / "kit"

CREAM = (0xFF, 0xF8, 0xF0)
# taku-education-mark-on-cream.svg: three rects in a 100 x 100 viewBox, rx 12.
MARK = [
    ((12, 16, 40, 24), (0xD6, 0xB8, 0x79)),
    ((48, 16, 40, 24), (0xB0, 0x82, 0x2F)),
    ((38, 28, 24, 60), (0x8A, 0x5A, 0x1F)),
]
CUTOUT_WIDTHS = (480, 800)
SCENE_WIDTHS = (640, 1280, 1920)


def webp(img: Image.Image, path: Path, quality: int = 82) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", quality=quality, method=6)


def fit_width(img: Image.Image, width: int) -> Image.Image:
    if img.width <= width:
        return img.copy()
    return img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)


def cutouts() -> dict:
    out = {}
    src = ART / "assets" / "cutouts"
    for person in sorted(src.glob("*.webp")):
        slug = person.stem
        if slug.endswith("-shadow") or slug == "og-default":
            continue
        img = Image.open(person).convert("RGBA")
        widths = []
        for w in CUTOUT_WIDTHS:
            if w > img.width:
                continue
            webp(fit_width(img, w), WEB / "cutouts" / f"{slug}-{w}.webp")
            widths.append(w)
        shadow = Image.open(src / f"{slug}-shadow.webp").convert("RGBA")
        webp(fit_width(shadow, 480), WEB / "cutouts" / f"{slug}-shadow.webp", quality=70)
        out[slug] = {"width": img.width, "height": img.height, "widths": widths}
    return out


def scenes() -> dict:
    out = {}
    for scene in sorted((ART / "assets" / "scenes").glob("*.webp")):
        img = Image.open(scene).convert("RGB")
        widths = [w for w in SCENE_WIDTHS if w < img.width]
        if img.width < SCENE_WIDTHS[-1]:
            widths.append(img.width)
        for w in widths:
            webp(fit_width(img, w), WEB / "scenes" / f"{scene.stem}-{w}.webp", quality=80)
        out[scene.stem] = {"width": img.width, "height": img.height, "widths": widths}
    return out


def og_image() -> None:
    img = Image.open(ART / "assets" / "scenes" / "landing-hero.png").convert("RGB")
    # 1.91:1, keeping the learner on the right and space on the left for the page title in link previews.
    h = round(img.width / 1.905)
    top = max(0, (img.height - h) // 2)
    crop = img.crop((0, top, img.width, top + h)).resize((1200, 630), Image.LANCZOS)
    crop.save(WEB / "og-landing.jpg", "JPEG", quality=86, optimize=True, progressive=True)


def draw_mark(size: int, mark_px: float, background: tuple | None) -> Image.Image:
    """The mark centred on a square canvas, mark_px wide for its 100 unit viewBox. Drawn at 8x and reduced for smooth edges."""
    s = 8
    big = size * s
    canvas = Image.new("RGBA", (big, big), (*background, 255) if background else (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    scale = mark_px * s / 100
    # Centre the painted box (x 12 to 88, y 16 to 88), not the viewBox.
    ox = big / 2 - 50 * scale
    oy = big / 2 - 52 * scale
    for (x, y, w, h), colour in MARK:
        box = (ox + x * scale, oy + y * scale, ox + (x + w) * scale, oy + (y + h) * scale)
        draw.rounded_rectangle(box, radius=12 * scale, fill=(*colour, 255))
    return canvas.resize((size, size), Image.LANCZOS)


def max_radius(img: Image.Image) -> float:
    """Distance from the centre to the farthest painted pixel that differs from the cream background."""
    c = img.width / 2
    px = img.load()
    far = 0.0
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if abs(r - CREAM[0]) + abs(g - CREAM[1]) + abs(b - CREAM[2]) > 6:
                far = max(far, math.hypot(x + 0.5 - c, y + 0.5 - c))
    return far


def icons() -> dict:
    shutil.copyfile(KIT / "taku-education-mark-on-cream.svg", PUBLIC / "icon.svg")
    draw_mark(192, 150, CREAM).convert("RGB").save(PUBLIC / "icon-192.png", optimize=True)
    draw_mark(512, 420, CREAM).convert("RGB").save(PUBLIC / "icon-512.png", optimize=True)
    # Maskable: everything painted must sit inside the circle of radius 40 percent (the 80 percent safe zone).
    maskable = draw_mark(512, 400, CREAM)
    radius = max_radius(maskable)
    assert radius <= 512 * 0.4, f"maskable mark reaches {radius:.1f} px, outside the safe zone"
    maskable.convert("RGB").save(PUBLIC / "icon-maskable-512.png", optimize=True)
    apple = draw_mark(180, 132, CREAM).convert("RGB")
    apple.save(PUBLIC / "apple-touch-icon.png", optimize=True)
    fav = draw_mark(256, 236, CREAM).convert("RGB")
    fav.save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    return {"maskableFarthestPx": round(radius, 1), "maskableSafeRadiusPx": 204.8}


def main() -> None:
    if WEB.exists():
        for child in ("cutouts", "scenes"):
            shutil.rmtree(WEB / child, ignore_errors=True)
    manifest = {"generator": "art/web/build_web.py (Pillow, procedural)", "cutouts": cutouts(), "scenes": scenes()}
    og_image()
    manifest["icons"] = icons()
    (WEB / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf8")
    print(f"cutouts {len(manifest['cutouts'])}, scenes {len(manifest['scenes'])}, icons {manifest['icons']}")


if __name__ == "__main__":
    main()
