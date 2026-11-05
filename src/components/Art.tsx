import type { CSSProperties } from "react";
import { CUTOUTS, SCENES, type CutoutSlug, type SceneSlug } from "../art.generated";

/**
 * Photos, never framed. A cutout is a person with their own soft contact
 * shadow, so they sit on the page. A scene is a composed photo whose edges
 * fade into the page texture. Both load lazily with srcset unless eager.
 * Sizes come from art/web/manifest.json via src/art.generated.ts.
 */

type Common = { alt: string; sizes: string; eager?: boolean; className?: string; style?: CSSProperties };

export function Cutout({ slug, alt, sizes, eager = false, className = "", style }: Common & { slug: CutoutSlug }) {
  const art = CUTOUTS[slug];
  const widths: readonly number[] = art.widths;
  const srcSet = widths.map((w) => `/art/cutouts/${slug}-${w}.webp ${w}w`).join(", ");
  const loading = eager ? "eager" : "lazy";
  return (
    <figure className={`cutout ${className}`} style={style}>
      <img className="cutout-shadow" src={`/art/cutouts/${slug}-shadow.webp`} alt="" aria-hidden="true" width={art.width} height={art.height} loading={loading} decoding="async" />
      <img className="cutout-person" src={`/art/cutouts/${slug}-${widths[0]}.webp`} srcSet={srcSet} sizes={sizes} alt={alt} width={art.width} height={art.height} loading={loading} decoding="async" fetchPriority={eager ? "high" : "auto"} />
    </figure>
  );
}

export function Scene({ slug, alt, sizes, eager = false, className = "", style }: Common & { slug: SceneSlug }) {
  const art = SCENES[slug];
  const widths: readonly number[] = art.widths;
  const srcSet = widths.map((w) => `/art/scenes/${slug}-${w}.webp ${w}w`).join(", ");
  return (
    <img
      className={`scene ${className}`}
      style={style}
      src={`/art/scenes/${slug}-${widths[0]}.webp`}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={art.width}
      height={art.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : "auto"}
    />
  );
}

type RasterDecor = "highlighter-stroke" | "sticky-note-butter" | "pencil-honey" | "book-stack" | "page-corner-curl" | "torn-paper-cream" | "torn-paper-amber";
type LineDecor = "underline-swoop" | "underline-double" | "circle-loop" | "stars" | "sparks" | "arrow-curved" | "margin-formula";

/** A stationery object from art/decor. Decorative only: never behind body text, at most two on a screen. */
export function Decor({ name, className = "", style }: { name: RasterDecor; className?: string; style?: CSSProperties }) {
  return <img className={`decor ${className}`} style={style} src={`/art/decor/${name}.webp`} alt="" aria-hidden="true" loading="lazy" decoding="async" />;
}

/** A single stroke mark from art/decor, recoloured to amber (or ink) through a CSS mask. */
export function DecorLine({ name, className = "", style }: { name: LineDecor; className?: string; style?: CSSProperties }) {
  return <span className={`decor-line ${className}`} style={{ ...style, ["--decor" as string]: `url("/art/decor/${name}.svg")` }} aria-hidden="true" />;
}
