import { BookOpen, Check, ChevronLeft, ChevronRight, Layers, ListChecks, Network, ScrollText, Sparkles, type LucideIcon } from "lucide-react";
import { useRef, useState } from "react";
import { copy } from "../../copy/en";
import { Try } from "./Try";
import { isStill, useInView, useStill } from "./motion";

type Key = keyof typeof copy.landing.tools.items;
const TILES: { key: Key; Icon: LucideIcon }[] = [
  { key: "cards", Icon: Layers },
  { key: "paper", Icon: ListChecks },
  { key: "scroll", Icon: ScrollText },
  { key: "summary", Icon: Sparkles },
  { key: "mindmap", Icon: Network },
  { key: "guide", Icon: BookOpen },
];

/**
 * The six study tools, each with a small animation that plays when the tiles
 * come on screen (once each time, under five seconds, so nothing loops).
 * A 3 by 2 bento on a computer with Flashcards larger; on a phone a sideways
 * scroll snap row with the next card peeking in, dots that follow the scroll,
 * and arrow buttons for keyboards. It never turns by itself.
 */
export function ToolBento() {
  const t = copy.landing.tools;
  const still = useStill();
  const [ref, active] = useInView<HTMLDivElement>("0px 0px -15% 0px");
  // Every tile shows its finished look at all times; play adds a short, subtle settle when the tiles come on screen. With less motion, never.
  const state = still || !active ? undefined : "play";
  const track = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);
  const frame = useRef(0);

  const tileAt = (i: number) => track.current?.children[i] as HTMLElement | undefined;
  const go = (i: number) => {
    const el = tileAt(Math.max(0, Math.min(TILES.length - 1, i)));
    const box = track.current;
    if (el === undefined || box === null) return;
    // Phones under 700 px snap each card to the start, so the next one peeks in; wider, cards snap to the centre.
    const start = getComputedStyle(el).scrollSnapAlign.includes("start");
    const left = start ? el.offsetLeft - parseFloat(getComputedStyle(box).scrollPaddingLeft || "0") : el.offsetLeft - (box.clientWidth - el.clientWidth) / 2;
    box.scrollTo({ left, behavior: isStill() ? "auto" : "smooth" });
  };
  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const box = track.current;
      if (box === null) return;
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

  return (
    <div ref={ref} className="l-wrap tb" data-state={state}>
      <div className="tb-head">
        <span className="eyebrow">{t.eyebrow}</span>
        <h2 id="l-tools-title" className="l-h2">
          {t.title}
        </h2>
      </div>
      <Try className="tb-try">
      <ul ref={track} className="tb-track" aria-labelledby="l-tools-title" tabIndex={0} onScroll={onScroll}>
        {TILES.map(({ key, Icon }, i) => (
          <li key={key} className={`tb-tile tb-t-${key}`} data-current={i === current ? "true" : undefined}>
            <div className="tb-top">
              <span className="tb-icon">
                <Icon size={20} aria-hidden="true" />
              </span>
              <h3>{t.items[key].name}</h3>
            </div>
            <p className="soft">{t.items[key].line}</p>
            <div className="tb-demo" aria-hidden="true">
              <Demo k={key} />
            </div>
          </li>
        ))}
      </ul>
      <div className="tb-controls">
        <button type="button" className="l-pause tb-arrow" onClick={() => go(current - 1)} aria-label={t.prev} disabled={current === 0}>
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <div className="tb-dots" role="group" aria-label={t.dots}>
          {TILES.map(({ key }, i) => (
            <button key={key} type="button" className="tb-dot" aria-label={t.show(t.items[key].name)} aria-current={i === current ? "true" : undefined} onClick={() => go(i)} />
          ))}
        </div>
        <button type="button" className="l-pause tb-arrow try-target" onClick={() => go(current + 1)} aria-label={t.next} disabled={current === TILES.length - 1}>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
      </Try>
    </div>
  );
}

function Demo({ k }: { k: Key }) {
  const i = copy.landing.tools.items;
  switch (k) {
    case "cards":
      return (
        <div className="tb-cardstack">
          <div className="tb-flip">
            <div className="tb-face tb-back">{i.cards.back}</div>
            <div className="tb-face tb-front">{i.cards.front}</div>
          </div>
          {/* A picture of the two answers, not controls: the whole demo is aria-hidden. */}
          <div className="tb-rate">
            <span className="tb-again">{i.cards.again}</span>
            <span className="tb-got">{i.cards.gotIt}</span>
          </div>
        </div>
      );
    case "paper":
      return (
        <ol className="tb-paper">
          <li>
            <span>
              {i.paper.q1} <b>{i.paper.m1}</b>
            </span>
            <span className="tb-answer">{i.paper.a1}</span>
            <span className="tb-tick" style={{ ["--i" as string]: 0 }}>
              <Check size={16} /> 1
            </span>
          </li>
          <li>
            <span>
              {i.paper.q2} <b>{i.paper.m2}</b>
            </span>
            <span className="tb-answer">{i.paper.a2}</span>
            <span className="tb-tick" style={{ ["--i" as string]: 1 }}>
              <Check size={16} /> 2
            </span>
          </li>
          <li className="tb-score" style={{ ["--i" as string]: 2 }}>
            {i.paper.score}
          </li>
        </ol>
      );
    case "scroll":
      return (
        <div className="tb-feed">
          {i.scroll.cards.map((c, n) => (
            <span key={c} style={{ ["--i" as string]: n }}>
              {c}
            </span>
          ))}
        </div>
      );
    case "summary":
      return (
        <ul className="tb-sum">
          {i.summary.lines.map((l, n) => (
            <li key={l} style={{ ["--i" as string]: n }}>
              <span className="tb-write">{l}</span>
              <span className="tb-cite">{n + 1}</span>
            </li>
          ))}
        </ul>
      );
    case "mindmap":
      return (
        <div className="tb-map">
          <b>{i.mindmap.centre}</b>
          {i.mindmap.branches.map((b, n) => (
            <span key={b} style={{ ["--i" as string]: n }}>
              {b}
            </span>
          ))}
        </div>
      );
    case "guide":
      return (
        <ul className="tb-terms">
          {i.guide.terms.map((term, n) => (
            <li key={term} style={{ ["--i" as string]: n }}>
              <Check size={14} />
              {term}
            </li>
          ))}
        </ul>
      );
  }
}
