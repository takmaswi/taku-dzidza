import { Link } from "react-router";
import { Layout } from "../components/Layout";
import { copy } from "../copy/en";
import { legal } from "../copy/legal";

/** The privacy notice and terms: drafts until a lawyer has read them, and marked as drafts on the page. */
export default function Legal({ page }: { page: "privacy" | "terms" }) {
  const doc = legal[page];
  return (
    <Layout>
      <article className="narrow card stack legal">
        <p className="notice" role="note">
          <b>{legal.draftTitle}.</b> {legal.draftBody}
        </p>
        <h1>{doc.title}</h1>
        <p className="soft">{doc.lead}</p>
        {doc.sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.body.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </section>
        ))}
        <p className="actions">
          <Link to={page === "privacy" ? "/terms" : "/privacy"}>{page === "privacy" ? copy.legal.termsLink : copy.legal.privacyLink}</Link>
        </p>
      </article>
    </Layout>
  );
}
