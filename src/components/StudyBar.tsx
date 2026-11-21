import { Check, CheckCircle2, Coffee, FileClock, Timer, X } from "lucide-react";
import { useState } from "react";
import type { StudyMode } from "../../convex/accounts/voices";
import { copy } from "../copy/en";
import { SPRINT_MINUTES, useSprint } from "./studySession";

/**
 * Above the question box, what the study mode adds to the session. Sprint: a
 * choice of length, then a progress bar and the time left, then a break
 * prompt. Test me: the score so far and a way to finish. Exam prep in a
 * notebook: a timed practice paper. A learner who said tests make them
 * anxious sees no countdown and gets the score only when they finish.
 */
export function StudyBar({
  mode,
  onMode,
  score,
  calm,
  onTimedPaper,
  paperBusy = false,
}: {
  mode: StudyMode;
  onMode: (mode: StudyMode) => void;
  score: { right: number; marked: number };
  calm: boolean;
  onTimedPaper?: () => void;
  paperBusy?: boolean;
}) {
  const t = copy.study;
  const { sprint, now, start, stop } = useSprint();
  const [finished, setFinished] = useState<{ right: number; marked: number } | null>(null);

  if (mode === "sprint") {
    if (sprint === null) {
      return (
        <div className="study-bar" data-testid="study-bar">
          <Timer size={16} aria-hidden="true" />
          <span>{t.sprintHow}</span>
          {SPRINT_MINUTES.map((m) => (
            <button key={m} type="button" className="chip" onClick={() => start(m)}>
              {t.minutes(m)}
            </button>
          ))}
        </div>
      );
    }
    const total = sprint.minutes * 60_000;
    const left = Math.max(0, sprint.endsAt - now);
    if (left === 0) {
      return (
        <div className="study-bar done" role="status" data-testid="study-bar">
          <Coffee size={18} aria-hidden="true" />
          <span className="sb-text">
            <b>{t.doneTitle}</b> {t.doneBody}
          </span>
          <button type="button" className="chip" onClick={() => start(sprint.minutes)}>
            {t.again}
          </button>
          <button type="button" className="chip" onClick={() => onMode("learn")}>
            {t.backToLearn}
          </button>
        </div>
      );
    }
    const done = Math.round(((total - left) / total) * 100);
    return (
      <div className="study-bar" data-testid="study-bar">
        <Timer size={16} aria-hidden="true" />
        {calm ? (
          <span>{t.sprintOn}</span>
        ) : (
          <>
            <div className="sprint-progress" role="progressbar" aria-label={t.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={done}>
              <span style={{ width: `${done}%` }} />
            </div>
            <span>{t.left(Math.ceil(left / 60_000))}</span>
          </>
        )}
        <button type="button" className="chip" onClick={stop}>
          {t.end}
        </button>
      </div>
    );
  }

  if (mode === "test" && (score.marked > 0 || finished !== null)) {
    if (finished !== null) {
      return (
        <div className="study-bar" role="status" data-testid="study-bar">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span className="sb-text">{t.final(finished.right, finished.marked)}</span>
          <button type="button" className="chip" onClick={() => (setFinished(null), onMode("learn"))}>
            {t.backToLearn}
          </button>
        </div>
      );
    }
    return (
      <div className="study-bar" data-testid="study-bar">
        <CheckCircle2 size={16} aria-hidden="true" />
        {!calm && <span>{t.score(score.right, score.marked)}</span>}
        <button type="button" className="chip" onClick={() => setFinished(score)}>
          {t.finish}
        </button>
      </div>
    );
  }

  if (mode === "exam" && onTimedPaper !== undefined) {
    return (
      <div className="study-bar" data-testid="study-bar">
        <FileClock size={16} aria-hidden="true" />
        <button type="button" className="chip" disabled={paperBusy} onClick={onTimedPaper}>
          {paperBusy ? copy.tools.making : t.timedPaper}
        </button>
      </div>
    );
  }
  return null;
}

/** The mark on a Test me reply, as an icon and a word, never colour alone. */
export function TestMark({ correct }: { correct: boolean }) {
  return (
    <p className={`test-mark ${correct ? "right" : "wrong"}`} data-testid="test-mark">
      {correct ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />} {correct ? copy.study.right : copy.study.wrong}
    </p>
  );
}

/** Taku's next question in Test me, set apart so the learner knows what to answer. */
export function TestQuestion({ text }: { text: string }) {
  return (
    <p className="test-question" data-testid="test-question">
      <b>{copy.study.question}:</b> {text}
    </p>
  );
}
