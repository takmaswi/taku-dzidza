import { useState } from "react";
import { copy } from "../../copy/en";
import { useInView, useStill } from "./motion";
import { PauseButton } from "./PauseButton";
import { stripOrder, type Region } from "./useRegion";

/**
 * A slow marquee of the exams and courses people study for, in text only (no
 * exam board logos), the region's own first. It stops on hover and focus,
 * has a pause button, runs only on screen, and is a still list with less motion.
 */
export function CurriculumStrip({ region }: { region: Region }) {
  const t = copy.landing.strip;
  const still = useStill();
  const [ref, , idle] = useInView<HTMLElement>();
  const [playing, setPlaying] = useState(true);
  const items = stripOrder(region).map((key) => ({ key, label: t.items[key] }));
  return (
    <section ref={ref} className="l-strip" aria-labelledby="l-strip-line" data-paused={!playing || idle ? "true" : undefined}>
      <div className="l-wrap l-strip-head">
        <p id="l-strip-line" className="l-strip-line">
          {t.line}
        </p>
        {!still && <PauseButton playing={playing} onToggle={() => setPlaying((p) => !p)} pauseLabel={t.pauseStrip} playLabel={t.playStrip} />}
      </div>
      <div className="l-marquee">
        <div className="l-marquee-track">
          <ul className="l-chips" aria-label={t.label}>
            {items.map((x) => (
              <li key={x.key}>{x.label}</li>
            ))}
          </ul>
          {/* The second copy closes the loop; screen readers hear the list once. */}
          <ul className="l-chips l-chips-copy" aria-hidden="true">
            {items.map((x) => (
              <li key={x.key}>{x.label}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
