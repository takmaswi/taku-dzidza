"""Seamless surface textures for Takudzidza: paper, bookcloth, linen.

python tools/make-textures.py

Every texture is built on a 1024 px torus. Noise comes from filtering white
noise in the Fourier domain, blurs are Fourier multiplications, and the weave
uses a whole number of threads across the tile, so each file tiles with no
seam by construction. The lightness channel is then high passed (a Gaussian
blur of sigma 48 px is subtracted) so no blotch, light falloff or wave can
survive, and scaled to a measured grain strength (standard deviation of
CIELAB L). Colour is held at the brand value; only lightness moves.

Writes art/textures/<name>.webp (1024 px) and art/textures/tile-tests/<name>-3x3.png
(nine tiles at the 512 px size the CSS shows them at), and prints the
measured grain, mean colour, warmth check and file size of each.
"""

from __future__ import annotations

import io
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "art" / "textures"
TESTS = OUT / "tile-tests"
SIZE = 1024
SHOWN = 512  # CSS background-size: every texture is drawn at half its pixel size, so it is sharp on 2x screens.
SEED = 20261112
HIGH_PASS_SIGMA = 48.0
MAX_BYTES = 200_000

FREQ = np.fft.fftfreq(SIZE)
FY, FX = np.meshgrid(FREQ, FREQ, indexing="ij")
YY, XX = np.meshgrid(
    np.arange(SIZE, dtype=np.float64), np.arange(SIZE, dtype=np.float64), indexing="ij"
)


# ---------- periodic tools ----------


def blur(field: np.ndarray, sx: float, sy: float | None = None) -> np.ndarray:
    """Gaussian blur on the torus. sy differs from sx for streaks along one axis."""
    sy = sx if sy is None else sy
    kernel = np.exp(-2 * np.pi**2 * ((sx * FX) ** 2 + (sy * FY) ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(field) * kernel))


def noise(rng: np.random.Generator, sx: float, sy: float | None = None) -> np.ndarray:
    """White noise, blurred on the torus, scaled to unit deviation."""
    n = blur(rng.standard_normal((SIZE, SIZE)), sx, sy)
    return (n - n.mean()) / n.std()


def high_pass(field: np.ndarray) -> np.ndarray:
    return field - blur(field, HIGH_PASS_SIGMA)


# ---------- colour ----------


def hex_rgb(value: str) -> np.ndarray:
    return (
        np.array([int(value[i : i + 2], 16) for i in (1, 3, 5)], dtype=np.float64) / 255
    )


def srgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    lin = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    m = np.array(
        [
            [0.4124564, 0.3575761, 0.1804375],
            [0.2126729, 0.7151522, 0.0721750],
            [0.0193339, 0.1191920, 0.9503041],
        ]
    )
    xyz = lin @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > (6 / 29) ** 3, np.cbrt(xyz), xyz / (3 * (6 / 29) ** 2) + 4 / 29)
    return np.stack(
        [
            116 * f[..., 1] - 16,
            500 * (f[..., 0] - f[..., 1]),
            200 * (f[..., 1] - f[..., 2]),
        ],
        axis=-1,
    )


def lab_to_srgb(lab: np.ndarray) -> np.ndarray:
    fy = (lab[..., 0] + 16) / 116
    f = np.stack([fy + lab[..., 1] / 500, fy, fy - lab[..., 2] / 200], axis=-1)
    xyz = np.where(f > 6 / 29, f**3, 3 * (6 / 29) ** 2 * (f - 4 / 29)) * np.array(
        [0.95047, 1.0, 1.08883]
    )
    m = np.array(
        [
            [3.2404542, -1.5371385, -0.4985314],
            [-0.9692660, 1.8760108, 0.0415560],
            [0.0556434, -0.2040259, 1.0572252],
        ]
    )
    lin = xyz @ m.T
    rgb = np.where(
        lin <= 0.0031308,
        12.92 * lin,
        1.055 * np.clip(lin, 0, None) ** (1 / 2.4) - 0.055,
    )
    return np.clip(rgb, 0, 1)


def colourise(base_hex: str, delta_l: np.ndarray) -> np.ndarray:
    """Base colour with lightness moved by delta_l. a and b stay put, so the hue never drifts."""
    base = srgb_to_lab(hex_rgb(base_hex))
    lab = np.empty((SIZE, SIZE, 3))
    lab[..., 0] = base[0] + delta_l
    lab[..., 1] = base[1]
    lab[..., 2] = base[2]
    return np.round(lab_to_srgb(lab) * 255).astype(np.uint8)


# ---------- surfaces ----------


def paper_cotton(rng: np.random.Generator) -> np.ndarray:
    """Cotton paper: fine tooth at two scales, a faint formation, and a few soft fibres."""
    tooth = 1.0 * noise(rng, 0.7) + 0.45 * noise(rng, 1.6) + 0.08 * noise(rng, 6.0)
    fibres = np.zeros((SIZE, SIZE))
    for _ in range(46):
        # A smooth wandering curve, drawn on the torus so it may cross an edge and come back on the far side.
        length = rng.uniform(70, 230)
        steps = int(length * 2)
        heading = rng.uniform(0, 2 * np.pi)
        turn = np.cumsum(rng.normal(0, 0.035, steps))
        angles = heading + turn
        x = rng.uniform(0, SIZE) + np.cumsum(np.cos(angles)) * 0.5
        y = rng.uniform(0, SIZE) + np.cumsum(np.sin(angles)) * 0.5
        taper = np.sin(np.linspace(0, np.pi, steps)) ** 0.7
        weight = rng.choice([1.0, -0.55]) * rng.uniform(0.5, 1.0)
        np.add.at(
            fibres,
            (np.round(y).astype(int) % SIZE, np.round(x).astype(int) % SIZE),
            weight * taper,
        )
    fibres = blur(fibres, 0.9)
    fibres /= np.abs(fibres).max()
    return tooth / tooth.std() + 1.1 * fibres


def weave(
    rng: np.random.Generator,
    pitch: int,
    wobble: float,
    thread_spread: float,
    slub: float,
    gap: float,
) -> np.ndarray:
    """Plain weave: each thread passes over one and under the next. pitch divides SIZE, so the threads meet themselves at the edge."""
    assert SIZE % pitch == 0
    n = SIZE // pitch
    # A gentle periodic wobble so the grid is not mechanical.
    x = XX + wobble * noise(rng, 22.0)
    y = YY + wobble * noise(rng, 22.0)
    ux, uy = x / pitch, y / pitch
    ix, iy = np.floor(ux).astype(int), np.floor(uy).astype(int)
    fx, fy = ux - ix, uy - iy
    warp_on_top = (ix + iy) % 2 == 0
    # Across a thread it is round (bright crown, dark edges); along a float it dips where it goes under.
    across_warp = 1 - gap * (2 * fx - 1) ** 2
    across_weft = 1 - gap * (2 * fy - 1) ** 2
    along_warp = 1 - 0.45 * (2 * fy - 1) ** 2
    along_weft = 1 - 0.45 * (2 * fx - 1) ** 2
    shade = np.where(warp_on_top, across_warp * along_warp, across_weft * along_weft)
    # Each thread has its own tone, and slubs run along the thread's length.
    warp_tone = rng.normal(0, thread_spread, n)[ix % n]
    weft_tone = rng.normal(0, thread_spread, n)[iy % n]
    warp_slub = noise(rng, 0.6, 26.0)
    weft_slub = noise(rng, 26.0, 0.6)
    tone = np.where(
        warp_on_top, warp_tone + slub * warp_slub, weft_tone + slub * weft_slub
    )
    field = shade + tone
    return field / field.std()


@dataclass(frozen=True)
class Texture:
    name: str
    base: str
    grain: float  # target standard deviation of L
    limits: tuple[float, float]
    build: Callable[[np.random.Generator], np.ndarray]
    quality: int
    pitch: (
        int  # weave period in px, 1 for paper; the seam is compared at the same phase
    )


TEXTURES = [
    Texture("paper-cotton", "#FFF8EC", 1.65, (1.5, 3.0), paper_cotton, 82, 1),
    Texture(
        "bookcloth-honey",
        "#F2C766",
        2.4,
        (1.5, 3.0),
        lambda r: weave(r, 4, 0.35, 0.18, 0.22, 0.9),
        84,
        4,
    ),
    Texture(
        "linen-charcoal",
        "#161514",
        2.15,
        (2.0, 3.5),
        lambda r: weave(r, 4, 0.55, 0.3, 0.45, 0.8) + 0.35 * noise(r, 0.8),
        84,
        4,
    ),
]


def lightness(img: np.ndarray) -> np.ndarray:
    return srgb_to_lab(img.astype(np.float64) / 255)[..., 0]


def encode(img: np.ndarray, quality: int) -> bytes:
    buf = io.BytesIO()
    Image.fromarray(img).save(buf, "WEBP", quality=quality, method=6)
    return buf.getvalue()


def seam_rank(light: np.ndarray, pitch: int) -> float:
    """Where the step across the wrap edge ranks among the steps inside at the same weave phase.

    0.5 is a typical inside line. A seam would rank at or near 1.0, stronger than every line inside.
    """
    cols = np.array(
        [
            np.abs(light[:, i] - light[:, i - 1]).mean()
            for i in range(pitch, SIZE, pitch)
        ]
    )
    rows = np.array(
        [
            np.abs(light[i, :] - light[i - 1, :]).mean()
            for i in range(pitch, SIZE, pitch)
        ]
    )
    col_edge = np.abs(light[:, 0] - light[:, -1]).mean()
    row_edge = np.abs(light[0, :] - light[-1, :]).mean()
    return float(max((cols < col_edge).mean(), (rows < row_edge).mean()))


def make(t: Texture, index: int) -> dict:
    rng = np.random.default_rng(SEED + index)
    field = high_pass(t.build(rng))
    field /= field.std()
    # Compression and the clip at white soften the grain, so measure what actually
    # ships (the decoded WebP) and rescale until it lands on the target.
    scale = t.grain
    for _ in range(6):
        img = colourise(t.base, field * scale)
        data = encode(img, t.quality)
        shipped = np.asarray(Image.open(io.BytesIO(data)).convert("RGB"))
        light = lightness(shipped)
        grain = float(light.std())
        if abs(grain - t.grain) < 0.05:
            break
        scale *= t.grain / grain
    mean = shipped.reshape(-1, 3).mean(axis=0)
    cool = int(
        np.count_nonzero(shipped[..., 2].astype(int) > shipped[..., 0].astype(int))
    )
    low = float(blur(light, HIGH_PASS_SIGMA).std())
    report = {
        "file": f"{t.name}.webp",
        "grain_L_std": round(grain, 2),
        "limits": t.limits,
        "mean_hex": "#" + "".join(f"{round(c):02X}" for c in mean),
        "target_hex": t.base,
        "pixels_blue_over_red": cool,
        "low_frequency_L_std": round(low, 3),
        # Before encoding: the tile itself. After: WebP never deblocks across the image edge, so the edge ranks a touch crisper.
        "seam_rank": round(seam_rank(lightness(img), t.pitch), 3),
        "seam_rank_after_webp": round(seam_rank(light, t.pitch), 3),
        "bytes": len(data),
    }
    problems = []
    if not t.limits[0] <= grain <= t.limits[1]:
        problems.append(f"grain {grain:.2f} outside {t.limits}")
    if report["seam_rank"] >= 0.99:
        problems.append(f"edge step ranks {report['seam_rank']} among inside steps")
    if cool:
        problems.append(f"{cool} pixels lean blue")
    if len(data) > MAX_BYTES:
        problems.append(f"{len(data)} bytes over {MAX_BYTES}")
    if problems:
        raise SystemExit(f"{t.name}: " + "; ".join(problems))
    (OUT / f"{t.name}.webp").write_bytes(data)
    shown = Image.fromarray(shipped).resize((SHOWN, SHOWN), Image.Resampling.LANCZOS)
    sheet = Image.new("RGB", (SHOWN * 3, SHOWN * 3))
    for gy in range(3):
        for gx in range(3):
            sheet.paste(shown, (gx * SHOWN, gy * SHOWN))
    sheet.save(TESTS / f"{t.name}-3x3.png", optimize=True)
    # The seams at full pixel size: the four corners of the tile meeting in the middle.
    tiled = np.tile(shipped, (2, 2, 1))
    Image.fromarray(tiled[SIZE - 192 : SIZE + 192, SIZE - 192 : SIZE + 192]).resize(
        (768, 768), Image.Resampling.NEAREST
    ).save(TESTS / f"{t.name}-seam-zoom.png", optimize=True)
    return report


def main() -> None:
    TESTS.mkdir(parents=True, exist_ok=True)
    reports = [make(t, i) for i, t in enumerate(TEXTURES)]
    for r in reports:
        print(
            f"{r['file']:<22} grain L std {r['grain_L_std']:.2f} (allowed {r['limits'][0]} to {r['limits'][1]})  "
            f"mean {r['mean_hex']} (target {r['target_hex']})  low freq {r['low_frequency_L_std']:.3f}  "
            f"seam rank {r['seam_rank']:.2f} ({r['seam_rank_after_webp']:.2f} after WebP)  blue pixels {r['pixels_blue_over_red']}  {r['bytes'] / 1000:.0f} KB"
        )
    (OUT / "textures-manifest.json").write_text(
        json.dumps(
            {
                "seed": SEED,
                "size": SIZE,
                "shown_at": SHOWN,
                "high_pass_sigma": HIGH_PASS_SIGMA,
                "textures": reports,
            },
            indent=2,
        )
        + "\n",
        encoding="utf8",
    )


if __name__ == "__main__":
    main()
