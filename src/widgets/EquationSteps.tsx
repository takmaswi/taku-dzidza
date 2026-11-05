import { Check, Lightbulb, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { checkLine, type EquationData } from "../../convex/widgets/equationSteps";
import { MathText } from "../components/MathText";
import { copy } from "../copy/en";

type Line = { typed: string; ok: boolean; problem: string | null };

/** Solve an equation line by line. checkLine marks each line with mathjs, in the browser, so it costs nothing and needs no data. */
export default function EquationSteps({ data }: { data: EquationData }) {
  const t = copy.widgets.equation;
  const [lines, setLines] = useState<Line[]>([]);
  const [typed, setTyped] = useState("");
  const [hints, setHints] = useState(0);
  const [done, setDone] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (typed.trim() === "") return;
    const verdict = checkLine(data.equation, data.variable, typed);
    setLines([...lines, { typed: typed.trim(), ok: verdict.ok, problem: verdict.problem === "unreadable" ? t.unreadable : verdict.problem === "wrong" ? t.wrong : null }]);
    if (verdict.ok) setTyped("");
    if (verdict.done) setDone(true);
  };

  return (
    <section className="widget card" data-testid="widget-equation">
      <span className="eyebrow">{t.label}</span>
      <h3>{data.title}</h3>
      <p className="widget-start">{data.equation}</p>
      <ol className="widget-lines" aria-live="polite">
        {lines.map((line, i) => (
          <li key={i} className={line.ok ? "ok" : "no"}>
            <span className="widget-line-text">{line.typed}</span>
            <span className="status">
              {line.ok ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />} {line.ok ? t.right : t.notRight}
            </span>
            {line.problem !== null && <small>{line.problem}</small>}
          </li>
        ))}
      </ol>
      {done ? (
        <p className="notice">{t.solved}</p>
      ) : (
        <form onSubmit={submit} className="widget-form">
          <label htmlFor="equation-line" className="sr-only">
            {t.lineLabel}
          </label>
          <input id="equation-line" type="text" inputMode="text" autoComplete="off" autoCapitalize="off" spellCheck={false} value={typed} placeholder={t.placeholder} onChange={(e) => setTyped(e.target.value)} />
          <button type="submit" className="pill small">
            {t.check}
          </button>
        </form>
      )}
      {hints > 0 && (
        <ul className="widget-hints">
          {data.hints.slice(0, hints).map((h) => (
            <li key={h}>
              <MathText text={h} />
            </li>
          ))}
        </ul>
      )}
      {!done && hints < data.hints.length && (
        <button type="button" className="pill ghost small" onClick={() => setHints(hints + 1)}>
          <Lightbulb size={16} aria-hidden="true" /> {t.hint}
        </button>
      )}
    </section>
  );
}
