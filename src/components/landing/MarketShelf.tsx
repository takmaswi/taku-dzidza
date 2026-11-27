import type { PointerEvent } from "react";
import { copy } from "../../copy/en";
import { LandingPhoto } from "./LandingPhoto";
import { MARKET_SAMPLES } from "./marketSamples";
import { isStill } from "./motion";

/** Sample student notes, with a pointer tilt on desktop and a swipeable shelf on mobile. */
export function MarketShelf() {
  const t = copy.landing.market;
  return (
    <ul className="msh" aria-label={t.shelf}>
      {MARKET_SAMPLES.map((item) => (
        <li key={item.photo} className="msh-item">
          <div className="msh-book" onPointerMove={lean} onPointerLeave={settle}>
            <LandingPhoto slug={item.photo} sizes="(max-width: 899px) 42vw, 220px" className="msh-cover" />
          </div>
          <div className="msh-info">
            <span className="msh-sample">{t.sample}</span>
            <b>{item.title}</b>
            <span className="soft">{t.by(item.seller)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function lean(e: PointerEvent<HTMLDivElement>) {
  if (e.pointerType !== "mouse" || isStill()) return;
  const box = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - box.left) / box.width - 0.5;
  const y = (e.clientY - box.top) / box.height - 0.5;
  e.currentTarget.style.setProperty("--ry", `${(x * 12).toFixed(2)}deg`);
  e.currentTarget.style.setProperty("--rx", `${(-y * 10).toFixed(2)}deg`);
}

function settle(e: PointerEvent<HTMLDivElement>) {
  e.currentTarget.style.removeProperty("--ry");
  e.currentTarget.style.removeProperty("--rx");
}
