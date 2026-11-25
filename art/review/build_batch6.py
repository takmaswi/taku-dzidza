"""Export the Batch 6 photographs and provenance, writing exclusively under art/."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import re
import shutil
import sys
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from rembg import new_session, remove

sys.dont_write_bytecode = True
ART = Path(__file__).resolve().parents[1]
ROOT = ART.parent
REVIEW = ART / "review"
SOURCES = REVIEW / "batch-6-sources"
OBJECTS = ART / "objects"
NATIVE_EXPORT = 1536
WIDTHS = (160, 320, 640)
U2NET_OBJECTS = {"moon", "speech-bubble", "hourglass", "highlighter"}


def optical_details(photo: Image.Image, cutout: Image.Image, slug: str) -> Image.Image:
    """Retain photographed rainbow/light spill/steam excluded by segmentation."""
    if slug == "highlighter":
        # Both segmentation models omit the white card. Trace its photographed
        # planar perimeter and retain the actual source pixels inside it.
        card = Image.new("L", photo.size)
        vertices = [(178, 650), (831, 513), (992, 838), (277, 960)]
        points = [
            (round(x * photo.width / 1536), round(y * photo.height / 1024))
            for x, y in vertices
        ]
        ImageDraw.Draw(card).polygon(points, fill=255)
        card = card.filter(ImageFilter.GaussianBlur(0.6))
        output = np.array(cutout)
        selected = np.asarray(card) > output[:, :, 3]
        output[selected, :3] = np.asarray(photo)[selected]
        output[:, :, 3] = np.maximum(output[:, :, 3], np.asarray(card))
        return Image.fromarray(output)
    regions = {
        "spark": (0.44, 0.56, 0.93, 0.88),
        "lamp": (0.30, 0.50, 0.99, 0.99),
        "tea-cup": (0.43, 0.025, 0.55, 0.28),
    }
    if slug not in regions:
        return cutout
    rgb = np.asarray(photo, dtype=np.float32)
    output = np.array(cutout)
    if slug == "spark":
        # Trace only the photographed prism silhouette to exclude the faint
        # neutral floor speckles retained by the automatic glass mask.
        silhouette = Image.new("L", photo.size)
        vertices = [(174, 857), (319, 639), (850, 269), (1014, 586), (498, 967)]
        points = [
            (round(x * photo.width / 1254), round(y * photo.height / 1254))
            for x, y in vertices
        ]
        ImageDraw.Draw(silhouette).polygon(points, fill=255)
        shape_alpha = np.asarray(silhouette.filter(ImageFilter.GaussianBlur(0.6)))
        output[:, :, 3] = np.minimum(output[:, :, 3], shape_alpha)
    current = output[:, :, 3].astype(np.float32)
    region = Image.new("L", photo.size)
    left, top, right, bottom = regions[slug]
    box = (
        round(left * photo.width),
        round(top * photo.height),
        round(right * photo.width),
        round(bottom * photo.height),
    )
    ImageDraw.Draw(region).rectangle(box, fill=255)
    feather = np.asarray(region.filter(ImageFilter.GaussianBlur(16))) / 255
    if slug == "tea-cup":
        # Steam above the rim is neutral and very faint on the white original.
        strength = np.clip((253 - rgb.mean(axis=2)) * 5, 0, 110)
        strength[rgb.mean(axis=2) < 220] = 0
        foreground = rgb
    else:
        chroma = rgb.max(axis=2) - rgb.min(axis=2)
        chroma_floor = 18 if slug == "spark" else 7
        strength = np.clip((chroma - chroma_floor) * 3, 0, 190)
        if slug == "spark":
            # Keep the coherent rainbow, excluding tiny coloured floor flecks.
            strength = np.asarray(
                Image.fromarray(strength.astype(np.uint8)).filter(
                    ImageFilter.MedianFilter(7)
                ),
                dtype=np.float32,
            )
        opacity = np.maximum(strength / 255, 1 - rgb.min(axis=2) / 255)
        coherence = np.clip(strength / 48, 0, 1) if slug == "spark" else (strength > 0)
        strength = opacity * 255 * coherence
        foreground = np.clip(
            (rgb - 255 * (1 - opacity[:, :, None]))
            / np.maximum(opacity[:, :, None], 0.001),
            0,
            255,
        )
    strength *= feather
    selected = strength > current
    output[selected, :3] = foreground[selected].astype(np.uint8)
    output[selected, 3] = strength[selected].astype(np.uint8)
    return Image.fromarray(output)


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def record(path: Path) -> dict:
    with Image.open(path) as image:
        image.load()
        return {
            "file": path.relative_to(ROOT).as_posix(),
            "size": list(image.size),
            "mode": image.mode,
            "bytes": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        }


def save_webp(image: Image.Image, path: Path) -> int:
    for quality in (92, 88, 84, 80, 75, 70, 60, 50):
        image.save(
            path, "WEBP", quality=quality, method=6, exact=True, alpha_quality=100
        )
        if path.stat().st_size < 60000:
            return quality
    raise ValueError(f"WebP cannot meet 60000 byte budget: {path}")


def export_object(entry: dict, session: Any) -> dict:
    slug = entry["slug"]
    source = Path(entry["source"])
    local_source = SOURCES / f"{slug}.png"
    shutil.copyfile(source, local_source)
    photo = Image.open(local_source).convert("RGB")
    model = "u2net" if slug in U2NET_OBJECTS else "isnet-general-use"
    if slug in U2NET_OBJECTS:
        session = new_session("u2net", providers=["CPUExecutionProvider"])
    cutout = remove(photo, session=session).convert("RGBA")
    # Discard segmentation noise in the plain backdrop and preserve native RGB.
    alpha = np.asarray(cutout.getchannel("A")).copy()
    alpha[alpha < 8] = 0
    alpha[alpha > 247] = 255
    cutout.putalpha(Image.fromarray(alpha))
    cutout = optical_details(photo, cutout, slug)
    bounds = cutout.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError(f"Empty cutout: {slug}")
    crop = cutout.crop(bounds)
    scale = NATIVE_EXPORT * 0.70 / max(crop.size)
    size = tuple(round(side * scale) for side in crop.size)
    resized = crop.resize(size, Image.Resampling.LANCZOS)
    master = Image.new("RGBA", (NATIVE_EXPORT, NATIVE_EXPORT))
    position = ((NATIVE_EXPORT - size[0]) // 2, (NATIVE_EXPORT - size[1]) // 2)
    master.paste(resized, position)
    master.save(OBJECTS / f"{slug}.png", optimize=True)
    encodings = []
    for width in WIDTHS:
        small = master.resize((width, width), Image.Resampling.LANCZOS)
        quality = save_webp(small, OBJECTS / f"{slug}-{width}.webp")
        encodings.append({"width": width, "quality": quality})
    # One shared shadow procedure, placed at each object's contact line.
    bottom = position[1] + size[1]
    mask = Image.new("L", master.size)
    ImageDraw.Draw(mask).ellipse(
        (
            position[0] + size[0] * 0.10,
            bottom - 28,
            position[0] + size[0] * 0.95,
            bottom + 25,
        ),
        fill=52,
    )
    shadow = Image.new("RGBA", master.size, (28, 24, 18, 0))
    shadow.putalpha(mask.filter(ImageFilter.GaussianBlur(25)))
    save_webp(shadow, OBJECTS / f"{slug}-shadow.webp")
    paths = [OBJECTS / f"{slug}.png"]
    paths += [OBJECTS / f"{slug}-{width}.webp" for width in WIDTHS]
    paths += [OBJECTS / f"{slug}-shadow.webp"]
    return {
        "name": slug,
        "category": "object",
        "batch": 6,
        "material": "real physical materials; photographic still life",
        "prompt": entry["prompt"],
        "source": local_source.relative_to(ROOT).as_posix(),
        "source_native_size": list(photo.size),
        "source_sha256": hashlib.sha256(local_source.read_bytes()).hexdigest(),
        "generator": "built-in imagegen; model undisclosed",
        "export_size": list(master.size),
        "scale_to_export": scale,
        "source_object_bounds": list(bounds),
        "widths": list(WIDTHS),
        "encodings": encodings,
        "files": [record(path) for path in paths],
        "background_removal": f"rembg {model}; alpha thresholds 8/247; source optical details retained where required; Lanczos fit to 70%",
    }


def contact_sheet(slugs: list[str]) -> None:
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 16)
    sheet = Image.new("RGB", (1760, 2920), "white")
    draw = ImageDraw.Draw(sheet)
    top = 0
    for width, background, title in (
        (320, "#FFFFFF", "320 px on white"),
        (160, "#FFFFFF", "160 px on white"),
        (320, "#121212", "320 px on near black #121212"),
    ):
        row_height = width + 38
        section_height = 46 + 3 * row_height
        draw.rectangle((0, top, 1760, top + section_height), fill=background)
        ink = "white" if background == "#121212" else "#202020"
        draw.text((24, top + 12), title, font=font, fill=ink)
        for index, slug in enumerate(slugs):
            x = 16 + (index % 5) * 350 + (320 - width) // 2
            y = top + 46 + (index // 5) * row_height
            image = Image.open(OBJECTS / f"{slug}-{width}.webp").convert("RGBA")
            shadow = Image.open(OBJECTS / f"{slug}-shadow.webp").convert("RGBA")
            shadow = shadow.resize((width, width), Image.Resampling.LANCZOS)
            tile = Image.new("RGBA", (width, width), background)
            tile.alpha_composite(shadow)
            tile.alpha_composite(image)
            sheet.paste(tile.convert("RGB"), (x, y))
            draw.text((x, y + width + 6), slug, font=font, fill=ink)
        top += section_height
    sheet.crop((0, 0, 1760, top)).save(REVIEW / "batch-6-objects.png")


def web_build() -> None:
    """Run the unchanged existing builder with its public output scoped to art/."""
    spec = importlib.util.spec_from_file_location(
        "batch6_web", ART / "web/build_web.py"
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("Cannot load art/web/build_web.py")
    web = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(web)
    web.PUBLIC = REVIEW / "batch-6-build-icons"
    web.PUBLIC.mkdir(exist_ok=True)
    web.main()


def document(entries: dict, rejects: list[dict]) -> None:
    lines = [
        "",
        "## Batch 6 - real object photography (2026-11-25)",
        "",
        "Generated with built-in imagegen. Exact shared preamble and constraints were",
        "preserved at the beginning and end of every prompt, including corrections.",
        "Native photographs are preserved byte-for-byte under `art/review/batch-6-sources/`.",
        "Masters are 1536x1536 RGBA, cropped and fitted to 70% with Lanczos.",
        "Native dimensions and the actual scaling factor are listed below; masters are not claimed as native 1536px photographs.",
        "Background removal uses local rembg isnet-general-use, with u2net for moon, speech-bubble, hourglass and highlighter to preserve complete subjects.",
        "Source-derived masks retain the prism rainbow, lamp light pool and steam above the mug; coloured spill is unmatted from white.",
        "Both background models omitted the highlighter's white card. A traced four-corner source mask retains its original photographed pixels and straight edges.",
        "Transparent glass, steam and fine reflected light are reviewed on both backgrounds.",
        "One shared Pillow ellipse/blur procedure produces the separate contact shadows.",
        "Exports: 160, 320, 640px WebP, each below 60000 bytes with lossless alpha.",
        "",
        "### Scripts and scope",
        "",
        "`python -B art/review/build_batch6.py` exports the objects and contact sheet.",
        "It runs the unchanged `art/web/build_web.py` main function with only its PUBLIC",
        "constant redirected to `art/review/batch-6-build-icons/`, so every write stays under art/.",
        "No application code, public assets, deployment, app tests or E2E checks are part of this batch.",
        "",
        "### Exact accepted prompts and source provenance",
        "",
    ]
    for slug, entry in entries.items():
        lines += [
            f"#### {slug}",
            "",
            f"Native: {entry['source_native_size']}. Scale to export: {entry['scale_to_export']:.6f}.",
            f"Source: `{entry['source']}`.",
            f"Source SHA-256: `{entry['source_sha256']}`.",
            "",
            "```text",
            entry["prompt"],
            "```",
            "",
        ]
    lines += ["### Rejected generations", ""]
    for entry in rejects:
        local = SOURCES / f"{entry['slug']}-rejected.png"
        shutil.copyfile(entry["source"], local)
        lines += [
            f"#### {entry['slug']} - rejected",
            "",
            entry["reason"],
            f"Native: {record(local)['size']}. SHA-256: `{record(local)['sha256']}`.",
            "",
            "```text",
            entry["prompt"],
            "```",
            "",
        ]
    lines += [
        "### Export inventory",
        "",
        "| File | Dimensions | Bytes | SHA-256 |",
        "| --- | --- | ---: | --- |",
    ]
    for entry in entries.values():
        for item in entry["files"]:
            lines.append(
                f"| `{item['file']}` | {item['size']} | {item['bytes']} | `{item['sha256']}` |"
            )
    notes = ART / "CODEX_NOTES.md"
    existing = notes.read_text(encoding="utf-8")
    header = "\n## Batch 6 - real object photography (2026-11-25)"
    notes.write_text(
        existing.split(header)[0].rstrip() + "\n" + "\n".join(lines) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    data = read_json(REVIEW / "batch-6-generation.json")
    preamble, constraints = re.findall(
        r"```text\n(.*?)\n```",
        (ART / "BRIEF-batch-6-objects.md").read_text(encoding="utf-8"),
        re.S,
    )
    for entry in data["records"] + data["rejects"]:
        assert entry["prompt"].startswith(preamble + "\n\n")
        assert entry["prompt"].endswith("\n\n" + constraints)
    SOURCES.mkdir(exist_ok=True)
    os.environ.setdefault("OMP_NUM_THREADS", "4")
    session = new_session("isnet-general-use", providers=["CPUExecutionProvider"])
    entries = {}
    for entry in data["records"]:
        entries[entry["slug"]] = export_object(entry, session)
        print(f"Exported {entry['slug']}", flush=True)
    write_json(
        OBJECTS / "manifest.json",
        {
            "about": "Batch 6 real object photography; exact prompts and native-source hashes included.",
            "objects": entries,
        },
    )
    contact_sheet(list(entries))
    document(entries, data["rejects"])
    web_build()


if __name__ == "__main__":
    main()
