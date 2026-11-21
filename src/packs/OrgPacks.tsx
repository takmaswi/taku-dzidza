import { useAction, useMutation, useQuery } from "convex/react";
import { BookOpen, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { errorText } from "../access";
import { copy } from "../copy/en";

/** An organisation's published course packs, on its public page. Adding one makes the learner's own linked notebook. */
export function PublishedPacks({ organisationId }: { organisationId: Id<"organisations"> }) {
  const t = copy.packs;
  const packs = useQuery(api.packs.packs.published, { organisationId });
  const add = useMutation(api.packs.packs.add);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  if (packs === undefined) return null;
  return (
    <section className="panel stack" aria-labelledby="packs-title">
      <h2 id="packs-title">{t.title}</h2>
      <p className="soft">{t.publicLine}</p>
      {packs.length === 0 ? (
        <p className="soft">{t.none}</p>
      ) : (
        <ul className="plain-list" aria-label={t.title}>
          {packs.map((p) => (
            <li key={p._id} className="org-row">
              <span className="ct-icon">
                <BookOpen size={18} aria-hidden="true" />
              </span>
              <span className="grow">
                <b>{p.title}</b>
                <small className="soft">
                  {t.level(p.subject, p.level)}. {t.version(p.version)}
                </small>
              </span>
              {p.notebookId !== null ? (
                <Link to={`/n/${p.notebookId}`} className="pill small ghost" aria-label={`${t.open} ${p.title}`}>
                  {t.open} <ChevronRight size={14} aria-hidden="true" />
                </Link>
              ) : (
                <button
                  type="button"
                  className="pill small"
                  aria-label={`${t.add}: ${p.title}`}
                  onClick={() =>
                    void add({ packId: p._id })
                      .then((id) => navigate(`/n/${id}`))
                      .catch((err: unknown) => setError(errorText(err, copy.errors.generic)))
                  }
                >
                  {t.add}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

/** For the organisation's teachers and admins: every pack with its state and learner count, a new draft, and publishing. */
export function StaffPacks({ organisationId }: { organisationId: Id<"organisations"> }) {
  const t = copy.packs;
  const packs = useQuery(api.packs.packs.forStaff, { organisationId });
  const [adding, setAdding] = useState(false);
  if (packs === undefined) return null;
  return (
    <section className="panel stack" aria-labelledby="staff-packs-title">
      <h2 id="staff-packs-title">{t.title}</h2>
      <p className="soft">{t.staffLine}</p>
      {packs.length > 0 && (
        <ul className="plain-list" aria-label={t.title}>
          {packs.map((p) => (
            <StaffPackRow key={p._id} pack={p} />
          ))}
        </ul>
      )}
      {adding ? (
        <NewPackForm organisationId={organisationId} onDone={() => setAdding(false)} />
      ) : (
        <button type="button" className="pill small ghost" onClick={() => setAdding(true)}>
          {t.newPack}
        </button>
      )}
    </section>
  );
}

type StaffPack = { _id: Id<"coursePacks">; title: string; subject: string; level: string; status: "draft" | "published"; version: number; learners: number; canManage: boolean; publishing: boolean };
type Note = { ok: boolean; text: string } | null;

function stateLine(pack: StaffPack): string {
  const t = copy.packs;
  if (pack.status === "published") return `${t.published}, ${t.version(pack.version).toLowerCase()}`;
  return pack.version > 0 ? `${t.notPublished}, ${t.version(pack.version).toLowerCase()}` : t.draft;
}

function StaffPackRow({ pack }: { pack: StaffPack }) {
  const t = copy.packs;
  const publish = useAction(api.packs.publish.publish);
  const unpublish = useMutation(api.packs.packs.unpublish);
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const id = `rights-${pack._id}`;
  return (
    <li className="owner-row" aria-label={pack.title}>
      <span>
        <b>{pack.title}</b>
        <small className="soft" style={{ display: "block" }}>
          {t.level(pack.subject, pack.level)}. {stateLine(pack)}. {t.learners(pack.learners)}
        </small>
      </span>
      {pack.canManage && editing && (
        <EditPackForm
          pack={pack}
          onDone={(saved) => {
            setEditing(false);
            if (saved) setNote({ ok: true, text: t.savedNote });
          }}
        />
      )}
      {pack.canManage && !editing && (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            setNote(null);
            void publish({ packId: pack._id, confirmRights: rights })
              .then((r) => setNote(r.ok ? { ok: true, text: t.publishedNote(r.version) } : { ok: false, text: r.message }))
              .catch((err: unknown) => setNote({ ok: false, text: errorText(err, copy.errors.generic) }))
              .finally(() => setBusy(false));
          }}
        >
          <label className="check-row" htmlFor={id}>
            <input id={id} type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} />
            <span>{t.rights}</span>
          </label>
          <button type="submit" className="pill small" disabled={busy || pack.publishing}>
            {pack.status === "published" ? t.republish : t.publish}
          </button>
          {(busy || pack.publishing) && <p className="soft">{t.publishing}</p>}
          <div className="actions">
            <button type="button" className="pill small ghost" onClick={() => setEditing(true)}>
              {t.edit}
            </button>
            {pack.status === "published" && (
              <button
                type="button"
                className="pill small ghost"
                onClick={() =>
                  void unpublish({ packId: pack._id })
                    .then(() => setNote({ ok: true, text: t.unpublishedNote }))
                    .catch((err: unknown) => setNote({ ok: false, text: errorText(err, copy.errors.generic) }))
                }
              >
                {t.unpublish}
              </button>
            )}
          </div>
        </form>
      )}
      {note !== null && (
        <p className={note.ok ? "notice" : "error"} role={note.ok ? "status" : "alert"}>
          {note.text}
        </p>
      )}
    </li>
  );
}

function EditPackForm({ pack, onDone }: { pack: StaffPack; onDone: (saved: boolean) => void }) {
  const t = copy.packs;
  const save = useMutation(api.packs.packs.edit);
  const [title, setTitle] = useState(pack.title);
  const [subject, setSubject] = useState(pack.subject);
  const [level, setLevel] = useState(pack.level);
  const [error, setError] = useState<string | null>(null);
  const key = pack._id;
  return (
    <form
      className="stack"
      aria-label={t.edit}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        void save({ packId: pack._id, title, subject, level })
          .then(() => onDone(true))
          .catch((err: unknown) => setError(errorText(err, copy.errors.generic)));
      }}
    >
      <div className="field">
        <label htmlFor={`title-${key}`}>{t.packTitle}</label>
        <input id={`title-${key}`} type="text" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor={`subject-${key}`}>{t.subject}</label>
        <input id={`subject-${key}`} type="text" maxLength={60} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor={`level-${key}`}>{t.packLevel}</label>
        <input id={`level-${key}`} type="text" maxLength={30} value={level} onChange={(e) => setLevel(e.target.value)} />
      </div>
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button type="submit" className="pill small">
          {t.save}
        </button>
        <button type="button" className="pill small ghost" onClick={() => onDone(false)}>
          {copy.orgs.cancel}
        </button>
      </div>
    </form>
  );
}

function NewPackForm({ organisationId, onDone }: { organisationId: Id<"organisations">; onDone: () => void }) {
  const t = copy.packs;
  const notebooks = useQuery(api.packs.packs.myNotebooks, { organisationId });
  const create = useMutation(api.packs.packs.create);
  const [notebookId, setNotebookId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (notebooks === undefined) return null;
  if (notebooks.length === 0) return <p className="soft">{t.noNotebooks}</p>;
  const chosen = notebookId === "" ? notebooks[0]._id : (notebookId as Id<"notebooks">);
  return (
    <form
      className="panel stack"
      aria-label={t.newPack}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        void create({ organisationId, notebookId: chosen, title, subject, level })
          .then(onDone)
          .catch((err: unknown) => setError(errorText(err, copy.errors.generic)));
      }}
    >
      <div className="field">
        <label htmlFor="pack-notebook">{t.fromNotebook}</label>
        <select id="pack-notebook" value={chosen} onChange={(e) => setNotebookId(e.target.value)}>
          {notebooks.map((n) => (
            <option key={n._id} value={n._id}>
              {n.title}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="pack-title">{t.packTitle}</label>
        <input id="pack-title" type="text" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pack-subject">{t.subject}</label>
        <input id="pack-subject" type="text" maxLength={60} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pack-level">{t.packLevel}</label>
        <input id="pack-level" type="text" maxLength={30} value={level} onChange={(e) => setLevel(e.target.value)} />
      </div>
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button type="submit" className="pill small">
          {t.create}
        </button>
        <button type="button" className="pill small ghost" onClick={onDone}>
          {copy.orgs.cancel}
        </button>
      </div>
    </form>
  );
}
