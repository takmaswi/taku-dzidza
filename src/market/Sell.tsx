import { useAction, useMutation, useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { RENT_DAYS } from "../../convex/market/rules";
import { errorText } from "../access";
import { AppShell } from "../components/Layout";
import { copy } from "../copy/en";
import { centsText, parseDollars } from "./format";

/** Selling notes (Step 9): becoming a seller, then listings made from the seller's notebooks and sent for approval. */
export default function Sell() {
  const t = copy.market;
  const me = useQuery(api.market.sellers.me);
  return (
    <AppShell title={t.sellTitle}>
      <div className="page-narrow stack">
        <Link to="/market" className="pill ghost small back-link">
          <ArrowLeft size={16} aria-hidden="true" /> {t.title}
        </Link>
        <h1>{t.sellTitle}</h1>
        <p className="soft">{t.sellLine}</p>
        {me === undefined && <p className="app-loading">{copy.loading}</p>}
        {me !== undefined && !me.canSell && <p className="notice">{t.adultsOnlySell}</p>}
        {me !== undefined && me.canSell && me.seller === null && <BecomeSeller />}
        {me?.seller != null && <Listings />}
        <p className="small-text">
          <Link to="/market/terms">{t.readTerms}</Link>
        </p>
      </div>
    </AppShell>
  );
}

export function BecomeSeller() {
  const t = copy.market;
  const become = useMutation(api.market.sellers.become);
  const [realName, setRealName] = useState("");
  const [number, setNumber] = useState("");
  const [rights, setRights] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="panel stack"
      aria-label={t.becomeTitle}
      onSubmit={(e) => {
        e.preventDefault();
        void become({ realName, payoutNumber: number, rights }).catch((err: unknown) => setError(errorText(err, copy.errors.generic)));
      }}
    >
      <h2>{t.becomeTitle}</h2>
      <p className="soft small-text">{t.becomeLine}</p>
      <div className="field">
        <label htmlFor="seller-name">{t.realName}</label>
        <input id="seller-name" type="text" autoComplete="name" maxLength={80} value={realName} onChange={(e) => setRealName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="seller-number">{t.payoutNumber}</label>
        <input id="seller-number" type="tel" inputMode="tel" autoComplete="tel" value={number} onChange={(e) => setNumber(e.target.value)} />
      </div>
      <label className="check-row">
        <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} />
        <span>{t.rightsTick}</span>
      </label>
      <button type="submit" className="pill">
        {t.become}
      </button>
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

type Row = NonNullable<ReturnType<typeof useMine>>["listings"][number];
function useMine() {
  return useQuery(api.market.listings.mine);
}

function Listings() {
  const t = copy.market;
  const mine = useMine();
  const [adding, setAdding] = useState(false);
  if (mine === undefined) return <p className="app-loading">{copy.loading}</p>;
  return (
    <div className="stack">
      {mine.listings.map((l) => (
        <ListingRow key={l._id} listing={l} />
      ))}
      {adding ? (
        <ListingForm notebooks={mine.notebooks} onDone={() => setAdding(false)} />
      ) : (
        <button type="button" className="pill" onClick={() => setAdding(true)}>
          {t.newListing}
        </button>
      )}
    </div>
  );
}

type Form = { notebookId: string; title: string; subject: string; level: string; exam: string; description: string; previewCount: number; buy: string; d7: string; d30: string; d90: string };

function emptyForm(notebookId: string): Form {
  return { notebookId, title: "", subject: "", level: "", exam: "", description: "", previewCount: 1, buy: "", d7: "", d30: "", d90: "" };
}

function formOf(l: Row): Form {
  return { notebookId: "", title: l.title, subject: l.subject, level: l.level, exam: l.exam, description: l.description, previewCount: l.previewCount, buy: centsText(l.buyCents), d7: centsText(l.rentCents?.d7), d30: centsText(l.rentCents?.d30), d90: centsText(l.rentCents?.d90) };
}

/** The form's prices as cents, or an error to show. */
function pricesOf(f: Form): { previewCount: number; buyCents?: number; rentCents?: { d7?: number; d30?: number; d90?: number } } | string {
  const buy = parseDollars(f.buy);
  const rent = { d7: parseDollars(f.d7), d30: parseDollars(f.d30), d90: parseDollars(f.d90) };
  if ([buy, rent.d7, rent.d30, rent.d90].some((n) => n !== undefined && Number.isNaN(n))) return copy.market.priceFormat;
  const rentCents = Object.fromEntries(Object.entries(rent).filter(([, c]) => c !== undefined));
  return { previewCount: f.previewCount, ...(buy === undefined ? {} : { buyCents: buy }), ...(Object.keys(rentCents).length === 0 ? {} : { rentCents }) };
}

function Fields({ form, set, prefix }: { form: Form; set: (f: Form) => void; prefix: string }) {
  const t = copy.market;
  const field = (key: "title" | "subject" | "level" | "exam", label: string) => (
    <div className="field">
      <label htmlFor={`${prefix}-${key}`}>{label}</label>
      <input id={`${prefix}-${key}`} type="text" value={form[key]} onChange={(e) => set({ ...form, [key]: e.target.value })} />
    </div>
  );
  return (
    <>
      {field("title", t.listingTitle)}
      {field("subject", t.subject)}
      {field("level", t.level)}
      {field("exam", t.exam)}
      <div className="field">
        <label htmlFor={`${prefix}-description`}>{t.description}</label>
        <textarea id={`${prefix}-description`} rows={4} maxLength={1200} value={form.description} onChange={(e) => set({ ...form, description: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-preview`}>{t.previewCount}</label>
        <select id={`${prefix}-preview`} value={form.previewCount} onChange={(e) => set({ ...form, previewCount: Number(e.target.value) })}>
          {[0, 1, 2, 3].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-buy`}>{t.buyPrice}</label>
        <input id={`${prefix}-buy`} type="text" inputMode="decimal" value={form.buy} onChange={(e) => set({ ...form, buy: e.target.value })} />
      </div>
      {RENT_DAYS.map((days) => {
        const key = `d${days}` as "d7" | "d30" | "d90";
        return (
          <div className="field" key={days}>
            <label htmlFor={`${prefix}-${key}`}>{t.rentPrice(days)}</label>
            <input id={`${prefix}-${key}`} type="text" inputMode="decimal" value={form[key]} onChange={(e) => set({ ...form, [key]: e.target.value })} />
          </div>
        );
      })}
      <p className="soft small-text">{t.blankNotOffered}</p>
      <p className="small-text not-allowed">{t.notAllowed}</p>
    </>
  );
}

function ListingForm({ notebooks, onDone }: { notebooks: { _id: Id<"notebooks">; title: string }[]; onDone: () => void }) {
  const t = copy.market;
  const create = useMutation(api.market.listings.create);
  const [form, setForm] = useState<Form>(() => emptyForm(notebooks[0]?._id ?? ""));
  const [error, setError] = useState<string | null>(null);
  if (notebooks.length === 0) return <p className="soft">{t.noNotebooks}</p>;
  return (
    <form
      className="panel stack"
      aria-label={t.newListing}
      onSubmit={(e) => {
        e.preventDefault();
        const prices = pricesOf(form);
        if (typeof prices === "string") return setError(prices);
        void create({ notebookId: form.notebookId as Id<"notebooks">, title: form.title, subject: form.subject, level: form.level, exam: form.exam, description: form.description, ...prices })
          .then(onDone)
          .catch((err: unknown) => setError(errorText(err, copy.errors.generic)));
      }}
    >
      <h2>{t.newListing}</h2>
      <div className="field">
        <label htmlFor="l-notebook">{t.fromNotebook}</label>
        <select id="l-notebook" value={form.notebookId} onChange={(e) => setForm({ ...form, notebookId: e.target.value })}>
          {notebooks.map((n) => (
            <option key={n._id} value={n._id}>
              {n.title}
            </option>
          ))}
        </select>
      </div>
      <Fields form={form} set={setForm} prefix="new" />
      <button type="submit" className="pill">
        {t.create}
      </button>
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function ListingRow({ listing: l }: { listing: Row }) {
  const t = copy.market;
  const edit = useMutation(api.market.listings.edit);
  const setOpen = useMutation(api.market.listings.setOpen);
  const submit = useAction(api.market.publish.submit);
  const [form, setForm] = useState<Form>(() => formOf(l));
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fail = (err: unknown) => setError(errorText(err, copy.errors.generic));
  const live = l.status === "live";
  const words = { title: form.title, subject: form.subject, level: form.level, exam: form.exam, description: form.description };
  const save = async (): Promise<boolean> => {
    const prices = pricesOf(form);
    if (typeof prices === "string") {
      setError(prices);
      return false;
    }
    await edit({ listingId: l._id, ...words, ...prices });
    return true;
  };
  const send = () => {
    setBusy(true);
    setError(null);
    setNote(t.sending);
    void save()
      .then(async (ok) => {
        if (!ok) return setNote(null);
        const r = await submit({ listingId: l._id, rights, ...(live ? { details: words } : {}) });
        if (r.ok) setNote(t.sent);
        else {
          setNote(null);
          setError(r.message);
        }
      })
      .catch((err: unknown) => {
        setNote(null);
        fail(err);
      })
      .finally(() => setBusy(false));
  };
  return (
    <section className="panel stack" aria-label={l.title} data-testid="seller-listing">
      <div className="row-between">
        <h2>{l.title}</h2>
        <span className="tag">{l.waiting ? t.waiting : l.closed ? t.closed : t.statuses[l.status]}</span>
      </div>
      <p className="soft small-text">
        {l.version > 0 ? `${t.version(l.version)}. ` : ""}
        {t.salesCount(l.sales)}
        {l.adultsOnly ? `. ${t.adultsOnly}` : ""}
      </p>
      {l.note !== null && (
        <p className="notice" role="status">
          {l.note}
        </p>
      )}
      {l.status !== "removed" && (
        <>
          <Fields form={form} set={setForm} prefix={l._id} />
          {live && <p className="soft small-text">{t.newWords}</p>}
          <div className="actions">
            <button type="button" className="pill small ghost" disabled={busy} onClick={() => void save().catch(fail)}>
              {t.save}
            </button>
          </div>
          <label className="check-row">
            <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} />
            <span>{t.rightsTick}</span>
          </label>
          <div className="actions">
            <button type="button" className="pill" disabled={busy || l.publishing} onClick={send}>
              {live ? t.submitNew : t.submit}
            </button>
            {live && (
              <button type="button" className="pill small ghost" onClick={() => void setOpen({ listingId: l._id, open: l.closed }).catch(fail)}>
                {l.closed ? t.sellAgain : t.stopSelling}
              </button>
            )}
          </div>
        </>
      )}
      {note !== null && (
        <p className="notice" role="status">
          {note}
        </p>
      )}
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
