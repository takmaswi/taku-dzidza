import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import { errorText } from "../../access";
import { AppShell } from "../../components/Layout";
import { copy } from "../../copy/en";

/**
 * A guardian's family page. Add a child (a one time code they type in their
 * own account), give permission once while signed in, then answer class
 * requests with one tap.
 */
export default function Family() {
  const t = copy.classes;
  const family = useQuery(api.classes.guardians.family);
  const createCode = useMutation(api.classes.guardians.createChildCode);
  const consentLink = useMutation(api.classes.guardians.consentLink);
  const decide = useMutation(api.classes.guardians.decide);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [made, setMade] = useState<{ name: string; code: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fail = (err: unknown) => setError(errorText(err, copy.errors.generic));
  return (
    <AppShell title={t.familyPage}>
      <div className="page-narrow stack">
        <h1>{t.familyPage}</h1>
        {family?.children.map((c) => (
          <section key={c.childProfileId} className="panel stack" data-testid="child">
            <h2>{c.firstName}</h2>
            {(c.consentState === "pending" || c.consentState === "withdrawn") && (
              <>
                <p className="soft">{t.consentNote}</p>
                <button type="button" className="pill small" onClick={() => void consentLink({ childProfileId: c.childProfileId }).then(({ token }) => navigate(`/consent/${token}`)).catch(fail)}>
                  {t.giveConsent}
                </button>
              </>
            )}
            {c.consentState === "given" && !c.decides && <p className="soft">{t.consentElsewhere}</p>}
            {c.decides && (
              <>
                <h3>{t.requestsTitle}</h3>
                {c.requests.length === 0 ? (
                  <p className="soft">{t.noRequests}</p>
                ) : (
                  <ul className="plain-list">
                    {c.requests.map((r) => (
                      <li key={r.enrolmentId} className="stack-tight">
                        <span>
                          <b>{r.className}</b> {r.subject}, {r.level}. {r.teacher}
                          {r.school !== null ? `, ${r.school}` : ""}
                        </span>
                        <div className="actions">
                          <button type="button" className="pill small" onClick={() => void decide({ enrolmentId: r.enrolmentId, approve: true }).catch(fail)}>
                            {t.approve}
                          </button>
                          <button type="button" className="pill small ghost" onClick={() => void decide({ enrolmentId: r.enrolmentId, approve: false }).catch(fail)}>
                            {t.decline}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        ))}
        <section className="panel stack">
          <h2>{t.addChild}</h2>
          <p className="soft">{t.addChildLine}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              void createCode({ firstName: name })
                .then(({ code }) => (setMade({ name, code }), setName("")))
                .catch(fail);
            }}
          >
            <div className="field">
              <label htmlFor="child-name">{t.childName}</label>
              <input id="child-name" type="text" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <button className="pill small" type="submit">
              {t.makeCode}
            </button>
          </form>
          {made !== null && (
            <p className="notice" data-testid="child-code">
              {t.codeFor(made.name, made.code)}
            </p>
          )}
          {family !== undefined && family.codes.length > 0 && (
            <p className="soft small-text">
              {t.openCodes}: {family.codes.map((c) => c.firstName).join(", ")}
            </p>
          )}
        </section>
        {error !== null && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    </AppShell>
  );
}
