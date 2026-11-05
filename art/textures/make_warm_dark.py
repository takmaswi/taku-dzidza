"""Rebuild only the dark textures using the original deterministic wave field.

The wave-field functions are copied verbatim from Batch 3 CODEX_NOTES.md.
All renders are native resolution. No image model or background removal.
"""

import hashlib
import io
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.interpolate import PchipInterpolator
from scipy.ndimage import gaussian_filter

OUT = Path(__file__).resolve().parent
FIELD_SEED = 20261105
DESKTOP = (2560, 1600, 1600.0)
PHONE = (1080, 2340, 1560.0)
DARK_GRAIN = [(1.0, 0.55), (2.4, 0.7), (6.0, 0.6), (18.0, 0.42)]


def hex_rgb(value: str) -> np.ndarray:
    return np.array([int(value[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float64)


def smoothstep(a: float, b: float, x: np.ndarray) -> np.ndarray:
    u = np.clip((x - a) / (b - a), 0, 1)
    return u * u * u * (u * (6 * u - 15) + 10)


class Rff:
    """Random Fourier field, defined on the whole plane."""

    def __init__(self, seed: int, count: int, fmin: float, fmax: float) -> None:
        rng = np.random.default_rng(seed)
        angle = rng.uniform(0, 2 * np.pi, count)
        freq = rng.uniform(fmin, fmax, count)
        self.fx = freq * np.cos(angle) * 2 * np.pi
        self.fy = freq * np.sin(angle) * 2 * np.pi
        self.phase = rng.uniform(0, 2 * np.pi, count)
        self.amp = 1 / (freq / fmin) / np.sqrt(count / 2)

    def __call__(self, x: np.ndarray, y: np.ndarray) -> np.ndarray:
        out = np.zeros_like(x)
        for fx, fy, phase, amp in zip(self.fx, self.fy, self.phase, self.amp):
            out = out + amp * np.sin(fx * x + fy * y + phase)
        return out


def world_grid(size: tuple) -> tuple:
    width, height, ppu = size
    xs = (np.arange(width, dtype=np.float64) + 0.5 - width / 2) / ppu
    ys = (np.arange(height, dtype=np.float64) + 0.5 - height / 2) / ppu
    return np.meshgrid(xs, ys)


def wave_field(size: tuple) -> tuple:
    """Original Batch 3 coordinates and seeds, with identical contours."""
    x, y = world_grid(size)
    warp_a = Rff(FIELD_SEED + 1, 6, 0.18, 0.5)
    warp_b = Rff(FIELD_SEED + 2, 6, 0.18, 0.5)
    warp_c = Rff(FIELD_SEED + 3, 6, 0.22, 0.62)
    px = x + 0.22 * warp_a(x, y)
    py = y + 0.22 * warp_b(x, y)
    theta = np.deg2rad(-17)
    v = -x * np.sin(theta) + y * np.cos(theta)
    u = x * np.cos(theta) + y * np.sin(theta)
    phase = 2 * np.pi * (2.0 * v + 0.10 * u + 0.30 * warp_c(px, py))
    main = 0.5 + 0.5 * np.sin(phase + 0.45 * np.sin(phase))
    cross_phase = 2 * np.pi * (0.42 * u - 0.16 * v + 0.14 * warp_a(px + 0.7, py - 0.4))
    cross = 0.5 + 0.5 * np.sin(cross_phase)
    t = 0.78 * main + 0.22 * cross
    t = (t - t.min()) / (t.max() - t.min())
    t = gaussian_filter(t, 6, mode="nearest")
    t = t ** 1.45
    lobes = Rff(FIELD_SEED + 4, 6, 0.3, 0.7)(x + 0.2, y - 0.1)
    lobes = smoothstep(-0.25, 0.85, lobes)
    glow = lobes * smoothstep(0.05, 0.75, 1 - t)
    return t, glow


def organic_grain(shape: tuple, seed: int, octaves: list) -> np.ndarray:
    rng = np.random.default_rng(seed)
    out = np.zeros(shape, dtype=np.float64)
    for sigma, amplitude in octaves:
        layer = rng.standard_normal(shape)
        if sigma > 0:
            layer = gaussian_filter(layer, sigma, mode="wrap")
        out = out + amplitude * layer / layer.std()
    return out


def to_uint8(rgb: np.ndarray, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    dither = rng.uniform(-0.5, 0.5, rgb.shape[:2]) + rng.uniform(-0.5, 0.5, rgb.shape[:2])
    return np.clip(np.floor(rgb + dither[..., None] + 0.5), 0, 255).astype(np.uint8)


def warm_rgb(t: np.ndarray, grain: np.ndarray) -> np.ndarray:
    charcoal = hex_rgb("#2B2D42")
    ink = hex_rgb("#4A3010")
    deep = hex_rgb("#8A5A1F")
    # The original field is unchanged. Small warm mixes give low-contrast dunes.
    colours = np.stack((charcoal * 0.78 + deep * 0.22, charcoal,
                        charcoal * 0.45 + ink * 0.55))
    rgb = np.stack([PchipInterpolator([0, 0.50, 1], colours[:, i])(t)
                    for i in range(3)], axis=-1)
    return rgb + grain[..., None] * np.array([1.0, 0.95, 0.85])


def encode_under(image: Image.Image, limit: int) -> tuple:
    for quality in range(95, 39, -1):
        buffer = io.BytesIO()
        image.save(buffer, "WEBP", quality=quality, method=6)
        if buffer.tell() < limit:
            return buffer.getvalue(), quality
    raise RuntimeError(f"Cannot encode below {limit} bytes")


def main() -> None:
    records = []
    for size, suffix, limit, seed in (
        (DESKTOP, "", 200000, 101), (PHONE, "-phone", 150000, 102)
    ):
        t, _ = wave_field(size)
        rgb = to_uint8(warm_rgb(t, organic_grain(t.shape, seed + 1, DARK_GRAIN)), seed + 11)
        data, quality = encode_under(Image.fromarray(rgb), limit)
        name = f"honey-waves-dark{suffix}.webp"
        (OUT / name).write_bytes(data)
        records.append({"file": name, "native_size": list(size[:2]), "bytes": len(data),
                        "limit": limit, "quality": quality,
                        "sha256": hashlib.sha256(data).hexdigest(),
                        "field_sha256": hashlib.sha256(t.tobytes()).hexdigest()})
    (OUT / "warm-dark-manifest.json").write_text(json.dumps(records, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(records, indent=2))


if __name__ == "__main__":
    main()
