import { useQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "../../convex/_generated/api";
import { useFlags } from "../classes/flags";
import { copy } from "../copy/en";
import { OrgCodeBox } from "./OrgCodeBox";
import { OrgSearch } from "./OrgSearch";
import { SetUpOrg } from "./SetUpOrg";

/** Settings while TEACHER_MODE is on: where you belong, what you follow, a code box, search, and for adults, setting one up. */
export function SettingsOrgs({ adult }: { adult: boolean }) {
  const t = copy.orgs;
  const flags = useFlags();
  if (!flags.teacher) return null;
  return (
    <section className="panel stack" aria-labelledby="orgs-title">
      <h2 id="orgs-title">{t.settingsTitle}</h2>
      <p className="soft">{t.settingsLine}</p>
      <MyOrgs />
      <OrgCodeBox />
      <OrgSearch />
      {adult && <SetUpOrg />}
      <OwnerLink />
    </section>
  );
}

export function MyOrgs() {
  const t = copy.orgs;
  const mine = useQuery(api.organisations.organisations.mine);
  if (mine === undefined || (mine.members.length === 0 && mine.follows.length === 0)) return null;
  return (
    <div className="stack">
      <h3>{t.mineTitle}</h3>
      <ul className="plain-list" aria-label={t.mineTitle}>
        {mine.members.map((o) => (
          <li key={o._id} className="org-row">
            <span className="grow">
              <Link to={`/org/${o._id}`}>
                <b>{o.name}</b>
              </Link>
              <small className="soft">
                {t.memberAs(t.roles[o.role])}
                {o.status === "pending" ? `. ${t.pendingTag}` : ""}
              </small>
            </span>
          </li>
        ))}
        {mine.follows.map((o) => (
          <li key={o._id} className="org-row">
            <span className="grow">
              <Link to={`/org/${o._id}`}>
                <b>{o.name}</b>
              </Link>
              <small className="soft">
                {t.followingTag}
                {o.status === "pending" ? `. ${t.pendingTag}` : ""}
              </small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OwnerLink() {
  const owner = useQuery(api.organisations.owner.isOwner);
  if (owner !== true) return null;
  return (
    <Link to="/owner/organisations" className="pill small ghost">
      {copy.orgs.ownerLink}
    </Link>
  );
}
