import { useMutation, useQuery } from "convex/react";
import { Copy, MessageCircle, QrCode as QrIcon } from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { joinLink, orgShareText, whatsAppLink } from "../../convex/classes/codes";
import { errorText } from "../access";
import { QrCode } from "../classes/shared";
import { copy } from "../copy/en";

/** An admin's join codes: the learner code (make a new one to stop the old), and staff codes to make or revoke. Each can be copied as a link, sent on WhatsApp or shown as a QR code. */
export function OrgCodes({ organisationId, orgName }: { organisationId: Id<"organisations">; orgName: string }) {
  const t = copy.orgs;
  const codes = useQuery(api.organisations.codes.codes, { organisationId });
  const makeCode = useMutation(api.organisations.codes.makeCode);
  const revokeCode = useMutation(api.organisations.codes.revokeCode);
  const newJoinCode = useMutation(api.organisations.codes.newJoinCode);
  const [error, setError] = useState<string | null>(null);
  const fail = (err: unknown) => setError(errorText(err, copy.errors.generic));
  if (codes === undefined) return null;
  return (
    <section className="panel stack" aria-labelledby="codes-title" id="codes">
      <h2 id="codes-title">{t.codesTitle}</h2>
      <p className="soft">{t.codesLine}</p>
      <p className="code-line" data-testid="learner-code">
        {t.learnerCode(codes.joinCode)}
      </p>
      <ShareCode code={codes.joinCode} text={orgShareText(orgName, window.location.origin, codes.joinCode, "learner")} />
      <button type="button" className="pill small ghost" onClick={() => void newJoinCode({ organisationId }).catch(fail)}>
        {t.newLearnerCode}
      </button>
      <h3>{t.staffCodes}</h3>
      {codes.staff.length === 0 ? (
        <p className="soft">{t.noStaffCodes}</p>
      ) : (
        <ul className="plain-list" aria-label={t.staffCodes}>
          {codes.staff.map((c) => (
            <li key={c._id} className="stack-tight code-item">
              <div className="org-row">
                <span className="grow code-line">{t.staffCode(c.code, t.roles[c.role])}</span>
                <button type="button" className="pill small ghost" aria-label={`${t.revoke} ${c.code}`} onClick={() => void revokeCode({ codeId: c._id }).catch(fail)}>
                  {t.revoke}
                </button>
              </div>
              <ShareCode code={c.code} text={orgShareText(orgName, window.location.origin, c.code, c.role)} />
            </li>
          ))}
        </ul>
      )}
      <div className="actions wrap">
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

/** Copy the join link, send it on WhatsApp, or show it as a QR code to scan from a board or a phone. */
function ShareCode({ code, text }: { code: string; text: string }) {
  const t = copy.orgs;
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState(false);
  const link = joinLink(window.location.origin, code);
  return (
    <div className="stack-tight">
      <div className="actions wrap">
        <button type="button" className="pill small ghost" aria-label={`${t.copyLink}: ${code}`} onClick={() => void navigator.clipboard?.writeText(link).then(() => setCopied(true))}>
          <Copy size={16} aria-hidden="true" /> {copied ? t.copied : t.copyLink}
        </button>
        <a className="pill small ghost" href={whatsAppLink(text)} target="_blank" rel="noreferrer" aria-label={`${t.whatsapp}: ${code}`}>
          <MessageCircle size={16} aria-hidden="true" /> {t.whatsapp}
        </a>
        <button type="button" className="pill small ghost" aria-expanded={qr} aria-label={`${qr ? t.hideQr : t.showQr}: ${code}`} onClick={() => setQr(!qr)}>
          <QrIcon size={16} aria-hidden="true" /> {qr ? t.hideQr : t.showQr}
        </button>
      </div>
      {qr && <QrCode text={link} label={t.qrLabel(code)} />}
    </div>
  );
}
