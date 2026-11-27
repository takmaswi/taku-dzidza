import { LANDING_PHOTOS, type LandingPhotoSlug } from "../../art.generated";

type Props = {
  slug: LandingPhotoSlug;
  sizes: string;
  alt?: string;
  className?: string;
  eager?: boolean;
};

export function LandingPhoto({ slug, sizes, alt = "", className, eager = false }: Props) {
  const photo = LANDING_PHOTOS[slug];
  const base = `/art/landing/${slug}`;
  return (
    <img
      className={className}
      src={`${base}-480.webp`}
      srcSet={photo.widths.map((width) => `${base}-${width}.webp ${width}w`).join(", ")}
      sizes={sizes}
      width={photo.width}
      height={photo.height}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
