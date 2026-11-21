import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { errorText } from "../access";
import { AppShell } from "../components/Layout";
import { copy } from "../copy/en";
import { OrgSearch } from "./OrgSearch";

/** The owner's page (ADMIN_EMAILS): organisations people added, waiting to be listed, checked or merged. */
export default function OwnerOrgs() {
  const t = copy.orgs;
  const owner = useQuery(api.organisations.owner.isOwner);
  if (owner === false) return <Navigate to="/" replace />;
  return (
    <AppShell title={t.ownerTitle}>
      <div className="page-narrow stack">
        <h1>{t.ownerTitle}</h1>
        <p className="soft">{t.ownerLine}</p>
        {owner === true && <TakudzidzaLink />}
        {owner === true ? <PendingList /> : <p className="app-loading">{copy.loading}</p>}
      </div>
    </AppShell>
  );
}

function PendingList() {
  const t = copy.orgs;
  const rows = useQuery(api.organisations.owner.pending);
  const [note, setNote] = useState<string | null>(null);
  if (rows === undefined) return <p className="app-loading">{copy.loading}</p>;
  return (
    <>
      {note !== null && (
        <p className="notice" role="status">
          {note}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="soft">{t.ownerEmpty}</p>
      ) : (
        <ul className="plain-list" aria-label={t.ownerTitle}>
          {rows.map((o) => (
            <PendingRow key={o._id} org={o} onMerged={(name) => setNote(t.merged(name))} />
          ))}
        </ul>
      )}
    </>
  );
}

type Pending = { _id: Id<"organisations">; name: string; type: keyof typeof copy.orgs.types; town: string; country: string; members: number; follows: number };

function PendingRow({ org, onMerged }: { org: Pending; onMerged: (name: string) => void }) {
  const t = copy.orgs;
  const setStatus = useMutation(api.organisations.owner.setStatus);
  const merge = useMutation(api.organisations.owner.merge);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fail = (err: unknown) => setError(errorText(err, copy.errors.generic));
  return (
    <li className="owner-row" aria-label={org.name}>
      <span>
        <b>{org.name}</b>
        <small className="soft" style={{ display: "block" }}>
          {t.types[org.type]}. {t.place(org.town, org.country)}. {t.ownerCounts(org.members, org.follows)}
        </small>
      </span>
      <div className="actions">
        <button type="button" className="pill small" onClick={() => void setStatus({ organisationId: org._id, status: "listed" }).catch(fail)}>
          {t.list}
        </button>
        <button type="button" className="pill small ghost" onClick={() => void setStatus({ organisationId: org._id, status: "verified" }).catch(fail)}>
          {t.verify}
        </button>
        <button type="button" className="pill small ghost" aria-expanded={merging} onClick={() => setMerging((m) => !m)}>
          {t.mergeInto}
        </button>
      </div>
      {merging && (
        <OrgSearch
          pickLabel={t.merge}
          onPick={(intoId, name) =>
            void merge({ fromId: org._id, intoId })
              .then(() => onMerged(name))
              .catch(fail)
          }
        />
      )}
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

/** The owner's own organisation, for course packs from material the owner uploads. */
function TakudzidzaLink() {
  const open = useMutation(api.organisations.owner.takudzidza);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="stack">
      <button type="button" className="pill small ghost" onClick={() => void open({}).then((id) => navigate(`/org/${id}`)).catch((err: unknown) => setError(errorText(err, copy.errors.generic)))}>
        {copy.packs.ownerOpen}
      </button>
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}