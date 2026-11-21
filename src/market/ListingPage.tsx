import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Flag, Star } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { errorText } from "../access";
import { AppShell } from "../components/Layout";
import { MathText } from "../components/MathText";
import { Sheet } from "../components/ui";
import { copy } from "../copy/en";
import { day, dollars } from "./format";

/** A listing (Step 9): previews, author, sales, ratings and reviews, prices, Buy, Rent and Report. */
export default function ListingPage() {
  const t = copy.market;
  const { listingId } = useParams();
  const id = listingId as Id<"listings">;
  const l = useQuery(api.market.listings.page, { listingId: id });
  const checkout = useMutation(api.market.purchases.checkout);
  const openNotebook = useMutation(api.market.purchases.openNotebook);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const start = (kind: "buy" | "rent", days?: number) =>
    void checkout({ listingId: id, kind, ...(days === undefined ? {} : { days }) })
      .then((checkoutId) => navigate(`/market/checkout/${checkoutId}`))
      .catch((err: unknown) => setError(errorText(err, copy.errors.generic)));
  if (l === undefined) return <AppShell title={t.title}><p className="app-loading">{copy.loading}</p></AppShell>;
  return (
    <AppShell title={t.title}>
      <div className="page stack listing-page">
        <Link to="/market" className="pill ghost small back-link">
          <ArrowLeft size={16} aria-hidden="true" /> {t.title}
        </Link>
        <header className="stack-tight">
          <h1>{l.title}</h1>
          <p className="soft">{[l.subject, l.level, l.exam].filter((s) => s !== "").join(", ")}</p>
          <p>
            {t.by(l.author)}. {t.sales(l.sales)}. {l.stars !== null ? t.stars(l.stars, l.ratingCount) : t.noReviews}
          </p>
          {l.adultsOnly && <span className="tag">{t.adultsOnly}</span>}
        </header>
        <div className="listing-grid">
          <div className="stack">
            <p className="listing-description">{l.description}</p>
            <section className="panel stack-tight">
              <h2>{t.whatYouGet}</h2>
              <p className="soft small-text">{t.whatYouGetLine}</p>
              {l.paperLabel !== null && <p className="small-text paper-label">{l.paperLabel}</p>}
            </section>
            {l.previews.length > 0 && (
              <section className="stack-tight" aria-label={t.preview}>
                <h2>{t.preview}</h2>
                {l.previews.map((p) => (
                  <figure key={`${p.title}-${p.page}`} className="preview-page" onCopy={(e) => e.preventDefault()}>
                    <figcaption className="soft small-text">{t.previewPage(p.title, p.page)}</figcaption>
                    <div className="reader-text">
                      <MathText text={p.text} />
                    </div>
                  </figure>
                ))}
              </section>
            )}
            <Reviews listingId={id} reviews={l.reviews} canReview={l.canReview} />
          </div>
          <aside className="panel stack buy-box" aria-label={t.checkoutTitle}>
            {l.access !== null && (
              <p className="notice" role="status">
                {l.access.kind === "buy" ? t.owned : t.renting(day(l.access.endsAt ?? 0))}
              </p>
            )}
            {l.access !== null && (
              <button type="button" className="pill" onClick={() => void openNotebook({ listingId: id }).then((nid) => navigate(`/n/${nid}`)).catch((err: unknown) => setError(errorText(err, copy.errors.generic)))}>
                {t.openNotebook}
              </button>
            )}
            {l.hidden && <p className="soft">{t.hiddenNote}</p>}
            {!l.forSale && !l.hidden && l.access === null && <p className="soft">{t.notForSale}</p>}
            {l.forSale && !l.isSeller && l.access?.kind !== "buy" && (
              <div className="stack-tight">
                {l.buyCents !== null && (
                  <button type="button" className="pill" onClick={() => start("buy")}>
                    {l.buyCents === 0 ? t.getFree : t.buy(dollars(l.buyCents))}
                  </button>
                )}
                {l.access === null &&
                  l.rent.map((r) => (
                    <button key={r.days} type="button" className="pill ghost" onClick={() => start("rent", r.days)}>
                      {t.rent(r.days, dollars(r.cents))}
                    </button>
                  ))}
              </div>
            )}
            {error !== null && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {!l.isSeller && (
              <button type="button" className="pill small ghost" onClick={() => setReporting(true)}>
                <Flag size={15} aria-hidden="true" /> {t.report}
              </button>
            )}
            {reported && (
              <p className="notice" role="status">
                {t.reported}
              </p>
            )}
          </aside>
        </div>
      </div>
      {reporting && (
        <ReportSheet
          listingId={id}
          onClose={() => setReporting(false)}
          onSent={() => {
            setReporting(false);
            setReported(true);
          }}
        />
      )}
    </AppShell>
  );
}

const REASONS = ["copyright", "exam_paper", "wrong", "harmful"] as const;

function ReportSheet({ listingId, onClose, onSent }: { listingId: Id<"listings">; onClose: () => void; onSent: () => void }) {
  const t = copy.market;
  const report = useMutation(api.market.reports.report);
  const [reason, setReason] = useState<(typeof REASONS)[number]>("copyright");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <Sheet title={t.reportTitle} onClose={onClose} testId="report-sheet">
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void report({ listingId, reason, note })
            .then(onSent)
            .catch((err: unknown) => setError(errorText(err, copy.errors.generic)));
        }}
      >
        <p className="soft small-text">{t.reportLine}</p>
        <fieldset className="stack-tight">
          <legend className="sr-only">{t.reportTitle}</legend>
          {REASONS.map((r) => (
            <label key={r} className="check-row">
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />
              <span>{t.reasons[r]}</span>
            </label>
          ))}
        </fieldset>
        <div className="field">
          <label htmlFor="report-note">{t.reportNote}</label>
          <textarea id="report-note" rows={3} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button type="submit" className="pill">
          {t.sendReport}
        </button>
        {error !== null && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
}

function Reviews({ listingId, reviews, canReview }: { listingId: Id<"listings">; reviews: { _id: Id<"reviews">; stars: number; text: string; by: string; createdAt: number }[]; canReview: boolean }) {
  const t = copy.market;
  const post = useMutation(api.market.reports.review);
  const [stars, setStars] = useState(5);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <section className="stack-tight" aria-label={t.reviewsTitle}>
      <h2>{t.reviewsTitle}</h2>
      {reviews.length === 0 && <p className="soft">{t.noReviews}</p>}
      <ul className="plain-list">
        {reviews.map((r) => (
          <li key={r._id} className="review">
            <b>
              <Star size={13} aria-hidden="true" /> {r.stars}/5
            </b>{" "}
            {r.text} <small className="soft">{r.by}</small>
          </li>
        ))}
      </ul>
      {canReview && (
        <form
          className="panel stack-tight"
          onSubmit={(e) => {
            e.preventDefault();
            void post({ listingId, stars, text }).catch((err: unknown) => setError(errorText(err, copy.errors.generic)));
          }}
        >
          <h3>{t.writeReview}</h3>
          <div className="field">
            <label htmlFor="review-stars">{t.starsLabel}</label>
            <select id="review-stars" value={stars} onChange={(e) => setStars(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="review-text">{t.reviewText}</label>
            <textarea id="review-text" rows={2} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <button type="submit" className="pill small">
            {t.sendReview}
          </button>
          {error !== null && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
