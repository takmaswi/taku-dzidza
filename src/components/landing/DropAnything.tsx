import { ArrowDown, AudioLines, Camera, Clock, FileText, Layers, Link2, ListChecks, Network, Presentation, ScrollText, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { copy } from "../../copy/en";
import { LandingPhoto } from "./LandingPhoto";
import { Try } from "./Try";

type Kind = keyof typeof copy.landing.drop.chips;
const KINDS: { kind: Kind; Icon: LucideIcon; Out: LucideIcon }[] = [
  { kind: "photo", Icon: Camera, Out: ListChecks },
  { kind: "pdf", Icon: FileText, Out: Layers },
  { kind: "slides", Icon: Presentation, Out: ScrollText },
  { kind: "link", Icon: Link2, Out: Network },
  { kind: "audio", Icon: AudioLines, Out: Clock },
];

/**
 * "Add your notes", the first chapter of How Taku works: five chips, each swapping what you add (left) and what
 * Taku makes from it (right). Photo of notes is picked first. Audio is shown
 * honestly as coming soon: today sources are photos, PDFs, Word files, pasted
 * text and links (convex/schema.ts, sourceKindValidator).
 */
export function DropAnything() {
  const t = copy.landing.drop;
  const [active, setActive] = useState<Kind>("photo");
  const pick = KINDS.find((k) => k.kind === active) ?? KINDS[0];
  const c = t.chips[active];
  return (
    <div className="da">
      <Try className="da-stage">
        <div className="da-chips" role="group" aria-label={t.chipsLabel}>
          {KINDS.map(({ kind, Icon }, i) => (
            <button key={kind} type="button" className={i === 1 ? "da-chip try-target" : "da-chip"} aria-pressed={kind === active} onClick={() => setActive(kind)}>
              <Icon size={18} aria-hidden="true" />
              {t.chips[kind].label}
              {kind === "audio" && <span className="da-soon">{t.soon}</span>}
            </button>
          ))}
        </div>
        <div className="da-flow" aria-live="polite">
          <div key={`in-${active}`} className="da-card da-in">
            <span className="eyebrow">{t.inputLabel}</span>
            <div className="da-file">
              {active === "photo" ? (
                <LandingPhoto slug="notes-economics" sizes="160px" className="da-photo" />
              ) : (
                <span className="da-icon"><pick.Icon size={22} aria-hidden="true" /></span>
              )}
              <span>
                <b>{c.input}</b>
                <br />
                <span className="soft small-text">{c.meta}</span>
              </span>
            </div>
          </div>
          <span className="da-arrow" aria-hidden="true">
            <ArrowDown size={20} />
          </span>
          <div key={`out-${active}`} className={`da-card da-out da-${active}`}>
            <span className="eyebrow">
              <pick.Out size={14} aria-hidden="true" /> {t.outputLabel}: {c.output}
            </span>
            {active !== "link" && <b className="da-title">{c.title}</b>}
            <Output kind={active} title={c.title} lines={c.lines} />
          </div>
        </div>
      </Try>
    </div>
  );
}

function Output({ kind, title, lines }: { kind: Kind; title: string; lines: readonly string[] }) {
  if (kind === "pdf") {
    const pairs = [0, 2].map((i) => ({ front: lines[i], back: lines[i + 1] }));
    return (
      <div className="da-cards">
        {pairs.map((p, i) => (
          <div key={p.front} className="da-flash" style={{ ["--i" as string]: i }}>
            <span>{p.front}</span>
            <span className="soft">{p.back}</span>
          </div>
        ))}
      </div>
    );
  }
  if (kind === "link") {
    return (
      <div className="da-map">
        <b className="da-centre">{title}</b>
        {lines.map((l, i) => (
          <span key={l} className="da-branch" style={{ ["--i" as string]: i }}>
            {l}
          </span>
        ))}
      </div>
    );
  }
  if (kind === "slides") {
    return (
      <ol className="da-paper">
        {lines.map((l, i) => (
          <li key={l} style={{ ["--i" as string]: i }}>
            {l}
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ul className={kind === "audio" ? "da-soon-lines" : "da-summary"}>
      {lines.map((l, i) => (
        <li key={l} style={{ ["--i" as string]: i }}>
          {l}
          {kind === "photo" && (
            <span className="cite da-dot" aria-hidden="true">
              1
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
