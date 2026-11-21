import { useAction, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { Navigate } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { errorText } from "../access";
import { AppShell } from "../components/Layout";
import { copy } from "../copy/en";
import { day, dollars, parseDollars, toCsv } from "./format";

/** The owner's marketplace page (ADMIN_EMAILS): approvals, reports, money owed, refunds and the ledger. */
export default function OwnerMarket() {
  const t = copy.market;
  const owner = useQuery(api.market.money.isOwner);
  if (owner === false) return <Navigate to="/" replace />;
  return (
    <AppShell title={t.ownerTitle}>
      <div className="page stack">
        <h1>{t.ownerTitle}</h1>
        {owner === true ? <OwnerParts /> : <p className="app-loading">{copy.loading}</p>}
      </div>
    </AppShell>
  );
}

function OwnerParts() {
  return (
    <>
        <Queue />
        <Reports />
        <Owed />
        <Refunds />
        <LedgerCsv />
    </>
  );
}

function useError() {
  const [error, setError] = useState<string | null>(null);
  const fail = (err: unknown) => setError(errorText(err, copy.errors.generic));
  const shown = error === null ? null : <p className="error" role="alert">{error}</p>;
  return { fail, shown, clear: () => setError(null) };
}

function Queue() {
  const t = copy.market;
  const rows = useQuery(api.market.publish.queue);
  // Kept here: an approved listing leaves the queue, and its row with it.
  const [note, setNote] = useState<string | null>(null);
  if (rows === undefined) return <p className="app-loading">{copy.loading}</p>;
  return (
    <section className="panel stack" aria-label={t.queue}>
      <h2>{t.queue}</h2>
      {note !== null && (
        <p className="notice" role="status">
          {note}
        </p>
      )}
      {rows.length === 0 && <p className="soft">{t.queueEmpty}</p>}
      {rows.map((r) => (
        <QueueRow key={r._id} row={r} onNote={setNote} />
      ))}
    </section>
  );
}

type QueueRowData = FunctionReturnType<typeof api.market.publish.queue>[number];

function QueueRow({ row, onNote }: { row: QueueRowData; onNote: (note: string) => void }) {
  const t = copy.market;
  const approve = useAction(api.market.publish.approve);
  const reject = useMutation(api.market.publish.reject);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const { fail, shown, clear } = useError();
  return (
    <article className="owner-item stack-tight" aria-label={row.title}>
      <b>
        {row.title} {row.newVersion && <span className="tag">{t.newVersionTag}</span>}
      </b>
      <span className="soft small-text">
        {[row.subject, row.level, row.exam].filter((s) => s !== "").join(", ")}. {t.by(row.seller)}
      </span>
      {row.flag !== null && <p className="notice warn">{t.flagged(row.flag)}</p>}
      <p className="small-text">{row.description}</p>
      {row.sources.map((s) => (
        <details key={s.title}>
          <summary>
            {s.title} ({s.pages})
          </summary>
          <p className="small-text pre-wrap">{s.firstPage}</p>
        </details>
      ))}
      <div className="actions">
        <button
          type="button"
          className="pill small"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            clear();
            void approve({ listingId: row._id })
              .then((r) => (r.ok ? onNote(r.adultsOnly ? t.approvedAdults : t.approvedAll) : fail({ data: r.message })))
              .catch(fail)
              .finally(() => setBusy(false));
          }}
        >
          {t.approve}
        </button>
      </div>
      <div className="field">
        <label htmlFor={`reject-${row._id}`}>{t.rejectReason}</label>
        <input id={`reject-${row._id}`} type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <button type="button" className="pill small ghost" disabled={busy} onClick={() => void reject({ listingId: row._id, reason }).catch(fail)}>
        {t.reject}
      </button>
      {shown}
    </article>
  );
}

function Reports() {
  const t = copy.market;
  const rows = useQuery(api.market.reports.open);
  const decide = useMutation(api.market.reports.decide);
  const { fail, shown } = useError();
  if (rows === undefined) return null;
  return (
    <section className="panel stack" aria-label={t.reportsTitle}>
      <h2>{t.reportsTitle}</h2>
      {rows.length === 0 && <p className="soft">{t.reportsEmpty}</p>}
      {rows.map((r) => (
        <article key={r.listingId} className="owner-item stack-tight" aria-label={r.title}>
          <b>{r.title}</b>
          <span className="soft small-text">{t.by(r.seller)}</span>
          <ul className="plain-list small-text">
            {r.reports.map((x) => (
              <li key={x.createdAt}>
                {t.reasons[x.reason as keyof typeof t.reasons]}
                {x.note !== "" ? `: ${x.note}` : ""}
              </li>
            ))}
          </ul>
          <div className="actions">
            <button type="button" className="pill small ghost" onClick={() => void decide({ listingId: r.listingId, decision: "restored" }).catch(fail)}>
              {t.restore}
            </button>
            <button type="button" className="pill small danger" onClick={() => void decide({ listingId: r.listingId, decision: "removed" }).catch(fail)}>
              {t.remove}
            </button>
          </div>
        </article>
      ))}
      {shown}
    </section>
  );
}

function Owed() {
  const t = copy.market;
  const rows = useQuery(api.market.money.owed);
  if (rows === undefined) return null;
  return (
    <section className="panel stack" aria-label={t.owedTitle}>
      <h2>{t.owedTitle}</h2>
      {rows.length === 0 && <p className="soft">{t.owedEmpty}</p>}
      {rows.map((r) => (
        <PayRow key={r.sellerId} row={r} />
      ))}
    </section>
  );
}

function PayRow({ row }: { row: { sellerId: Id<"sellers">; name: string; payoutNumber: string; deleted: boolean; owedCents: number; pendingCents: number; paidCents: number } }) {
  const t = copy.market;
  const markPaid = useMutation(api.market.money.markPaid);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const { fail, shown, clear } = useError();
  return (
    <article className="owner-item stack-tight" aria-label={row.name}>
      <b>
        {row.name} {row.deleted && <span className="tag">{t.deletedSeller}</span>}
      </b>
      <span className="small-text">{row.payoutNumber}</span>
      <span className="small-text">
        {t.balanceOwed}: <b>{dollars(row.owedCents)}</b>. {t.pending}: {dollars(row.pendingCents)}. {t.paidOut}: {dollars(row.paidCents)}
      </span>
      {row.owedCents > 0 && (
        <form
          className="pay-form"
          onSubmit={(e) => {
            e.preventDefault();
            clear();
            const cents = parseDollars(amount);
            void markPaid({ sellerId: row.sellerId, amountCents: cents === undefined || Number.isNaN(cents) ? 0 : cents, paidOn, reference })
              .then(() => (setAmount(""), setReference("")))
              .catch(fail);
          }}
        >
          <div className="field">
            <label htmlFor={`amount-${row.sellerId}`}>{t.amount}</label>
            <input id={`amount-${row.sellerId}`} type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor={`paid-${row.sellerId}`}>{t.paidOn}</label>
            <input id={`paid-${row.sellerId}`} type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor={`ref-${row.sellerId}`}>{t.reference}</label>
            <input id={`ref-${row.sellerId}`} type="text" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <button type="submit" className="pill small">
            {t.markPaid}
          </button>
        </form>
      )}
      {shown}
    </article>
  );
}

function Refunds() {
  const t = copy.market;
  const rows = useQuery(api.market.money.refundable);
  const refund = useMutation(api.market.money.refund);
  const { fail, shown } = useError();
  if (rows === undefined) return null;
  return (
    <section className="panel stack" aria-label={t.refundsTitle}>
      <h2>{t.refundsTitle}</h2>
      {rows.length === 0 && <p className="soft">{t.refundsEmpty}</p>}
      <ul className="plain-list">
        {rows.map((r) => (
          <li key={r.purchaseId} className="row-between">
            <span className="small-text">
              <b>{r.title}</b>, {r.buyer}, {dollars(r.amountCents)}, {day(r.createdAt)}, {r.reference}
            </span>
            <button type="button" className="pill small ghost" aria-label={`${t.refund}: ${r.title}, ${r.buyer}`} onClick={() => void refund({ purchaseId: r.purchaseId }).catch(fail)}>
              {t.refund}
            </button>
          </li>
        ))}
      </ul>
      {shown}
    </section>
  );
}

function LedgerCsv() {
  const t = copy.market;
  const rows = useQuery(api.market.money.ledger);
  if (rows === undefined) return null;
  const csv = toCsv(rows.map((r) => ({ date: r.date, buyer: r.buyer, listing: r.listing, seller: r.seller, amount: (r.amountCents / 100).toFixed(2), commission: (r.commissionCents / 100).toFixed(2), sellerShare: (r.sellerCents / 100).toFixed(2), provider: r.provider, status: r.status })));
  const href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  return (
    <a className="pill ghost" href={href} download="takudzidza-ledger.csv">
      {t.ledgerCsv}
    </a>
  );
}
