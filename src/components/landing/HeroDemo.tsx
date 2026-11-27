import { CalendarDays, Check, ClipboardCheck, KeyRound, Mic, Pause, Play, Send } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Link } from "react-router";
import { copy } from "../../copy/en";
import { BrandMark } from "../BrandMark";
import { LandingPhoto } from "./LandingPhoto";
import { MARKET_SAMPLES } from "./marketSamples";
import { isStill, useInView, useStill } from "./motion";
import { NOTE_SAMPLES } from "./noteSamples";
import { PauseButton } from "./PauseButton";

/**
 * The hero's live demo: a tour of the whole app on a phone drawn in HTML and
 * CSS. Five tabs, about 4 seconds each, the screen crossfading between them:
 * (0) Tutor, a cited answer and then its source page, from the next of the
 * five sample notes pages on each pass of the tour; (1) Practise, a
 * flashcard that flips and then a marked practice question; (2) Listen, a
 * summary the device's own voice reads, only on tap; (3) Marketplace, three sample notebooks;
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
  // Each pass of the tour shows the Tutor answer from the next sample notes page.
  const [round, setRound] = useState(0);
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
      if (frame.tab === PARTS.length - 1) setRound((r) => r + 1);
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
              <Screen frame={leaving} round={round} idle />
            </div>
          )}
          <div key={`in-${frame.tab}`} className="hd-panel hd-enter">
            <Screen frame={{ tab: frame.tab, part: shownPart }} round={round} idle={idle} onCite={() => setFrame({ tab: 0, part: 1 })} />
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

type ScreenProps = { frame: Frame; round: number; idle: boolean; onCite?: () => void };

/** One tab's screen at one of its parts. */
function Screen({ frame, round, idle, onCite }: ScreenProps) {
  switch (frame.tab) {
    case 0:
      return <Tutor note={NOTE_SAMPLES[round % NOTE_SAMPLES.length]} first={round === 0} sourceOpen={frame.part === 1} onCite={onCite} />;
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

type Note = (typeof NOTE_SAMPLES)[number];

/** first: the opening frame, whose photos load at once; later notes pages load as the tour reaches them. */
function Tutor({ note, first, sourceOpen, onCite }: { note: Note; first: boolean; sourceOpen: boolean; onCite?: () => void }) {
  const t = copy.landing.demo;
  const words = note.answer.split(" ");
  return (
    <>
      <Bar title={note.subject} />
      <div className="hd-body">
        <div className="hd-photo strip" aria-hidden="true">
          <LandingPhoto slug={note.slug} sizes="290px" eager={first} />
          <span className="hd-photo-tag">Page 1</span>
        </div>
        <p className="hd-msg hd-q" aria-hidden="true">
          {note.question}
        </p>
        <div className="hd-msg hd-a">
          <BrandMark variant="on-cream" className="hd-a-mark" />
          <p>
            {words.map((w, i) => (
              <span key={i} className="hd-word" style={{ ["--i" as string]: i }} aria-hidden="true">
                {w}{" "}
              </span>
            ))}
            <span className="sr-only">{note.answer}</span>
            <button type="button" className="cite hd-cite" data-open={sourceOpen ? "true" : undefined} aria-label={t.cite} aria-expanded={sourceOpen} onClick={onCite}>
              1
            </button>
          </p>
        </div>
      </div>
      {sourceOpen && (
        <div className="hd-sheet">
          <span className="eyebrow">{note.title}</span>
          <p><mark className="hl">{note.cited}</mark></p>
          <LandingPhoto slug={note.slug} sizes="290px" alt={note.transcript} eager={first} />
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
      <Bar title={t.practiseNotebook} />
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

/**
 * The summary, read by the device's own voice. Nothing speaks until play is
 * tapped; the bars move and the line fills only while it speaks. Without
 * speech in the browser the button stays disabled.
 */
function Listen({ idle }: { idle: boolean }) {
  const t = copy.landing.demo;
  const [on, setOn] = useState(false);
  const [progress, setProgress] = useState(0);
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => () => {
    if (canSpeak) window.speechSynthesis.cancel();
  }, [canSpeak]);
  useEffect(() => {
    if (idle && canSpeak) window.speechSynthesis.cancel();
  }, [idle, canSpeak]);

  const toggle = () => {
    if (!canSpeak) return;
    const speech = window.speechSynthesis;
    if (on) {
      speech.cancel();
      return;
    }
    speech.cancel();
    const line = new SpeechSynthesisUtterance(t.listenScript);
    line.lang = "en";
    line.rate = 0.95;
    line.onstart = () => setOn(true);
    line.onboundary = (e) => setProgress(e.charIndex / t.listenScript.length);
    line.onend = () => {
      setOn(false);
      setProgress(0);
    };
    line.onerror = () => setOn(false);
    setProgress(0);
    speech.speak(line);
  };

  return (
    <>
      <Bar title={t.listenNotebook} />
      <div className="hd-body hd-middle">
        <div className="hd-player" data-on={on ? "true" : undefined}>
          <LandingPhoto slug="spot-listening" sizes="160px" className="hd-player-art" />
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
          <button type="button" className="hd-play" onClick={toggle} disabled={!canSpeak} aria-label={on ? t.pauseListen : t.playListen}>
            {on ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </>
  );
}

function Market() {
  const t = copy.landing.demo;
  const m = copy.landing.market;
  return (
    <>
      <Bar title={t.steps[3]} />
      <ul className="hd-body hd-shelf">
        {MARKET_SAMPLES.slice(0, 3).map((item, i) => (
          <li key={item.title} className="hd-book" style={{ ["--i" as string]: i }}>
            <LandingPhoto slug={item.photo} sizes="64px" className="hd-cover" />
            <div className="hd-book-info">
              <span className="msh-sample">{m.sample}</span>
              <b>{item.title}</b>
              <span className="hd-soft">
                {m.by(item.seller)}
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
