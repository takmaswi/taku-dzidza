import { cloneElement, useId, type CSSProperties, type ReactElement, type ReactNode, type SVGProps } from "react";
import { OBJECT_RASTERS } from "../art.generated";

/**
 * Objects drawn as layered cut paper: cream, butter, honey and ink only, two
 * or three stacked layers with a small shadow between them, each filled with
 * the cotton paper texture, and one soft contact shadow underneath. No faces,
 * no text, no outline over 1.5 px. When art/objects/manifest.json lists a
 * raster for a name (Codex, art/BRIEF-batch-4.md: <slug>-<width>.webp and
 * <slug>-shadow.webp), that photo and its shadow show instead, at the same
 * size, so the swap needs no code change.
 */

export type ObjectName =
  | "sun"
  | "sun-low"
  | "moon"
  | "speech-bubble"
  | "open-book"
  | "index-cards"
  | "star-medal"
  | "hourglass"
  | "lamp"
  | "spark"
  | "tea-cup"
  | "key"
  | "seedling";

/** Objects that exist only as batch 6 photos, with no drawn fallback: without the photo they draw nothing. */
type PhotoOnly = "highlighter" | "headphones";
export type ObjectArtName = ObjectName | PhotoOnly;

const CREAM = "#FFF8EC";
const BUTTER = "#F8E2A8";
const HONEY = "#F2B33D";
const INK = "#111111";

type Props = { name: ObjectArtName; size?: number; alt: string; className?: string; style?: CSSProperties };

export function ObjectArt({ name, size = 120, alt, className = "", style }: Props) {
  const raw = useId();
  const id = `oa${raw.replace(/[^a-zA-Z0-9]/g, "")}`;
  const raster = OBJECT_RASTERS[name];
  const cls = `object-art oa-${name} ${className}`.trim();
  if (raster !== undefined) {
    // Up to the first width that covers a 2x screen: sharper screens get no visible gain for the bytes.
    const cover = raster.widths.findIndex((w) => w >= size * 2);
    const widths = cover === -1 ? raster.widths : raster.widths.slice(0, cover + 1);
    const srcSet = widths.map((w) => `/art/objects/${name}-${w}.webp ${w}w`).join(", ");
    return (
      <span className={`${cls} oa-raster`} style={{ ["--oa-size" as string]: `${size}px`, ...style }}>
        <img src={`/art/objects/${name}-shadow.webp`} alt="" aria-hidden="true" width={size} height={size} loading="lazy" decoding="async" />
        <img src={`/art/objects/${name}-${raster.widths[0]}.webp`} srcSet={srcSet} sizes={`${size}px`} width={size} height={size} alt={alt} loading="lazy" decoding="async" />
      </span>
    );
  }
  if (!isDrawn(name)) return null;
  const label = alt === "" ? { "aria-hidden": true as const } : { role: "img", "aria-label": alt };
  return (
    <svg className={cls} style={style} width={size} height={size} viewBox="0 0 120 120" {...label} focusable="false">
      <defs>
        {/* The tooth is stretched once, inside the pattern, so it reads at object size. */}
        <filter id={`${id}-tooth`} colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.9" intercept="-0.9" />
            <feFuncG type="linear" slope="1.9" intercept="-0.9" />
            <feFuncB type="linear" slope="1.9" intercept="-0.9" />
          </feComponentTransfer>
        </filter>
        <pattern id={`${id}-paper`} patternUnits="userSpaceOnUse" width="256" height="256">
          <image href="/art/textures/paper-cotton.webp" width="256" height="256" filter={`url(#${id}-tooth)`} />
        </pattern>
        <filter id={`${id}-lift`} x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0.7" dy="1.4" stdDeviation="0.8" floodColor={INK} floodOpacity="0.2" />
        </filter>
        <filter id={`${id}-soft`} x="-50%" y="-200%" width="200%" height="500%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      {DRAW[name](id)}
    </svg>
  );
}

/** One piece of cut paper: the shape in its colour, the paper's tooth multiplied over it, and a small lift shadow. */
function Layer({ id, fill, shape, lift = true }: { id: string; fill: string; shape: ReactElement<SVGProps<SVGElement>>; lift?: boolean }) {
  return (
    <g filter={lift ? `url(#${id}-lift)` : undefined}>
      {cloneElement(shape, { fill })}
      {cloneElement(shape, { fill: `url(#${id}-paper)`, style: { mixBlendMode: "multiply" } })}
    </g>
  );
}

function Contact({ id, cx = 60, cy = 108, rx = 34 }: { id: string; cx?: number; cy?: number; rx?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={4.5} fill={INK} opacity={0.14} filter={`url(#${id}-soft)`} />;
}

// ---------- geometry ----------

const rad = (deg: number) => (deg * Math.PI) / 180;
const pt = (cx: number, cy: number, r: number, deg: number) => `${(cx + r * Math.cos(rad(deg))).toFixed(2)},${(cy + r * Math.sin(rad(deg))).toFixed(2)}`;

/** Rays as thin triangles between two radii. */
function rays(cx: number, cy: number, r1: number, r2: number, angles: number[], half: number): string {
  return angles.map((a) => `M${pt(cx, cy, r1, a - half)} L${pt(cx, cy, r2, a)} L${pt(cx, cy, r1, a + half)} Z`).join(" ");
}

/** A five point star. */
function star(cx: number, cy: number, r: number, inner: number): string {
  const p = Array.from({ length: 10 }, (_, i) => pt(cx, cy, i % 2 === 0 ? r : inner, -90 + i * 36));
  return `M${p.join(" L")} Z`;
}

/** A four point sparkle with curved sides. */
function sparkle(cx: number, cy: number, r: number, waist: number): string {
  const w = waist;
  return `M${cx},${cy - r} Q${cx + w},${cy - w} ${cx + r},${cy} Q${cx + w},${cy + w} ${cx},${cy + r} Q${cx - w},${cy + w} ${cx - r},${cy} Q${cx - w},${cy - w} ${cx},${cy - r} Z`;
}

function roundRect(x: number, y: number, w: number, h: number, r: number): string {
  return `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
}

/** A filled circle as a path, so several can share one layer. */
function disc(cx: number, cy: number, r: number, sweep: 0 | 1 = 0): string {
  return `M${cx - r},${cy} A${r},${r} 0 1 ${sweep} ${cx + r},${cy} A${r},${r} 0 1 ${sweep} ${cx - r},${cy} Z`;
}

/** A ring: the hole winds the other way, so the default nonzero fill cuts it out and shapes may overlap the ring freely. */
function ring(cx: number, cy: number, r: number, hole: number): string {
  return `${disc(cx, cy, r, 0)} ${disc(cx, cy, hole, 1)}`;
}

const every = (start: number, step: number, n: number) => Array.from({ length: n }, (_, i) => start + i * step);

// ---------- the objects ----------

function isDrawn(name: string): name is ObjectName {
  return name in DRAW;
}

const DRAW: Record<ObjectName, (id: string) => ReactNode> = {
  sun: (id) => (
    <>
      <Contact id={id} rx={26} />
      <g className="oa-rays">
        <Layer id={id} fill={BUTTER} shape={<path d={rays(60, 54, 30, 52, every(0, 30, 12), 7)} />} />
        <Layer id={id} fill={HONEY} shape={<path d={rays(60, 54, 30, 44, every(15, 30, 12), 6)} />} />
      </g>
      <Layer id={id} fill={HONEY} shape={<circle cx={60} cy={54} r={27} />} />
      <Layer id={id} fill={BUTTER} shape={<circle cx={58} cy={52} r={19} />} />
    </>
  ),

  "sun-low": (id) => (
    <>
      <Contact id={id} cy={106} rx={44} />
      <Layer id={id} fill={BUTTER} shape={<path d={rays(60, 76, 30, 52, every(-165, 25, 7), 6)} />} />
      <Layer id={id} fill={HONEY} shape={<path d="M34,78 A26,26 0 0 1 86,78 Z" />} />
      <Layer id={id} fill={BUTTER} shape={<path d="M43,78 A17,17 0 0 1 77,78 Z" />} />
      <Layer id={id} fill={BUTTER} shape={<path d="M6,88 Q34,70 64,82 T114,80 L114,98 Q60,102 6,98 Z" />} />
      <Layer id={id} fill={CREAM} shape={<path d="M6,94 Q44,80 82,90 T114,88 L114,102 Q60,106 6,102 Z" />} />
    </>
  ),

  moon: (id) => (
    <>
      <Contact id={id} rx={24} />
      <g className="oa-float">
        <defs>
          <mask id={`${id}-cres-a`}>
            <circle cx={56} cy={56} r={31} fill="#fff" />
            <circle cx={71} cy={45} r={25} fill="#000" />
          </mask>
          <mask id={`${id}-cres-b`}>
            <circle cx={55} cy={58} r={24} fill="#fff" />
            <circle cx={67} cy={49} r={21} fill="#000" />
          </mask>
        </defs>
        <Layer id={id} fill={BUTTER} shape={<circle cx={56} cy={56} r={31} mask={`url(#${id}-cres-a)`} />} />
        <Layer id={id} fill={CREAM} shape={<circle cx={55} cy={58} r={24} mask={`url(#${id}-cres-b)`} />} />
        <Layer id={id} fill={HONEY} shape={<path d={`${sparkle(88, 30, 9, 2)} ${sparkle(96, 62, 5, 1.2)} ${sparkle(30, 24, 5, 1.2)}`} />} />
      </g>
    </>
  ),

  "speech-bubble": (id) => (
    <>
      <Contact id={id} rx={36} />
      <Layer id={id} fill={BUTTER} shape={<path d={`${roundRect(42, 20, 62, 44, 20)} M86,58 L100,74 L74,62 Z`} />} />
      <Layer id={id} fill={CREAM} shape={<path d={`${roundRect(16, 38, 68, 48, 22)} M30,80 L22,98 L46,84 Z`} />} />
      <Layer id={id} fill={HONEY} shape={<path d={`${disc(36, 62, 4.5)} ${disc(50, 62, 4.5)} ${disc(64, 62, 4.5)}`} />} />
    </>
  ),

  "open-book": (id) => (
    <>
      <Contact id={id} rx={46} />
      <Layer id={id} fill={HONEY} shape={<path d="M10,40 Q36,30 60,40 Q84,30 110,40 L110,94 Q84,86 60,96 Q36,86 10,94 Z" />} />
      <Layer id={id} fill={BUTTER} shape={<path d="M15,38 Q38,30 59,40 L59,91 Q38,82 15,89 Z M61,40 Q82,30 105,38 L105,89 Q82,82 61,91 Z" />} />
      <Layer id={id} fill={CREAM} shape={<path d="M17,34 Q39,26 59,37 L59,87 Q39,78 17,85 Z M61,37 Q81,26 103,34 L103,85 Q81,78 61,87 Z" />} />
      <path d="M25,46 Q38,41 51,47 M25,56 Q38,51 51,57 M25,66 Q36,61 46,66 M69,47 Q82,41 95,46 M69,57 Q82,51 95,56 M69,67 Q80,62 91,66" stroke={BUTTER} strokeWidth={1.5} strokeLinecap="round" fill="none" />
    </>
  ),

  "index-cards": (id) => (
    <>
      <Contact id={id} rx={40} />
      <Layer id={id} fill={HONEY} shape={<rect x={24} y={34} width={68} height={46} rx={5} transform="rotate(-11 58 57)" />} />
      <Layer id={id} fill={BUTTER} shape={<rect x={28} y={38} width={68} height={46} rx={5} transform="rotate(5 62 61)" />} />
      <Layer id={id} fill={CREAM} shape={<rect x={24} y={44} width={70} height={48} rx={5} transform="rotate(-3 59 68)" />} />
      <g transform="rotate(-3 59 68)" stroke={BUTTER} strokeWidth={1.5} strokeLinecap="round">
        <path d="M33,62 H84 M33,71 H84 M33,80 H66" />
      </g>
      <circle cx={84} cy={53} r={3.5} fill={HONEY} transform="rotate(-3 59 68)" />
    </>
  ),

  "star-medal": (id) => (
    <>
      <Contact id={id} rx={22} />
      <Layer id={id} fill={HONEY} shape={<path d="M48,62 L36,102 L45,96 L52,104 L60,66 Z" />} />
      <Layer id={id} fill={BUTTER} shape={<path d="M72,62 L84,102 L75,96 L68,104 L60,66 Z" />} />
      <Layer id={id} fill={HONEY} shape={<circle cx={60} cy={48} r={28} />} />
      <Layer id={id} fill={BUTTER} shape={<circle cx={60} cy={48} r={21} />} />
      <Layer id={id} fill={CREAM} shape={<path d={star(60, 49, 14, 6)} />} />
    </>
  ),

  hourglass: (id) => (
    <>
      <Contact id={id} rx={28} />
      <path d="M37,26 V94 M83,26 V94" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
      <Layer id={id} fill={CREAM} shape={<path d="M41,26 H79 Q79,46 63,58 V62 Q79,74 79,94 H41 Q41,74 57,62 V58 Q41,46 41,26 Z" />} />
      <Layer id={id} fill={BUTTER} shape={<path d="M47,36 H73 Q71,47 60,55 Q49,47 47,36 Z" />} lift={false} />
      <Layer id={id} fill={HONEY} shape={<path d="M45,93 Q60,72 75,93 Z" />} lift={false} />
      <path d="M60,57 V84" stroke={HONEY} strokeWidth={1.5} strokeLinecap="round" />
      <Layer id={id} fill={HONEY} shape={<path d={`${roundRect(30, 17, 60, 10, 5)} ${roundRect(30, 93, 60, 10, 5)}`} />} />
    </>
  ),

  lamp: (id) => (
    <>
      <Contact id={id} cx={52} rx={36} />
      <path className="oa-glow" d="M84,58 L104,51 L112,97 L74,97 Z" fill={BUTTER} />
      <Layer id={id} fill={BUTTER} shape={<path d="M42,92 L48,92 L65,60 L59,57 Z M59,55 L63,61 L84,48 L80,42 Z" />} />
      <Layer id={id} fill={HONEY} shape={<path d={roundRect(22, 90, 46, 10, 5)} />} />
      <Layer id={id} fill={CREAM} shape={<circle cx={61.5} cy={58} r={4} />} />
      <Layer id={id} fill={HONEY} shape={<path d="M74,38 Q82,22 98,26 L108,50 Q94,62 80,58 Z" />} />
      <Layer id={id} fill={BUTTER} shape={<circle cx={93} cy={55} r={4.5} />} lift={false} />
    </>
  ),

  spark: (id) => (
    <>
      <Contact id={id} rx={28} />
      <Layer id={id} fill={BUTTER} shape={<path d={sparkle(86, 30, 15, 3.5)} />} />
      <g className="oa-twinkle">
        <Layer id={id} fill={HONEY} shape={<path d={sparkle(58, 58, 36, 8)} />} />
        <Layer id={id} fill={BUTTER} shape={<path d={sparkle(58, 58, 18, 4)} />} />
      </g>
      <Layer id={id} fill={CREAM} shape={<path d={sparkle(30, 88, 9, 2.2)} />} />
    </>
  ),

  "tea-cup": (id) => (
    <>
      <Contact id={id} cx={57} rx={42} />
      <Layer id={id} fill={BUTTER} shape={<path d="M47,46 C41,38 53,32 47,22 C46,19 49,18 50.5,20 C57,31 45,37 51,46 Z M63,46 C59,40 67,36 63,29 C62,27 64.5,26 66,28 C70,35 62,40 66.5,46 Z" />} />
      <Layer id={id} fill={BUTTER} shape={<ellipse cx={57} cy={93} rx={42} ry={8} />} />
      <Layer id={id} fill={HONEY} shape={<path d="M83,58 Q101,57 99,71 Q97,83 81,80 L82,73 Q91,74 92,69 Q93,64 83,65 Z" />} />
      <Layer id={id} fill={CREAM} shape={<path d="M28,52 H86 Q86,88 57,91 Q28,88 28,52 Z" />} />
      <Layer id={id} fill={HONEY} shape={<path d="M28.5,61 H85.5 Q85,65.5 84.3,70 H29.7 Q29,65.5 28.5,61 Z" />} lift={false} />
      <Layer id={id} fill={BUTTER} shape={<ellipse cx={57} cy={52} rx={29} ry={4.5} />} lift={false} />
      <ellipse cx={57} cy={52.6} rx={24} ry={3} fill={HONEY} />
    </>
  ),

  key: (id) => (
    <>
      <Contact id={id} rx={44} />
      <Layer id={id} fill={BUTTER} shape={<path d={`${ring(38, 59, 21, 12)} ${roundRect(55, 55, 51, 9, 4.5)} ${roundRect(87, 61, 7, 13, 2)} ${roundRect(97, 61, 7, 10, 2)}`} transform="translate(2.5 2.5)" />} />
      <Layer id={id} fill={HONEY} shape={<path d={`${ring(38, 59, 21, 8)} ${roundRect(55, 55, 51, 9, 4.5)} ${roundRect(87, 61, 7, 13, 2)} ${roundRect(97, 61, 7, 10, 2)}`} />} />
      <Layer id={id} fill={CREAM} shape={<path d={roundRect(61, 52, 6, 15, 2.5)} />} />
    </>
  ),

  seedling: (id) => (
    <>
      <Contact id={id} rx={28} />
      <Layer id={id} fill={BUTTER} shape={<path d="M58.6,68 Q57,52 60,40 L62.4,40 Q59.6,52 61.4,68 Z" />} />
      <Layer id={id} fill={BUTTER} shape={<path d="M60,50 Q40,49 32,33 Q52,28 60,50 Z" />} />
      <Layer id={id} fill={HONEY} shape={<path d="M61.5,43 Q71,23 94,24 Q88,45 61.5,43 Z" />} />
      <path d="M58,48 Q46,42 38,35 M64,41 Q76,33 88,28" stroke={CREAM} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      <Layer id={id} fill={HONEY} shape={<path d="M38,74 H82 L76,102 H44 Z" />} />
      <Layer id={id} fill={BUTTER} shape={<path d={roundRect(33, 66, 54, 11, 3)} />} />
      <ellipse cx={60} cy={67} rx={21} ry={2.2} fill={INK} opacity={0.8} />
    </>
  ),
};
