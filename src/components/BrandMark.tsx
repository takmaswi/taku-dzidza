/** The Takudzidza mark: an ink tile with a cream T and a honey dot (public/icon.svg). */
export function BrandMark({ className = "brand-mark", inverse = false }: { className?: string; inverse?: boolean }) {
  const tile = inverse ? "#fff8ec" : "#111111";
  const letter = inverse ? "#111111" : "#fff8ec";
  return (
    <svg className={className} viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="120" fill={tile} />
      <circle cx="372" cy="140" r="56" fill="#f2b33d" />
      <rect x="128" y="160" width="208" height="56" rx="28" fill={letter} />
      <rect x="204" y="160" width="56" height="224" rx="28" fill={letter} />
    </svg>
  );
}

/** The zigzag divider, in the spirit of Takubasa's masonry chevron. */
export function Chevron() {
  return (
    <svg className="chevron" viewBox="0 0 1200 22" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 18 L20 4 L40 18 L60 4 L80 18 L100 4 L120 18 L140 4 L160 18 L180 4 L200 18 L220 4 L240 18 L260 4 L280 18 L300 4 L320 18 L340 4 L360 18 L380 4 L400 18 L420 4 L440 18 L460 4 L480 18 L500 4 L520 18 L540 4 L560 18 L580 4 L600 18 L620 4 L640 18 L660 4 L680 18 L700 4 L720 18 L740 4 L760 18 L780 4 L800 18 L820 4 L840 18 L860 4 L880 18 L900 4 L920 18 L940 4 L960 18 L980 4 L1000 18 L1020 4 L1040 18 L1060 4 L1080 18 L1100 4 L1120 18 L1140 4 L1160 18 L1180 4 L1200 18" fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
