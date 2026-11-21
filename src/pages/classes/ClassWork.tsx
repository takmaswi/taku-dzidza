import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { errorText } from "../../access";
import { FocusShell } from "../../components/Layout";
import { MathText } from "../../components/MathText";
import { copy } from "../../copy/en";

/**
 * Work a teacher set. The marking scheme comes only after hand in: multiple
 * choice is marked by the server, then the learner marks their written
 * answers against the scheme they can now see.
 */
export default function ClassWork() {
  const t = copy.classes;
  const tt = copy.tools;
  const { classId = "", assignmentId = "" } = useParams();
  const id = assignmentId as Id<"assignments">;
  const paper = useQuery(api.classes.assignments.forLearner, { assignmentId: id });
  const handIn = useMutation(api.classes.assignments.handIn);
  const markWritten = useMutation(api.classes.assignments.markWritten);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [given, setGiven] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);
  const back = `/class/${classId}`;
  if (paper === undefined) {
    return (
      <FocusShell exitTo={back} title={copy.loading}>
        <p>{copy.loading}</p>
      </FocusShell>
    );
  }
  const mark = paper.mark;
  const handedIn = mark !== null;
  const fail = (err: unknown) => setError(errorText(err, copy.errors.generic));
  const typed = (n: number) => (mark?.answers.find((a) => a.number === n)?.answer ?? answers[n] ?? "");
  return (
    <FocusShell exitTo={back} title={paper.title}>
      <div className="paper-wrap">
        <article className="paper">
          <header className="paper-head">
            <h1>{paper.title}</h1>
            <div className="paper-meta">
              <span>{tt.quizTime(paper.minutes)}</span>
              <span>{tt.quizTotal(paper.totalMarks)}</span>
            </div>
            <p className="paper-instructions">{tt.quizInstructions}</p>
          </header>
          <ol className="questions">
            {paper.questions.map((q) => {
              const scheme = paper.scheme?.find((s) => s.number === q.number);
              const got = mark?.perQuestion.find((p) => p.number === q.number)?.got ?? 0;
              return (
                <li key={q.number} className="question">
                  <div className="question-line">
                    <span className="qnum">{q.number}</span>
                    <span className="qtext">
                      <MathText text={q.prompt} />
                    </span>
                    <span className="qmarks">{tt.marks(q.marks)}</span>
                  </div>
                  {q.kind === "mcq" ? (
                    <div className="options" role="radiogroup" aria-label={t.question(q.number)}>
                      {q.options.map((o, i) => (
                        <label key={o} className="option">
                          <input type="radio" name={`q${q.number}`} value={o} disabled={handedIn} checked={answers[q.number] === o} onChange={() => setAnswers({ ...answers, [q.number]: o })} />
                          <span className="letter">{String.fromCharCode(65 + i)}</span> <MathText text={o} />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea className="answer-box" aria-label={`${tt.yourAnswer} ${q.number}`} rows={q.kind === "structured" ? 5 : 3} disabled={handedIn} value={typed(q.number)} onChange={(e) => setAnswers({ ...answers, [q.number]: e.target.value })} />
                  )}
                  {scheme !== undefined && (
                    <div className="scheme">
                      {q.kind === "mcq" ? (
                        <p className={got > 0 ? "ok-text" : "error"}>{got > 0 ? tt.correct : <MathText text={tt.wrong(scheme.answer)} />}</p>
                      ) : (
                        <>
                          <p>
                            <b>{tt.accept}:</b>
                          </p>
                          <ul>
                            {(scheme.markingPoints.length > 0 ? scheme.markingPoints : [scheme.answer]).map((m) => (
                              <li key={m}>
                                <MathText text={m} />
                              </li>
                            ))}
                          </ul>
                          <label className="marks-input">
                            {tt.youGot}
                            <select value={given[q.number] ?? got} disabled={mark?.confirmed === true} onChange={(e) => setGiven({ ...given, [q.number]: Number(e.target.value) })}>
                              {Array.from({ length: q.marks + 1 }, (_, n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </label>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="actions">
            {!handedIn && (
              <button type="button" className="pill" onClick={() => void handIn({ assignmentId: id, answers: Object.entries(answers).map(([n, text]) => ({ number: Number(n), text })) }).catch(fail)}>
                {t.handIn}
              </button>
            )}
            {handedIn && !mark.confirmed && (
              <>
                <p className="notice">{t.handedIn}</p>
                <button type="button" className="pill" onClick={() => void markWritten({ assignmentId: id, marks: paper.questions.map((q) => ({ number: q.number, got: given[q.number] ?? 0 })) }).catch(fail)}>
                  {t.markAnswers}
                </button>
              </>
            )}
          </div>
          {mark?.confirmed === true && (
            <p className="notice" role="status">
              {t.yourScore(mark.score, mark.total)}
            </p>
          )}
          {error !== null && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </article>
      </div>
    </FocusShell>
  );
}
