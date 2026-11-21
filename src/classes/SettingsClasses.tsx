import { useMutation } from "convex/react";
import { Link } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { useSettling } from "../components/hooks";
import { Switch } from "../components/Switch";
import { copy } from "../copy/en";
import { useFlags } from "./flags";
import { GuardianCodeForm } from "./shared";

/** Settings while TEACHER_MODE is on: adults switch on teaching or open the family page; under 18s link a guardian's code. Codes for classes go in the box under "Where you study" (src/orgs). */
export function SettingsClasses({ profile, adult }: { profile: Doc<"profiles">; adult: boolean }) {
  const t = copy.classes;
  const flags = useFlags();
  const setTeaching = useMutation(api.classes.roles.setTeaching);
  const [teaches, toggleTeaching] = useSettling((profile.roles ?? []).includes("teacher"), (on) => setTeaching({ on }));
  if (!flags.teacher) return null;
  return (
    <>
      {adult ? (
        <section className="panel stack" aria-labelledby="teaching">
          <h2 id="teaching">{t.teachTitle}</h2>
          <div className="toggle-row">
            <label htmlFor="r-teach" style={{ margin: 0 }}>
              {t.teachSwitch}
              <small className="soft" style={{ display: "block", fontWeight: 400 }}>
                {t.teachLine}
              </small>
            </label>
            <Switch id="r-teach" label={t.teachSwitch} checked={teaches} onChange={toggleTeaching} />
          </div>
          {teaches && (
            <Link to="/teach" className="pill small">
              {t.openTeach}
            </Link>
          )}
          <h3>{t.familyTitle}</h3>
          <p className="soft">{t.familyLine}</p>
          <Link to="/family" className="pill small ghost">
            {t.openFamily}
          </Link>
        </section>
      ) : (
        <section className="panel stack">
          <GuardianCodeForm />
        </section>
      )}
    </>
  );
}
