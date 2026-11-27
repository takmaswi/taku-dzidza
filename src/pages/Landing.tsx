import { ArrowRight, Check, ChevronDown, Plus, Search } from "lucide-react";
import { useLayoutEffect, type MouseEvent } from "react";
import { Link } from "react-router";
import { BrandMark } from "../components/BrandMark";
import { Layout } from "../components/Layout";
import { CurriculumStrip } from "../components/landing/CurriculumStrip";
import { HeroDemo } from "../components/landing/HeroDemo";
import { HowItWorks, SoonCard } from "../components/landing/HowItWorks";
import { LandingHeader } from "../components/landing/LandingHeader";
import { LandingPhoto } from "../components/landing/LandingPhoto";
import { isStill } from "../components/landing/motion";
import { MarketShelf } from "../components/landing/MarketShelf";
import { REGIONS, useRegion, type Region } from "../components/landing/useRegion";
import { ObjectArt } from "../components/ObjectArt";
import { useReveal } from "../components/useReveal";
import { copy } from "../copy/en";

/**
 * The study desk around the hero phone, seen from above: batch 6 photos
 * (art/BRIEF-batch-6-objects.md), the only objects on the page. Only the
 * first two stay on a phone.
 */
const DESK = ["highlighter", "tea-cup", "index-cards", "headphones"] as const;

const SIGN_UP = "/signin?mode=signUp";

/** "See how it works": glide to the demo (it sits under the text on a phone), or jump there with less motion. */
function seeItWork(e: MouseEvent<HTMLAnchorElement>) {
  const demo = document.getElementById("demo");
  if (demo === null) return;
  e.preventDefault();
  demo.scrollIntoView({ behavior: isStill() ? "auto" : "smooth", block: "center" });
}

/**
 * The public front door, for learners about 15 to 40, anywhere, in six
 * screens: the hero with its live tour, How Taku works as one story in five
 * chapters, the marketplace, schools, the FAQ and the final call. Copy is
 * copy.landing; styles are src/styles/landing.css.
 */
export default function Landing() {
  const t = copy.landing;
  const [region, setRegion] = useRegion();
  useReveal();
  useLayoutEffect(() => {
    // The real page is about to paint, so the prerendered copy (scripts/prerender.mjs) can go.
    document.getElementById("prerender")?.remove();
  }, []);
  return (
    <Layout top={<LandingHeader />} bleed white>
      <section className="l-hero" aria-labelledby="l-hero-title">
        <div className="l-wrap l-hero-grid">
          <div className="l-hero-text">
            <h1 id="l-hero-title">{t.hero.title}</h1>
            <p className="lead">{t.hero.lead}</p>
            <div className="actions">
              <Link to={SIGN_UP} className="pill">
                {t.hero.start} <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a href="#demo" className="pill ghost" onClick={seeItWork}>
                {t.hero.see}
              </a>
            </div>
            <ul className="l-quiet">
              {t.hero.quiet.map((q) => (
                <li key={q}>
                  <Check size={16} aria-hidden="true" />
                  {q}
                </li>
              ))}
            </ul>
          </div>
          <div id="demo" className="l-hero-demo">
            <HeroDemo
              desk={
                <span className="l-desk" aria-hidden="true">
                  {DESK.map((name) => (
                    <ObjectArt key={name} name={name} alt="" size={200} className={`l-desk-obj l-desk-${name}`} />
                  ))}
                </span>
              }
            />
          </div>
        </div>
      </section>

      <CurriculumStrip region={region} />

      <section id="learners" className="l-section l-story" aria-labelledby="l-story-title">
        <HowItWorks signUp={SIGN_UP} />
      </section>

      <section id="marketplace" className="l-section l-band reveal" aria-labelledby="l-market-title">
        <div className="l-wrap">
          <div className="mk-head">
            <div>
              <span className="eyebrow">{t.market.eyebrow}</span>
              <div className="l-photo-heading">
                <h2 id="l-market-title" className="l-h2">{t.market.title}</h2>
                <LandingPhoto slug="spot-earn-from-notes" sizes="88px" className="l-heading-photo" />
              </div>
              <p className="lead soft">{t.market.body}</p>
              <ul className="l-quiet mk-points">
                {t.market.points.map((p) => (
                  <li key={p}>
                    <Check size={16} aria-hidden="true" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="actions">
              <Link to={SIGN_UP} className="pill">
                {t.market.sell}
              </Link>
              <Link to={SIGN_UP} className="pill ghost">
                {t.market.browse}
              </Link>
            </div>
          </div>
          <div className="mk-search" role="img" aria-label={t.market.searchLabel}>
            <span className="mk-field">
              <Search size={18} aria-hidden="true" />
              {t.market.searchQuery}
            </span>
            <span className="mk-chips">
              {t.market.searchChips.map((c) => (
                <span key={c} className="mk-chip">
                  {c}
                </span>
              ))}
            </span>
            <span className="mk-results soft">{t.market.results}</span>
          </div>
          <MarketShelf />
          <div className="mk-foot">
            <SoonCard photo="spot-study-groups" title={t.market.groups.title} tag={t.market.groups.tag} line={t.market.groups.line} />
            <p className="mk-note soft small-text">{t.market.note}</p>
          </div>
        </div>
      </section>

      <section id="institutions" className="l-section reveal" aria-labelledby="l-inst-title">
        <div className="l-wrap l-split in-wrap">
          <div>
            <span className="eyebrow">{t.institutions.eyebrow}</span>
            <div className="l-photo-heading">
              <h2 id="l-inst-title" className="l-h2">{t.institutions.title}</h2>
              <LandingPhoto slug="spot-schools-institutions" sizes="88px" className="l-heading-photo" />
            </div>
            <div className="actions">
              <Link to={SIGN_UP} className="pill">
                {t.institutions.cta} <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div>
            <ul className="in-points">
              {t.institutions.points.map((p) => <li key={p}>{p}</li>)}
            </ul>
            <details className="in-more">
              <summary>
                {t.institutions.more}
                <ChevronDown size={18} aria-hidden="true" className="in-more-icon" />
              </summary>
              <ol>
                {t.institutions.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="soft">{t.institutions.consent}</p>
            </details>
          </div>
        </div>
      </section>

      <section className="l-section l-band reveal" aria-labelledby="l-faq-title">
        <div className="l-wrap l-narrow">
          <h2 id="l-faq-title" className="l-h2">
            {t.faq.title}
          </h2>
          <div className="l-faqs">
            {t.faq.items.map((f) => (
              <details key={f.q} className="l-faq">
                <summary>
                  {f.q}
                  <Plus size={20} aria-hidden="true" className="l-faq-icon" />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="l-final reveal" aria-labelledby="l-final-title">
        <div className="l-final-card">
          <span className="l-final-badge">
            <BrandMark variant="on-cream" className="l-final-mark" />
          </span>
          <h2 id="l-final-title" className="l-h2">
            {t.final.title}
          </h2>
          <p className="lead soft">{t.final.body}</p>
          <Link to={SIGN_UP} className="pill">
            {t.final.cta} <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="l-foot">
        <div className="l-wrap l-foot-row">
          <div className="l-foot-brand">
            <BrandMark variant="on-cream" className="l-foot-mark" />
            <span>{t.footer.line}</span>
          </div>
          <nav className="l-foot-links" aria-label={t.footer.links}>
            <Link to="/contact">{copy.menu.help}</Link>
            <Link to="/privacy">{copy.legal.privacyLink}</Link>
            <Link to="/terms">{copy.legal.termsLink}</Link>
          </nav>
          <label className="l-region">
            <span>{t.footer.region}</span>
            <select value={region} onChange={(e) => setRegion(e.target.value as Region)}>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {t.footer.regions[r]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </footer>
    </Layout>
  );
}
