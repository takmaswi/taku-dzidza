import { ChevronDown, Headphones, Users, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode, type TouchEvent } from "react";
import { copy } from "../../copy/en";
import { CiteDemo } from "./CiteDemo";
import { DropAnything } from "./DropAnything";
import { ModeSwitcher } from "./ModeSwitcher";
import { isStill, useInView, useStill } from "./motion";
import { PauseButton } from "./PauseButton";
import { ProgressCard } from "./ProgressCard";
import { ToolBento } from "./ToolBento";
import { Try } from "./Try";

type Chapter = (typeof copy.landing.story.chapters)[number];

/** A small card for something not here yet (Coming soon) or still settling (Beta). Icon, words and tag, never colour alone. */
export function SoonCard({ Icon, title, tag, line }: { Icon: LucideIcon; title: string; tag: string; line: string }) {
  return (
    <div className="hw-soon">
      <span className="hw-soon-icon">
        <Icon size={18} aria-hidden="true" />
      </span>
      <span>
        <b>{title}</b> <span className="l-tag">{tag}</span>
        <br />
        <span className="soft">{line}</span>
      </span>
    </div>
  );
}

const SOON_ICONS: Record<string, LucideIcon> = { listen: Headphones, groups: Users };

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

/** Sideways swipes inside these belong to them, not to the story. */
const OWN_SWIPE = ".tb-track, input, select, textarea";

/**
 * How Taku works: one section in five chapters that plays like a short video.
 * A bar over each chapter tab fills while it plays, then the next chapter
 * comes up; after the last it stops. Hover or keyboard focus holds it, a tap
 * inside a chapter or Learn more pauses it, and the pause button stops and
 * starts it. On a phone a sideways swipe turns the chapter. With less motion
 * it is plain tabs that never move by themselves. Off screen, nothing runs.
 */
export function HowItWorks({ signUp }: { signUp: string }) {
  const t = copy.landing.story;
  const chapters = t.chapters;
  const still = useStill();
  const [ref, onScreen] = useInView<HTMLDivElement>("0px 0px -20% 0px");
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const [ended, setEnded] = useState(false);
  const [more, setMore] = useState<number | null>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const playing = !still && onScreen && !paused && !held && !ended;

  useEffect(() => {
    // Keep the chosen tab in view in the phone's sideways tab row, without moving the page.
    const list = tabs.current;
    const tab = list?.children[current] as HTMLElement | undefined;
    if (list == null || tab === undefined || list.scrollWidth <= list.clientWidth) return;
    list.scrollTo({ left: tab.offsetLeft - (list.clientWidth - tab.clientWidth) / 2, behavior: isStill() ? "auto" : "smooth" });
  }, [current]);

  const go = (i: number) => {
    setCurrent((i + chapters.length) % chapters.length);
    setEnded(false);
    setMore(null);
  };
  const next = () => {
    if (still) return;
    if (current === chapters.length - 1) setEnded(true);
    else go(current + 1);
  };
  const toggle = () => {
    if (ended) {
      go(0);
      setPaused(false);
    } else setPaused((p) => !p);
  };
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const n = (current + step + chapters.length) % chapters.length;
    go(n);
    (tabs.current?.children[n] as HTMLElement | undefined)?.focus();
  };
  const onTouchStart = (e: TouchEvent) => {
    const target = e.target as Element;
    touch.current = target.closest(OWN_SWIPE) === null ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (start === null) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) go(current + (dx < 0 ? 1 : -1));
  };
  // Keyboard focus holds the story; a mouse click leaves focus behind, so only visible focus counts.
  const onFocus = (e: FocusEvent) => setHeld((e.target as Element).matches(":focus-visible"));
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false);
  };

  return (
    <div
      ref={ref}
      className="l-wrap hw"
      data-still={still ? "true" : undefined}
      data-playing={playing ? "true" : undefined}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHeld(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHeld(false)}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <div className="hw-head">
        <span className="eyebrow">{t.eyebrow}</span>
        <h2 id="l-story-title" className="l-h2">
          {t.title}
        </h2>
      </div>
      <div className="hw-bar-row">
        <div ref={tabs} className="hw-tabs" role="tablist" aria-label={t.tabsLabel} onKeyDown={onTabKey}>
          {chapters.map((c, i) => (
            <button
              key={c.id}
              id={`hw-tab-${c.id}`}
              type="button"
              role="tab"
              className="hw-tab"
              aria-selected={i === current}
              aria-controls={`hw-panel-${c.id}`}
              tabIndex={i === current ? 0 : -1}
              data-done={i < current || (ended && i === current) ? "true" : undefined}
              onClick={() => go(i)}
            >
              <span className="hw-progress" aria-hidden="true">
                <i key={i === current ? `run-${current}` : "rest"} onAnimationEnd={i === current ? next : undefined} />
              </span>
              <span className="hw-tab-label">
                {c.tab}
                {c.tag !== null && <span className="l-tag">{c.tag}</span>}
              </span>
            </button>
          ))}
        </div>
        {!still && <PauseButton playing={!paused && !ended} onToggle={toggle} pauseLabel={t.pause} playLabel={t.play} className="hw-pause" />}
      </div>
      <div className="hw-stage" onPointerDown={() => setPaused(true)} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {chapters.map((c, i) => {
          const on = i === current;
          const soon = c.soon;
          return (
            <div key={c.id} id={`hw-panel-${c.id}`} role="tabpanel" aria-labelledby={`hw-tab-${c.id}`} className={`hw-panel hw-${c.id}`} data-on={on ? "true" : undefined} inert={!on}>
              <div className="hw-text">
                <h3>{c.title}</h3>
                <p className="lead soft">{c.line}</p>
                <button type="button" className="hw-more-toggle" aria-expanded={more === i} aria-controls={`hw-more-${c.id}`} onClick={() => setMore(more === i ? null : i)}>
                  {more === i ? t.less : t.more} <ChevronDown size={16} aria-hidden="true" />
                </button>
                <div id={`hw-more-${c.id}`} className="hw-more" hidden={more !== i}>
                  <p>{c.more}</p>
                </div>
                {soon !== null && <SoonCard Icon={SOON_ICONS[soon.id]} title={soon.title} tag={soon.tag} line={soon.line} />}
              </div>
              <div className="hw-visual">
                <Visual id={c.id} signUp={signUp} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
