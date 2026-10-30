import { useAction, useMutation, useQuery } from "convex/react";
import { Brain, Layers, ListChecks, Network, ScrollText, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { errorText } from "../access";
import { copy } from "../copy/en";

const ICONS: Record<string, typeof Brain> = { summary: Sparkles, cards: Layers, quiz: ListChecks, mindmap: Network, scroll: ScrollText };

/** The study tools of one notebook: make a tool, see what was made, review flashcards. */
export function ToolsPanel({ notebookId, initialTool }: { notebookId: Id<"notebooks">; initialTool?: string }) {
  const t = copy.tools;
  const modes = useQuery(api.study.tools.modes);
  const outputs = useQuery(api.study.tools.list, { notebookId });
  const [now] = useState(() => Date.now());
  const due = useQuery(api.study.cards.due, { notebookId, now });
  const generate = useAction(api.study.tools.generate);
  const remove = useMutation(api.study.tools.remove);
  const navigate = useNavigate();
  const [open, setOpen] = useState<string | null>(initialTool === "test" ? "quiz" : initialTool === "cards" ? "flashcards" : initialTool === "scroll" ? "scroll" : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const make = async (slug: string, form: FormData) => {
    setBusy(true);
    setError(null);
    try {
      const options: { count?: number; difficulty?: string; minutes?: number } = {};
      if (form.has("count")) options.count = Number(form.get("count"));
      if (form.has("difficulty")) options.difficulty = String(form.get("difficulty"));
      if (form.has("minutes")) options.minutes = Number(form.get("minutes"));
      const result = await generate({ notebookId, mode: slug, options });
      // Flashcards go straight into review; everything else opens what was made.
      if (result.ok) navigate(slug === "flashcards" ? `/n/${notebookId}/review` : `/n/${notebookId}/o/${result.outputId}`);
      else setError(result.message);
    } catch (e) {
      setError(errorText(e, copy.errors.generic));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack tools-main">
      {due !== undefined && due.total > 0 && (
        <section className="card warm review-banner">
          <div>
            <h2>{t.reviewTitle}</h2>
            <p>{due.cards.length > 0 ? t.reviewDue(due.cards.length) : t.reviewNone}</p>
          </div>
          {due.cards.length > 0 && (
            <Link to={`/n/${notebookId}/review`} className="pill">
              {t.reviewStart}
            </Link>
          )}
        </section>
      )}
      <section className="tool-grid">
        {(modes ?? []).map((m) => {
          const Icon = ICONS[m.output] ?? Sparkles;
          const opts = m.options as { count?: { min: number; max: number; default: number }; difficulty?: boolean; minutes?: boolean };
          return (
            <div key={m.slug} className="card tool">
              <button type="button" className="tool-head" aria-expanded={open === m.slug} onClick={() => setOpen(open === m.slug ? null : m.slug)}>
                <Icon size={22} aria-hidden="true" />
                <span>
                  <b>{m.title}</b>
                  <small className="soft">{m.tagline}</small>
                </span>
              </button>
              {open === m.slug && (
                <form
                  className="tool-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void make(m.slug, new FormData(e.currentTarget));
                  }}
                >
                  <div className="row">
                    {opts.count !== undefined && (
                      <div className="field">
                        <label htmlFor={`count-${m.slug}`}>{t.count}</label>
                        <input id={`count-${m.slug}`} name="count" type="number" min={opts.count.min} max={opts.count.max} defaultValue={opts.count.default} />
                      </div>
                    )}
                    {opts.difficulty === true && (
                      <div className="field">
                        <label htmlFor={`difficulty-${m.slug}`}>{t.difficulty}</label>
                        <select id={`difficulty-${m.slug}`} name="difficulty" defaultValue="medium">
                          <option value="easy">{t.easy}</option>
                          <option value="medium">{t.medium}</option>
                          <option value="hard">{t.hard}</option>
                        </select>
                      </div>
                    )}
                    {opts.minutes === true && (
                      <div className="field">
                        <label htmlFor={`minutes-${m.slug}`}>{t.minutes}</label>
                        <input id={`minutes-${m.slug}`} name="minutes" type="number" min={5} max={180} defaultValue={30} />
                      </div>
                    )}
                  </div>
                  <button className="pill small" type="submit" disabled={busy}>
                    {busy ? t.making : `${t.make} ${m.title.toLowerCase()}`}
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </section>
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="card">
        <h2>{t.made}</h2>
        {outputs === undefined || outputs.length === 0 ? (
          <p className="soft">{t.none}</p>
        ) : (
          <ul className="source-list">
            {outputs.map((o) => {
              const Icon = ICONS[o.kind] ?? Sparkles;
              return (
                <li key={o._id}>
                  <Link to={`/n/${notebookId}/o/${o._id}`} className="source-title">
                    <Icon size={16} aria-hidden="true" />
                    <span>
                      {o.title}
                      <small className="soft">{new Date(o.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</small>
                    </span>
                  </Link>
                  <button type="button" className="icon-button" aria-label={`${t.remove} ${o.title}`} onClick={() => void remove({ outputId: o._id })}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
