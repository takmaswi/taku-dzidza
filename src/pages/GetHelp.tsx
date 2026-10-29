import { Phone } from "lucide-react";
import { Layout } from "../components/Layout";
import { copy } from "../copy/en";

/**
 * Get help (SPEC.md 3.13). Public and always one tap away. Only numbers
 * verified from an official or reputable source are listed: Childline
 * Zimbabwe 116 (UNICEF Zimbabwe; findahelpline.com, checked 29 October 2026).
 */
export default function GetHelp() {
  const t = copy.help;
  return (
    <Layout>
      <div className="narrow stack">
        <div>
          <h1>{t.title}</h1>
          <p className="lead">{t.lead}</p>
        </div>
        <section className="card warm">
          <h2>{t.under18Title}</h2>
          <p className="help-number">{t.childline}</p>
          <p>{t.childlineLine}</p>
          <a className="pill" href="tel:116">
            <Phone size={18} aria-hidden="true" /> {t.callChildline}
          </a>
        </section>
        <section className="card">
          <h2>{t.everyoneTitle}</h2>
          <p>{t.danger}</p>
          <p>{t.talk}</p>
          <p className="soft">{t.taku}</p>
        </section>
      </div>
    </Layout>
  );
}
