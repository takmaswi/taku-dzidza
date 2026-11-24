import { Check, FileClock, GraduationCap, ListChecks, Timer, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { STUDY_MODES, type StudyMode } from "../../../convex/accounts/voices";
import { copy } from "../../copy/en";
import { BrandMark } from "../BrandMark";

const ICONS = { learn: GraduationCap, test: ListChecks, sprint: Timer, exam: FileClock } as const;

/**
 * "One question, four ways": the real study modes (STUDY_MODES and
 * copy.study.modes) as a segmented control. The question stays; the answer
 * below changes shape, and its box eases to the new height.
 */
export function ModeSwitcher() {
  const t = copy.landing.modes;
  const [mode, setMode] = useState<StudyMode>("learn");
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const el = inner.current;
    if (el === null || !("ResizeObserver" in window)) return;
    // The answer remounts for each mode, so watch the new one.
    const watch = new ResizeObserver(() => setHeight(el.offsetHeight));
    watch.observe(el);
    return () => watch.disconnect();
  }, [mode]);

  return (
    <div className="ms">
      <div className="ms-switch" role="group" aria-label={t.pick}>
        {STUDY_MODES.map((m) => {
          const Icon = ICONS[m];
          return (
            <button key={m} type="button" aria-pressed={m === mode} onClick={() => setMode(m)}>
              <Icon size={17} aria-hidden="true" />
              {copy.study.modes[m].name}
            </button>
          );
        })}
      </div>
      <div className="ms-chat raised">
        <p className="ms-q">{t.question}</p>
        <div className="ms-a">
          <BrandMark variant="on-cream" className="ms-mark" />
          <div className="ms-box" style={{ height }}>
            <div ref={inner} key={mode} className={`ms-answer ms-${mode}`} aria-live="polite">
              <p className="ms-line soft">{copy.study.modes[mode].line}</p>
              <Answer mode={mode} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Answer({ mode }: { mode: StudyMode }) {
  const t = copy.landing.modes;
  if (mode === "learn") {
    return (
      <>
        <ol className="ms-steps">
          {t.learn.steps.map((s, i) => (
            <li key={s} style={{ ["--i" as string]: i }}>
              {s}
            </li>
          ))}
        </ol>
        <p className="ms-check">{t.learn.check}</p>
      </>
    );
  }
  if (mode === "test") return <Quiz />;
  if (mode === "sprint") {
    return (
      <div className="ms-sprint">
        <span className="ms-ring" role="img" aria-label={t.sprint.left}>
          <svg viewBox="0 0 44 44" aria-hidden="true">
            <circle cx="22" cy="22" r="18" />
            <circle className="ms-ring-left" cx="22" cy="22" r="18" pathLength="100" />
          </svg>
        </span>
        <div>
          <span className="eyebrow">
            {t.sprint.timer}, {t.sprint.left}
          </span>
          <ul>
            {t.sprint.facts.map((f, i) => (
              <li key={f} style={{ ["--i" as string]: i }}>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  return (
    <div className="ms-exam">
      <p>
        <b>{t.exam.question}</b> <b className="ms-marks">{t.exam.marks}</b>
      </p>
      <ol>
        {t.exam.lines.map((l, i) => (
          <li key={l.text} style={{ ["--i" as string]: i }}>
            <span>{l.text}</span>
            <span className="ms-pen">
              <Check size={14} aria-hidden="true" /> {l.mark}
            </span>
          </li>
        ))}
      </ol>
      <p className="ms-total">
        <span className="ms-pen">{t.exam.total}</span> <span className="soft">{t.exam.note}</span>
      </p>
    </div>
  );
}

/** Test me: two questions with options to tap; each is marked at once, with an icon and words, not colour alone. */
function Quiz() {
  const t = copy.landing.modes.test;
  const [picked, setPicked] = useState<(number | null)[]>(() => t.questions.map(() => null));
  return (
    <div className="ms-quiz">
      {t.questions.map((q, n) => {
        const choice = picked[n];
        const done = choice !== null;
        return (
          <fieldset key={q.q} style={{ ["--i" as string]: n }}>
            <legend>
              {n + 1}. {q.q}
            </legend>
            <div className="ms-options">
              {q.options.map((o, i) => {
                const state = !done ? undefined : i === q.answer ? "right" : i === choice ? "wrong" : undefined;
                return (
                  <button key={o} type="button" className="ms-option" data-state={state} aria-pressed={choice === i} disabled={done} onClick={() => setPicked((p) => p.map((v, k) => (k === n ? i : v)))}>
                    {state === "right" && <Check size={15} aria-hidden="true" />}
                    {state === "wrong" && <X size={15} aria-hidden="true" />}
                    {o}
                  </button>
                );
              })}
            </div>
            {done && (
              <p className="ms-mark-line" role="status">
                {choice === q.answer ? t.right : t.wrong(q.options[q.answer])}
              </p>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
