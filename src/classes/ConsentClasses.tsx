import { useAction, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { errorText } from "../access";
import { copy } from "../copy/en";

type Request = { enrolmentId: Id<"enrolments">; className: string; subject: string; level: string; teacher: string; school: string | null };

/**
 * Class requests on the guardian's permission page. The learner holds this
 * link too, so each answer needs a fresh code sent to the phone the guardian
 * used when giving permission (convex/accounts/consent.ts, decideClass).
 */
export function ConsentClasses({ token, learnerName, requests }: { token: string; learnerName: string; requests: Request[] }) {
  const t = copy.classes;
  const sendCode = useAction(api.accounts.consent.sendApprovalCode);
  const decide = useMutation(api.accounts.consent.decideClass);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (requests.length === 0) return null;
  const answer = (enrolmentId: Id<"enrolments">, approve: boolean) => {
    setError(null);
    void decide({ token, enrolmentId, approve, code })
      .then((r) => {
        if (r.state === "wrong_code") setError(r.error ?? copy.errors.generic);
        else setCode("");
      })
      .catch((err: unknown) => setError(errorText(err, copy.errors.generic)));
  };
  return (
    <section className="stack" aria-labelledby="class-requests" data-testid="class-requests">
      <h2 id="class-requests">{t.consentClassTitle}</h2>
      <p>{t.consentClassLine(learnerName)}</p>
      <ul className="plain-list">
        {requests.map((r) => (
          <li key={r.enrolmentId} className="stack-tight">
            <span>
              <b>{r.className}</b> {r.subject}, {r.level}. {r.teacher}
              {r.school !== null ? `, ${r.school}` : ""}
            </span>
            {sent && (
              <div className="actions">
                <button type="button" className="pill small" onClick={() => answer(r.enrolmentId, true)}>
                  {t.approve}
                </button>
                <button type="button" className="pill small ghost" onClick={() => answer(r.enrolmentId, false)}>
                  {t.decline}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {!sent ? (
        <button type="button" className="pill small ghost" onClick={() => void sendCode({ token }).then((r) => (r.sent ? setSent(true) : setError(copy.consent.smsNotReady))).catch((err: unknown) => setError(errorText(err, copy.errors.generic)))}>
          {t.sendApproval}
        </button>
      ) : (
        <div className="field">
          <label htmlFor="approval-code">{t.approvalCode}</label>
          <small className="soft">{t.approvalCodeSent}</small>
          <input id="approval-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
      )}
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
