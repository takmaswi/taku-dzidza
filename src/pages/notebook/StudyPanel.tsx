import { useAction, useMutation, useQuery } from "convex/react";
import { BookMarked, Brain, ChevronRight, Layers, ListChecks, Network, ScrollText, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { errorText } from "../../access";
import { useTrack } from "../../analytics";
import { Decor } from "../../components/Art";
import { copy } from "../../copy/en";
import { PanelOutput } from "../Output";
import { PANEL_KINDS } from "./tools";

const MODE_ICONS: Record<string, typeof Brain> = { summarise: Sparkles, flashcards: Layers, quiz: ListChecks, "mind-map": Network, scroll: ScrollText, "study-guide": BookMarked };
const KIND_ICONS: Record<string, typeof Brain> = { summary: Sparkles, cards: Layers, quiz: ListChecks, mindmap: Network, scroll: ScrollText, widget: Brain };
/** The order of the tool grid. Step by step widgets come last, across the full width. */
const ORDER = ["summarise", "flashcards", "quiz", "mind-map", "scroll", "study-guide"];

/**
 * Study tools for one notebook: the tool grid, cards due, and what was made.
 * Summaries, mind maps and widgets open here; practice papers, Scroll and
 * flashcard review open in focus mode.
 */
export function StudyPanel({ notebookId, readAloud, initialTool }: { notebookId: Id<"notebooks">; readAloud: boolean; initialTool: string | null }) {
  const t = copy.tools;
  const modes = useQuery(api.study.tools.modes);
  const outputs = useQuery(api.study.tools.list, { notebookId });
  const [now] = useState(() => Date.now());
  const due = useQuery(api.study.cards.due, { notebookId, now });
  const generate = useAction(api.study.tools.generate);
  const widgets = useQuery(api.study.widgets.list);
  const makeWidget = useAction(api.study.widgets.generate);
  const remove = useMutation(api.study.tools.remove);
  const track = useTrack();
  const navigate = useNavigate();
  const [open, setOpen] = useState<string | null>(initialTool);
  const [view, setView] = useState<Id<"outputs"> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const show = (outputId: Id<"outputs">, kind: string) => {
    if (kind === "cards") navigate(`/n/${notebookId}/review`);
    else if (PANEL_KINDS.has(kind)) setView(outputId);
    else navigate(`/n/${notebookId}/o/${outputId}`);
  };

  const work = async (job: () => Promise<{ ok: true; outputId: Id<"outputs"> } | { ok: false; message: string }>, kind: string, event: "tool_made" | "widget_made") => {
    setBusy(true);
    setError(null);
    try {
      const result = await job();
      if (!result.ok) return setError(result.message);
      track(event);
      setOpen(null);
      show(result.outputId, kind);
    } catch (e) {
      setError(errorText(e, copy.errors.generic));
    } finally {
      setBusy(false);
    }
  };

  const make = (slug: string, output: string, form: FormData) => {
    const options: { count?: number; difficulty?: string; minutes?: number } = {};
    if (form.has("count")) options.count = Number(form.get("count"));
    if (form.has("difficulty")) options.difficulty = String(form.get("difficulty"));
    if (form.has("minutes")) options.minutes = Number(form.get("minutes"));
    void work(() => generate({ notebookId, mode: slug, options }), output, "tool_made");
  };

  if (view !== null) return <PanelOutput outputId={view} notebookId={notebookId} readAloud={readAloud} onBack={() => setView(null)} />;

  const sorted = [...(modes ?? [])].sort((a, b) => ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug));
  const openMode = sorted.find((m) => m.slug === open);
  const dueNow = due?.cards.length ?? 0;
  return (
    <div className="study-panel-body">
      <div className="tool-grid" role="group" aria-label={copy.tools.tabTools}>
        {sorted.map((m) => {
          const Icon = MODE_ICONS[m.slug] ?? Sparkles;
          const name = t.label[m.slug as keyof typeof t.label] ?? m.title;
          return (
            <button key={m.slug} type="button" className="tool-tile lift" aria-expanded={open === m.slug} onClick={() => setOpen(open === m.slug ? null : m.slug)}>
              <span className="ct-icon">
                <Icon size={18} aria-hidden="true" />
              </span>
              <b>{name}</b>
              <span className="sr-only">{m.tagline}</span>
            </button>
          );
        })}
        <button type="button" className="tool-tile wide lift" aria-expanded={open === "widgets"} onClick={() => setOpen(open === "widgets" ? null : "widgets")}>
          <span className="ct-icon">
            <Brain size={18} aria-hidden="true" />
          </span>
          <b>{t.widgetsTitle}</b>
          <span className="sr-only">{t.widgetsLead}</span>
        </button>
      </div>

      {openMode !== undefined && (
        <ToolForm key={openMode.slug} slug={openMode.slug} name={t.label[openMode.slug as keyof typeof t.label] ?? openMode.title} tagline={openMode.tagline} options={openMode.options} busy={busy} onMake={(form) => make(openMode.slug, openMode.output, form)} />
      )}
      {open === "widgets" && (
        <div className="tool-form raised">
          <p className="soft small-text">{t.widgetsLead}</p>
          <div className="widget-picks">
            {(widgets ?? []).map((w) => (
              <button key={w.slug} type="button" className="choice" disabled={busy} onClick={() => void work(() => makeWidget({ notebookId, slug: w.slug }), "widget", "widget_made")}>
                <b>{w.title}</b>
                <span>{w.tagline}</span>
              </button>
            ))}
          </div>
          {busy && <p className="stage">{t.making}</p>}
        </div>
      )}
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {due !== undefined && due.total > 0 && (
        <section className="due-card">
          <Decor name="sticky-note-butter" className="due-note" />
          <div className="due-text">
            <b>{t.reviewTitle}</b>
            <p>{dueNow > 0 ? t.reviewDue(dueNow) : t.reviewNone}</p>
            {dueNow > 0 && (
              <button type="button" className="pill small" onClick={() => navigate(`/n/${notebookId}/review`)}>
                {t.startReview}
              </button>
            )}
          </div>
        </section>
      )}

      <section className="made">
        <h3>{t.made}</h3>
        {outputs === undefined || outputs.length === 0 ? (
          <p className="soft small-text">{t.none}</p>
        ) : (
          <ul className="made-list">
            {outputs.map((o) => {
              const Icon = KIND_ICONS[o.kind] ?? Sparkles;
              return (
                <li key={o._id}>
                  <button type="button" className="made-open" onClick={() => show(o._id, o.kind)}>
                    <Icon size={16} aria-hidden="true" />
                    <span>
                      <b>{o.title}</b>
                      <small className="soft">{new Date(o.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</small>
                    </span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                  <button type="button" className="icon-button" aria-label={`${t.remove} ${o.title}`} onClick={() => void remove({ outputId: o._id })}>
                    <Trash2 size={15} aria-hidden="true" />
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

function ToolForm({ slug, name, tagline, options, busy, onMake }: { slug: string; name: string; tagline: string; options: unknown; busy: boolean; onMake: (form: FormData) => void }) {
  const t = copy.tools;
  const opts = options as { count?: { min: number; max: number; default: number }; difficulty?: boolean; minutes?: boolean };
  return (
    <form
      className="tool-form raised rise"
      onSubmit={(e) => {
        e.preventDefault();
        onMake(new FormData(e.currentTarget));
      }}
    >
      <b>{name}</b>
      <p className="soft small-text">{tagline}</p>
      <div className="row">
        {opts.count !== undefined && (
          <div className="field">
            <label htmlFor={`count-${slug}`}>{t.count}</label>
            <input id={`count-${slug}`} name="count" type="number" min={opts.count.min} max={opts.count.max} defaultValue={opts.count.default} />
          </div>
        )}
        {opts.difficulty === true && (
          <div className="field">
            <label htmlFor={`difficulty-${slug}`}>{t.difficulty}</label>
            <select id={`difficulty-${slug}`} name="difficulty" defaultValue="medium">
              <option value="easy">{t.easy}</option>
              <option value="medium">{t.medium}</option>
              <option value="hard">{t.hard}</option>
            </select>
          </div>
        )}
        {opts.minutes === true && (
          <div className="field">
            <label htmlFor={`minutes-${slug}`}>{t.minutes}</label>
            <input id={`minutes-${slug}`} name="minutes" type="number" min={5} max={180} defaultValue={30} />
          </div>
        )}
      </div>
      <button className="pill small" type="submit" disabled={busy}>
        {busy ? t.making : `${t.make} ${name.toLowerCase()}`}
      </button>
    </form>
  );
}
