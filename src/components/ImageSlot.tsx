import { ART_SLUGS } from "../art.generated";

/**
 * A photo from art/assets, or a labelled placeholder while Codex has not made
 * it yet (art/STYLE.md). Low data mode will swap photos for the placeholder.
 */
export function ImageSlot({ slug, alt }: { slug: string; alt: string }) {
  if (!ART_SLUGS.includes(slug)) {
    return (
      <div className="image-slot placeholder" role="img" aria-label={alt}>
        {slug}
      </div>
    );
  }
  return (
    <div className="image-slot">
      <img src={`/art/${slug}.webp`} alt={alt} width={1080} height={1350} loading="lazy" decoding="async" />
    </div>
  );
}
