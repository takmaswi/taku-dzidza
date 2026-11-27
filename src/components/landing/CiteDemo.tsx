import { Pointer } from "lucide-react";
import { useState } from "react";
import { copy } from "../../copy/en";
import { BrandMark } from "../BrandMark";
import { LandingPhoto } from "./LandingPhoto";
import { NOTE_SAMPLES } from "./noteSamples";

/**
 * "Every answer points to the page": a sample answer whose citation number
 * the visitor taps. The source page slides up under it with the line
 * highlighted; a second tap closes it. The page's space is kept either way,
 * so nothing below moves.
 */
export function CiteDemo() {
  const t = copy.landing.cite;
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState<string>(NOTE_SAMPLES[0].slug);
  const sample = NOTE_SAMPLES.find((note) => note.slug === slug) ?? NOTE_SAMPLES[0];
  return (
    <div className={`cd${open ? " open" : ""}`}>
      <p className="cd-hint">
        <Pointer size={16} aria-hidden="true" />
        {t.hint}
      </p>
      <div className="cd-chat raised">
        <label className="cd-topic">
          <span className="eyebrow">Sample notes</span>
          <select value={slug} onChange={(event) => { setSlug(event.target.value); setOpen(false); }}>
            {NOTE_SAMPLES.map((note) => <option key={note.slug} value={note.slug}>{note.title}</option>)}
          </select>
        </label>
        <p className="cd-q">{sample.question}</p>
        <div className="cd-a">
          <BrandMark variant="on-cream" className="cd-mark" />
          <div>
            <p>
              {sample.answer}{" "}
              <button type="button" className="cite cd-cite try-target" aria-expanded={open} aria-controls="cd-page" aria-label={open ? t.close : t.open} onClick={() => setOpen((o) => !o)}>
                1
              </button>
            </p>
          </div>
        </div>
      </div>
      <div id="cd-page" className="cd-page" hidden={!open}>
        <span className="eyebrow">{sample.title}</span>
        <p><mark className="hl">{sample.cited}</mark></p>
        {open && (
          <LandingPhoto
            slug={sample.slug}
            sizes="(max-width: 600px) calc(100vw - 5rem), 400px"
            alt={`${sample.title}. ${sample.transcript}`}
            className="cd-photo"
          />
        )}
      </div>
    </div>
  );
}
