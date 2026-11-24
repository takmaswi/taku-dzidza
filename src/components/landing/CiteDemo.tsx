import { useState } from "react";
import { copy } from "../../copy/en";
import { BrandMark } from "../BrandMark";

/**
 * "Every answer points to the page": a sample answer whose citation number
 * the visitor taps. The source page slides up under it with the line
 * highlighted; a second tap closes it. The page's space is kept either way,
 * so nothing below moves.
 */
export function CiteDemo() {
  const t = copy.landing.cite;
  const [open, setOpen] = useState(false);
  return (
    <div className={`cd${open ? " open" : ""}`}>
      <p className="cd-hint">{t.hint}</p>
      <div className="cd-chat raised">
        <span className="eyebrow">{t.notebook}</span>
        <p className="cd-q">{t.question}</p>
        <div className="cd-a">
          <BrandMark variant="on-cream" className="cd-mark" />
          <div>
            <p>
              {t.answer}{" "}
              <button type="button" className="cite cd-cite" aria-expanded={open} aria-controls="cd-page" aria-label={open ? t.close : t.open} onClick={() => setOpen((o) => !o)}>
                1
              </button>
            </p>
            <p className="cd-added">
              {t.added} <span className="added-tag">{copy.notebook.addedByTaku}</span>
            </p>
          </div>
        </div>
      </div>
      <div id="cd-page" className="cd-page" hidden={!open}>
        <span className="eyebrow">{t.source}</span>
        <p>
          {t.sourceBefore} <mark className="hl">{t.sourceLine}</mark> {t.sourceAfter}
        </p>
      </div>
    </div>
  );
}
