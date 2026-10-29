import { useAction, useMutation, useQuery } from "convex/react";
import { ArrowLeft, FileText, Link2, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { errorText } from "../access";
import { Layout } from "../components/Layout";
import { ReadAloud } from "../components/ReadAloud";
import { copy } from "../copy/en";
import { ToolsPanel } from "./ToolsPanel";

type Origin = { kind: "source"; sourceId: string; page: number; quote: string } | { kind: "added" };
type Citation = { sourceId: Id<"sources">; page: number; quote: string };

/** One notebook: its sources, the source mode, and the chat with Taku (SPEC.md 3.2). */
export default function Notebook({ profile }: { profile: Doc<"profiles"> }) {
  const { id = "" } = useParams();
  const notebookId = id as Id<"notebooks">;
  const data = useQuery(api.notebooks.notebooks.get, { notebookId });
  const [citation, setCitation] = useState<Citation | null>(null);
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "tools" ? "tools" : "ask";
  const t = copy.notebook;

  if (data === undefined) {
    return (
      <Layout signedIn>
        <p>{copy.loading}</p>
      </Layout>
    );
  }

  const titles = new Map(data.sources.map((s) => [s._id as string, s.title]));
  return (
    <Layout signedIn>
      <div className="stack">
        <Link to="/" className="back-link">
          <ArrowLeft size={18} aria-hidden="true" /> {t.back}
        </Link>
        <h1>{data.notebook.title}</h1>
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "ask"} onClick={() => setParams({})}>
            {copy.tools.tabAsk}
          </button>
          <button type="button" role="tab" aria-selected={tab === "tools"} onClick={() => setParams({ tab: "tools" })}>
            {copy.tools.tabTools}
          </button>
        </div>
        <div className={`notebook-grid${data.sources.length > 0 ? " has-sources" : ""}`}>
          <aside className="stack">
            <SourcesPanel notebookId={notebookId} sources={data.sources} />
            <ModePanel notebook={data.notebook} profile={profile} />
            <NotebookActions notebookId={notebookId} />
          </aside>
          {tab === "ask" ? <Chat notebookId={notebookId} messages={data.messages} titles={titles} onCite={setCitation} readAloud={profile.accessibility.readAloud} /> : <ToolsPanel notebookId={notebookId} />}
        </div>
      </div>
      {citation !== null && <CitationViewer citation={citation} onClose={() => setCitation(null)} />}
    </Layout>
  );
}

function SourcesPanel({ notebookId, sources }: { notebookId: Id<"notebooks">; sources: Doc<"sources">[] }) {
  const t = copy.notebook;
  const generateUploadUrl = useMutation(api.notebooks.sources.generateUploadUrl);
  const addFile = useMutation(api.notebooks.sources.addFile);
  const addText = useMutation(api.notebooks.sources.addText);
  const addLink = useMutation(api.notebooks.sources.addLink);
  const remove = useMutation(api.notebooks.sources.remove);
  const [panel, setPanel] = useState<"none" | "paste" | "link">("none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const run = async (work: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      await work();
      setPanel("none");
    } catch (e) {
      setError(errorText(e, copy.errors.generic));
    } finally {
      setBusy(false);
    }
  };

  const upload = (file: File) =>
    run(async () => {
      const url = await generateUploadUrl({});
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      if (!response.ok) throw new Error("upload failed");
      const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
      await addFile({ notebookId, storageId, fileName: file.name });
    });

  return (
    <section className="card">
      <h2>{t.sourcesTitle}</h2>
      {sources.length === 0 ? (
        <p className="soft">{t.noSources}</p>
      ) : (
        <ul className="source-list">
          {sources.map((s) => (
            <li key={s._id}>
              <span className="source-title">
                {s.kind === "link" ? <Link2 size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}
                <span>
                  {s.title}
                  <small className={s.status === "failed" ? "error" : "soft"}>{s.status === "reading" ? t.reading : s.status === "failed" ? (s.error ?? t.failed) : t.ready(s.pageCount)}</small>
                </span>
              </span>
              <button type="button" className="icon-button" aria-label={`${t.removeSource} ${s.title}`} onClick={() => void remove({ sourceId: s._id })}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <h3 style={{ marginTop: "1rem" }}>{t.addTitle}</h3>
      <div className="actions">
        <button type="button" className="pill small" disabled={busy} onClick={() => fileInput.current?.click()}>
          <Upload size={16} aria-hidden="true" /> {busy ? t.uploading : t.upload}
        </button>
        <button type="button" className="pill ghost small" onClick={() => setPanel(panel === "paste" ? "none" : "paste")}>
          {t.paste}
        </button>
        <button type="button" className="pill ghost small" onClick={() => setPanel(panel === "link" ? "none" : "link")}>
          {t.link}
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        hidden
        accept=".pdf,.docx,image/jpeg,image/png,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        data-testid="file-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file !== undefined) void upload(file);
        }}
      />
      <small className="soft">{t.uploadHint}</small>
      {panel === "paste" && (
        <form
          className="add-form"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void run(() => addText({ notebookId, title: String(form.get("pasteTitle") ?? ""), text: String(form.get("pasteText") ?? "") }));
          }}
        >
          <div className="field">
            <label htmlFor="pasteTitle">{t.pasteTitle}</label>
            <input id="pasteTitle" name="pasteTitle" type="text" maxLength={120} />
          </div>
          <div className="field">
            <label htmlFor="pasteText">{t.pasteText}</label>
            <textarea id="pasteText" name="pasteText" rows={8} required />
          </div>
          <button className="pill small" type="submit" disabled={busy}>
            {t.addPaste}
          </button>
        </form>
      )}
      {panel === "link" && (
        <form
          className="add-form"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void run(() => addLink({ notebookId, url: String(form.get("url") ?? "") }));
          }}
        >
          <div className="field">
            <label htmlFor="url">{t.linkLabel}</label>
            <input id="url" name="url" type="url" inputMode="url" placeholder="https://" required />
          </div>
          <button className="pill small" type="submit" disabled={busy}>
            {t.addLink}
          </button>
        </form>
      )}
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function ModePanel({ notebook, profile }: { notebook: Doc<"notebooks">; profile: Doc<"profiles"> }) {
  const t = copy.notebook;
  const setSourceMode = useMutation(api.notebooks.notebooks.setSourceMode);
  const setAnswerMode = useMutation(api.accounts.profiles.setAnswerMode);
  return (
    <section className="card">
      <h2>{t.modeTitle}</h2>
      <div className="segmented" role="group" aria-label={t.modeTitle}>
        <button type="button" aria-pressed={notebook.sourceMode === "only_mine"} onClick={() => void setSourceMode({ notebookId: notebook._id, sourceMode: "only_mine" })}>
          {t.onlyMine}
        </button>
        <button type="button" aria-pressed={notebook.sourceMode === "mine_plus"} onClick={() => void setSourceMode({ notebookId: notebook._id, sourceMode: "mine_plus" })}>
          {t.minePlus}
        </button>
      </div>
      <p className="soft small-text">{notebook.sourceMode === "only_mine" ? t.onlyMineNote : t.minePlusNote}</p>
      <h3>{t.answerTitle}</h3>
      <div className="segmented" role="group" aria-label={t.answerTitle}>
        <button type="button" aria-pressed={profile.answerMode === "answer"} onClick={() => void setAnswerMode({ answerMode: "answer" })}>
          {copy.settings.answer.name}
        </button>
        <button type="button" aria-pressed={profile.answerMode === "guide"} onClick={() => void setAnswerMode({ answerMode: "guide" })}>
          {copy.settings.guide.name}
        </button>
      </div>
      <p className="soft small-text">{profile.answerMode === "answer" ? copy.settings.answer.line : copy.settings.guide.line}</p>
    </section>
  );
}

function NotebookActions({ notebookId }: { notebookId: Id<"notebooks"> }) {
  const t = copy.notebook;
  const clearChat = useMutation(api.notebooks.notebooks.clearChat);
  const remove = useMutation(api.notebooks.notebooks.remove);
  const navigate = useNavigate();
  return (
    <div className="actions">
      <button type="button" className="pill ghost small" onClick={() => void clearChat({ notebookId })}>
        {t.clearChat}
      </button>
      <button
        type="button"
        className="pill ghost small"
        onClick={() => {
          if (window.confirm(t.deleteConfirm)) void remove({ notebookId }).then(() => navigate("/"));
        }}
      >
        {t.deleteNotebook}
      </button>
    </div>
  );
}

function Chat({ notebookId, messages, titles, onCite, readAloud }: { notebookId: Id<"notebooks">; messages: Doc<"messages">[]; titles: Map<string, string>; onCite: (c: Citation) => void; readAloud: boolean }) {
  const t = copy.notebook;
  const ask = useAction(api.notebooks.ask.ask);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Newer browsers return a promise here; an effect must return nothing.
    void end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (question.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await ask({ notebookId, question });
      setQuestion("");
    } catch (e) {
      setError(errorText(e, copy.errors.generic));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card chat">
      <div className="messages" aria-live="polite">
        {messages.map((m) => (
          <article key={m._id} className={`message ${m.role}`} data-testid={`message-${m.role}`}>
            <b className="who">{m.role === "learner" ? t.you : t.taku}</b>
            {m.text !== "" && <p>{m.text}</p>}
            {m.parts?.map((part, i) => (
              <Part key={i} text={part.text} origin={part.origin as Origin} titles={titles} onCite={onCite} />
            ))}
            {m.note !== undefined && <p className="soft small-text">{m.note}</p>}
            {readAloud && m.role === "taku" && <ReadAloud text={[m.text, ...(m.parts ?? []).map((x) => x.text)].join(" ")} />}
            {m.kind === "help" && (
              <Link to="/help" className="pill small">
                {t.getHelp}
              </Link>
            )}
          </article>
        ))}
        {busy && <p className="soft">{t.thinking}</p>}
        <div ref={end} />
      </div>
      <form onSubmit={submit} className="ask-form">
        <label htmlFor="question" className="sr-only">
          {t.askLabel}
        </label>
        <textarea id="question" rows={2} value={question} placeholder={t.askPlaceholder} maxLength={2000} onChange={(e) => setQuestion(e.target.value)} />
        <button className="pill" type="submit" disabled={busy || question.trim().length === 0}>
          {t.ask}
        </button>
      </form>
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function Part({ text, origin, titles, onCite }: { text: string; origin: Origin; titles: Map<string, string>; onCite: (c: Citation) => void }) {
  const t = copy.notebook;
  if (origin.kind === "added") {
    return (
      <p className="part added">
        {text} <span className="added-tag">{t.addedByTaku}</span>
      </p>
    );
  }
  const title = titles.get(origin.sourceId) ?? "";
  return (
    <p className="part">
      {text}{" "}
      <button type="button" className="cite" onClick={() => onCite({ sourceId: origin.sourceId as Id<"sources">, page: origin.page, quote: origin.quote })}>
        {t.fromPage(title, origin.page)}
      </button>
    </p>
  );
}

function CitationViewer({ citation, onClose }: { citation: Citation; onClose: () => void }) {
  const t = copy.notebook;
  const page = useQuery(api.notebooks.sources.page, { sourceId: citation.sourceId, page: citation.page });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const text = page?.text ?? null;
  const at = text === null ? -1 : text.toLowerCase().indexOf(citation.quote.toLowerCase());
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal card" role="dialog" aria-modal="true" aria-label={page ? t.fromPage(page.title, citation.page) : t.close} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{page ? t.fromPage(page.title, citation.page) : copy.loading}</h2>
          <button type="button" className="pill ghost small" onClick={onClose}>
            {t.close}
          </button>
        </div>
        {page !== undefined && text === null && <p>{t.pageMissing}</p>}
        {text !== null && at < 0 && <blockquote className="quote">{citation.quote}</blockquote>}
        {text !== null && (
          <div className="page-text">
            {at < 0 ? (
              text
            ) : (
              <>
                {text.slice(0, at)}
                <mark>{text.slice(at, at + citation.quote.length)}</mark>
                {text.slice(at + citation.quote.length)}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
