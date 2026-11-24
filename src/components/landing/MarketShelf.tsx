import type { PointerEvent } from "react";
import { COVERS } from "../../art.generated";
import { copy } from "../../copy/en";
import { isStill } from "./motion";

/**
 * A shelf of six sample notebooks for the marketplace section. Covers are the
 * art batch 5 bookcloth photos where they exist, otherwise a CSS cover in the
 * honey bookcloth texture tinted to the colour. Words sit under the cover,
 * never on the photo. On a computer each cover leans slightly toward the
 * pointer; on a phone the shelf scrolls sideways.
 */
export function MarketShelf() {
  const t = copy.landing.market;
  return (
    <ul className="msh" aria-label={t.shelf}>
      {t.items.map((item) => {
        const slug = `cover-${item.cover}`;
        return (
          <li key={item.title} className="msh-item">
            <div className="msh-book" onPointerMove={lean} onPointerLeave={settle}>
              {COVERS.includes(slug) ? (
                <img src={`/art/covers/${slug}-450.webp`} alt="" width={450} height={600} loading="lazy" decoding="async" />
              ) : (
                <span className={`msh-cloth msh-${item.cover}`} aria-hidden="true" />
              )}
            </div>
            <div className="msh-info">
              <span className="msh-sample">{t.sample}</span>
              <b>{item.title}</b>
              <span className="soft">
                {item.subject}, {t.by(item.seller)}
              </span>
              <span className="msh-price">{item.price}</span>
            </div>
          </li>
        );
      })}
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
