"""Independently verify the Batch 6 asset delivery against its brief."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "art"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    brief = (ART / "BRIEF-batch-6-objects.md").read_text(encoding="utf-8")
    prefix, suffix = re.findall(r"```text\n(.*?)\n```", brief, re.S)
    subjects = dict(re.findall(r"^\| `([^`]+)` \| (.*?) \|$", brief, re.M))
    objects = json.loads((ART / "objects/manifest.json").read_text(encoding="utf-8"))[
        "objects"
    ]
    assert set(objects) == set(subjects), "Manifest must contain all 15 requested slugs"
    results = []
    for slug, entry in objects.items():
        assert entry["batch"] == 6
        assert entry["prompt"].startswith(prefix + "\n\n")
        assert entry["prompt"].endswith("\n\n" + suffix)
        assert subjects[slug] in entry["prompt"]
        source = ROOT / entry["source"]
        assert sha256(source) == entry["source_sha256"]
        with Image.open(source) as native:
            assert list(native.size) == entry["source_native_size"]
        master = Image.open(ART / "objects" / f"{slug}.png")
        assert master.mode == "RGBA" and master.size == (1536, 1536)
        alpha = np.asarray(master.getchannel("A"))
        assert alpha.min() == 0 and alpha.max() == 255
        assert np.mean(alpha == 0) > 0.20
        assert np.count_nonzero((alpha > 0) & (alpha < 255)) > 10
        assert not np.any(alpha[:16]) and not np.any(alpha[-16:])
        assert not np.any(alpha[:, :16]) and not np.any(alpha[:, -16:])
        assert entry["widths"] == [160, 320, 640]
        for width in (160, 320, 640):
            path = ART / "objects" / f"{slug}-{width}.webp"
            small = Image.open(path)
            assert small.mode == "RGBA" and small.size == (width, width)
            assert path.stat().st_size < 60000
            expected = master.resize((width, width), Image.Resampling.LANCZOS)
            assert np.array_equal(
                np.asarray(small.getchannel("A")), np.asarray(expected.getchannel("A"))
            )
        shadow_path = ART / "objects" / f"{slug}-shadow.webp"
        shadow = Image.open(shadow_path)
        assert shadow.mode == "RGBA" and shadow.size == master.size
        assert 0 < shadow.getchannel("A").getextrema()[1] <= 52
        assert shadow.getchannel("A").getextrema()[0] == 0
        assert shadow_path.stat().st_size < 60000
        assert len(entry["files"]) == 5
        for item in entry["files"]:
            path = ROOT / item["file"]
            assert path.stat().st_size == item["bytes"]
            assert sha256(path) == item["sha256"]
            with Image.open(path) as image:
                image.load()
                assert list(image.size) == item["size"] and image.mode == item["mode"]
        results.append(
            {
                "slug": slug,
                "status": "pass",
                "checks": "exact prompt blocks, subject, source hash/native dimensions, RGBA master, transparent margins, 3 WebP sizes/budgets/exact alpha, separate shadow, 5 export hashes",
            }
        )
        print(f"PASS {slug}")
    with Image.open(ART / "review/batch-6-objects.png") as sheet:
        assert sheet.size == (1760, 2880)
        assert sheet.getpixel((0, 0)) == (255, 255, 255)
        assert sheet.getpixel((0, 1761)) == (18, 18, 18)
    data = {
        "objects": results,
        "contact_sheet": "pass: 15 at 320 white, 15 at 160 white, 15 at 320 near black",
        "application_tests": "not run; asset-only task",
    }
    (ART / "review/batch-6-verification.json").write_text(
        json.dumps(data, indent=2) + "\n", encoding="utf-8"
    )
    print("PASS: 15 objects, 75 exports, prompt/source integrity, contact-sheet layout")


if __name__ == "__main__":
    main()
