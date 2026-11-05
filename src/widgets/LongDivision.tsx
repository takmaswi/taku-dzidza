import { Check, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { checkStep, divisionSteps, result, type DivisionData, type DivisionStep } from "../../convex/widgets/longDivision";
import { copy } from "../copy/en";

const SHOW_AFTER = 2;

function question(step: DivisionStep): string {
  const t = copy.widgets.division;
  if (step.kind === "divide") return t.divide(step.divisor, step.current);
  if (step.kind === "multiply") return t.multiply(step.digit, step.divisor);
  if (step.kind === "subtract") return t.subtract(step.current, step.product);
  return t.bring(step.digit, step.remainder);
}

function hint(step: DivisionStep): string {
  const t = copy.widgets.division;
  if (step.kind === "divide") return t.hintDivide(step.divisor, step.answer, step.answer * step.divisor, step.current);
  if (step.kind === "multiply") return t.hintMultiply(step.digit, step.divisor);
  if (step.kind === "subtract") return t.hintSubtract(step.product, step.current);
  return t.hintBring(step.remainder, step.digit);
}

function worked(step: DivisionStep): string {
  const t = copy.widgets.division;
  if (step.kind === "divide") return t.workedDivide(step.current, step.divisor, step.answer);
  if (step.kind === "multiply") return t.workedMultiply(step.digit, step.divisor, step.answer);
  if (step.kind === "subtract") return t.workedSubtract(step.current, step.product, step.answer);
  return t.workedBring(step.digit, step.answer);
}

/** Long division, one question at a time. Every step and answer comes from divisionSteps, not from a model. */
export default function LongDivision({ data }: { data: DivisionData }) {
  const t = copy.widgets.division;
  const steps = useMemo(() => divisionSteps(data.dividend, data.divisor), [data.dividend, data.divisor]);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [tries, setTries] = useState(0);
  const step = steps[index] as DivisionStep | undefined;
  const quotient = steps.slice(0, index).flatMap((s) => (s.kind === "divide" ? [String(s.answer)] : [])).join("");
  const answer = result(data.dividend, data.divisor);

  const next = () => {
    setIndex(index + 1);
    setTyped("");
    setTries(0);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (step === undefined || typed.trim() === "") return;
    if (checkStep(step, typed)) next();
    else setTries(tries + 1);
  };

  return (
    <section className="widget card" data-testid="widget-division">
      <span className="eyebrow">{t.label}</span>
      <h3>{data.title}</h3>
      <p className="widget-start">
        {data.dividend} {"÷"} {data.divisor}
        {quotient !== "" && (
          <span className="soft">
            {" "}
            {t.soFar}: {quotient}
          </span>
        )}
      </p>
      <ol className="widget-lines" aria-live="polite">
        {steps.slice(0, index).map((s, i) => (
          <li key={i} className="ok">
            <span className="widget-line-text">{worked(s)}</span>
            <span className="status">
              <Check size={16} aria-hidden="true" /> {t.right}
            </span>
          </li>
        ))}
      </ol>
      {step === undefined ? (
        <p className="notice">{answer.remainder === 0 ? t.done(data.dividend, data.divisor, answer.quotient) : t.doneRemainder(data.dividend, data.divisor, answer.quotient, answer.remainder)}</p>
      ) : (
        <form onSubmit={submit} className="widget-form">
          <label htmlFor="division-step">{question(step)}</label>
          <input id="division-step" type="text" inputMode="numeric" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
          <button type="submit" className="pill small">
            {t.check}
          </button>
          {tries > 0 && (
            <p className="status no">
              <X size={16} aria-hidden="true" /> {t.notRight} {tries >= SHOW_AFTER ? hint(step) : t.tryAgain}
            </p>
          )}
          {tries >= SHOW_AFTER && (
            <button type="button" className="pill ghost small" onClick={next}>
              {t.show}
            </button>
          )}
        </form>
      )}
    </section>
  );
}
