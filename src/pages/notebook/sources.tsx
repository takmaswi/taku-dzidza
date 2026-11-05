import { useMutation } from "convex/react";
import { ChevronLeft, FileText, Link2, Plus, Search, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Menu } from "../../components/ui";
import { copy } from "../../copy/en";
import { ADD_ICONS, type Sources } from "./useSources";

/** The paste and link forms, shown where the learner asked for them. */
export function AddForms({ sources }: { sources: Sources }) {
  const t = copy.notebook;
  return (
    <>
      {sources.form === "paste" && (
        <form
          className="add-form"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void sources.addText(String(form.get("pasteTitle") ?? ""), String(form.get("pasteText") ?? ""));
          }}
        >
          <div className="field">
            <label htmlFor="pasteTitle">{t.pasteTitle}</label>
            <input id="pasteTitle" name="pasteTitle" type="text" maxLength={120} />
          </div>
          <div className="field">
            <label htmlFor="pasteText">{t.pasteText}</label>
            <textarea id="pasteText" name="pasteText" rows={7} required autoFocus />
          </div>
          <div className="actions">
            <button className="pill small" type="submit" disabled={sources.busy}>
              {t.addPaste}
            </button>
            <button className="pill ghost small" type="button" onClick={() => sources.setForm(null)}>
              {copy.home.cancel}
            </button>
          </div>
        </form>
      )}
      {sources.form === "link" && (
        <form
          className="add-form"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            void sources.addLink(String(new FormData(e.currentTarget).get("url") ?? ""));
          }}
        >
          <div className="field">
            <label htmlFor="url">{t.linkLabel}</label>
            <input id="url" name="url" type="url" inputMode="url" placeholder="https://" required autoFocus />
          </div>
          <div className="actions">
            <button className="pill small" type="submit" disabled={sources.busy}>
              {t.addLink}
            </button>
            <button className="pill ghost small" type="button" onClick={() => sources.setForm(null)}>
              {copy.home.cancel}
            </button>
          </div>
        </form>
      )}
      {sources.busy && sources.form === null && <p className="soft small-text">{t.uploading}</p>}
      {sources.error !== null && (
        <p className="error" role="alert">
          {sources.error}
        </p>
      )}
    </>
  );
}

/** The Add a source button and its menu: upload, snap, paste or link. */
export function AddSourceMenu({ sources }: { sources: Sources }) {
  const t = copy.notebook;
  return (
    <Menu
      label={t.addTitle}
      className="add-menu"
      button={
        <span className="pill small">
          <Plus size={16} aria-hidden="true" /> {t.addTitle}
        </span>
      }
    >
      {(close) =>
        (["upload", "snap", "paste", "link"] as const).map((kind) => {
          const Icon = ADD_ICONS[kind];
          return (
            <button key={kind} type="button" role="menuitem" onClick={() => (close(), sources.start(kind))}>
              <Icon size={16} aria-hidden="true" /> {t.add[kind].title}
            </button>
          );
        })
      }
    </Menu>
  );
}

/** The list of sources with search, removal and the add menu. Used in the rail and in the phone sheet. */
/** `forms` is false while the empty notebook centre shows the same add forms, so they never appear twice. */
export function SourceList({ notebookId, list, sources, header, forms = true }: { notebookId: Id<"notebooks">; list: Doc<"sources">[]; sources: Sources; header?: ReactNode; forms?: boolean }) {
  const t = copy.notebook;
  const remove = useMutation(api.notebooks.sources.remove);
  const [query, setQuery] = useState("");
  const shown = query.trim() === "" ? list : list.filter((s) => s.title.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div className="source-panel" data-notebook={notebookId}>
      {header}
      {list.length > 0 && (
        <label className="search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">{t.searchSources}</span>
          <input type="search" value={query} placeholder={t.searchSources} onChange={(e) => setQuery(e.target.value)} />
        </label>
      )}
      {list.length === 0 ? (
        <p className="soft small-text">{t.noSources}</p>
      ) : (
        <ul className="source-list">
          {shown.map((s) => (
            <li key={s._id}>
              <span className="source-icon">{s.kind === "link" ? <Link2 size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}</span>
              <span className="source-text">
                <b>{s.title}</b>
                <small className={s.status === "failed" ? "error" : "soft"}>{s.status === "reading" ? t.reading : s.status === "failed" ? (s.error ?? t.failed) : t.ready(s.pageCount)}</small>
              </span>
              <button type="button" className="icon-button" aria-label={`${t.removeSource} ${s.title}`} onClick={() => void remove({ sourceId: s._id })}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="source-add">
        <AddSourceMenu sources={sources} />
        <small className="soft">{t.uploadHint}</small>
      </div>
      {forms && <AddForms sources={sources} />}
    </div>
  );
}

export function BackToSources({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" className="icon-button back-sources" onClick={onBack}>
      <ChevronLeft size={16} aria-hidden="true" /> {copy.notebook.allSources}
    </button>
  );
}
