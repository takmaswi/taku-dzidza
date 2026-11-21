import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useParams } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { errorText } from "../access";
import { AppShell } from "../components/Layout";
import { copy } from "../copy/en";
import { PublishedPacks, StaffPacks } from "../packs/OrgPacks";
import { OrgCodes } from "./OrgCodes";

/** An organisation's public page: who it is, follow or stop following, its published course packs, and, for its teachers and admins, making packs and the join codes. */
export default function OrgPage() {
  const { organisationId } = useParams();
  const t = copy.orgs;
  return (
    <AppShell title={t.settingsTitle}>
      <div className="page-narrow stack">
        <OrgDetail organisationId={organisationId as Id<"organisations">} />
      </div>
    </AppShell>
  );
}

function OrgDetail({ organisationId }: { organisationId: Id<"organisations"> }) {
  const t = copy.orgs;
  const org = useQuery(api.organisations.organisations.publicPage, { organisationId });
  const follow = useMutation(api.organisations.organisations.follow);
  const unfollow = useMutation(api.organisations.organisations.unfollow);
  const leave = useMutation(api.organisations.organisations.leave);
  const [error, setError] = useState<string | null>(null);
  const fail = (err: unknown) => setError(errorText(err, copy.errors.generic));
  if (org === undefined) return <p className="app-loading">{copy.loading}</p>;
  if (org === null) return <p className="soft">{t.pageNotFound}</p>;
  return (
    <>
      <h1>{org.name}</h1>
      <p className="soft">
        {t.types[org.type]}. {t.place(org.town, org.country)}
      </p>
      <p>
        {org.status === "pending" && <span className="tag">{t.pendingTag}</span>} {org.status === "verified" && <span className="tag">{t.verifiedTag}</span>}
      </p>
      {org.role !== null ? (
        <div className="actions">
          <p>{t.yourRole(t.roles[org.role])}</p>
          <button type="button" className="pill small ghost" onClick={() => void leave({ organisationId }).catch(fail)}>
            {t.leave}
          </button>
        </div>
      ) : org.following ? (
        <div className="stack">
          <p className="soft">{t.followLine}</p>
          <button type="button" className="pill small ghost" onClick={() => void unfollow({ organisationId }).catch(fail)}>
            {t.unfollow}
          </button>
        </div>
      ) : (
        <div className="stack">
          <p className="soft">{t.followLine}</p>
          <button type="button" className="pill small" onClick={() => void follow({ organisationId }).catch(fail)}>
            {t.follow}
          </button>
        </div>
      )}
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <PublishedPacks organisationId={organisationId} />
      {(org.role === "teacher" || org.role === "admin") && <StaffPacks organisationId={organisationId} />}
      {org.role === "admin" && <OrgCodes organisationId={organisationId} />}
    </>
  );
}
