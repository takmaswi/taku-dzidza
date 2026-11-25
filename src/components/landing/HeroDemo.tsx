import { CalendarDays, Check, ClipboardCheck, Headphones, KeyRound, Mic, Pause, Play, Send } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Link } from "react-router";
import { copy } from "../../copy/en";
import { BrandMark } from "../BrandMark";
import { isStill, useInView, useStill } from "./motion";
import { PauseButton } from "./PauseButton";

/**
 * The hero's live demo: a tour of the whole app on a phone drawn in HTML and
 * CSS. Five tabs, about 4 seconds each, the screen crossfading between them:
 * (0) Tutor, a cited answer and then its source page; (1) Practise, a
 * flashcard that flips and then a marked practice question; (2) Listen, an
 * audio card that plays only on tap; (3) Marketplace, three sample notebooks;
 * (4) Class, a teacher's assignment card. A tap anywhere in it or a hover
 * pauses the tour. With less motion it is one still frame per tab, Tutor's
 * cited page first, and changes only when a tab is tapped.
 */

/** How long each part of each tab shows while the tour plays. Tutor and Practise have two parts. */
const PARTS: readonly (readonly number[])[] = [[2200, 2400], [2000, 2200], [4000], [4000], [4000]];
const TAB_MS = PARTS.map((p) => p.reduce((sum, d) => sum + d, 0));
const FADE_MS = 450;
const SIGN_UP = "/signin?mode=signUp";

type Frame = { tab: number; part: number };

/** desk: decor laid around the phone, behind it; it pauses with the demo. */
export function HeroDemo({ desk }: { desk?: ReactNode }) {
  const t = copy.landing.demo;
  const still = useStill();
  const [ref, active, idle] = useInView<HTMLDivElement>();
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState(false);
  const [frame, setFrame] = useState<Frame>({ tab: 0, part: 0 });
  // The screen being faded out while the next one fades in.
  const [leaving, setLeaving] = useState<Frame | null>(null);
  // Bumped on every tab change, so the lit tab's progress bar starts again.
  const [runs, setRuns] = useState(0);
  const tabs = useRef<HTMLDivElement>(null);
  const running = playing && !hover && active && !still;

  const lastPart = (tab: number) => PARTS[tab].length - 1;
  const shownPart = still ? lastPart(frame.tab) : frame.part;

  // Time left in the current part when the tour was paused, so it resumes in step with the tab's progress bar.
  const left = useRef<{ key: string; ms: number } | null>(null);

  const goTo = (tab: number) => {
    if (tab !== frame.tab && !still) setLeaving({ tab: frame.tab, part: shownPart });
    setFrame({ tab, part: 0 });
    setRuns((r) => r + 1);
  };

  useEffect(() => {
    if (!running) return;
    const key = `${frame.tab}.${frame.part}.${runs}`;
    const ms = left.current?.key === key ? left.current.ms : PARTS[frame.tab][frame.part];
    const start = performance.now();
    let fired = false;
    const id = window.setTimeout(() => {
      fired = true;
      left.current = null;
      if (frame.part < PARTS[frame.tab].length - 1) {
        setFrame({ tab: frame.tab, part: frame.part + 1 });
        return;
      }
      setLeaving(frame);
      setFrame({ tab: (frame.tab + 1) % PARTS.length, part: 0 });
      setRuns((r) => r + 1);
    }, ms);
    return () => {
      window.clearTimeout(id);
      if (!fired) left.current = { key, ms: Math.max(0, ms - (performance.now() - start)) };
    };
  }, [running, frame, runs]);

  useEffect(() => {
    if (leaving === null) return;
    const id = window.setTimeout(() => setLeaving(null), FADE_MS);
    return () => window.clearTimeout(id);
  }, [leaving]);

  // Under 700 px the tabs scroll sideways: keep the lit one in view as the tour moves on.
  useEffect(() => {
    const box = tabs.current;
    const tab = box?.children[frame.tab] as HTMLElement | undefined;
    if (box === null || tab === undefined || box.scrollWidth <= box.clientWidth) return;
    box.scrollTo({ left: tab.offsetLeft - (box.clientWidth - tab.clientWidth) / 2, behavior: isStill() ? "auto" : "smooth" });
  }, [frame.tab]);

  const pause = () => setPlaying(false);
  const pick = (tab: number) => {
    goTo(tab);
    pause();
  };
  const onHover = (on: boolean) => (e: PointerEvent) => {
    if (e.pointerType === "mouse") setHover(on);
  };

  return (
    <div ref={ref} className="hd" data-tab={frame.tab} data-paused={!running || idle ? "true" : undefined} onPointerEnter={onHover(true)} onPointerLeave={onHover(false)}>
      {desk}
      <div className="hd-phone" role="group" aria-label={t.label}>
        <div className="hd-screen" onPointerDown={pause}>
          {leaving !== null && (
            <div key={`out-${leaving.tab}`} className="hd-panel hd-leave" aria-hidden="true" inert>
              <Screen frame={leaving} idle />
            </div>
          )}
          <div key={`in-${frame.tab}`} className="hd-panel hd-enter">
            <Screen frame={{ tab: frame.tab, part: shownPart }} idle={idle} onCite={() => setFrame({ tab: 0, part: 1 })} />
          </div>
        </div>
        {!still && <PauseButton playing={playing} onToggle={() => setPlaying((p) => !p)} pauseLabel={t.pauseDemo} playLabel={t.playDemo} className="hd-pause" />}
      </div>
      <div className="hd-steps">
        <span className="hd-steps-hint">{t.tapStep}</span>
        <div ref={tabs} className="hd-tabs" role="tablist" aria-label={t.stepsLabel}>
          {t.steps.map((s, i) => (
            <button key={s} type="button" role="tab" className="hd-tab" aria-selected={frame.tab === i} onClick={() => pick(i)}>
              {s}
              {frame.tab === i && !still && <span key={runs} className="hd-tab-bar" style={{ ["--ms" as string]: `${TAB_MS[i]}ms` }} aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

type ScreenProps = { frame: Frame; idle: boolean; onCite?: () => void };

/** One tab's screen at one of its parts. */
function Screen({ frame, idle, onCite }: ScreenProps) {
  switch (frame.tab) {
    case 0:
      return <Tutor sourceOpen={frame.part === 1} onCite={onCite} />;
    case 1:
      return <Practise paper={frame.part === 1} />;
    case 2:
      return <Listen idle={idle} />;
    case 3:
      return <Market />;
    default:
      return <Class />;
  }
}

function Bar({ title }: { title: string }) {
  return (
    <div className="hd-bar" aria-hidden="true">
      <BrandMark variant="on-cream" className="hd-mark" />
      <b>{title}</b>
    </div>
  );
}

function Tutor({ sourceOpen, onCite }: { sourceOpen: boolean; onCite?: () => void }) {
  const t = copy.landing.demo;
  const words = t.answer.split(" ");
  return (
    <>
      <Bar title={t.notebook} />
      <div className="hd-body">
        <div className="hd-photo strip" aria-hidden="true">
          <Scribbles />
          <span className="hd-photo-tag">{t.source}</span>
        </div>
        <p className="hd-msg hd-q" aria-hidden="true">
          {t.question}
        </p>
        <div className="hd-msg hd-a">
          <BrandMark variant="on-cream" className="hd-a-mark" />
          <p>
            {words.map((w, i) => (
              <span key={i} className="hd-word" style={{ ["--i" as string]: i }} aria-hidden="true">
                {w}{" "}
              </span>
            ))}
            <span className="sr-only">{t.answer}</span>
            <button type="button" className="cite hd-cite" data-open={sourceOpen ? "true" : undefined} aria-label={t.cite} aria-expanded={sourceOpen} onClick={onCite}>
              1
            </button>
          </p>
        </div>
      </div>
      {sourceOpen && (
        <div className="hd-sheet">
          <span className="eyebrow">{t.source}</span>
          <p>
            {t.sourceBefore} <mark className="hl">{t.sourceLine}</mark> {t.sourceAfter}
          </p>
        </div>
      )}
      <div className="hd-composer" aria-hidden="true">
        <span className="hd-placeholder">{t.ask}</span>
        <Mic size={16} />
        <span className="hd-send">
          <Send size={14} />
        </span>
      </div>
    </>
  );
}

function Practise({ paper }: { paper: boolean }) {
  const t = copy.landing.demo;
  return (
    <>
      <Bar title={t.notebook} />
      <div className="hd-body hd-middle">
        {paper ? (
          <div key="paper" className="hd-paper">
            <span className="eyebrow">{t.paper}</span>
            <p className="hd-paper-q">
              <b>{t.paperQuestion}</b> <span>{t.paperMarks}</span>
            </p>
            <ol>
              {t.paperLines.map((l, i) => (
                <li key={l.text} style={{ ["--i" as string]: i }}>
                  <span>{l.text}</span>
                  <span className="hd-pen">
                    <Check size={14} aria-hidden="true" />
                    {l.mark}
                  </span>
                </li>
              ))}
            </ol>
            <span className="hd-total">{t.paperTotal}</span>
          </div>
        ) : (
          <div key="card" className="hd-card">
            <div className="hd-card-in">
              <div className="hd-face hd-front" aria-hidden="true">
                <span className="eyebrow">{t.card}</span>
                <b>{t.cardFront}</b>
              </div>
              <div className="hd-face hd-back">
                <span className="eyebrow">{t.card}</span>
                <b>{t.cardBack}</b>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** The real summary clip. Nothing downloads until play is tapped; the bars move only while it plays. */
function Listen({ idle }: { idle: boolean }) {
  const t = copy.landing.demo;
  const audio = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(0);

  useEffect(() => {
    const a = audio.current;
    return () => a?.pause();
  }, []);
  useEffect(() => {
    if (idle) audio.current?.pause();
  }, [idle]);

  const toggle = () => {
    const a = audio.current;
    if (a === null) return;
    if (a.paused) a.play().catch(() => setOn(false));
    else a.pause();
  };
  const progress = length > 0 ? Math.min(1, time / length) : 0;

  return (
    <>
      <Bar title={t.notebook} />
      <div className="hd-body hd-middle">
        <div className="hd-player" data-on={on ? "true" : undefined}>
          <span className="hd-player-art" aria-hidden="true">
            <Headphones size={30} />
          </span>
          <b>{t.listenTitle}</b>
          <span className="hd-soft">{t.listenVoice}</span>
          <span className="hd-eq" aria-hidden="true">
            {Array.from({ length: 16 }, (_, i) => (
              <i key={i} style={{ ["--i" as string]: i }} />
            ))}
          </span>
          <span className="hd-track" aria-hidden="true">
            <i style={{ transform: `scaleX(${progress})` }} />
          </span>
          <div className="hd-player-row">
            <span className="hd-time">{on || time > 0 ? clock(time) : "0:00"}</span>
            <button type="button" className="hd-play" onClick={toggle} aria-label={on ? t.pauseListen : t.playListen}>
              {on ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
            </button>
            <span className="hd-time">{length > 0 ? clock(length) : t.listenLength}</span>
          </div>
          <audio
            ref={audio}
            src="/audio/landing/summary-calm.mp3"
            preload="none"
            onPlay={() => setOn(true)}
            onPause={() => setOn(false)}
            onEnded={() => {
              setOn(false);
              setTime(0);
            }}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setLength(e.currentTarget.duration)}
            onError={() => setOn(false)}
          />
        </div>
      </div>
    </>
  );
}

function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Market() {
  const t = copy.landing.demo;
  const m = copy.landing.market;
  return (
    <>
      <Bar title={t.steps[3]} />
      <ul className="hd-body hd-shelf">
        {m.items.slice(0, 3).map((item, i) => (
          <li key={item.title} className="hd-book" style={{ ["--i" as string]: i }}>
            <span className={`hd-cover msh-cloth msh-${item.cover}`} aria-hidden="true" />
            <div className="hd-book-info">
              <span className="msh-sample">{m.sample}</span>
              <b>{item.title}</b>
              <span className="hd-soft">
                {m.by(item.seller)}, <span className="msh-price">{item.price}</span>
              </span>
              <span className="hd-deal">
                <Link to={SIGN_UP}>{t.rent}</Link>
                <Link to={SIGN_UP}>{t.buy}</Link>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

const HANDED = 3;
const CLASS_SIZE = 28;

function Class() {
  const t = copy.landing.demo;
  return (
    <>
      <Bar title={t.className} />
      <div className="hd-body">
        <div className="hd-class">
          <span className="eyebrow">{t.classRole}</span>
          <b className="hd-class-name">{t.className}</b>
          <span className="hd-code">
            <KeyRound size={14} aria-hidden="true" />
            {t.classCode} <b>{t.classCodeValue}</b>
          </span>
        </div>
        <div className="hd-task">
          <span className="hd-task-top">
            <span className="hd-task-icon" aria-hidden="true">
              <ClipboardCheck size={16} />
            </span>
            <b>{t.classTask}</b>
          </span>
          <span className="hd-soft hd-due">
            <CalendarDays size={14} aria-hidden="true" />
            {t.classDue}
          </span>
          <span className="hd-handed" role="progressbar" aria-label={t.classHanded} aria-valuemin={0} aria-valuemax={CLASS_SIZE} aria-valuenow={HANDED}>
            <i style={{ ["--done" as string]: HANDED / CLASS_SIZE }} />
          </span>
          <span className="hd-handed-label">{t.classHanded}</span>
        </div>
      </div>
    </>
  );
}

/** Handwriting as soft ink strokes: lines of notes with no letters (art/STYLE.md: no readable text in pictures). */
function Scribbles() {
  return (
    <svg className="hd-scribble" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <path d="M14 18 q18 -5 36 0 t36 0 t30 1" />
      <path d="M14 38 q14 -4 28 0 t28 0 t28 0 t26 -1 t24 1" />
      <path d="M14 56 q16 -5 32 0 t32 0 t30 0 t22 1" />
      <path d="M14 74 q12 -4 24 0 t24 0 t24 0 t24 0" />
      <path className="hd-ink-mark" d="M18 92 q20 -5 40 0 t40 0 t36 0" />
      <path d="M14 110 q16 -4 32 0 t32 0 t30 1 t30 -1" />
      <path d="M14 128 q14 -4 28 0 t28 0 t24 0" />
      <circle cx="170" cy="120" r="14" />
      <path d="M156 120 h28 M170 106 v28" />
    </svg>
  );
}
