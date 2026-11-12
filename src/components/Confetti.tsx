import type { CSSProperties } from "react";

const COLOURS = ["#F2B33D", "#F8E2A8", "#F2C766", "#FFF8EC", "#F2B33D"];
const PIECES = 22;

/** A fixed spread, so the same pieces fall each time and rendering stays pure. */
const SPREAD = Array.from({ length: PIECES }, (_, i) => {
  const a = ((i * 137.5) % 360) * (Math.PI / 180);
  const reach = 70 + ((i * 53) % 90);
  return {
    ["--x" as string]: `${Math.round(Math.cos(a) * reach)}px`,
    ["--up" as string]: `${-40 - ((i * 29) % 60)}px`,
    ["--down" as string]: `${90 + ((i * 41) % 120)}px`,
    ["--r" as string]: `${((i * 97) % 540) - 270}deg`,
    ["--d" as string]: `${(i % 6) * 30}ms`,
    ["--w" as string]: `${6 + (i % 3) * 2}px`,
    ["--c" as string]: COLOURS[i % COLOURS.length],
  } as CSSProperties;
});

/**
 * One soft burst of honey paper pieces, played once when it mounts. Plain CSS
 * (src/styles/polish.css); hidden when the learner or the phone asks for less motion.
 */
export function Confetti() {
  return (
    <span className="confetti" aria-hidden="true">
      {SPREAD.map((style, i) => (
        <i key={i} style={style} />
      ))}
    </span>
  );
}
