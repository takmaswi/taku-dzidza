import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, BookOpen, FileText } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { AppShell } from "../../components/Layout";
import { copy } from "../../copy/en";
import { OutputBody } from "../Output";

/** A class, for a learner in it: what the teacher shared, view only, and the work set. */
export default function LearnerClass() {
  const t = copy.classes;
  const { classId = "" } = useParams();
  const id = classId as Id<"classes">;
  const data = useQuery(api.classes.sharing.material, { classId: id });
  const leave = useMutation(api.classes.joining.leave);
  const navigate = useNavigate();
  if (data === undefined) {
    return (
      <AppShell title={t.homeClasses}>
        <p className="app-loading">{copy.loading}</p>
      </AppShell>
    );
  }
  return (
    <AppShell title={data.class.name}>
      <div className="page-narrow stack">
        <Link to="/" className="back-link">
          <ArrowLeft size={18} aria-hidden="true" /> {copy.nav.home}
        </Link>
        <h1>{data.class.name}</h1>
        <p className="soft">
          {data.class.subject}, {data.class.level}
        </p>
        <section className="panel stack" aria-labelledby="work">
          <h2 id="work">{t.classWork}</h2>
          {data.work.length === 0 ? (
            <p className="soft">{t.nothingYet}</p>
          ) : (
            <ul className="plain-list">
              {data.work.map((w) => (
                <li key={w.assignmentId} className="row-between">
                  <span>
                    <b>{w.title}</b> {w.score !== null && w.total !== null && <small className="soft">{t.yourScore(w.score, w.total)}</small>}
                  </span>
                  <Link to={`/class/${id}/a/${w.assignmentId}`} className="pill small">
                    {t.start}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel stack" aria-labelledby="material">
          <h2 id="material">{t.classMaterial}</h2>
          {data.notebooks.length === 0 && <p className="soft">{t.nothingYet}</p>}
          {data.notebooks.map((nb) => (
            <div key={nb.notebookId} className="stack-tight">
              <h3>
                <BookOpen size={16} aria-hidden="true" /> {nb.title}
              </h3>
              {nb.sources.length > 0 && <p className="soft small-text">{nb.sources.map((s) => s.title).join(", ")}</p>}
              <ul className="plain-list">
                {nb.outputs.map((o) => (
                  <li key={o.outputId}>
                    <Link to={`/class/${id}/o/${o.outputId}`} className="link">
                      <FileText size={14} aria-hidden="true" /> {o.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
        <button type="button" className="pill small ghost" onClick={() => void leave({ classId: id }).then(() => navigate("/"))}>
          {t.leave}
        </button>
      </div>
    </AppShell>
  );
}

/** One shared summary or mind map, read only. */
export function SharedOutput({ profile }: { profile: Doc<"profiles"> }) {
  const { classId = "", outputId = "" } = useParams();
  const data = useQuery(api.classes.sharing.sharedOutput, { classId: classId as Id<"classes">, outputId: outputId as Id<"outputs"> });
  return (
    <AppShell title={data?.output.title ?? copy.loading}>
      <div className="page-narrow stack">
        <Link to={`/class/${classId}`} className="back-link">
          <ArrowLeft size={18} aria-hidden="true" /> {copy.classes.classMaterial}
        </Link>
        {data === undefined ? <p className="soft">{copy.loading}</p> : <OutputBody output={data.output} titles={data.titles} notebookId="" readAloud={profile.accessibility.readAloud} />}
      </div>
    </AppShell>
  );
}
