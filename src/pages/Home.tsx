import { Link } from "react-router";
import type { Doc } from "../../convex/_generated/dataModel";
import { ImageSlot } from "../components/ImageSlot";
import { Layout } from "../components/Layout";
import { copy } from "../copy/en";

/** The dashboard shell. Notebooks arrive in Phase 2, the plan in Phase 4 (SPEC.md section 8). */
export default function Home({ profile }: { profile: Doc<"profiles"> }) {
  const t = copy.home;
  const style = copy.styles[profile.studyStyle];
  return (
    <Layout signedIn>
      <div className="stack">
        <div>
          <h1>{t.hello(profile.displayName)}</h1>
          <p className="soft lead">{t.lead}</p>
        </div>
        <div className="grid two">
          <div className="card warm stack">
            <h2>{t.notebooksTitle}</h2>
            <p className="soft">{t.notebooksBody}</p>
            <ImageSlot slug="empty-notebook" alt="Hands photographing a textbook page with a phone" />
          </div>
          <div className="grid">
            <div className="card">
              <h2>{t.planTitle}</h2>
              <p className="soft">{t.planBody}</p>
            </div>
            <div className="card">
              <h2>{t.styleTitle}</h2>
              <p>
                <b>{style.name}</b>
              </p>
              <p className="soft">{style.line}</p>
              <Link to="/settings" className="pill ghost small">
                {t.change}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
