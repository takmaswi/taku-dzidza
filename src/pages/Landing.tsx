import { Link } from "react-router";
import { ImageSlot } from "../components/ImageSlot";
import { Layout } from "../components/Layout";
import { copy } from "../copy/en";

export default function Landing() {
  const t = copy.landing;
  return (
    <Layout>
      <section className="hero">
        <div>
          <h1>{t.title}</h1>
          <p className="lead soft">{t.lead}</p>
          <ul>
            {t.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <div className="actions">
            <Link to="/signin?mode=signUp" className="pill">
              {t.start}
            </Link>
            <Link to="/signin" className="pill ghost">
              {t.signIn}
            </Link>
          </div>
        </div>
        <ImageSlot slug="dashboard-hero-university" alt="Two university students revising together from a shared textbook in a library" />
      </section>
    </Layout>
  );
}
