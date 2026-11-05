"""Export existing true-alpha imagegen cutouts; never generate or remove backgrounds.

Usage: python art/review/export_cutouts.py art/review/cutout-sources.json
Input: [{"name": "slug", "source": "absolute/or/repo-relative.png", "prompt": "..."}]
Optional review_crops: {"hair": [x,y,w,h], "hands": [x,y,w,h]} in SOURCE pixels.
Missing sources remain pending, so rerun as each source arrives. Outputs stay in art/.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ART = Path(__file__).resolve().parents[1]
ROOT = ART.parent
OUT = ART / "assets/cutouts"
REVIEW = ART / "review/edges"
FONT = ART / "brand/takudzidza/source/Inter-Variable.ttf"
CREAM = "#FFF8F0"
CHARCOAL = "#2B2D42"
INK = "#4A3010"
PADDING = 12
PATCH = 192


def font(size: int, weight: int = 400) -> ImageFont.FreeTypeFont:
    result = ImageFont.truetype(str(FONT), size)
    result.set_variation_by_axes([14, weight])
    return result


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def alpha_stats(image: Image.Image) -> dict[str, int]:
    alpha = np.asarray(image.getchannel("A"))
    return {
        "min": int(alpha.min()),
        "max": int(alpha.max()),
        "intermediate_pixels": int(((alpha > 0) & (alpha < 255)).sum()),
        "transparent_pixels": int((alpha == 0).sum()),
    }


def validate_alpha(image: Image.Image) -> dict[str, int]:
    stats = alpha_stats(image)
    if stats["min"] != 0 or stats["max"] < 254 or stats["intermediate_pixels"] == 0:
        raise ValueError(f"True anti-aliased alpha required; found {stats}")
    return stats


def encode_webp(image: Image.Image, limit: int) -> tuple[bytes, int]:
    for quality in range(95, -1, -1):
        buffer = io.BytesIO()
        image.save(buffer, "WEBP", quality=quality, method=6, exact=True, alpha_quality=100)
        if buffer.tell() < limit:
            encoded = buffer.getvalue()
            with Image.open(io.BytesIO(encoded)) as decoded:
                if not np.array_equal(np.asarray(image.getchannel("A")), np.asarray(decoded.getchannel("A"))):
                    raise ValueError("WebP encoding changed alpha")
            return encoded, quality
    raise ValueError(f"Cannot encode image below {limit:,} bytes")


def tight_crop(image: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("Source is fully transparent")
    subject = image.crop(bbox)
    result = Image.new("RGBA", (subject.width + 2 * PADDING, subject.height + 2 * PADDING))
    result.paste(subject, (PADDING, PADDING))
    return result, bbox


def contact_shadow(size: tuple[int, int]) -> Image.Image:
    width, height = size
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    # Shadow is a separate procedural ellipse, never a copy of person pixels.
    centre_y = height - PADDING - max(4, int(height * 0.015))
    radius_y = max(3, int(height * 0.012))
    draw.ellipse((width * 0.14, centre_y - radius_y, width * 0.86, centre_y + radius_y), fill=62)
    mask = mask.filter(ImageFilter.GaussianBlur(max(3, height * 0.012)))
    result = Image.new("RGBA", size, INK)
    result.putalpha(mask)
    return result


def composite(image: Image.Image, background: str) -> Image.Image:
    result = Image.new("RGBA", image.size, background)
    result.alpha_composite(image)
    return result.convert("RGB")


def boundary_centre(alpha: np.ndarray, region: tuple[int, int, int, int]) -> tuple[int, int]:
    height, width = alpha.shape
    x0, y0, x1, y1 = region
    # Intermediate alpha identifies the true antialiased edge without threshold erosion.
    ys, xs = np.nonzero((alpha[y0:y1, x0:x1] > 0) & (alpha[y0:y1, x0:x1] < 255))
    if len(xs) == 0:
        return (x0 + x1) // 2, (y0 + y1) // 2
    centre = len(xs) // 2
    return min(width - 1, int(xs[centre]) + x0), min(height - 1, int(ys[centre]) + y0)


def review_boxes(image: Image.Image, entry: dict[str, Any], bbox: tuple[int, int, int, int]) -> list[tuple[str, tuple[int, int, int, int]]]:
    explicit = entry.get("review_crops", {})
    if explicit:
        boxes = []
        for label, (x, y, width, height) in explicit.items():
            left = int(x) - bbox[0] + PADDING
            top = int(y) - bbox[1] + PADDING
            boxes.append((str(label), (left, top, left + int(width), top + int(height))))
        return boxes
    width, height = image.size
    alpha = np.asarray(image.getchannel("A"))
    regions = (
        ("Upper edge / hair candidate", (0, 0, width, max(1, int(height * 0.35)))),
        ("Lower left / hand candidate", (0, int(height * 0.4), max(1, width // 2), height)),
        ("Lower right / hand candidate", (width // 2, int(height * 0.4), width, height)),
    )
    boxes = []
    for label, region in regions:
        cx, cy = boundary_centre(alpha, region)
        boxes.append((label, (cx - PATCH // 2, cy - PATCH // 2, cx + PATCH // 2, cy + PATCH // 2)))
    return boxes


def export_review(image: Image.Image, name: str, entry: dict[str, Any], bbox: tuple[int, int, int, int]) -> list[dict[str, Any]]:
    panel_width, panel_height = 480, 640
    board = Image.new("RGB", (panel_width * 2, panel_height), CREAM)
    draw = ImageDraw.Draw(board)
    for index, background in enumerate((CREAM, CHARCOAL)):
        left = index * panel_width
        draw.rectangle((left, 0, left + panel_width, panel_height), fill=background)
        label_colour = INK if index == 0 else CREAM
        draw.text((left + 22, 20), name, font=font(18, 600), fill=label_colour)
        fitted = image.copy()
        fitted.thumbnail((panel_width - 48, panel_height - 110), Image.Resampling.LANCZOS)
        patch = composite(fitted, background)
        board.paste(patch, (left + (panel_width - patch.width) // 2, 78))
        draw.text((left + 22, panel_height - 35), background, font=font(18), fill=label_colour)
    contact_path = REVIEW / f"{name}-contact.png"
    board.save(contact_path, optimize=True)
    crops = review_boxes(image, entry, bbox)
    cell = max(440, max(max(box[2] - box[0], box[3] - box[1]) * 2 + 52 for _, box in crops))
    sheet = Image.new("RGB", (cell * 2, 110 + len(crops) * (cell + 54)), CREAM)
    sheet_draw = ImageDraw.Draw(sheet)
    sheet_draw.text((24, 20), f"{name} / 200% native pixels", font=font(22, 600), fill=INK)
    sheet_draw.text((24, 58), "Automatic candidates require visual confirmation of hair and hand coverage.", font=font(17), fill=INK)
    crop_records = []
    for row, (label, box) in enumerate(crops):
        crop = image.crop(box)
        enlarged = crop.resize((crop.width * 2, crop.height * 2), Image.Resampling.NEAREST)
        top = 110 + row * (cell + 54)
        for col, background in enumerate((CREAM, CHARCOAL)):
            left = col * cell
            sheet_draw.rectangle((left, top, left + cell, top + cell + 54), fill=background)
            sheet_draw.text((left + 20, top + 12), label, font=font(17), fill=INK if col == 0 else CREAM)
            sheet.paste(composite(enlarged, background), (left + 24, top + 54))
        crop_records.append({"label": label, "export_box_xyxy": list(box), "scale": 2, "resampling": "nearest"})
    edges_path = REVIEW / f"{name}-200pct.png"
    sheet.save(edges_path, optimize=True)
    return [
        {"file": relative(contact_path), "native_size": list(board.size), "sha256": sha256(contact_path)},
        {"file": relative(edges_path), "native_size": list(sheet.size), "sha256": sha256(edges_path), "crops": crop_records},
    ]


def cached_export(entry: dict[str, Any], source: Path, previous: dict[str, Any] | None) -> dict[str, Any] | None:
    if not previous or previous.get("status") != "exported":
        return None
    if previous.get("source_sha256") != sha256(source):
        return None
    records = previous.get("files", []) + previous.get("review", [])
    if len(previous.get("files", [])) != 3 or len(previous.get("review", [])) != 2:
        return None
    for record in records:
        path = ROOT / record["file"]
        if not path.is_file() or sha256(path) != record.get("sha256"):
            return None
    return {
        **previous,
        "source": str(source),
        "prompt": entry.get("prompt", ""),
        "cache_reused": True,
        "cache_verification": "Source SHA-256 and all three exports plus both review sheet hashes match",
    }


def export_one(entry: dict[str, Any], input_base: Path, previous: dict[str, Any] | None = None) -> dict[str, Any]:
    name = entry["name"]
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name):
        raise ValueError(f"Unsafe asset name: {name!r}")
    source = Path(entry["source"])
    if not source.is_absolute():
        source = ROOT / source if (ROOT / source).exists() else input_base / source
    record = {"name": name, "source": str(source), "prompt": entry.get("prompt", "")}
    if not source.is_file():
        return {**record, "status": "pending", "reason": "Source has not arrived"}
    cached = cached_export(entry, source, previous)
    if cached is not None:
        return cached
    with Image.open(source) as opened:
        if "A" not in opened.getbands():
            raise ValueError("Source has no alpha channel; background removal is outside this utility")
        original = opened.convert("RGBA")
    source_stats = validate_alpha(original)
    image, bbox = tight_crop(original)
    stats = validate_alpha(image)
    png = OUT / f"{name}.png"
    webp = OUT / f"{name}.webp"
    shadow_path = OUT / f"{name}-shadow.webp"
    limit = 250_000 if image.width > image.height else 200_000
    data, quality = encode_webp(image, limit)
    image.save(png, optimize=True)
    webp.write_bytes(data)
    shadow = contact_shadow(image.size)
    shadow.save(shadow_path, "WEBP", lossless=True, method=6, exact=True)
    files = [
        {"file": relative(path), "bytes": path.stat().st_size, "native_size": list(image.size), "sha256": sha256(path)}
        for path in (png, webp, shadow_path)
    ]
    return {
        **record, "status": "exported", "source_sha256": sha256(source), "source_native_size": list(original.size),
        "source_alpha": source_stats, "export_size": list(image.size), "export_alpha": stats,
        "source_bbox_xyxy": list(bbox), "padding_px": PADDING, "upscale": False,
        "background_removal_method": "Built-in imagegen true alpha supplied by source; no removal performed by exporter",
        "alpha_coverage_note": (
            "Source maximum alpha 254 accepted as near-opaque 99.6% coverage; original pixels and alpha preserved without normalization"
            if source_stats["max"] == 254 else "Source includes fully opaque alpha 255; original pixels and alpha preserved"
        ),
        "webp_quality": quality, "webp_limit_bytes": limit, "webp_alpha_lossless_verified": True,
        "shadow_method": "Independent warm ink #4A3010 ellipse, Gaussian softening, bottom aligned; no subject pixels",
        "shadow_alpha": alpha_stats(shadow), "files": files,
        "review": export_review(image, name, entry, bbox),
        "review_status": "Pending human/model visual inspection; candidate crops are not semantic proof of hair or hands",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args()
    entries = json.loads(args.manifest.read_text(encoding="utf-8-sig"))
    if not isinstance(entries, list):
        raise ValueError("Input manifest must be a JSON list")
    OUT.mkdir(parents=True, exist_ok=True)
    REVIEW.mkdir(parents=True, exist_ok=True)
    path = OUT / "manifest.json"
    previous = {}
    if path.is_file():
        previous = {
            item["name"]: item
            for item in json.loads(path.read_text(encoding="utf-8"))["entries"]
        }
    records = []
    for entry in entries:
        try:
            result = export_one(entry, args.manifest.resolve().parent, previous.get(entry.get("name")))
        except (OSError, ValueError, KeyError, TypeError) as error:
            result = {"name": entry.get("name", "unknown"), "source": entry.get("source"), "status": "error", "reason": str(error)}
        records.append(result)
        cache_label = " (verified cache)" if result.get("cache_reused") else ""
        print(f"{result['status']}: {result['name']}{cache_label}" + (f" - {result['reason']}" if "reason" in result else ""))
    report = {"generator": relative(Path(__file__).resolve()), "method": "Existing-alpha native-size crop and export; no generation", "entries": records}
    path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Manifest: {relative(path)}")
    if any(record["status"] != "exported" for record in records):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
