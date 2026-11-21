import { useMutation, useQuery } from "convex/react";
import { ChevronRight, Plus, Users } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import { FORM_LEVELS, SYLLABUSES } from "../../../convex/curriculum/catalogue";
import { errorText } from "../../access";
import { AppShell } from "../../components/Layout";
import { copy } from "../../copy/en";
import { TeachOrgs } from "../../orgs/TeachOrgs";

/**
 * A teacher's classes. With none yet, the first run: name the class, then the
 * class page walks through sharing the code, choosing what learners read and
 * setting the first quiz. Everything else stays out of sight until used.
 */
export default function Teach() {
  const t = copy.classes;
  const classes = useQuery(api.classes.classes.myClasses);
  const [adding, setAdding] = useState(false);
  if (classes === undefined) {
    return (
      <AppShell title={t.teachPage}>
        <p className="app-loading">{copy.loading}</p>
      </AppShell>
    );
  }
  const first = classes.length === 0;
  return (
    <AppShell title={t.teachPage}>
      <div className="page-narrow stack">
        <h1>{first ? t.firstRunTitle : t.teachPage}</h1>
        {first && (
          <>
            <p className="soft">{t.firstRunLine}</p>
            <ol className="steps soft">
              <li>{t.stepClass}</li>
              <li>{t.stepShare}</li>
              <li>{t.stepBooks}</li>
              <li>{t.stepQuiz}</li>
            </ol>
          </>
        )}
        {!first && (
          <ul className="class-list">
            {classes.map((c) => (
              <li key={c._id}>
                <Link to={`/teach/${c._id}`} className="continue-item lift">
                  <span className="ct-icon">
                    <Users size={18} aria-hidden="true" />
                  </span>
                  <span className="grow">
                    <b>{c.name}</b>
                    <small className="soft">
                      {c.subject}, {c.level}. {t.learnersCount(c.learners)}
                      {c.waiting > 0 ? `. ${t.waitingCount(c.waiting)}` : ""}
                    </small>
                  </span>
                  <ChevronRight size={18} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {first || adding ? (
          <NewClassForm onCancel={first ? undefined : () => setAdding(false)} />
        ) : (
          <button type="button" className="pill ghost" onClick={() => setAdding(true)}>
            <Plus size={16} aria-hidden="true" /> {t.newClass}
          </button>
        )}
        {!first && <TeachOrgs />}
      </div>
    </AppShell>
  );
}

function NewClassForm({ onCancel }: { onCancel?: () => void }) {
  const t = copy.classes;
  const create = useMutation(api.classes.classes.createClass);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [syllabusId, setSyllabusId] = useState(SYLLABUSES[0].id);
  const [level, setLevel] = useState<string>(FORM_LEVELS[0]);
  const [error, setError] = useState<string | null>(null);
  const syllabus = SYLLABUSES.find((s) => s.id === syllabusId);
  return (
    <form
      className="panel stack"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        void create({ name, subject: syllabus?.subject ?? "", level, syllabusId: syllabus?.id })
          .then((id) => navigate(`/teach/${id}`))
          .catch((err: unknown) => setError(errorText(err, copy.errors.generic)));
      }}
    >
      <div className="field">
        <label htmlFor="class-name">{t.className}</label>
        <input id="class-name" type="text" maxLength={60} placeholder={t.classNameHint} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="class-syllabus">{t.syllabus}</label>
        <select id="class-syllabus" value={syllabusId} onChange={(e) => setSyllabusId(e.target.value)}>
          {SYLLABUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.board} {s.subject}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="class-level">{t.level}</label>
        <select id="class-level" value={level} onChange={(e) => setLevel(e.target.value)}>
          {FORM_LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button className="pill" type="submit">
          {t.create}
        </button>
        {onCancel !== undefined && (
          <button className="pill ghost" type="button" onClick={onCancel}>
            {copy.home.cancel}
          </button>
        )}
      </div>
    </form>
  );
}
