import lockupUrl from "../../art/brand/takudzidza/proposed/takudzidza-horizontal-by-taku.svg";
import { copy } from "../copy/en";
import { MARK_FILLS, MARK_RECTS, type MarkVariant } from "./brand";

type Variant = MarkVariant;

function MarkSvg({ variant, className }: { variant: Variant; className: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {MARK_RECTS.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.width} height={r.height} rx="12" fill={MARK_FILLS[variant][i]} />
      ))}
    </svg>
  );
}

/** The mark alone. "auto" follows the surface: on cream in light mode, inverse on the dark app. */
export function BrandMark({ variant = "auto", className = "mark" }: { variant?: Variant | "auto"; className?: string }) {
  if (variant !== "auto") return <MarkSvg variant={variant} className={className} />;
  return (
    <span className={`mark-auto ${className}`}>
      <MarkSvg variant="on-cream" className="mark-light" />
      <MarkSvg variant="inverse" className="mark-dark" />
    </span>
  );
}

/**
 * The approved product lockup: horizontal, with "by Taku". Only on cream and honey surfaces.
 * The file's canvas is 1400 by 480 with wide margins; the artwork paints 98 to 1110 across and
 * 111 to 342 down. The view keeps the artwork whole plus its clear space (a quarter of the
 * mark width, 61) and drops the rest, so the file itself is used unchanged.
 */
const LOCKUP_VIEW = { x: 37, y: 50, width: 1134, height: 353 };

export function Lockup({ className = "lockup" }: { className?: string }) {
  const v = LOCKUP_VIEW;
  return (
    <svg className={className} viewBox={`${v.x} ${v.y} ${v.width} ${v.height}`} role="img" aria-label={`${copy.appName} ${copy.byline}`}>
      <image href={lockupUrl} width={1400} height={480} />
    </svg>
  );
}
