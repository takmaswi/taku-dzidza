import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Copy, MessageCircle, QrCode as QrIcon } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { joinLink, shareText, whatsAppLink } from "../../../convex/classes/codes";
import { errorText } from "../../access";
import { QrCode } from "../../classes/shared";
import { AppShell } from "../../components/Layout";
import { copy } from "../../copy/en";

/**
 * One class, for its teacher. Top to bottom, the first run order: share the
 * code, choose what learners read, set work. Learners, names, work set and
 * results appear once there is something in them.
 */
export default function ClassPage() {
  const t = copy.classes;
  const { classId = "" } = useParams();
  const id = classId as Id<"classes">;
  const data = useQuery(api.classes.classes.detail, { classId: id });
  if (data === undefined) {
    return (
      <AppShell title={t.teachPage}>
        <p className="app-loading">{copy.loading}</p>
      </AppShell>
    );
  }
  const { class: cls } = data;
  return (
    <AppShell title={cls.name}>
      <div className="page-narrow stack">
        <Link to="/teach" className="back-link">
          <ArrowLeft size={18} aria-hidden="true" /> {t.teachPage}
        </Link>
        <h1>{cls.name}</h1>
        <p className="soft">
          {cls.subject}, {cls.level}
        </p>
        <ShareBox name={cls.name} code={cls.code} />
        <MaterialBox classId={id} />
        <WorkBox classId={id} />
        {data.assignments.length > 0 && (
          <section className="panel stack" aria-labelledby="papers">
            <h2 id="papers">{t.papersTitle}</h2>
            <ul className="plain-list">
              {data.assignments.map((a) => (
                <li key={a.assignmentId} className="row-between">
                  <span>
                    <b>{a.title}</b> <small className="soft">{t.marked(a.marked)}{a.drafts > 0 ? `, ${t.drafts(a.drafts)}` : ""}</small>
                  </span>
                  <Link to={`/teach/${id}/a/${a.assignmentId}`} className="pill small ghost">
                    {t.openMarking}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <LearnersBox classId={id} learners={data.learners} names={data.names} />
        {data.assignments.length > 0 && <ResultsBox classId={id} />}
      </div>
    </AppShell>
  );
}

function ShareBox({ name, code }: { name: string; code: string }) {
  const t = copy.classes;
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState(false);
  const origin = window.location.origin;
  const link = joinLink(origin, code);
  return (
    <section className="panel stack" aria-labelledby="share">
      <h2 id="share">{t.shareTitle}</h2>
      <p className="soft">{t.shareLine}</p>
      <p className="class-code" data-testid="class-code">
        {code}
      </p>
      <div className="actions wrap">
        <button type="button" className="pill small" onClick={() => void navigator.clipboard?.writeText(link).then(() => setCopied(true))}>
          <Copy size={16} aria-hidden="true" /> {copied ? t.copied : t.copyLink}
        </button>
        <a className="pill small ghost" href={whatsAppLink(shareText(name, origin, code))} target="_blank" rel="noreferrer">
          <MessageCircle size={16} aria-hidden="true" /> {t.whatsapp}
        </a>
        <button type="button" className="pill small ghost" aria-expanded={qr} onClick={() => setQr(!qr)}>
          <QrIcon size={16} aria-hidden="true" /> {qr ? t.hideQr : t.showQr}
        </button>
      </div>
      {qr && <QrCode text={link} label={t.qrLabel(code)} />}
    </section>
  );
}

function MaterialBox({ classId }: { classId: Id<"classes"> }) {
  const t = copy.classes;
  const picker = useQuery(api.classes.sharing.picker, { classId });
  const share = useMutation(api.classes.sharing.share);
  const setThirdParty = useMutation(api.classes.sharing.setThirdParty);
  if (picker === undefined) return null;
  return (
    <section className="panel stack" aria-labelledby="material">
      <h2 id="material">{t.materialTitle}</h2>
      <p className="soft">{t.materialLine}</p>
      {picker.length === 0 ? (
        <p>
          {t.noNotebooks}{" "}
          <Link to="/notebooks" className="link">
            {copy.nav.notebooks}
          </Link>
        </p>
      ) : (
        <ul className="plain-list">
          {picker.map((nb) => (
            <li key={nb.notebookId} className="stack-tight">
              <label className="check-row">
                <input type="checkbox" checked={nb.shared} onChange={(e) => void share({ classId, notebookId: nb.notebookId, on: e.target.checked })} />
                <span>{t.shareNotebook(nb.title)}</span>
              </label>
              {nb.shared && nb.sources.length > 0 && (
                <ul className="plain-list indent">
                  {nb.sources.map((s) => (
                    <li key={s.sourceId}>
                      <label className="check-row small-text">
                        <input type="checkbox" checked={s.thirdParty} onChange={(e) => void setThirdParty({ sourceId: s.sourceId, on: e.target.checked })} />
                        <span>
                          {s.title}: {t.publishedBook}
                        </span>
                      </label>
                    </li>
                  ))}
                  <li className="soft small-text">{t.publishedLine}</li>
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function WorkBox({ classId }: { classId: Id<"classes"> }) {
  const t = copy.classes;
  const picker = useQuery(api.classes.sharing.picker, { classId });
  const assign = useMutation(api.classes.assignments.assign);
  const [outputId, setOutputId] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  if (picker === undefined) return null;
  const quizzes = picker.flatMap((nb) => nb.quizzes.map((q) => ({ ...q, notebook: nb.title })));
  return (
    <section className="panel stack" aria-labelledby="work">
      <h2 id="work">{t.workTitle}</h2>
      <p className="soft">{t.workLine}</p>
      {quizzes.length === 0 ? (
        <p>{t.noQuiz}</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const chosen = (outputId || quizzes[0].outputId) as Id<"outputs">;
            void assign({ classId, outputId: chosen })
              .then(() => setNote({ ok: true, text: t.setDone }))
              .catch((err: unknown) => setNote({ ok: false, text: errorText(err, copy.errors.generic) }));
          }}
        >
          <div className="field">
            <label htmlFor="pick-quiz">{t.pickQuiz}</label>
            <select id="pick-quiz" value={outputId || quizzes[0].outputId} onChange={(e) => setOutputId(e.target.value)}>
              {quizzes.map((q) => (
                <option key={q.outputId} value={q.outputId}>
                  {q.title} ({q.notebook})
                </option>
              ))}
            </select>
          </div>
          <button className="pill small" type="submit">
            {t.setIt}
          </button>
          {note !== null && (
            <p className={note.ok ? "notice" : "error"} role={note.ok ? "status" : "alert"}>
              {note.text}
            </p>
          )}
        </form>
      )}
    </section>
  );
}

type Learner = { enrolmentId: Id<"enrolments">; firstName: string; status: "approved" | "pending" };
type Name = { rosterId: Id<"rosterNames">; firstName: string };

function LearnersBox({ classId, learners, names }: { classId: Id<"classes">; learners: Learner[]; names: Name[] }) {
  const t = copy.classes;
  const removeLearner = useMutation(api.classes.classes.removeLearner);
  const addName = useMutation(api.classes.classes.addName);
  const removeName = useMutation(api.classes.classes.removeName);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <section className="panel stack" aria-labelledby="learners">
      <h2 id="learners">{t.learnersTitle}</h2>
      {learners.length === 0 ? (
        <p className="soft">{t.noLearners}</p>
      ) : (
        <ul className="plain-list" data-testid="roster">
          {learners.map((l) => (
            <li key={l.enrolmentId} className="row-between">
              <span>
                {l.firstName} {l.status === "pending" && <small className="status-label soft">{t.pendingTag}</small>}
              </span>
              <button type="button" className="pill small ghost" onClick={() => void removeLearner({ classId, enrolmentId: l.enrolmentId })}>
                {t.remove}
              </button>
            </li>
          ))}
        </ul>
      )}
      <details>
        <summary>{t.namesTitle}</summary>
        <p className="soft small-text">{t.namesLine}</p>
        {names.length > 0 && (
          <ul className="plain-list">
            {names.map((n) => (
              <li key={n.rosterId} className="row-between">
                <span>{n.firstName}</span>
                <button type="button" className="pill small ghost" onClick={() => void removeName({ classId, rosterId: n.rosterId })}>
                  {t.remove}
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            void addName({ classId, firstName: name })
              .then(() => setName(""))
              .catch((err: unknown) => setError(errorText(err, copy.errors.generic)));
          }}
        >
          <div className="field">
            <label htmlFor="roster-name">{t.firstNameLabel}</label>
            <input id="roster-name" type="text" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button className="pill small ghost" type="submit">
            {t.addName}
          </button>
          {error !== null && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      </details>
    </section>
  );
}

function ResultsBox({ classId }: { classId: Id<"classes"> }) {
  const t = copy.classes;
  const results = useQuery(api.classes.assignments.results, { classId });
  if (results === undefined) return null;
  return (
    <section className="panel stack" aria-labelledby="results" data-testid="results">
      <h2 id="results">{t.resultsTitle}</h2>
      <p className="soft small-text">{t.resultsLine}</p>
      {results.topics.length === 0 ? (
        <p className="soft">{t.noResults}</p>
      ) : (
        <table className="results-table">
          <thead>
            <tr>
              <th scope="col">{t.topicCol}</th>
              <th scope="col">{t.answersCol}</th>
              <th scope="col">{t.percentCol}</th>
            </tr>
          </thead>
          <tbody>
            {results.topics.map((r) => (
              <tr key={r.topic}>
                <td>{r.topic}</td>
                <td>{r.answers}</td>
                <td>{t.percent(r.percent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {results.papers.some((p) => p.scripts > 0) && (
        <table className="results-table">
          <thead>
            <tr>
              <th scope="col">{t.paperCol}</th>
              <th scope="col">{t.scriptsCol}</th>
              <th scope="col">{t.percentCol}</th>
            </tr>
          </thead>
          <tbody>
            {results.papers.map((p) => (
              <tr key={p.assignmentId}>
                <td>{p.title}</td>
                <td>{p.scripts}</td>
                <td>{p.percent === null ? "" : t.percent(p.percent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
