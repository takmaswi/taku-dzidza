import { useQuery } from "convex/react";
import { Search, Star, Store } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AppShell } from "../components/Layout";
import { copy } from "../copy/en";
import { dollars } from "./format";

/** The marketplace tab (Step 9): search with filters, or the Popular, New and For your exam sections. */

type Card = { _id: Id<"listings">; title: string; subject: string; level: string; exam: string; author: string; sales: number; stars: number | null; reviews: number; from: number | null };

const PRICE_OPTIONS = [
  { value: "", label: copy.market.anyPrice },
  { value: "0", label: copy.market.free },
  { value: "200", label: copy.market.under("$2") },
  { value: "500", label: copy.market.under("$5") },
  { value: "1000", label: copy.market.under("$10") },
] as const;

export default function Market() {
  const t = copy.market;
  const [typed, setTyped] = useState("");
  const [text, setText] = useState("");
  const [price, setPrice] = useState("");
  const [offer, setOffer] = useState<"" | "buy" | "rent">("");
  const [stars, setStars] = useState("");
  const data = useQuery(api.market.listings.browse, {
    ...(text.trim() === "" ? {} : { text }),
    ...(price === "" ? {} : { maxCents: Number(price) }),
    ...(offer === "" ? {} : { offer }),
    ...(stars === "" ? {} : { minStars: Number(stars) }),
  });
  return (
    <AppShell title={t.title}>
      <div className="page stack market">
        <div className="market-head">
          <div>
            <h1>{t.title}</h1>
            <p className="soft">{t.line}</p>
          </div>
          <Link to="/market/sell" className="pill small ghost">
            <Store size={16} aria-hidden="true" /> {t.sell}
          </Link>
        </div>
        <form
          className="market-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setText(typed);
          }}
        >
          <label htmlFor="market-search" className="sr-only">
            {t.search}
          </label>
          <input id="market-search" type="search" placeholder={t.search} value={typed} onChange={(e) => setTyped(e.target.value)} />
          <button type="submit" className="pill small">
            <Search size={16} aria-hidden="true" /> {t.searchButton}
          </button>
        </form>
        <div className="market-filters" role="group" aria-label={t.filters}>
          <label>
            <span className="sr-only">{t.price}</span>
            <select aria-label={t.price} value={price} onChange={(e) => setPrice(e.target.value)}>
              {PRICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">{t.offer}</span>
            <select aria-label={t.offer} value={offer} onChange={(e) => setOffer(e.target.value as "" | "buy" | "rent")}>
              <option value="">{t.anyOffer}</option>
              <option value="buy">{t.buyOnly}</option>
              <option value="rent">{t.rentOnly}</option>
            </select>
          </label>
          <label>
            <span className="sr-only">{t.rating}</span>
            <select aria-label={t.rating} value={stars} onChange={(e) => setStars(e.target.value)}>
              <option value="">{t.anyRating}</option>
              <option value="4">{t.stars4}</option>
            </select>
          </label>
        </div>
        {data === undefined && <p className="app-loading">{copy.loading}</p>}
        {data !== undefined && data.results !== null && (
          <section aria-label={t.results(data.results.length)}>
            <p className="soft small-text" role="status">
              {t.results(data.results.length)}
            </p>
            {data.results.length === 0 ? <p className="soft">{t.noResults}</p> : <Cards cards={data.results} />}
          </section>
        )}
        {data !== undefined && data.results === null && (
          <>
            {data.fresh.length === 0 && <p className="soft">{t.empty}</p>}
            <Section title={t.forExam} cards={data.forExam} />
            <Section title={t.popular} cards={data.popular} />
            <Section title={t.fresh} cards={data.fresh} />
          </>
        )}
        <p className="small-text">
          <Link to="/market/terms">{t.sellerTerms}</Link>
        </p>
      </div>
    </AppShell>
  );
}

function Section({ title, cards }: { title: string; cards: Card[] }) {
  if (cards.length === 0) return null;
  return (
    <section aria-label={title}>
      <h2>{title}</h2>
      <Cards cards={cards} />
    </section>
  );
}

function Cards({ cards }: { cards: Card[] }) {
  const t = copy.market;
  return (
    <ul className="listing-cards">
      {cards.map((c) => (
        <li key={c._id}>
          <Link to={`/market/l/${c._id}`} className="listing-card">
            <b>{c.title}</b>
            <span className="soft small-text">{[c.subject, c.level, c.exam].filter((s) => s !== "").join(", ")}</span>
            <span className="small-text">{t.by(c.author)}</span>
            <span className="listing-meta small-text">
              {c.stars !== null ? (
                <span>
                  <Star size={13} aria-hidden="true" /> {t.stars(c.stars, c.reviews)}
                </span>
              ) : (
                <span className="soft">{t.noReviews}</span>
              )}
              <span>{t.sales(c.sales)}</span>
            </span>
            {c.from !== null && <span className="listing-price">{c.from === 0 ? t.free : t.from(dollars(c.from))}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
