"""Export Batch 5 generated sources without writing outside art/.

Run: python -B art/review/build_batch5.py
Input: art/review/batch-5-sources.json. All image generation happens elsewhere.
"""

from __future__ import annotations

import hashlib
import importlib.util
import io
import json
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "art"
REVIEW = ART / "review"
CREAM = "#FFF8EC"
DARK = "#121212"
WEB_METHOD = "Scoped existing build_web.py webp()/fit_width()/width constants to5newcutouts and1scene. No fullcutouts()/scenes()/CLI/main completion claimed; no public writes."
PEOPLE = [
    "learner-snap-notes", "learner-listening", "learner-flashcards",
    "seller-notes", "lecturer-class",
]
OBJECTS = ["sun", "moon", "open-book", "headphones", "highlighter", "index-cards"]
COVERS = [f"cover-{colour}" for colour in ("honey", "sage", "olive", "ochre", "charcoal", "cream")]
SEMANTIC_CROPS = {
    "learner-snap-notes": {"hair-left": [300, 100, 256, 256], "face": [550, 250, 256, 256], "phone-left-hand": [330, 820, 256, 256], "phone-right-hand": [770, 840, 256, 256]},
    "learner-listening": {"head-and-hair": [200, 50, 256, 256], "neck-and-beard": [330, 290, 256, 256], "pen-hand": [330, 770, 300, 300], "book-hand": [830, 880, 280, 280]},
    "learner-flashcards": {"hair-left": [250, 170, 256, 256], "face": [480, 260, 256, 256], "gesture-hand": [20, 500, 300, 300], "card-hand": [600, 900, 300, 300]},
    "seller-notes": {"loc-hair": [400, 70, 256, 256], "face": [440, 250, 256, 256], "page-hand": [330, 890, 300, 300], "binder-hand": [800, 1000, 300, 300]},
    "lecturer-class": {"silver-hair": [300, 40, 256, 256], "face": [440, 170, 256, 256], "gesture-hand": [0, 700, 300, 300], "tablet-hand": [670, 950, 300, 300]},
}


def module_at(name: str, path: Path) -> Any:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


cutouts = module_at("batch5_cutouts", REVIEW / "export_cutouts.py")
web = module_at("batch5_web", ART / "web/build_web.py")
ENCODER_CONTEXT = threading.local()


def encode_bounded(image: Image.Image, limit: int) -> tuple[bytes, int]:
    """Bounded binary search; prove chosen quality fits and its successor fails."""
    samples: dict[int, bytes] = {}

    def candidate(quality: int) -> bytes:
        if quality in samples:
            return samples[quality]
        started = time.monotonic()
        stream = io.BytesIO()
        image.save(stream, "WEBP", quality=quality, method=6, exact=True, alpha_quality=100)
        data = stream.getvalue()
        samples[quality] = data
        print(f"encode {getattr(ENCODER_CONTEXT, 'name', 'product')} q{quality}: {len(data)} bytes / {time.monotonic() - started:.1f}s", flush=True)
        return data

    best = 95 if len(candidate(95)) < limit else -1
    if best < 0:
        low, high = 0, 94
        while low <= high:
            quality = (low + high) // 2
            if len(candidate(quality)) < limit:
                best, low = quality, quality + 1
            else:
                high = quality - 1
    if best < 0:
        raise ValueError(f"Cannot encode image below {limit} bytes")
    next_bytes = len(candidate(best + 1)) if best < 95 else None
    if next_bytes is not None and next_bytes < limit:
        raise ValueError("Quality boundary was not verified")
    data = candidate(best)
    if image.mode == "RGBA":
        decoded = Image.open(io.BytesIO(data))
        if not np.array_equal(np.asarray(image.getchannel("A")), np.asarray(decoded.getchannel("A"))):
            raise ValueError("WebP encoding changed alpha")
    ENCODER_CONTEXT.latest = {"method": "bounded binary search, not exhaustive", "selected_quality": best,
                              "selected_bytes": len(data), "next_quality_bytes": next_bytes,
                              "limit": limit, "sampled_quality_bytes": {str(q): len(value) for q, value in samples.items()}}
    return data, best


cutouts.encode_webp = encode_bounded


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def record(path: Path) -> dict[str, Any]:
    data = path.read_bytes()
    result = {"file": path.relative_to(ROOT).as_posix(), "bytes": len(data),
              "sha256": hashlib.sha256(data).hexdigest()}
    with Image.open(path) as image:
        image.load()
        result.update({"size": list(image.size), "mode": image.mode})
    return result


def source_record(entry: dict[str, Any], size: tuple[int, int], scale: float) -> dict[str, Any]:
    path = Path(entry["source"])
    with Image.open(path) as image:
        native = list(image.size)
    return {**entry, "source_native_size": native, "source_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "export_size": list(size), "scale_to_export": scale, "generator": "built-in imagegen; model undisclosed"}


def encode_rgb(image: Image.Image, path: Path, limit: int) -> int:
    data, quality = encode_bounded(image, limit)
    path.write_bytes(data)
    return quality


def export_photo(entry: dict[str, Any]) -> dict[str, Any]:
    image = Image.open(entry["source"]).convert("RGB")
    folder = REVIEW / "batch-5-originals"
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{entry['name']}.png"
    image.save(path, optimize=True)
    return {**source_record(entry, image.size, 1.0), "status": "QA reference only, not accepted art",
            "files": [record(path)]}


def export_scene(entry: dict[str, Any]) -> dict[str, Any]:
    image = Image.open(entry["source"]).convert("RGB")
    photograph = ImageOps.fit(image, (2048, 1280), Image.Resampling.LANCZOS)
    scene = Image.new("RGB", (2560, 1600))
    scene.paste(photograph, (256, 160))
    paper = Image.open(ART / "textures/paper-cotton.webp").convert("RGB")
    surface = Image.new("RGB", scene.size)
    for y in range(0, scene.height, paper.height):
        for x in range(0, scene.width, paper.width):
            surface.paste(paper, (x, y))
    def smooth(a: float, b: float, values: np.ndarray) -> np.ndarray:
        t = np.clip((values - a) / (b - a), 0, 1)
        return t * t * (3 - 2 * t)

    x = np.linspace(0, 1, scene.width)[None, :]
    y = np.linspace(0, 1, scene.height)[:, None]
    coverage = smooth(0.18, 0.42, x) * (1 - smooth(0.85, 0.90, x))
    coverage = coverage * smooth(0.10, 0.14, y) * (1 - smooth(0.86, 0.90, y))
    mask = Image.fromarray(np.round(coverage * 255).astype(np.uint8))
    scene = Image.composite(scene, surface, mask)
    stem = ART / "assets/scenes" / entry["name"]
    scene.save(stem.with_suffix(".png"), optimize=True)
    quality = encode_rgb(scene, stem.with_suffix(".webp"), 250_000)
    scene.crop((384, 0, 2176, 1600)).save(REVIEW / "batch-5-scene-mobile.png", optimize=True)
    return {**source_record(entry, scene.size, max(2048 / image.width, 1280 / image.height)),
            "composite": "Actual tiled paper-cotton surrounds photograph fitted2048x1280 at(256,160). Photo mask ramps x18..42%,right85..90%,top10..14%,bottom86..90%; heads wholly within unchanged central area. Mobile QA crop x15..85%.",
            "webp_quality": quality, "encoding_search": ENCODER_CONTEXT.latest,
            "files": [record(stem.with_suffix(ext)) for ext in (".png", ".webp")]}


def place_alpha(image: Image.Image, size: tuple[int, int], fill: float) -> tuple[Image.Image, float]:
    cutouts.validate_alpha(image)
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("Empty generated alpha")
    subject = image.crop(bbox)
    factor = min(size[0] * fill / subject.width, size[1] * fill / subject.height)
    resized = subject.resize((round(subject.width * factor), round(subject.height * factor)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size)
    canvas.alpha_composite(resized, ((size[0] - resized.width) // 2, (size[1] - resized.height) // 2))
    return canvas, factor


def export_product(entry: dict[str, Any]) -> dict[str, Any]:
    is_object = entry["category"] == "object"
    folder = ART / ("objects" if is_object else "covers")
    folder.mkdir(parents=True, exist_ok=True)
    size = (1536, 1536) if is_object else (900, 1200)
    image, scale = place_alpha(Image.open(entry["source"]).convert("RGBA"), size, 0.70 if is_object else 0.96)
    stem = folder / entry["name"]
    same_master = False
    if stem.with_suffix(".png").exists():
        with Image.open(stem.with_suffix(".png")) as previous:
            same_master = np.array_equal(np.asarray(previous.convert("RGBA")), np.asarray(image))
    image.save(stem.with_suffix(".png"), optimize=True)
    paths = [stem.with_suffix(".png")]
    encodings = []
    widths = (160, 320, 640) if is_object else (450,)
    for width in widths:
        resized = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
        path = folder / f"{entry['name']}-{width}.webp"
        reusable = False
        if same_master and path.exists():
            with Image.open(path) as decoded:
                reusable = decoded.size == resized.size and np.array_equal(
                    np.asarray(decoded.convert("RGBA").getchannel("A")), np.asarray(resized.getchannel("A")))
            reusable = reusable and (not is_object or path.stat().st_size < 60_000)
        if reusable:
            encoding = {"width": width, "method": "Reused current-batch output; decoded dimensions and exact alpha verified"}
        elif is_object:
            data, quality = cutouts.encode_webp(resized, 60_000)
            path.write_bytes(data)
            encoding = {"width": width, "quality": quality, "search": ENCODER_CONTEXT.latest}
        else:
            resized.save(path, "WEBP", quality=82, method=6, exact=True, alpha_quality=100)
            encoding = {"width": width, "quality": 82, "method": "Optional preview, fixed quality, no voluntary budget search"}
        paths.append(path)
        encodings.append(encoding)
    if is_object:
        bounds = image.getchannel("A").getbbox()
        if bounds is None:
            raise ValueError("Empty object export")
        mask = Image.new("L", size, 0)
        draw = ImageDraw.Draw(mask)
        centre_y = bounds[3] - 8
        draw.ellipse((size[0] * 0.24, centre_y - 14, size[0] * 0.76, centre_y + 14), fill=62)
        mask = mask.filter(ImageFilter.GaussianBlur(18))
        shadow = Image.new("RGBA", size, "#4A3010")
        shadow.putalpha(mask)
        shadow_path = folder / f"{entry['name']}-shadow.webp"
        shadow.save(shadow_path, "WEBP", lossless=True, method=6, exact=True)
        paths.append(shadow_path)
    else:
        retained = folder / f"{entry['name']}-900.webp"
        if retained.exists():
            paths.append(retained)
            widths = (*widths, 900)
            encodings.append({"width": 900, "method": "Retained optional current-batch derivative, not required by brief"})
    return {**source_record(entry, size, scale), "widths": list(widths), "encodings": encodings, "files": [record(path) for path in paths],
            "alpha": cutouts.alpha_stats(image), "material": "matte glazed ceramic" if is_object else "bookcloth"}


def paste_panel(board: Image.Image, path: Path, box: tuple[int, int, int, int], background: str, label: str,
                shadow_path: Path | None = None) -> None:
    x, y, width, height = box
    panel = Image.new("RGBA", (width, height), background)
    image = Image.open(path).convert("RGBA")
    if shadow_path is not None:
        shadow = Image.open(shadow_path).convert("RGBA")
        if shadow.size != image.size:
            raise ValueError("Review shadow and subject canvas mismatch")
        shadow.alpha_composite(image)
        image = shadow
    image.thumbnail((width - 24, height - 48), Image.Resampling.LANCZOS)
    panel.alpha_composite(image, ((width - image.width) // 2, 8 + (height - 48 - image.height) // 2))
    draw = ImageDraw.Draw(panel)
    draw.text((12, height - 31), label, fill=CREAM if background == DARK else "#111111", font=cutouts.font(18))
    board.paste(panel.convert("RGB"), (x, y))


def review_boards() -> None:
    board = Image.new("RGB", (2400, 3000), CREAM)
    paste_panel(board, ART / "assets/scenes/landing-ensemble.png", (0, 0, 2400, 1450), CREAM, "landing-ensemble.png")
    for index, name in enumerate(PEOPLE):
        paste_panel(board, ART / f"assets/cutouts/{name}.png", (index * 480, 1450, 480, 620), CREAM,
                    f"{name}.png", ART / f"assets/cutouts/{name}-shadow.webp")
    for row, background in enumerate((CREAM, DARK)):
        for index, name in enumerate(OBJECTS):
            paste_panel(board, ART / f"objects/{name}.png", (index * 400, 2070 + row * 270, 400, 270), background,
                        f"{name}.png", ART / f"objects/{name}-shadow.webp")
    for index, name in enumerate(COVERS):
        paste_panel(board, ART / f"covers/{name}.png", (index * 400, 2610, 400, 390), CREAM, f"{name}.png")
    board.save(REVIEW / "batch-5-landing.png", optimize=True)
    for name in PEOPLE:
        comparison = Image.new("RGB", (1440, 700), CREAM)
        paste_panel(comparison, REVIEW / f"batch-5-originals/{name}.png", (0, 0, 480, 700), CREAM, "QA original, not accepted art")
        for index, background in enumerate((CREAM, DARK), 1):
            paste_panel(comparison, ART / f"assets/cutouts/{name}.png", (index * 480, 0, 480, 700), background, name)
        comparison.save(REVIEW / f"batch-5-{name}-comparison.png", optimize=True)
    identity_boards()


def identity_boards() -> None:
    photos = sorted(path for path in (ART / "assets").glob("*.png") if path.stem not in PEOPLE)
    for page in range((len(photos) + 5) // 6):
        sheet = Image.new("RGB", (2400, 1600), CREAM)
        for index, name in enumerate(PEOPLE):
            paste_panel(sheet, ART / f"assets/cutouts/{name}.png", (index * 480, 0, 480, 720), CREAM, name)
        for index, path in enumerate(photos[page * 6:(page + 1) * 6]):
            paste_panel(sheet, path, (index * 400, 760, 400, 800), CREAM, path.stem)
        sheet.save(REVIEW / f"batch-5-identity-{page + 1}.png", optimize=True)


def web_exports() -> None:
    manifest = read_json(ART / "web/manifest.json")
    for name in PEOPLE:
        image = Image.open(ART / f"assets/cutouts/{name}.webp").convert("RGBA")
        widths = [width for width in web.CUTOUT_WIDTHS if width <= image.width]
        for width in widths:
            web.webp(web.fit_width(image, width), ART / f"web/cutouts/{name}-{width}.webp")
        shadow = Image.open(ART / f"assets/cutouts/{name}-shadow.webp").convert("RGBA")
        web.webp(web.fit_width(shadow, 480), ART / f"web/cutouts/{name}-shadow.webp", quality=70)
        manifest["cutouts"][name] = {"width": image.width, "height": image.height, "widths": widths}
    image = Image.open(ART / "assets/scenes/landing-ensemble.webp").convert("RGB")
    widths = [width for width in web.SCENE_WIDTHS if width < image.width]
    for width in widths:
        web.webp(web.fit_width(image, width), ART / f"web/scenes/landing-ensemble-{width}.webp", quality=80)
    manifest["scenes"]["landing-ensemble"] = {"width": image.width, "height": image.height, "widths": widths}
    manifest["batch5_generator"] = "build_batch5.py scopes build_web.py webp()/fit_width()/width constants to new5cutouts and1scene; no CLI/main/public outputs"
    (ART / "web/manifest.json").write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")


def semantic_reviews(entries: list[dict[str, Any]]) -> None:
    metadata = []
    for entry in entries:
        if entry["category"] != "cutout":
            continue
        source = Image.open(entry["source"]).convert("RGBA")
        regions = SEMANTIC_CROPS[entry["name"]]
        sheet = Image.new("RGB", (1320, 90 + 670 * len(regions)), CREAM)
        draw = ImageDraw.Draw(sheet)
        draw.text((20, 20), f"{entry['name']} - native semantic crops at 200%", font=cutouts.font(24), fill="#111111")
        for row, (label, (x, y, width, height)) in enumerate(regions.items()):
            patch = source.crop((x, y, x + width, y + height)).resize((width * 2, height * 2), Image.Resampling.NEAREST)
            for col, background in enumerate((CREAM, DARK)):
                panel = Image.new("RGBA", (660, 670), background)
                ImageDraw.Draw(panel).text((20, 12), label, font=cutouts.font(20), fill=CREAM if col else "#111111")
                panel.alpha_composite(patch, (20, 55))
                sheet.paste(panel.convert("RGB"), (660 * col, 90 + 670 * row))
        path = REVIEW / f"batch-5-{entry['name']}-semantic-200pct.png"
        sheet.save(path, optimize=True)
        metadata.append({"name": entry["name"], "source": entry["source"], "source_native_size": list(source.size),
                         "source_sha256": hashlib.sha256(Path(entry["source"]).read_bytes()).hexdigest(),
                         "crops_xywh": regions, "scale": 2, "resampling": "nearest", "file": record(path)})
    write_json(REVIEW / "batch-5-semantic-crops.json", metadata)


def export_person(entry: dict[str, Any], previous: dict[str, Any] | None) -> dict[str, Any]:
    ENCODER_CONTEXT.name = entry["name"]
    cache = REVIEW / "batch-5-cache" / f"{entry['name']}.json"
    if cache.exists():
        previous = read_json(cache)
    item = {**entry, **cutouts.export_one(entry, ROOT, previous), "scale_to_export": 1.0}
    if not item.get("cache_reused"):
        item["encoding_search"] = ENCODER_CONTEXT.latest
    write_json(cache, item)
    return item


def verify_outputs(entries: list[dict[str, Any]]) -> dict[str, Any]:
    checks = []
    for entry in entries:
        category, name = entry["category"], entry["name"]
        if category == "cutout":
            source = Image.open(entry["source"]).convert("RGBA")
            expected, _ = cutouts.tight_crop(source)
            master = Image.open(ART / f"assets/cutouts/{name}.png").convert("RGBA")
            decoded = Image.open(ART / f"assets/cutouts/{name}.webp").convert("RGBA")
            assert np.array_equal(np.asarray(expected), np.asarray(master)), f"Cutout PNG changed source: {name}"
            assert np.array_equal(np.asarray(master.getchannel("A")), np.asarray(decoded.getchannel("A"))), f"Cutout WebP alpha: {name}"
            assert (ART / f"assets/cutouts/{name}.webp").stat().st_size < 200_000
            checks.append(f"{name}: native crop RGBA exact, WebP alpha exact, under200000bytes")
        elif category in ("object", "cover"):
            folder = "objects" if category == "object" else "covers"
            master = Image.open(ART / folder / f"{name}.png").convert("RGBA")
            assert master.size == ((1536, 1536) if category == "object" else (900, 1200))
            cutouts.validate_alpha(master)
            widths = (160, 320, 640) if category == "object" else tuple(
                int(path.stem.rsplit("-", 1)[1]) for path in sorted((ART / folder).glob(f"{name}-*.webp")))
            for width in widths:
                path = ART / folder / f"{name}-{width}.webp"
                decoded = Image.open(path).convert("RGBA")
                expected = master.resize((width, round(master.height * width / master.width)), Image.Resampling.LANCZOS)
                assert decoded.size == expected.size
                assert np.array_equal(np.asarray(expected.getchannel("A")), np.asarray(decoded.getchannel("A")))
                if category == "object":
                    assert path.stat().st_size < 60_000
            checks.append(f"{name}: target PNG size/alpha, {len(widths)} decoded WebPs dimensions/budgets/lossless-alpha")
        elif category == "scene":
            png = Image.open(ART / f"assets/scenes/{name}.png")
            decoded = Image.open(ART / f"assets/scenes/{name}.webp")
            assert png.size == decoded.size == (2560, 1600)
            assert png.mode == decoded.mode == "RGB"
            assert (ART / f"assets/scenes/{name}.webp").stat().st_size < 250_000
            checks.append(f"{name}: PNG/WebP2560x1600RGB, under250000bytes")
    people_manifest = read_json(ART / "assets/cutouts/manifest.json")
    scene_manifest = read_json(ART / "assets/scenes/manifest.json")
    objects_manifest = read_json(ART / "objects/manifest.json")
    cover_manifest = read_json(ART / "covers/manifest.json")
    assert set(PEOPLE) <= {item["name"] for item in people_manifest["entries"]}
    assert "landing-ensemble" in {item["name"] for item in scene_manifest}
    assert set(OBJECTS) <= set(objects_manifest["objects"])
    assert set(COVERS) == {item["name"] for item in cover_manifest["covers"]}
    checks.append("All5 cutout,1scene,6object,6cover manifest entries present")
    result = {"result": "pass", "checks": checks, "audio_bytes": 0,
              "limits": "Asset checks only; no app integration, live E2E or physical-device checks"}
    write_json(REVIEW / "batch-5-verification.json", result)
    return result


def finalize_existing() -> None:
    """Complete existing exports without re-encoding masters or product families."""
    entries = read_json(REVIEW / "batch-5-sources.json")
    people = read_json(ART / "assets/cutouts/manifest.json")["entries"]
    scenes = read_json(ART / "assets/scenes/manifest.json")
    objects = read_json(ART / "objects/manifest.json")["objects"]
    covers_manifest = read_json(ART / "covers/manifest.json")
    covers = covers_manifest["covers"]
    sources = []
    for entry in entries:
        category, name = entry["category"], entry["name"]
        if category == "photo":
            path = REVIEW / f"batch-5-originals/{name}.png"
            image = Image.open(path)
            item = {**source_record(entry, image.size, 1.0), "status": "QA reference only, not accepted art", "files": [record(path)]}
        elif category == "cutout":
            item = next(item for item in people if item["name"] == name)
        elif category == "scene":
            item = next(item for item in scenes if item["name"] == name)
        elif category == "object":
            item = objects[name]
        else:
            item = next(item for item in covers if item["name"] == name)
            retained = ART / f"covers/{name}-900.webp"
            if retained.exists() and not any(file["file"] == retained.relative_to(ROOT).as_posix() for file in item["files"]):
                item["files"].append(record(retained))
                item["widths"].append(900)
                item["encodings"].append({"width": 900, "method": "Retained optional current-batch derivative, not required by brief"})
        sources.append(item)
    write_json(ART / "covers/manifest.json", covers_manifest)
    web_exports()
    review_boards()
    semantic_reviews(entries)
    web_files = [record(path) for name in PEOPLE for path in sorted((ART / "web/cutouts").glob(f"{name}-*.webp"))]
    web_files.extend(record(path) for path in sorted((ART / "web/scenes").glob("landing-ensemble-*.webp")))
    write_json(REVIEW / "batch-5-inventory.json", {"sources": sources, "audio_bytes": 0, "web_files": web_files,
               "review_files": [record(path) for path in sorted(REVIEW.glob("batch-5-*.png"))],
               "web_method": WEB_METHOD})
    verify_outputs(entries)


def main() -> None:
    entries = read_json(REVIEW / "batch-5-sources.json")
    if any(not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", entry["name"]) for entry in entries):
        raise ValueError("Unsafe source slug")
    manifests = {
        "cutout": read_json(ART / "assets/cutouts/manifest.json"),
        "scene": read_json(ART / "assets/scenes/manifest.json"),
        "object": read_json(ART / "objects/manifest.json"),
    }
    exported = []
    cutouts.OUT.mkdir(parents=True, exist_ok=True)
    cutouts.REVIEW.mkdir(parents=True, exist_ok=True)
    people = [entry for entry in entries if entry["category"] == "cutout"]
    for entry in people:
        image, _ = cutouts.tight_crop(Image.open(entry["source"]).convert("RGBA"))
        image.save(cutouts.OUT / f"{entry['name']}.png", optimize=True)
    pool = ThreadPoolExecutor(max_workers=3)
    pending = []
    for entry in people:
        previous = next((old for old in manifests["cutout"]["entries"] if old["name"] == entry["name"]), None)
        pending.append(pool.submit(export_person, entry, previous))
    for entry in entries:
        category = entry["category"]
        if category == "photo":
            item = export_photo(entry)
        elif category == "cutout":
            continue
        elif category == "scene":
            item = export_scene(entry)
            manifests[category] = [old for old in manifests[category] if old["name"] != entry["name"]] + [item]
        elif category in ("object", "cover"):
            item = export_product(entry)
            if category == "object":
                manifests[category]["objects"][entry["name"]] = item
        else:
            raise ValueError(f"Unknown category: {category}")
        exported.append(item)
    for future in pending:
        item = future.result()
        manifests["cutout"]["entries"] = [old for old in manifests["cutout"]["entries"] if old["name"] != item["name"]] + [item]
        exported.append(item)
    pool.shutdown()
    write_json(ART / "assets/cutouts/manifest.json", manifests["cutout"])
    write_json(ART / "assets/scenes/manifest.json", manifests["scene"])
    write_json(ART / "objects/manifest.json", manifests["object"])
    write_json(ART / "covers/manifest.json", {"covers": [item for item in exported if item["category"] == "cover"]})
    web_exports()
    review_boards()
    semantic_reviews(entries)
    web_files = []
    for name in PEOPLE:
        web_files.extend(record(path) for path in sorted((ART / "web/cutouts").glob(f"{name}-*.webp")))
    web_files.extend(record(path) for path in sorted((ART / "web/scenes").glob("landing-ensemble-*.webp")))
    review_files = [record(path) for path in sorted(REVIEW.glob("batch-5-*.png"))]
    write_json(REVIEW / "batch-5-inventory.json", {"sources": exported, "audio_bytes": 0,
               "web_files": web_files, "review_files": review_files,
               "web_method": WEB_METHOD})
    verify_outputs(entries)


if __name__ == "__main__":
    if "--finalize" in sys.argv:
        finalize_existing()
    else:
        main()
