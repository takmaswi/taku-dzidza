import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { AppShell } from "../components/Layout";
import { copy } from "../copy/en";

/** The seller terms in plain English (Step 9). A draft until a lawyer has read it. */
export default function SellerTerms() {
  const t = copy.market;
  return (
    <AppShell title={t.termsTitle}>
      <div className="page-narrow stack">
        <Link to="/market/sell" className="pill ghost small back-link">
          <ArrowLeft size={16} aria-hidden="true" /> {t.sellTitle}
        </Link>
        <h1>{t.termsTitle}</h1>
        <ol className="terms-list">
          {t.terms.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </div>
    </AppShell>
  );
}
