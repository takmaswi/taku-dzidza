import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { MindmapContent, QuizContent, ScrollContent, SummaryContent } from "../../convex/study/shapes";
import { Layout } from "../components/Layout";
import { ReadAloud } from "../components/ReadAloud";
import { copy } from "../copy/en";

type Origin = { kind: "source"; sourceId: string; page: number; quote: string } | { kind: "added" };

/** One study tool Taku made: a summary or study guide, a quiz paper, a mind map or a Scroll feed. */
export default function Output({ profile }: { profile: Doc<"profiles"> }) {
  const { id = "", outputId = "" } = useParams();
  const data = useQuery(api.study.tools.get, { outputId: outputId as Id<"outputs"> });
  const t = copy.tools;
  if (data === undefined) {
    return (
      <Layout signedIn>
        <p>{copy.loading}</p>
      </Layout>
    );
  }
  const { output, titles } = data;
  if (output.kind === "scroll") return <Scroll notebookId={id} content={output.content as ScrollContent} titles={titles} />;
  return (
    <Layout signedIn>
      <div className="stack">
        <Link to={`/n/${id}?tab=tools`} className="back-link no-print">
          <ArrowLeft size={18} aria-hidden="true" /> {t.back}
        </Link>
        {output.kind === "summary" && <Summary content={output.content as SummaryContent} titles={titles} readAloud={profile.accessibility.readAloud} />}
        {output.kind === "quiz" && <QuizPaper output={output} content={output.content as QuizContent} />}
        {output.kind === "mindmap" && <MindMap content={output.content as MindmapContent} />}
        {output.kind === "cards" && (
          <div className="card">
            <h1>{output.title}</h1>
            <Link to={`/n/${id}/review`} className="pill">
              {t.reviewStart}
            </Link>
          </div>
        )}
        {output.note !== undefined && <p className="soft small-text">{output.note}</p>}
      </div>
    </Layout>
  );
}

function Cite({ origin, titles }: { origin: Origin; titles: Record<string, string> }) {
  if (origin.kind === "added") return <span className="added-tag">{copy.notebook.addedByTaku}</span>;
  return <span className="cite static">{copy.notebook.fromPage(titles[origin.sourceId] ?? "", origin.page)}</span>;
}

function Summary({ content, titles, readAloud }: { content: SummaryContent; titles: Record<string, string>; readAloud: boolean }) {
  const text = useMemo(() => [content.title, ...content.sections.flatMap((s) => [s.heading, ...s.points.map((p) => p.text)])].join(". "), [content]);
  return (
    <article className="card stack">
      <div className="row-between">
        <h1>{content.title}</h1>
        {readAloud && <ReadAloud text={text} />}
      </div>
      {content.sections.map((s) => (
        <section key={s.heading}>
          <h2>{s.heading}</h2>
          <ul className="points">
            {s.points.map((p, i) => (
              <li key={i} className={p.origin.kind === "added" ? "added" : undefined}>
                {p.text} <Cite origin={p.origin as Origin} titles={titles} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}

/** An exam board style paper: numbered questions, marks in brackets, then a separate marking scheme. */
function QuizPaper({ output, content }: { output: Doc<"outputs">; content: QuizContent }) {
  const t = copy.tools;
  const submit = useMutation(api.study.quizzes.submit);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [marking, setMarking] = useState(false);
  const [given, setGiven] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);

  const startMarking = () => {
    const auto: Record<number, number> = {};
    for (const q of content.questions) if (q.kind === "mcq") auto[q.number] = answers[q.number] === q.answer ? q.marks : 0;
    setGiven(auto);
    setMarking(true);
  };

  return (
    <article className="paper">
      <header className="paper-head">
        <h1>{content.title}</h1>
        <div className="paper-meta">
          <span>{t.quizTime(content.minutes)}</span>
          <span>{t.quizTotal(content.totalMarks)}</span>
        </div>
        <p className="paper-instructions">{t.quizInstructions}</p>
        <button type="button" className="pill ghost small no-print" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" /> {t.print}
        </button>
      </header>
      <ol className="questions">
        {content.questions.map((q) => (
          <li key={q.number} className="question">
            <div className="question-line">
              <span className="qnum">{q.number}</span>
              <span className="qtext">{q.prompt}</span>
              <span className="qmarks">{t.marks(q.marks)}</span>
            </div>
            {q.kind === "mcq" ? (
              <div className="options" role="radiogroup" aria-label={`Question ${q.number}`}>
                {q.options.map((o, i) => (
                  <label key={o} className="option">
                    <input type="radio" name={`q${q.number}`} value={o} disabled={marking} checked={answers[q.number] === o} onChange={() => setAnswers({ ...answers, [q.number]: o })} />
                    <span className="letter">{String.fromCharCode(65 + i)}</span> {o}
                  </label>
                ))}
              </div>
            ) : (
              <textarea className="answer-box no-print-border" aria-label={`${t.yourAnswer} ${q.number}`} rows={q.kind === "structured" ? 5 : 3} disabled={marking} value={answers[q.number] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.number]: e.target.value })} />
            )}
            {marking && (
              <div className="scheme">
                {q.kind === "mcq" ? (
                  <p className={answers[q.number] === q.answer ? "ok-text" : "error"}>{answers[q.number] === q.answer ? t.correct : t.wrong(q.answer)}</p>
                ) : (
                  <>
                    <p>
                      <b>{t.accept}:</b>
                    </p>
                    <ul>
                      {q.markingPoints.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                    <label className="marks-input">
                      {t.youGot}
                      <select value={given[q.number] ?? 0} onChange={(e) => setGiven({ ...given, [q.number]: Number(e.target.value) })} disabled={result !== null}>
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
        ))}
      </ol>
      <div className="actions no-print">
        {!marking && (
          <button type="button" className="pill" onClick={startMarking}>
            {t.markIt}
          </button>
        )}
        {marking && result === null && (
          <button
            type="button"
            className="pill"
            onClick={() => void submit({ outputId: output._id, marks: content.questions.map((q) => ({ number: q.number, got: given[q.number] ?? 0 })) }).then(setResult)}
          >
            {t.saveMarks}
          </button>
        )}
      </div>
      {result !== null && <p className="notice">{t.score(result.score, result.total)}</p>}
      <section className="print-only scheme-print">
        <h2>{t.markingScheme}</h2>
        <ol>
          {content.questions.map((q) => (
            <li key={q.number}>
              {q.answer} {t.marks(q.marks)}
              {q.markingPoints.length > 0 && <ul>{q.markingPoints.map((m) => <li key={m}>{m}</li>)}</ul>}
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}

function MindMap({ content }: { content: MindmapContent }) {
  return (
    <article className="card">
      <div className="mindmap">
        <div className="mm-central">{content.central}</div>
        <div className="mm-branches">
          {content.branches.map((b) => (
            <section key={b.label} className="mm-branch">
              <h2>{b.label}</h2>
              <ul>
                {b.leaves.map((l, i) => (
                  <li key={i} className={l.origin.kind === "added" ? "added" : undefined}>
                    {l.text}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}

/** Scroll: a full screen feed of cards with hooks, snapping one card at a time. */
function Scroll({ notebookId, content, titles }: { notebookId: string; content: ScrollContent; titles: Record<string, string> }) {
  const t = copy.tools;
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [picked, setPicked] = useState<Record<number, boolean>>({});
  return (
    <div className="scroll-feed" data-testid="scroll-feed">
      <Link to={`/n/${notebookId}?tab=tools`} className="scroll-close pill small">
        <ArrowLeft size={16} aria-hidden="true" /> {t.back}
      </Link>
      {content.cards.map((c, i) => {
        const truth = c.answer.trim().toLowerCase().startsWith("true");
        return (
          <section key={i} className={`scroll-card ${c.type}`} aria-label={`Card ${i + 1} of ${content.cards.length}`}>
            <p className="scroll-hook">{c.hook}</p>
            <p className="scroll-text">{c.text}</p>
            {c.type === "question" &&
              (revealed[i] ? (
                <p className="scroll-answer">{c.answer}</p>
              ) : (
                <button type="button" className="pill" onClick={() => setRevealed({ ...revealed, [i]: true })}>
                  {t.tapReveal}
                </button>
              ))}
            {c.type === "truefalse" &&
              (picked[i] === undefined ? (
                <div className="actions">
                  <button type="button" className="pill" onClick={() => setPicked({ ...picked, [i]: true })}>
                    {t.trueLabel}
                  </button>
                  <button type="button" className="pill ghost" onClick={() => setPicked({ ...picked, [i]: false })}>
                    {t.falseLabel}
                  </button>
                </div>
              ) : (
                <p className="scroll-answer">
                  {picked[i] === truth ? t.correct : ""} {c.answer}
                </p>
              ))}
            <small className="scroll-source">{c.origin.kind === "source" ? copy.notebook.fromPage(titles[c.origin.sourceId] ?? "", c.origin.page) : copy.notebook.addedByTaku}</small>
            {i === 0 && <small className="scroll-hint">{t.swipeHint}</small>}
          </section>
        );
      })}
      <section className="scroll-card end">
        <p className="scroll-hook">{t.scrollEnd}</p>
        <Link to={`/n/${notebookId}?tab=tools`} className="pill">
          {t.back}
        </Link>
      </section>
    </div>
  );
}
