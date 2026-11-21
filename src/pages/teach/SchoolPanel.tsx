import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { errorText } from "../../access";
import { copy } from "../../copy/en";

/** A teacher's school: make one and share the staff code, or join one. Folded away until opened. */
export function SchoolPanel() {
  const t = copy.classes;
  const school = useQuery(api.classes.schools.mySchool);
  const createSchool = useMutation(api.classes.schools.createSchool);
  const joinSchool = useMutation(api.classes.schools.joinSchool);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fail = (err: unknown) => setError(errorText(err, copy.errors.generic));
  if (school === undefined) return null;
  return (
    <details className="panel">
      <summary>
        <b>{school?.name ?? t.schoolTitle}</b>
      </summary>
      {school === null ? (
        <div className="stack">
          <p className="soft">{t.schoolLine}</p>
          <form onSubmit={(e) => (e.preventDefault(), void createSchool({ name }).catch(fail))}>
            <div className="field">
              <label htmlFor="school-name">{t.schoolName}</label>
              <input id="school-name" type="text" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <button className="pill small" type="submit">
              {t.makeSchool}
            </button>
          </form>
          <form onSubmit={(e) => (e.preventDefault(), void joinSchool({ staffCode: code }).catch(fail))}>
            <div className="field">
              <label htmlFor="staff-code">{t.staffCode}</label>
              <input id="staff-code" type="text" autoCapitalize="characters" maxLength={12} value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <button className="pill small ghost" type="submit">
              {t.joinSchool}
            </button>
          </form>
        </div>
      ) : (
        <div className="stack">
          {school.staffCode !== null && <p className="code-line">{t.staffCodeShow(school.staffCode)}</p>}
          <h3>{t.staffTitle}</h3>
          <p className="soft">{school.staff.map((s) => s.name).join(", ")}</p>
          {school.isAdmin && school.classes.length > 0 && (
            <>
              <h3>{t.schoolClasses}</h3>
              <ul className="plain-list">
                {school.classes.map((c) => (
                  <li key={`${c.name}${c.teacher}`}>
                    {c.name}, {c.subject}, {c.teacher}: {t.learnersCount(c.learners)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </details>
  );
}
