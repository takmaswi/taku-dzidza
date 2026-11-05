import { useAction, useMutation, useQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { api } from "../../convex/_generated/api";
import { errorText } from "../access";
import { Layout } from "../components/Layout";
import { copy } from "../copy/en";

/** The guardian's page, opened from the learner's link on the guardian's own phone. No sign in. Consent completes only with the code sent to their phone. */
export default function Consent() {
  const { token = "" } = useParams();
  const info = useQuery(api.accounts.consent.requestInfo, { token });
  const sendCode = useAction(api.accounts.consent.sendCode);
  const give = useMutation(api.accounts.consent.give);
  const withdraw = useMutation(api.accounts.consent.withdraw);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const t = copy.consent;

  const send = async (phone: string) => {
    setError(null);
    setBusy(true);
    try {
      const { sent } = await sendCode({ token, phone });
      if (sent) setCodeSent(true);
      else setError(t.smsFailed);
    } catch (e) {
      setError(errorText(e, copy.errors.generic));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const phone = String(form.get("guardianContact") ?? "");
    if (!codeSent) return void (await send(phone));
    setError(null);
    setBusy(true);
    try {
      const result = await give({
        token,
        guardianName: String(form.get("guardianName") ?? ""),
        relationship: String(form.get("relationship") ?? ""),
        guardianContact: phone,
        code: String(form.get("code") ?? ""),
        confirmsGuardian: form.get("confirmsGuardian") === "on",
        agrees: form.get("agrees") === "on",
      });
      if (result.error !== undefined) setError(result.error);
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
        {info != null && info.state === "pending" && !info.smsReady && <p className="notice">{t.smsNotReady}</p>}
        {info != null && info.state === "pending" && info.smsReady && (
          <>
            <p>{t.intro(info.learnerName)}</p>
            <h2>{t.agreeTitle}</h2>
            <ul>
              {info.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className="small-text">
              <Link to="/privacy">{copy.legal.privacyLink}</Link>
            </p>
            <form onSubmit={(e) => void submit(e)}>
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
                <input id="guardianContact" name="guardianContact" type="tel" autoComplete="tel" required />
                <small>{t.contactHint}</small>
              </div>
              <label className="check">
                <input type="checkbox" name="confirmsGuardian" required /> {t.confirmsGuardian}
              </label>
              <label className="check">
                <input type="checkbox" name="agrees" required /> {t.agrees}
              </label>
              {codeSent && (
                <div className="field">
                  <label htmlFor="code">{t.code}</label>
                  <input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required />
                  <small>{t.codeHint}</small>
                </div>
              )}
              {error !== null && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="actions">
                <button className="pill" type="submit" disabled={busy}>
                  {codeSent ? t.give : t.sendCode}
                </button>
                {codeSent && (
                  <button
                    className="link"
                    type="button"
                    disabled={busy}
                    onClick={(e) => {
                      const phone = new FormData(e.currentTarget.form ?? undefined).get("guardianContact");
                      void send(String(phone ?? ""));
                    }}
                  >
                    {t.resend}
                  </button>
                )}
              </div>
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
