import { ART_SLUGS } from "../art.generated";

/**
 * A photo from art/assets. While Codex has not made it yet, a fallback photo
 * from batch 1 is used if one is given, otherwise a designed stand in (a
 * butter block with a honey sun and the slug), so pages never look broken.
 */
export function ImageSlot({ slug, alt, fallback, shape = "card", eager = false }: { slug: string; alt: string; fallback?: string; shape?: "card" | "arch" | "pill"; eager?: boolean }) {
  const cls = `image-slot${shape === "arch" ? " arch" : shape === "pill" ? " pill-shape" : ""}`;
  const use = ART_SLUGS.includes(slug) ? slug : fallback !== undefined && ART_SLUGS.includes(fallback) ? fallback : null;
  if (use === null) {
    return (
      <div className={`${cls} standin`} role="img" aria-label={alt}>
        <span>{slug}</span>
      </div>
    );
  }
  return (
    <div className={cls}>
      <img src={`/art/${use}.webp`} alt={alt} width={1080} height={1350} loading={eager ? "eager" : "lazy"} decoding="async" />
    </div>
  );
}
