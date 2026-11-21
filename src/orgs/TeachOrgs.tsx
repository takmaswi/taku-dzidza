import { useQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "../../convex/_generated/api";
import { copy } from "../copy/en";
import { OrgCodeBox } from "./OrgCodeBox";

/** On the Teach page: the organisations this teacher teaches at, and a box for a staff code. Folded away until opened. */
export function TeachOrgs() {
  const t = copy.orgs;
  const mine = useQuery(api.organisations.organisations.mine);
  if (mine === undefined) return null;
  const staff = mine.members.filter((m) => m.role === "teacher" || m.role === "admin");
  return (
    <details className="panel">
      <summary>
        <b>{staff.length === 1 ? staff[0].name : t.teachTitle}</b>
      </summary>
      <div className="stack">
        {staff.length > 0 && (
          <ul className="plain-list" aria-label={t.teachTitle}>
            {staff.map((o) => (
              <li key={o._id}>
                <Link to={`/org/${o._id}`}>
                  <b>{o.name}</b>
                </Link>{" "}
                <small className="soft">{t.memberAs(t.roles[o.role])}</small>
              </li>
            ))}
          </ul>
        )}
        <p className="soft">{t.teachLine}</p>
        <OrgCodeBox id="staff-code" />
      </div>
    </details>
  );
}
