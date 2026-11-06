import { ArrowDown, Check, Copy, Info, Square, Volume2 } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { copy } from "../copy/en";
import { BrandMark } from "./BrandMark";
import { speakable } from "./math";

const NEAR = 120;

/**
 * A conversation that scrolls on its own. It follows new messages while the
 * learner is at the bottom, stays put when they have scrolled up to read,
 * and offers a Jump to latest button then. pin={false} (an empty state) stays
 * at the top, so nothing at the top is cut off.
 */
export function Thread({ children, follow, testId, pin = true }: { children: ReactNode; follow: unknown; testId?: string; pin?: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [away, setAway] = useState(false);
  const pinned = useRef(true);

  const toBottom = (smooth: boolean) => {
    const el = scroller.current;
    if (el !== null) el.scrollTo({ top: el.scrollHeight, behavior: smooth && !matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto" });
  };

  useLayoutEffect(() => {
    if (pin && pinned.current) toBottom(false);
  }, [follow, pin]);

  useEffect(() => {
    // Late layout (maths, images) can grow the thread after the first paint.
    const el = scroller.current?.firstElementChild;
    if (el == null || !("ResizeObserver" in window)) return;
    const ro = new ResizeObserver(() => pin && pinned.current && toBottom(false));
    ro.observe(el);
    return () => ro.disconnect();
  }, [pin]);

  return (
    <div className="thread-wrap">
      <div
        className="thread-scroll"
        ref={scroller}
        data-testid={testId}
        onScroll={(e) => {
          const el = e.currentTarget;
          const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR;
          pinned.current = near;
          setAway(!near);
        }}
      >
        <div className="thread" aria-live="polite">
          {children}
        </div>
      </div>
      {away && (
        <button
          type="button"
          className="jump"
          onClick={() => {
            pinned.current = true;
            toBottom(true);
          }}
        >
          <ArrowDown size={16} aria-hidden="true" /> {copy.thread.jump}
        </button>
      )}
    </div>
  );
}

/** One learner message: a compact charcoal bubble on the right. */
export function LearnerBubble({ text, testId }: { text: string; testId: string }) {
  return (
    <article className="msg learner rise" data-testid={testId}>
      <span className="sr-only">{copy.chat.you}: </span>
      <p>{text}</p>
    </article>
  );
}

/**
 * One answer from Taku: flowing text beside the small mark, no box and no label.
 * Its footer (copy, read aloud, next steps) shows on the latest answer, and on
 * older ones when the pointer is over them or focus is inside.
 */
export function TakuMessage({ children, testId, streaming = false, latest = false }: { children: ReactNode; testId: string; streaming?: boolean; latest?: boolean }) {
  return (
    <article className={`msg taku rise${latest ? " latest" : ""}`} data-testid={testId} data-streaming={streaming ? "true" : undefined}>
      <BrandMark className="msg-mark" />
      <span className="sr-only">{copy.chat.taku}: </span>
      <div className="msg-body">{children}</div>
    </article>
  );
}

const STAGES = ["reading", "writing", "checking"] as const;

/** Staged progress while Taku answers: the current step in words, and where it sits among the three. */
export function Stages({ stage, stuck }: { stage: (typeof STAGES)[number]; stuck: boolean }) {
  const t = copy.notebook;
  if (stuck) return <p className="stage-stuck soft">{t.stuck}</p>;
  const at = STAGES.indexOf(stage);
  return (
    <div className="stages">
      <p className="stage" role="status" data-testid="answer-stage">
        {t.stages[stage]}
      </p>
      <ol className="stage-steps" aria-hidden="true">
        {STAGES.map((s, i) => (
          <li key={s} className={i < at ? "done" : i === at ? "now" : undefined}>
            {i < at ? <Check size={12} /> : null}
            {t.stages[s]}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Thinking dots, for a reply that has not started yet. */
export function Typing() {
  return (
    <div className="typing" aria-label={copy.chat.thinking} role="status">
      <span />
      <span />
      <span />
    </div>
  );
}

/** Copy and read aloud, under every answer. */
export function CopyAndRead({ text }: { text: string }) {
  const t = copy.thread;
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
  useEffect(() => () => (speaking ? window.speechSynthesis?.cancel() : undefined), [speaking]);
  return (
    <>
      <button
        type="button"
        className="icon-button small-action"
        onClick={() => void navigator.clipboard?.writeText(text).then(() => (setCopied(true), setTimeout(() => setCopied(false), 1800)))}
      >
        {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} {copied ? t.copied : t.copy}
      </button>
      {canSpeak && (
        <button
          type="button"
          className="icon-button small-action"
          aria-pressed={speaking}
          onClick={() => {
            window.speechSynthesis.cancel();
            if (speaking) return setSpeaking(false);
            const u = new SpeechSynthesisUtterance(speakable(text));
            u.lang = "en";
            u.onend = () => setSpeaking(false);
            u.onerror = () => setSpeaking(false);
            window.speechSynthesis.speak(u);
            setSpeaking(true);
          }}
        >
          {speaking ? <Square size={15} aria-hidden="true" /> : <Volume2 size={15} aria-hidden="true" />} {speaking ? copy.tools.stopReading : copy.tools.readAloud}
        </button>
      )}
    </>
  );
}

/** A note about how an answer was checked, behind a small info icon. Hover, focus or a tap shows the sentence. */
export function InfoNote({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className={`info-note${open ? " open" : ""}`} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="icon-button small-action info-button" aria-label={copy.thread.aboutAnswer} aria-expanded={open} aria-describedby={id} onClick={() => setOpen(!open)} onBlur={() => setOpen(false)}>
        <Info size={16} aria-hidden="true" />
      </button>
      <span id={id} role="tooltip" className="info-pop" data-testid="answer-note">
        {text}
      </span>
    </span>
  );
}