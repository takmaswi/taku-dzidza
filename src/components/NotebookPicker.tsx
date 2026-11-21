import { useQuery } from "convex/react";
import { BookOpen, ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { PickedNotebook } from "../../convex/chat/fromNotebooks";
import { copy } from "../copy/en";
import { Sheet } from "./ui";

export const MAX_PICKED = 5;

/** The chip beside the mode chips: "Use my notebooks", or how many are picked. */
export function NotebooksChip({ count, onOpen }: { count: number; onOpen: () => void }) {
  const t = copy.chat;
  return (
    <span className="chip-menu">
      <button type="button" className={`chip${count > 0 ? " chip-on" : ""}`} aria-haspopup="dialog" aria-label={t.notebooksChip(count)} data-testid="notebooks-chip" onClick={onOpen}>
      <BookOpen size={15} aria-hidden="true" />
      <span className="chip-full">{t.notebooksChip(count)}</span>
      <span className="chip-short" aria-hidden="true">
        {count === 0 ? t.useNotebooksShort : count}
      </span>
      <ChevronDown size={14} aria-hidden="true" />
      </button>
    </span>
  );
}

/** A searchable list of the learner's notebooks, own and course packs; up to 5 can be ticked. */
export function NotebookPickerSheet({ picked, onChange, onClose }: { picked: Id<"notebooks">[]; onChange: (ids: Id<"notebooks">[]) => void; onClose: () => void }) {
  const t = copy.chat;
  const all = useQuery(api.chat.fromNotebooks.pickable);
  const [text, setText] = useState("");
  const full = picked.length >= MAX_PICKED;
  const words = text.trim().toLowerCase();
  const shown = (all ?? []).filter((n) => words === "" || n.title.toLowerCase().includes(words));
  const toggle = (id: Id<"notebooks">, on: boolean) => onChange(on ? [...picked, id].slice(0, MAX_PICKED) : picked.filter((p) => p !== id));
  return (
    <Sheet title={t.pickTitle} onClose={onClose} testId="notebook-picker">
      <div className="stack">
        <p className="soft small-text">{t.pickLine}</p>
        <div className="field">
          <label htmlFor="notebook-search">{t.pickSearch}</label>
          <input id="notebook-search" type="search" autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        {all !== undefined && all.length === 0 && <p className="soft">{t.pickNone}</p>}
        {all !== undefined && all.length > 0 && shown.length === 0 && <p className="soft">{t.pickNoMatch}</p>}
        <ul className="plain-list picker-list" aria-label={t.pickTitle}>
          {shown.map((n) => {
            const on = picked.includes(n.notebookId);
            const id = `pick-${n.notebookId}`;
            return (
              <li key={n.notebookId}>
                <label className="check-row" htmlFor={id}>
                  <input id={id} type="checkbox" checked={on} disabled={!on && full} onChange={(e) => toggle(n.notebookId, e.target.checked)} />
                  <span>
                    {n.title} {t.kinds[n.kind] !== "" && <small className="tag">{t.kinds[n.kind]}</small>}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        {full && (
          <p className="soft small-text" role="status">
            {t.pickMax}
          </p>
        )}
        {picked.length > 0 && (
          <button type="button" className="pill small ghost" onClick={() => onChange([])}>
            {t.pickClear}
          </button>
        )}
      </div>
    </Sheet>
  );
}

/** Above the question box: the notebooks Taku answers from, each removable. */
export function PickedChips({ picked, onRemove }: { picked: PickedNotebook[]; onRemove: (id: Id<"notebooks">) => void }) {
  const t = copy.chat;
  if (picked.length === 0) return null;
  return (
    <ul className="picked-chips" aria-label={t.pickedLabel} data-testid="picked-notebooks">
      {picked.map((n) => (
        <li key={n.notebookId}>
          <span className="picked-chip">
            <BookOpen size={13} aria-hidden="true" />
            <span className="picked-title">{n.title}</span>
            <button type="button" className="picked-x" aria-label={t.removePicked(n.title)} onClick={() => onRemove(n.notebookId)}>
              <X size={14} aria-hidden="true" />
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}
