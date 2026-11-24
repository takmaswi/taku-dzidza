import { Headphones, Mic, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { copy } from "../../copy/en";
import { BrandMark } from "../BrandMark";
import { useInView, useStill } from "./motion";
import { PauseButton } from "./PauseButton";

/**
 * The hero's live demo: a phone drawn in HTML and CSS playing a 12 second
 * loop. (0) a photo of handwritten notes drops in, (1) a question types
 * itself, (2) Taku's answer streams in with a citation, (3) the source page
 * slides up with the line highlighted, (4) the answer folds into a flashcard
 * that flips, (5) a listen bar plays. Step 3 is the still frame for reduced
 * motion, the first frame before the page starts, and what tapping the
 * citation shows.
 */

const DURATIONS = [2000, 2000, 2200, 2600, 1900, 1300] as const;
const STILL_STEP = 3;
/** Which caption under the phone each step lights. */
const CAPTION_FOR_STEP = [0, 1, 1, 2, 3, 4] as const;

export function HeroDemo() {
  const t = copy.landing.demo;
  const still = useStill();
  const [ref, active, idle] = useInView<HTMLDivElement>();
  const [playing, setPlaying] = useState(true);
  const [step, setStep] = useState<number>(STILL_STEP);
  const running = playing && active && !still;

  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => setStep((s) => (s + 1) % DURATIONS.length), DURATIONS[step]);
    return () => window.clearTimeout(id);
  }, [running, step]);

  // With less motion the demo is one still frame: the cited page.
  const shown = still ? STILL_STEP : step;
  const words = t.answer.split(" ");

  return (
    <div ref={ref} className="hd" data-step={shown} data-paused={!playing || idle ? "true" : undefined}>
      <div className="hd-phone" role="group" aria-label={t.label}>
        <div className="hd-screen">
          <div className="hd-bar" aria-hidden="true">
            <BrandMark variant="on-cream" className="hd-mark" />
            <b>{t.notebook}</b>
          </div>

          <div className="hd-body">
            {shown === 0 ? (
              <div key="drop" className="hd-photo big" aria-hidden="true">
                <Scribbles />
                <span className="hd-photo-tag">{t.photo}</span>
              </div>
            ) : (
              <div className="hd-thumb" aria-hidden="true">
                <span className="hd-photo small">
                  <Scribbles />
                </span>
                <span>{t.source}</span>
              </div>
            )}

            {shown >= 2 && (
              <p className="hd-msg hd-q" aria-hidden="true">
                {t.question}
              </p>
            )}

            {(shown === 2 || shown === 3) && (
              <div key="answer" className="hd-msg hd-a">
                <BrandMark variant="on-cream" className="hd-a-mark" />
                <p>
                  {words.map((w, i) => (
                    <span key={i} className="hd-word" style={{ ["--i" as string]: i }} aria-hidden="true">
                      {w}{" "}
                    </span>
                  ))}
                  <span className="sr-only">{t.answer}</span>
                  <button type="button" className="cite hd-cite" aria-label={t.cite} aria-expanded={shown === 3} onClick={() => setStep(STILL_STEP)}>
                    1
                  </button>
                </p>
              </div>
            )}

            {shown >= 4 && (
              <div key="card" className="hd-card" aria-hidden="true">
                <div className="hd-card-in">
                  <div className="hd-face hd-front">
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

          {shown === 3 && (
            <div key="sheet" className="hd-sheet">
              <span className="eyebrow">{t.source}</span>
              <p>
                {t.sourceBefore} <mark className="hl">{t.sourceLine}</mark> {t.sourceAfter}
              </p>
            </div>
          )}

          {shown === 5 && (
            <div key="listen" className="hd-listen" aria-hidden="true">
              <Headphones size={16} />
              <span>{t.listen}</span>
              <span className="hd-wave">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <i key={i} style={{ ["--i" as string]: i }} />
                ))}
              </span>
              <small>{t.listenTime}</small>
            </div>
          )}

          <div className="hd-composer" aria-hidden="true">
            {shown === 1 ? (
              <span key="typing" className="hd-typing" style={{ ["--n" as string]: t.question.length }}>
                {t.question}
              </span>
            ) : (
              <span className="hd-placeholder">{t.ask}</span>
            )}
            <Mic size={16} />
            <span className="hd-send">
              <Send size={14} />
            </span>
          </div>
        </div>
        {!still && <PauseButton playing={playing} onToggle={() => setPlaying((p) => !p)} pauseLabel={t.pauseDemo} playLabel={t.playDemo} className="hd-pause" />}
      </div>
      <ol className="hd-steps" aria-hidden="true">
        {t.steps.map((s, i) => (
          <li key={s} className={CAPTION_FOR_STEP[shown] === i ? "on" : undefined}>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Handwriting as soft ink strokes: lines of notes with no letters (art/STYLE.md: no readable text in pictures). */
function Scribbles() {
  return (
    <svg className="hd-scribble" viewBox="0 0 200 150" aria-hidden="true" focusable="false">
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
