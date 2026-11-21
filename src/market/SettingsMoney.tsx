import { useQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "../../convex/_generated/api";
import { useFlags } from "../classes/flags";
import { copy } from "../copy/en";
import { day, dollars } from "./format";

/**
 * Settings > Money while MARKETPLACE_MODE is on (Step 9). Everyone: what they
 * bought and rented, with expiry dates and receipts. Sellers: owed, pending,
 * paid out, and every sale. Adults who do not sell yet get "Become a seller".
 */
export function SettingsMoney() {
  const flags = useFlags();
  if (!flags.market) return null;
  return <Money />;
}

function Money() {
  const t = copy.market;
  const me = useQuery(api.market.sellers.me);
  const seller = useQuery(api.market.money.seller);
  const purchases = useQuery(api.market.purchases.mine);
  const owner = useQuery(api.market.money.isOwner);
  return (
    <section className="panel stack" aria-label={t.moneyTitle} data-testid="settings-money">
      <h2>{t.moneyTitle}</h2>
      <p className="soft small-text">{t.moneyLine}</p>
      {seller != null && (
        <div className="stack-tight">
          <dl className="money-grid">
            <div>
              <dt>{t.balanceOwed}</dt>
              <dd data-testid="balance-owed">{dollars(seller.owedCents)}</dd>
            </div>
            <div>
              <dt>{t.pending}</dt>
              <dd data-testid="balance-pending">{dollars(seller.pendingCents)}</dd>
            </div>
            <div>
              <dt>{t.paidOut}</dt>
              <dd data-testid="balance-paid">{dollars(seller.paidCents)}</dd>
            </div>
          </dl>
          <h3>{t.yourSales}</h3>
          {seller.sales.length === 0 && <p className="soft small-text">{t.noSales}</p>}
          <ul className="plain-list small-text" aria-label={t.yourSales}>
            {seller.sales.map((s) => (
              <li key={s._id}>
                <b>{s.title}</b>, {s.kind === "buy" ? t.kindBuy : t.kindRent(s.days ?? 0)}, {dollars(s.sellerCents)} {s.status === "refund" ? `(${t.refunded})` : ""}, {day(s.createdAt)}
              </li>
            ))}
          </ul>
          {seller.payouts.length > 0 && (
            <>
              <h3>{t.payouts}</h3>
              <ul className="plain-list small-text">
                {seller.payouts.map((p) => (
                  <li key={p._id}>
                    {dollars(p.amountCents)}, {p.paidOn}, {p.reference}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      {me !== undefined && me.canSell && me.seller === null && (
        <Link to="/market/sell" className="pill small ghost">
          {t.becomeSeller}
        </Link>
      )}
      <h3>{t.yourPurchases}</h3>
      {purchases !== undefined && purchases.length === 0 && <p className="soft small-text">{t.noPurchases}</p>}
      <ul className="plain-list" aria-label={t.yourPurchases}>
        {(purchases ?? []).map((p) => (
          <li key={p._id} className="purchase-row">
            <span>
              {p.notebookId !== null && p.state === "active" ? <Link to={`/n/${p.notebookId}`}>{p.title}</Link> : <b>{p.title}</b>}
              <small className="soft">
                {" "}
                {p.kind === "buy" ? t.kindBuy : t.kindRent(p.days ?? 0)}, {p.state === "active" ? t.active : p.state === "ended" ? t.ended : t.refunded}
                {p.endsAt !== null && p.state === "active" ? ` ${t.until(day(p.endsAt))}` : ""}
              </small>
            </span>
            <details>
              <summary>{t.receipt}</summary>
              <p className="small-text">
                {p.title}. {p.amountCents === 0 ? t.free : dollars(p.amountCents)}. {t.receiptLine(p.reference, t.methods[p.method as keyof typeof t.methods] ?? p.method, day(p.createdAt))}
              </p>
            </details>
          </li>
        ))}
      </ul>
      {owner === true && (
        <Link to="/owner/market" className="pill small ghost">
          {t.ownerLink}
        </Link>
      )}
    </section>
  );
}
