import { useMutation, useQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { useParams } from "react-router";
import { api } from "../../convex/_generated/api";
import { errorText } from "../access";
import { Layout } from "../components/Layout";
import { copy } from "../copy/en";

/** The guardian's page, opened from the learner's link on the guardian's own phone. No sign in. */
export default function Consent() {
  const { token = "" } = useParams();
  const info = useQuery(api.accounts.consent.requestInfo, { token });
  const give = useMutation(api.accounts.consent.give);
  const withdraw = useMutation(api.accounts.consent.withdraw);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = copy.consent;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setBusy(true);
    try {
      await give({
        token,
        guardianName: String(form.get("guardianName") ?? ""),
        relationship: String(form.get("relationship") ?? ""),
        guardianContact: String(form.get("guardianContact") ?? ""),
        confirmsGuardian: form.get("confirmsGuardian") === "on",
        agrees: form.get("agrees") === "on",
      });
    } catch (e) {
      setError(errorText(e, copy.errors.generic));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <div className="narrow card stack">
        <h1>{t.title}</h1>
        {info === undefined && <p>{copy.loading}</p>}
        {info === null && <p>{t.expired}</p>}
        {info != null && info.state === "given" && (
          <>
            <p className="notice">{t.given}</p>
            <button className="pill ghost" type="button" onClick={() => void withdraw({ token }).catch((e) => setError(errorText(e, copy.errors.generic)))}>
              {t.withdraw}
            </button>
          </>
        )}
        {info != null && info.state === "withdrawn" && <p className="notice">{t.withdrawn}</p>}
        {info != null && info.state === "pending" && (
          <>
            <p>{t.intro(info.learnerName)}</p>
            <h2>{t.agreeTitle}</h2>
            <ul>
              {info.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <form onSubmit={submit}>
              <div className="field">
                <label htmlFor="guardianName">{t.guardianName}</label>
                <input id="guardianName" name="guardianName" type="text" autoComplete="name" required />
              </div>
              <div className="field">
                <label htmlFor="relationship">{t.relationship}</label>
                <input id="relationship" name="relationship" type="text" required />
                <small>{t.relationshipHint}</small>
              </div>
              <div className="field">
                <label htmlFor="guardianContact">{t.contact}</label>
                <input id="guardianContact" name="guardianContact" type="text" autoComplete="email" required />
              </div>
              <label className="check">
                <input type="checkbox" name="confirmsGuardian" required /> {t.confirmsGuardian}
              </label>
              <label className="check">
                <input type="checkbox" name="agrees" required /> {t.agrees}
              </label>
              {error !== null && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button className="pill" type="submit" disabled={busy}>
                {t.give}
              </button>
            </form>
          </>
        )}
        {error !== null && info?.state !== "pending" && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Layout>
  );
}
