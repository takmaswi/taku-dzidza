import { useMutation, useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { MemberRow } from "../../convex/organisations/admin";
import { errorText } from "../access";
import { AppShell } from "../components/Layout";
import { copy } from "../copy/en";
import { StaffPacks } from "../packs/OrgPacks";
import { OrgCodes } from "./OrgCodes";

type Role = "admin" | "teacher" | "learner" | "guardian";
const ROLES: Role[] = ["admin", "teacher", "learner", "guardian"];

/** /org/:organisationId/admin: an organisation's admins run it from here. Members, join codes, course packs and results; two columns on a wide screen, one on a phone. */
export default function OrgAdmin() {
  const { organisationId = "" } = useParams();
  const id = organisationId as Id<"organisations">;
  const t = copy.orgs;
  const org = useQuery(api.organisations.organisations.publicPage, { organisationId: id });
  return (
    <AppShell title={t.adminTitle}>
      <div className="page-wide stack">
        {org === undefined ? (
          <p className="app-loading">{copy.loading}</p>
        ) : org === null || org.role !== "admin" ? (
          <p className="soft">{t.notAdmin}</p>
        ) : (
          <>
            <Link to={`/org/${id}`} className="back-link">
              <ArrowLeft size={18} aria-hidden="true" /> {org.name}
            </Link>
            <h1>
              {org.name}: {t.adminTitle}
            </h1>
            <p className="soft">{t.adminLine}</p>
            <nav aria-label={t.adminSections} className="actions wrap admin-nav">
              <a href="#members" className="pill small ghost">
                {t.membersTitle}
              </a>
              <a href="#codes" className="pill small ghost">
                {t.codesTitle}
              </a>
              <a href="#staff-packs-title" className="pill small ghost">
                {copy.packs.title}
              </a>
              <a href="#results" className="pill small ghost">
                {t.resultsTitle}
              </a>
            </nav>
            <div className="admin-grid">
              <Members organisationId={id} />
              <OrgCodes organisationId={id} orgName={org.name} />
              <StaffPacks organisationId={id} />
              <Results organisationId={id} />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Members({ organisationId }: { organisationId: Id<"organisations"> }) {
  const t = copy.orgs;
  const members = useQuery(api.organisations.admin.members, { organisationId });
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  if (members === undefined) return null;
  return (
    <section className="panel stack" aria-labelledby="members-title" id="members">
      <h2 id="members-title">{t.membersTitle}</h2>
      <p className="soft">{t.membersLine}</p>
      {ROLES.map((role) => (
        <div key={role} className="stack-tight">
          <h3>
            {t.roleGroups[role]} <small className="soft">{members[role].length}</small>
          </h3>
          {members[role].length === 0 ? (
            <p className="soft small-text">{t.noneInRole}</p>
          ) : (
            <ul className="plain-list" aria-label={t.roleGroups[role]}>
              {members[role].map((m) => (
                <MemberItem key={m.membershipId} member={m} role={role} onNote={setNote} />
              ))}
            </ul>
          )}
        </div>
      ))}
      {note !== null && (
        <p className={note.ok ? "notice" : "error"} role={note.ok ? "status" : "alert"}>
          {note.text}
        </p>
      )}
    </section>
  );
}

function MemberItem({ member, role, onNote }: { member: MemberRow; role: Role; onNote: (n: { ok: boolean; text: string }) => void }) {
  const t = copy.orgs;
  const remove = useMutation(api.organisations.admin.removeMember);
  const makeAdmin = useMutation(api.organisations.admin.makeAdmin);
  const [asking, setAsking] = useState(false);
  const fail = (err: unknown) => onNote({ ok: false, text: errorText(err, copy.errors.generic) });
  return (
    <li className="member-row" aria-label={member.name}>
      <span className="grow">
        {member.name} {member.you && <small className="status-label soft">{t.you}</small>}
      </span>
      {!member.you && !asking && (
        <span className="actions">
          {role === "teacher" && member.adult && (
            <button
              type="button"
              className="pill small ghost"
              onClick={() =>
                void makeAdmin({ membershipId: member.membershipId })
                  .then(() => onNote({ ok: true, text: t.madeAdmin(member.name) }))
                  .catch(fail)
              }
            >
              {t.makeAdmin}
            </button>
          )}
          <button type="button" className="pill small ghost" onClick={() => setAsking(true)}>
            {t.remove}
          </button>
        </span>
      )}
      {asking && (
        <span className="stack-tight confirm-box">
          <span className="small-text">{t.removeAsk(member.name)}</span>
          <span className="actions">
            <button
              type="button"
              className="pill small"
              onClick={() =>
                void remove({ membershipId: member.membershipId })
                  .then(() => onNote({ ok: true, text: t.removed(member.name) }))
                  .catch(fail)
                  .finally(() => setAsking(false))
              }
            >
              {t.removeYes}
            </button>
            <button type="button" className="pill small ghost" onClick={() => setAsking(false)}>
              {t.cancel}
            </button>
          </span>
        </span>
      )}
    </li>
  );
}

function Results({ organisationId }: { organisationId: Id<"organisations"> }) {
  const t = copy.orgs;
  const results = useQuery(api.organisations.admin.results, { organisationId });
  if (results === undefined) return null;
  return (
    <section className="panel stack" aria-labelledby="results-title" id="results" data-testid="org-results">
      <h2 id="results-title">{t.resultsTitle}</h2>
      <p className="soft small-text">{t.resultsLine}</p>
      {results.topics.length === 0 ? (
        <p className="soft">{t.noResults}</p>
      ) : (
        <div className="table-scroll">
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
        </div>
      )}
      {results.classes.length > 0 && (
        <>
          <h3>{t.classesTitle}</h3>
          <div className="table-scroll">
            <table className="results-table" aria-label={t.classesTitle}>
              <thead>
                <tr>
                  <th scope="col">{t.classCol}</th>
                  <th scope="col">{t.teacherCol}</th>
                  <th scope="col">{t.scriptsCol}</th>
                  <th scope="col">{t.percentCol}</th>
                </tr>
              </thead>
              <tbody>
                {results.classes.map((c) => (
                  <tr key={c.classId}>
                    <td>{c.name}</td>
                    <td>{c.teacher}</td>
                    <td>{c.scripts}</td>
                    <td>{c.percent === null ? "" : t.percent(c.percent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
