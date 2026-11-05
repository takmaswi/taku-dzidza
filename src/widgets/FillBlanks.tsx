import { Check, X } from "lucide-react";
import { useState } from "react";
import { checkBlank, type BlanksData } from "../../convex/widgets/fillBlanks";
import { MathText } from "../components/MathText";
import { copy } from "../copy/en";

type State = { typed: string; tries: number; right: boolean; shown: boolean };
const SHOW_AFTER = 2;

/** Sentences from the learner's notes with a word missing. checkBlank marks each one; every blank shows its page. */
export default function FillBlanks({ data, titles }: { data: BlanksData; titles: Record<string, string> }) {
  const t = copy.widgets.blanks;
  const [states, setStates] = useState<State[]>(() => data.items.map(() => ({ typed: "", tries: 0, right: false, shown: false })));
  const set = (i: number, patch: Partial<State>) => setStates(states.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const right = states.filter((s) => s.right).length;

  return (
    <section className="widget card" data-testid="widget-blanks">
      <span className="eyebrow">{t.label}</span>
      <h3>{data.title}</h3>
      <ol className="blanks">
        {data.items.map((item, i) => {
          const s = states[i];
          const finished = s.right || s.shown;
          return (
            <li key={i}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (s.typed.trim() === "") return;
                  const ok = checkBlank(item, s.typed);
                  set(i, { right: ok, tries: ok ? s.tries : s.tries + 1 });
                }}
              >
                <p className="blank-line">
                  <MathText text={item.before} />{" "}
                  {finished ? (
                    <b>{s.right ? s.typed.trim() : item.answer}</b>
                  ) : (
                    <input type="text" aria-label={t.gap(i + 1)} autoComplete="off" autoCapitalize="off" spellCheck={false} value={s.typed} onChange={(e) => set(i, { typed: e.target.value })} />
                  )}{" "}
                  <MathText text={item.after} />
                </p>
                {!finished && (
                  <div className="actions">
                    <button type="submit" className="pill small">
                      {t.check}
                    </button>
                    {s.tries >= SHOW_AFTER && (
                      <button type="button" className="pill ghost small" onClick={() => set(i, { shown: true })}>
                        {t.show}
                      </button>
                    )}
                  </div>
                )}
                {s.right && (
                  <p className="status ok">
                    <Check size={16} aria-hidden="true" /> {t.right}
                  </p>
                )}
                {!s.right && s.tries > 0 && !s.shown && (
                  <p className="status no">
                    <X size={16} aria-hidden="true" /> {t.notRight} {item.hint !== "" && <MathText text={item.hint} />}
                  </p>
                )}
                <small className="cite static">{copy.notebook.fromPage(titles[item.origin.sourceId] ?? t.yourNotes, item.origin.page)}</small>
              </form>
            </li>
          );
        })}
      </ol>
      <p className="soft" aria-live="polite">
        {t.score(right, data.items.length)}
      </p>
    </section>
  );
}
