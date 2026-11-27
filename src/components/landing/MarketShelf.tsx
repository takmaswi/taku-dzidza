import { useEffect, useState, type RefObject } from "react";
import { copy } from "../../copy/en";
import { LandingPhoto } from "./LandingPhoto";
import { MARKET_SAMPLES } from "./marketSamples";
import { useInView, useStill } from "./motion";

type Entrance = "wait" | "play" | undefined;

/**
 * Motion state for a marketplace part: "wait" holds it out of sight until it
 * comes on screen, then "play" runs its entrance once and it stays. With less
 * motion, and in the prerendered page, there is no state: it shows its final
 * look. Styles animate transform and opacity only.
 */
function useEntrance<T extends Element>(): [RefObject<T | null>, Entrance] {
  const still = useStill();
  const [ref, active] = useInView<T>("0px 0px -15% 0px");
  const [live, setLive] = useState(false);
  const [seen, setSeen] = useState(false);
  useEffect(() => setLive(true), []);
  useEffect(() => {
    if (active) setSeen(true);
  }, [active]);
  if (still || !live) return [ref, undefined];
  return [ref, seen ? "play" : "wait"];
}

/** Sample student notes: they slide onto the shelf in turn when it comes on screen, and lift a little on hover. */
export function MarketShelf() {
  const t = copy.landing.market;
  const [ref, state] = useEntrance<HTMLUListElement>();
  return (
    <ul ref={ref} className="msh" aria-label={t.shelf} data-state={state}>
      {MARKET_SAMPLES.map((item, i) => (
        <li key={item.photo} className="msh-item" style={{ ["--i" as string]: i }}>
          <div className="msh-book">
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

/**
 * How a sale works, played once when it comes on screen: the preview a buyer
 * reads first, then a notebook travels from the seller's card to a buyer's
 * library and "80% to the seller" comes up. Its final look is the notebook
 * in the library with the 80% shown.
 */
export function MarketSale() {
  const t = copy.landing.market;
  const [ref, state] = useEntrance<HTMLDivElement>();
  return (
    <div ref={ref} className="mk-flow" data-state={state}>
      <figure className="mk-preview">
        <LandingPhoto slug="market-buyer-preview" sizes="160px" alt={t.preview.alt} className="mk-preview-photo" />
        <figcaption>
          <b>{t.preview.title}</b>
          <span className="soft">{t.preview.line}</span>
        </figcaption>
      </figure>
      <div className="mk-sale" role="img" aria-label={t.sale.label}>
        <div className="mk-side">
          <LandingPhoto slug="spot-earn-from-notes" sizes="160px" className="mk-side-photo" />
          <span className="eyebrow">{t.sale.seller}</span>
        </div>
        <div className="mk-path" aria-hidden="true">
          <span className="mk-lane">
            <i className="mk-book mk-traveller" />
          </span>
          <span className="mk-cut">{t.sale.cut}</span>
        </div>
        <div className="mk-side">
          <span className="mk-library">
            <LandingPhoto slug="market-notebook-stack" sizes="160px" className="mk-side-photo" />
            <span className="mk-landed">
              <i className="mk-book" />
              {t.sale.added}
            </span>
          </span>
          <span className="eyebrow">{t.sale.library}</span>
        </div>
      </div>
    </div>
  );
}
