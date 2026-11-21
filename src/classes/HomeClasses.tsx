import { useQuery } from "convex/react";
import { ChevronRight, Heart, Presentation, Users } from "lucide-react";
import { Link } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { copy } from "../copy/en";
import { useFlags } from "./flags";

/** Home: classes a learner is in, the teacher's classes, and the family page. Nothing shows until it is used. */
export function HomeClasses({ profile }: { profile: Doc<"profiles"> }) {
  const t = copy.classes;
  const flags = useFlags();
  const roles = profile.roles ?? [];
  const mine = useQuery(api.classes.joining.mine, flags.teacher ? {} : "skip");
  if (!flags.teacher) return null;
  const teaches = roles.includes("teacher");
  const guards = roles.includes("guardian");
  if ((mine ?? []).length === 0 && !teaches && !guards) return null;
  return (
    <section className="home-section" aria-labelledby="home-classes">
      <h2 id="home-classes">{t.homeClasses}</h2>
      <div className="continue-list">
        {(mine ?? []).map((c) =>
          c.status === "approved" ? (
            <Link key={c.classId} to={`/class/${c.classId}`} className="continue-item lift">
              <span className="ct-icon">
                <Users size={18} aria-hidden="true" />
              </span>
              <span className="grow">
                <b>{c.name}</b>
                <small className="soft">
                  {c.subject}, {c.teacher}
                </small>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          ) : (
            <div key={c.classId} className="continue-item">
              <span className="ct-icon">
                <Users size={18} aria-hidden="true" />
              </span>
              <span className="grow">
                <b>{c.name}</b>
                <small className="soft">{t.waitingTag}</small>
              </span>
            </div>
          ),
        )}
        {teaches && (
          <Link to="/teach" className="continue-item lift">
            <span className="ct-icon">
              <Presentation size={18} aria-hidden="true" />
            </span>
            <span className="grow">
              <b>{t.homeTeach}</b>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        )}
        {guards && (
          <Link to="/family" className="continue-item lift">
            <span className="ct-icon">
              <Heart size={18} aria-hidden="true" />
            </span>
            <span className="grow">
              <b>{t.familyPage}</b>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}
