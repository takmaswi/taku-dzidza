import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { PayMethod } from "../../convex/market/payments";
import { errorText } from "../access";
import { AppShell } from "../components/Layout";
import { copy } from "../copy/en";
import { dollars } from "./format";

/** Checkout (Step 9). Only the demo provider exists: a clear banner, a choice of method, and a button that succeeds or fails. */
export default function Checkout() {
  const t = copy.market;
  const { checkoutId } = useParams();
  const id = checkoutId as Id<"checkouts">;
  const c = useQuery(api.market.purchases.checkoutInfo, { checkoutId: id });
  const pay = useMutation(api.market.purchases.pay);
  const navigate = useNavigate();
  const [method, setMethod] = useState<PayMethod>("ecocash");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (c === undefined) return <AppShell title={t.checkoutTitle}><p className="app-loading">{copy.loading}</p></AppShell>;
  const run = (succeed: boolean) => {
    setBusy(true);
    setError(null);
    void pay({ checkoutId: id, method, succeed })
      .then((r) => (r.ok ? navigate(`/n/${r.notebookId}`) : setError(r.message)))
      .catch((err: unknown) => setError(errorText(err, copy.errors.generic)))
      .finally(() => setBusy(false));
  };
  const free = c.amountCents === 0;
  return (
    <AppShell title={t.checkoutTitle}>
      <div className="page-narrow stack">
        <Link to={`/market/l/${c.listingId}`} className="pill ghost small back-link">
          <ArrowLeft size={16} aria-hidden="true" /> {t.back}
        </Link>
        <h1>{t.checkoutTitle}</h1>
        {c.demo && !free && (
          <div className="demo-banner" role="note" data-testid="demo-banner">
            <TriangleAlert size={18} aria-hidden="true" />
            <div>
              <b>{t.demoBanner}</b>
              <p className="small-text">{t.demoLine}</p>
            </div>
          </div>
        )}
        <section className="panel stack-tight">
          <b>{c.title}</b>
          <span className="soft">{c.kind === "buy" ? t.kindBuy : t.kindRent(c.days ?? 0)}</span>
          <span>
            {t.total}: <b>{free ? t.free : dollars(c.amountCents)}</b>
          </span>
        </section>
        {c.status !== "open" ? (
          <p className="notice warn" role="status">
            {c.status === "failed" ? t.failedLine : t.paid}
          </p>
        ) : free ? (
          <button type="button" className="pill" disabled={busy} onClick={() => run(true)}>
            {t.getFree}
          </button>
        ) : (
          <>
            <fieldset className="stack-tight pay-methods">
              <legend>{t.payWith}</legend>
              {c.methods.map((m) => (
                <label key={m} className="check-row">
                  <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} />
                  <span>{t.methods[m]}</span>
                </label>
              ))}
            </fieldset>
            <div className="actions">
              <button type="button" className="pill" disabled={busy} onClick={() => run(true)}>
                {t.paySucceed}
              </button>
              <button type="button" className="pill ghost" disabled={busy} onClick={() => run(false)}>
                {t.payFail}
              </button>
            </div>
          </>
        )}
        {error !== null && c.status === "open" && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    </AppShell>
  );
}
