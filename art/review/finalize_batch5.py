"""Append exact Batch 5 provenance after export and visual review."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "art"
REVIEW = ART / "review"


def read_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main() -> None:
    notes = ART / "CODEX_NOTES.md"
    original = notes.read_text(encoding="utf-8")
    if "## Batch 5 - landing assets and voice status" in original:
        raise RuntimeError("Batch 5 notes already exist; review before replacing")
    inventory = read_json(REVIEW / "batch-5-inventory.json")
    entries = inventory["sources"]
    history = read_json(REVIEW / "batch-5-scene-iterations.json")
    history += read_json(REVIEW / "batch-5-rejected-cutouts.json")
    lines = [
        "", "## Batch 5 - landing assets and voice status", "",
        "Created 2026-11-24, Africa/Harare. Branch `codex/art-batch-5-landing`, based on freshly pulled main.", "",
        "### Scope and method", "",
        "The Batch 5 brief controls this landing-only asset package. The full image set is delivered without a pilot gate: one ensemble scene, five people cutouts, six matte ceramic objects and six blank bookcloth covers. At landing wiring, retire `landing-hero`, `landing-form1` and `guardian-consent` from that page while keeping their files. Their current application references are not changed by this asset-only delivery. No source code or application integration is part of this package.", "",
        "Generation used the built-in imagegen tool, one call per source or revision. The tool does not expose a model identifier. No CLI fallback, external identity reference, credit-bearing OpenRouter call, rembg or chroma key was used. All identities are synthetic. Initial six people prompts use the brief's exact shared preamble, body and shared constraints. Revision prompts are reproduced verbatim below, including the first scene edit that omitted the shared wrapper; this omission is recorded rather than hidden. Later people revisions include the exact wrapper.", "",
        "Rejected original people photographs are kept under `art/review/batch-5-originals/` solely for QA, not as accepted product assets. Listening, seller and lecturer were freshly regenerated from their subject descriptions after extraction texture concerns. Those three accepted identities are new generations, not pixel-identity extractions of rejected originals. Snap and flashcards preserve their respective reference identities by visual comparison. Snap phone orientation was corrected to show the screen above the page, with the rear camera facing the notes.", "",
        "`art/review/build_batch5.py` reuses Batch 3 native-alpha crop, 12 px margin, lossless WebP alpha and independent warm contact shadows. Cutout masters retain native detail rather than being described as native 2160x2700. Native size, actual canvas and scale are listed below. Resizing uses Pillow Lanczos without skin retouching, sharpening or recolouring. WebP encoding uses method 6, preserved alpha and strict budgets. Where bounded quality search is used, no exhaustive highest-quality claim is made.", "",
        "No finish selection was found in the current object manifest or notes, so the brief's default matte glazed ceramic in cream and honey was used. Objects use 1536 square transparent masters and 160/320/640 WebPs below 60,000 bytes plus separate contact shadows. The required covers are 900x1200 transparent bookcloth PNG masters. Any cover WebPs in the inventory are optional previews, not an additional delivery requirement.", "",
        "The 2560x1600 ensemble composes the resized real photograph at 80 percent of the canvas over the existing actual `paper-cotton.webp` tile. Soft edge masks blend the scene into that material; no wallpaper gradient is created. Four complete heads fit within the central 70 percent. The left 42 percent has no face. The centred crop is saved as `art/review/batch-5-scene-mobile.png`. Scaling is recorded as a composition transform, not a native-resolution claim.", "",
        "Your explicit write limit takes precedence over delivery step 4's request for `public/art`. Web exports use a scoped invocation of the existing `art/web/build_web.py` module's webp(), fit_width() and width constants for the new five cutouts and one scene. Its default main() was excluded because it deletes directories and writes public icons. New web sizes and merged manifests are under `art/web/`. Nothing was copied to `public/art`, and no public icon or application code was changed. Incidental older derivative rewrites from the initial helper pass were restored to their original tracked bytes.", "",
        "### Review and limits", "",
        "Review evidence: `art/review/batch-5-landing.png`, original/cream/near-black comparisons, native semantic hair/head/hand crops at 200 percent, identity sheets beside all pre-existing people in `art/assets`, and `art/review/batch-5-independent/`. Rejected extraction sources and scene iterations are recorded with reasons. The independent QA report states the final reviewed sources and its sampling limits. Visual QA is an asset review, not product acceptance, deployment or physical-device certification.", "",
        "### ElevenLabs voice section - blocked", "",
        "`ELEVENLABS_API_KEY` was absent from the process, Windows User and Windows Machine environment variables. No credential file was searched, no secret was printed or written, and no authenticated ElevenLabs call or voice generation was performed. This part stopped as the brief requires. Account plan and chosen-voice commercial eligibility could not be verified. No MP3 files were fabricated. Total generated audio size: 0 bytes.", "",
        "Current official documentation was checked before any potential call: [models](https://elevenlabs.io/docs/overview/models), [multi-speaker dialogue](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert), and [commercial-use rules](https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform). The documentation lists Eleven v4 as the flagship high-quality TTS option, while the dialogue endpoint documents a default of eleven_v3. No model was selected for generation without account/model availability verification. Paid-plan commercial licensing excludes Beta Services; the user's actual plan remains unverified.", "",
        "`public/audio/landing/manifest.json` records the three requested filenames, exact scripts and blocked statuses. Voice names, model and durations remain unset because there are no generated files.", "",
        "### Accepted sources and QA originals", "",
        "| Name | Category | Native source | Actual export | Scale | Source SHA-256 |", "| --- | --- | --- | --- | --- | --- |",
    ]
    for entry in entries:
        source = Path(entry["source"])
        with Image.open(source) as image:
            native = list(image.size)
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        scale = entry.get("scale_to_export", 1)
        output = entry.get("export_size", native)
        lines.append(f"| {entry['name']} | {entry['category']} | {native[0]}x{native[1]} | {output[0]}x{output[1]} | {scale} | `{digest}` |")
    lines += ["", "### Exact generation and revision prompts", ""]
    for index, entry in enumerate(entries + history, 1):
        source = Path(entry["source"])
        with Image.open(source) as image:
            size = image.size
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        lines += [f"#### {index}. {entry['name']} - {entry['category']}", "",
                  f"Source: `{source.name}`. Native {size[0]}x{size[1]}. SHA-256: `{digest}`.", ""]
        if entry.get("reason"):
            lines += [f"Disposition: {entry['reason']}", ""]
        lines += ["```text", entry["prompt"], "```", ""]
    lines += ["### Export inventory", "", "| File | Size | Bytes | SHA-256 |", "| --- | --- | ---: | --- |"]
    for entry in entries:
        for item in entry.get("files", []):
            size = item.get("size", item.get("native_size", []))
            lines.append(f"| `{item['file']}` | {size} | {item['bytes']} | `{item['sha256']}` |")
    for item in inventory.get("web_files", []):
        lines.append(f"| `{item['file']}` | {item['size']} | {item['bytes']} | `{item['sha256']}` |")
    listed = {item["file"] for entry in entries for item in entry.get("files", [])}
    for path in sorted((ART / "covers").glob("*.webp")):
        relative = path.relative_to(ROOT).as_posix()
        if relative not in listed:
            with Image.open(path) as image:
                size = list(image.size)
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            lines.append(f"| `{relative}` (optional preview) | {size} | {path.stat().st_size} | `{digest}` |")
    verification = read_json(REVIEW / "batch-5-verification.json")
    if verification["result"] != "pass":
        raise RuntimeError("Asset verification has not passed")
    lines += ["", "### Checks actually performed", ""]
    lines += [f"- {check}" for check in verification["checks"]]
    lines += ["- Ruff passed for the two Batch 5 helpers; independent read-only code review found no critical or high issue.",
              "- Initial people prompt bodies, final accepted people prompt wrappers and all audio scripts were compared against the brief exactly.",
              "- No application tests, E2E, deployment or physical-device checks were run for this asset-only package."]
    lines += ["", "Detailed machine-readable provenance and checks: `art/review/batch-5-inventory.json`. Audio manifest is an explicit blocked-work record, not a claim of delivered audio.", ""]
    notes.write_text(original.rstrip() + "\n" + "\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
