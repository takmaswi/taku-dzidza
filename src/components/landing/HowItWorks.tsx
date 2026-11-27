import { ChevronDown } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { copy } from "../../copy/en";
import type { LandingPhotoSlug } from "../../art.generated";
import { CiteDemo } from "./CiteDemo";
import { DropAnything } from "./DropAnything";
import { LandingPhoto } from "./LandingPhoto";
import { ModeSwitcher } from "./ModeSwitcher";
import { isStill } from "./motion";
import { ProgressCard } from "./ProgressCard";
import { ToolBento } from "./ToolBento";
import { Try } from "./Try";

type Part = keyof typeof copy.landing.story.parts;
type Chapter = (typeof copy.landing.story.parts)[Part]["chapters"][number];

/** A small card for an upcoming feature, its photo at card size. */
export function SoonCard({ photo, title, tag, line }: { photo: LandingPhotoSlug; title: string; tag: string; line: string }) {
  return (
    <div className="hw-soon">
      <LandingPhoto slug={photo} sizes="160px" className="hw-soon-photo" />
      <span>
        <b>{title}</b> <span className="l-tag">{tag}</span>
        <br />
        <span className="soft">{line}</span>
      </span>
    </div>
  );
}

/** Each chapter's picture, shown at card size. */
const PHOTOS: Record<Chapter["id"], LandingPhotoSlug> = {
  notes: "spot-add-your-notes",
  ask: "notes-maths",
  practise: "market-notebook-stack",
  gaps: "spot-learns-with-you",
  adapt: "market-worked-example",
};

const SOON_PHOTOS: Record<Part, LandingPhotoSlug> = { notes: "spot-listening", learns: "spot-study-groups" };

function Visual({ id, signUp }: { id: Chapter["id"]; signUp: string }): ReactNode {
  switch (id) {
    case "notes":
      return <DropAnything />;
    case "ask":
      return (
        <Try>
          <CiteDemo />
        </Try>
      );
    case "practise":
      return <ToolBento />;
    case "gaps":
      return <ProgressCard signUp={signUp} />;
    case "adapt":
      return (
        <Try>
          <ModeSwitcher />
        </Try>
      );
  }
}

/**
 * One part of How Taku works: the heading, then every chapter at once as a
 * card (side by side on a computer, a sideways row that snaps on a phone),
 * then the highlighted chapter's demo. Nothing moves by itself: a tap on a
 * card, or a swipe that brings one to the middle of the row, highlights it
 * and swaps the demo. Learn more opens in place under its card.
 */
export function HowItWorks({ part, signUp }: { part: Part; signUp: string }) {
  const t = copy.landing.story;
  const p = t.parts[part];
  const chapters: readonly Chapter[] = p.chapters;
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState<readonly number[]>([]);
  const row = useRef<HTMLUListElement>(null);
  const frame = useRef(0);
  const stageId = `hw-stage-${part}`;
  const chapter = chapters[current];

  const pick = (i: number) => {
    setCurrent(i);
    // On a phone, bring a half seen card to the middle of the row.
    const box = row.current;
    const card = box?.children[i] as HTMLElement | undefined;
    if (box == null || card === undefined || box.scrollWidth <= box.clientWidth) return;
    box.scrollTo({ left: card.offsetLeft - (box.clientWidth - card.clientWidth) / 2, behavior: isStill() ? "auto" : "smooth" });
  };
  // A swipe on the phone's row highlights the card that settles nearest the middle.
  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const box = row.current;
      if (box === null || box.scrollWidth <= box.clientWidth) return;
      const middle = box.scrollLeft + box.clientWidth / 2;
      let best = 0;
      let bestGap = Infinity;
      [...box.children].forEach((child, i) => {
        const el = child as HTMLElement;
        const gap = Math.abs(el.offsetLeft + el.clientWidth / 2 - middle);
        if (gap < bestGap) [best, bestGap] = [i, gap];
      });
      setCurrent(best);
    });
  };
  const toggleMore = (i: number) => setOpen((o) => (o.includes(i) ? o.filter((n) => n !== i) : [...o, i]));

  return (
    <div className={`l-wrap hw hw-${part}`}>
      <div className="hw-head">
        <span className="eyebrow">{p.eyebrow}</span>
        <h2 id={`l-${part}-title`} className="l-h2">
          {p.title}
        </h2>
        <p className="lead soft">{p.lead}</p>
      </div>
      <ul ref={row} className="hw-cards" data-count={chapters.length} onScroll={onScroll}>
        {chapters.map((c, i) => {
          const on = i === current;
          const more = open.includes(i);
          return (
            <li key={c.id} className="hw-card" data-on={on ? "true" : undefined} onClick={() => pick(i)}>
              <LandingPhoto slug={PHOTOS[c.id]} sizes="(max-width: 899px) 78vw, 400px" className="hw-photo" />
              <span className="hw-step">
                <b aria-hidden="true">{i + 1}</b>
                {c.tab}
                {c.tag !== null && <span className="l-tag">{c.tag}</span>}
              </span>
              <h3>
                <button type="button" className="hw-pick" aria-pressed={on} aria-controls={stageId}>
                  {c.title}
                </button>
              </h3>
              <p className="soft">{c.line}</p>
              <button type="button" className="hw-more-toggle" aria-expanded={more} aria-controls={`hw-more-${c.id}`} onClick={() => toggleMore(i)}>
                {more ? t.less : t.more} <ChevronDown size={16} aria-hidden="true" />
              </button>
              <div id={`hw-more-${c.id}`} className="hw-more" hidden={!more}>
                <p>{c.more}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div id={stageId} className="hw-stage" role="region" aria-label={t.stage(chapter.tab)}>
        <div key={chapter.id} className={`hw-visual hw-v-${chapter.id}`}>
          <Visual id={chapter.id} signUp={signUp} />
        </div>
      </div>
      <SoonCard photo={SOON_PHOTOS[part]} title={p.soon.title} tag={p.soon.tag} line={p.soon.line} />
    </div>
  );
}
