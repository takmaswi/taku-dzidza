import { useContext, type CSSProperties } from "react";
import { CUTOUTS, SCENES, type CutoutSlug, type SceneSlug } from "../art.generated";
import { SignedInContext } from "./signedIn";

/**
 * Photos, never framed. A cutout is a person with their own soft contact
 * shadow, so they sit on the page. A scene is a composed photo whose edges
 * fade into the page texture. Both load lazily with srcset unless eager.
 * Sizes come from art/web/manifest.json via src/art.generated.ts.
 *
 * People appear on Landing, SignIn and Setup only. Inside the signed in app
 * (SignedInContext) both draw nothing, and say so in development.
 */

function usePeopleAllowed(kind: string, slug: string): boolean {
  const signedIn = useContext(SignedInContext);
  if (signedIn && import.meta.env.DEV) console.error(`${kind} "${slug}" is a person, and people stay out of the signed in app. Use ObjectArt.`);
  return !signedIn;
}

type Common = { alt: string; sizes: string; eager?: boolean; className?: string; style?: CSSProperties };

export function Cutout({ slug, alt, sizes, eager = false, className = "", style }: Common & { slug: CutoutSlug }) {
  const allowed = usePeopleAllowed("Cutout", slug);
  if (!allowed) return null;
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

/** max: leave out web sizes wider than this, to keep a page inside its image budget on sharp screens. */
export function Scene({ slug, alt, sizes, eager = false, className = "", style, max }: Common & { slug: SceneSlug; max?: number }) {
  const allowed = usePeopleAllowed("Scene", slug);
  if (!allowed) return null;
  const art = SCENES[slug];
  const all: readonly number[] = art.widths;
  const capped = all.filter((w) => max === undefined || w <= max);
  const widths = capped.length > 0 ? capped : all.slice(0, 1);
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

type LineDecor = "underline-swoop" | "underline-double" | "circle-loop" | "stars" | "sparks" | "arrow-curved" | "margin-formula";

/** A single stroke mark from art/decor, recoloured to amber (or ink) through a CSS mask. */
export function DecorLine({ name, className = "", style }: { name: LineDecor; className?: string; style?: CSSProperties }) {
  return <span className={`decor-line ${className}`} style={{ ...style, ["--decor" as string]: `url("/art/decor/${name}.svg")` }} aria-hidden="true" />;
}
