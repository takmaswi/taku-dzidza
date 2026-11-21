import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { errorText } from "../access";
import { copy } from "../copy/en";

/** An admin's join codes: the learner code (make a new one to stop the old), and staff codes to make or revoke. */
export function OrgCodes({ organisationId }: { organisationId: Id<"organisations"> }) {
  const t = copy.orgs;
  const codes = useQuery(api.organisations.codes.codes, { organisationId });
  const makeCode = useMutation(api.organisations.codes.makeCode);
  const revokeCode = useMutation(api.organisations.codes.revokeCode);
  const newJoinCode = useMutation(api.organisations.codes.newJoinCode);
  const [error, setError] = useState<string | null>(null);
  const fail = (err: unknown) => setError(errorText(err, copy.errors.generic));
  if (codes === undefined) return null;
  return (
    <section className="panel stack" aria-labelledby="codes-title">
      <h2 id="codes-title">{t.codesTitle}</h2>
      <p className="soft">{t.codesLine}</p>
      <p className="code-line" data-testid="learner-code">
        {t.learnerCode(codes.joinCode)}
      </p>
      <button type="button" className="pill small ghost" onClick={() => void newJoinCode({ organisationId }).catch(fail)}>
        {t.newLearnerCode}
      </button>
      <h3>{t.staffCodes}</h3>
      {codes.staff.length === 0 ? (
        <p className="soft">{t.noStaffCodes}</p>
      ) : (
        <ul className="plain-list" aria-label={t.staffCodes}>
          {codes.staff.map((c) => (
            <li key={c._id} className="org-row">
              <span className="grow code-line">{t.staffCode(c.code, t.roles[c.role])}</span>
              <button type="button" className="pill small ghost" aria-label={`${t.revoke} ${c.code}`} onClick={() => void revokeCode({ codeId: c._id }).catch(fail)}>
                {t.revoke}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="actions">
        <button type="button" className="pill small" onClick={() => void makeCode({ organisationId, role: "teacher" }).catch(fail)}>
          {t.makeTeacherCode}
        </button>
        <button type="button" className="pill small ghost" onClick={() => void makeCode({ organisationId, role: "admin" }).catch(fail)}>
          {t.makeAdminCode}
        </button>
      </div>
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
