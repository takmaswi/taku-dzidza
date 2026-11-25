import { ArrowRight, BookOpen, ClipboardCheck, EyeOff, KeyRound, LifeBuoy, Plus, ShieldCheck, Smartphone } from "lucide-react";
import { useLayoutEffect, type MouseEvent } from "react";
import { Link } from "react-router";
import { Scene } from "../components/Art";
import { BrandMark } from "../components/BrandMark";
import { Layout } from "../components/Layout";
import { CiteDemo } from "../components/landing/CiteDemo";
import { CurriculumStrip } from "../components/landing/CurriculumStrip";
import { DropAnything } from "../components/landing/DropAnything";
import { HeroDemo } from "../components/landing/HeroDemo";
import { LandingHeader } from "../components/landing/LandingHeader";
import { isStill } from "../components/landing/motion";
import { ListenDemo } from "../components/landing/ListenDemo";
import { MarketShelf } from "../components/landing/MarketShelf";
import { ModeSwitcher } from "../components/landing/ModeSwitcher";
import { ToolBento } from "../components/landing/ToolBento";
import { REGIONS, useRegion, type Region } from "../components/landing/useRegion";
import { ObjectArt, type ObjectArtName } from "../components/ObjectArt";
import { useReveal } from "../components/useReveal";
import { copy } from "../copy/en";

/**
 * Every object on the landing page, in one place: batch 6 photos
 * (art/BRIEF-batch-6-objects.md). People stay out of the sections; they
 * appear once, in the people section.
 */
const ART: Record<"drop" | "tools" | "market" | "listen" | "institutions" | "safe", ObjectArtName> = {
  drop: "speech-bubble",
  tools: "lamp",
  market: "star-medal",
  listen: "headphones",
  institutions: "key",
  safe: "open-book",
};
/** The study desk around the hero phone, seen from above. Only the first two stay on a phone. */
const DESK = ["highlighter", "tea-cup", "index-cards", "headphones"] as const;

const SIGN_UP = "/signin?mode=signUp";
const INSTITUTION_ICONS = [KeyRound, BookOpen, ClipboardCheck] as const;
const SAFE_ICONS = [ShieldCheck, EyeOff, Smartphone] as const;

/** "See it work": glide to the demo (it sits under the text on a phone), or jump there with less motion. */
function seeItWork(e: MouseEvent<HTMLAnchorElement>) {
  const demo = document.getElementById("demo");
  if (demo === null) return;
  e.preventDefault();
  demo.scrollIntoView({ behavior: isStill() ? "auto" : "smooth", block: "center" });
}

/**
 * The public front door, for learners about 15 to 40, anywhere: a live demo in
 * the hero, then each feature shown working. Copy is copy.landing; styles are
 * src/styles/landing.css.
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
            <p className="eyebrow l-eyebrow">
              <span>
                {copy.appName} {copy.byline}
              </span>
              <span>{t.hero.eyebrow}</span>
            </p>
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
            <p className="l-quiet">{t.hero.quiet}</p>
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

      <section className="l-section l-people reveal" aria-labelledby="l-people-title">
        <div className="l-wrap">
          <h2 id="l-people-title" className="l-h2">
            {t.people.title}
          </h2>
          <Scene slug="landing-people" alt={t.people.alt} sizes="(min-width: 1240px) 1160px, 92vw" className="l-people-photo" />
        </div>
      </section>

      <CurriculumStrip region={region} />

      <section id="learners" className="l-section reveal" aria-labelledby="l-drop-title">
        <DropAnything art={<ObjectArt name={ART.drop} alt="" size={240} className="l-obj" />} />
      </section>

      <section className="l-section l-band reveal" aria-labelledby="l-cite-title">
        <div className="l-wrap l-split">
          <div>
            <span className="eyebrow">{t.cite.eyebrow}</span>
            <h2 id="l-cite-title" className="l-h2">
              {t.cite.title}
            </h2>
            <p className="lead soft">{t.cite.body}</p>
          </div>
          <CiteDemo />
        </div>
      </section>

      <section className="l-section reveal" aria-labelledby="l-tools-title">
        <ToolBento art={<ObjectArt name={ART.tools} alt="" size={220} className="l-obj" />} />
      </section>

      <section className="l-section l-band reveal" aria-labelledby="l-modes-title">
        <div className="l-wrap">
          <div className="ms-intro">
            <span className="eyebrow">{t.modes.eyebrow}</span>
            <h2 id="l-modes-title" className="l-h2">
              {t.modes.title}
            </h2>
            <p className="lead soft">{t.modes.body}</p>
          </div>
          <ModeSwitcher />
        </div>
      </section>

      <section id="marketplace" className="l-section reveal" aria-labelledby="l-market-title">
        <div className="l-wrap">
          <div className="l-split mk-head">
            <div>
              <span className="eyebrow">{t.market.eyebrow}</span>
              <h2 id="l-market-title" className="l-h2">
                {t.market.title}
              </h2>
              <p className="lead soft">{t.market.body}</p>
              <div className="actions">
                <Link to={SIGN_UP} className="pill">
                  {t.market.browse}
                </Link>
                <Link to={SIGN_UP} className="pill ghost">
                  {t.market.sell}
                </Link>
              </div>
            </div>
            <ObjectArt name={ART.market} alt="" size={240} className="l-obj mk-art" />
          </div>
          <MarketShelf />
          <p className="mk-note soft small-text">{t.market.note}</p>
        </div>
      </section>

      <section className="l-section l-band reveal" aria-labelledby="l-listen-title">
        <div className="l-wrap l-split ld-wrap">
          <div>
            <span className="eyebrow">{t.listen.eyebrow}</span>
            <h2 id="l-listen-title" className="l-h2">
              {t.listen.title}
            </h2>
            <p className="ld-honest">{t.listen.honest}</p>
            <ObjectArt name={ART.listen} alt="" size={240} className="l-obj ld-art" />
          </div>
          <ListenDemo />
        </div>
      </section>

      <section id="institutions" className="l-section reveal" aria-labelledby="l-inst-title">
        <div className="l-wrap l-split">
          <ObjectArt name={ART.institutions} alt="" size={240} className="l-obj in-art" />
          <div>
            <span className="eyebrow">{t.institutions.eyebrow}</span>
            <h2 id="l-inst-title" className="l-h2">
              {t.institutions.title}
            </h2>
            <ul className="in-points">
              {t.institutions.points.map((p, i) => {
                const Icon = INSTITUTION_ICONS[i];
                return (
                  <li key={p}>
                    <span className="in-icon">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span>{p}</span>
                  </li>
                );
              })}
            </ul>
            <div className="actions">
              <Link to={SIGN_UP} className="pill">
                {t.institutions.cta} <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="l-section l-band reveal" aria-labelledby="l-safe-title">
        <div className="l-wrap sf">
          <div className="sf-head">
            <div>
              <span className="eyebrow">{t.safe.eyebrow}</span>
              <h2 id="l-safe-title" className="l-h2">
                {t.safe.title}
              </h2>
            </div>
            <ObjectArt name={ART.safe} alt="" size={180} className="sf-art" />
          </div>
          <ul className="sf-points">
            {t.safe.points.map((p, i) => {
              const Icon = SAFE_ICONS[i];
              return (
                <li key={p}>
                  <span className="sf-icon">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span>{p}</span>
                </li>
              );
            })}
            <li>
              <span className="sf-icon">
                <LifeBuoy size={20} aria-hidden="true" />
              </span>
              <HelpLine region={region} />
            </li>
          </ul>
        </div>
      </section>

      <section className="l-section reveal" aria-labelledby="l-faq-title">
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
          <nav className="l-foot-links" aria-label={copy.menu.help}>
            <Link to="/help">{copy.menu.help}</Link>
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

/**
 * The help line point. Zimbabwe gets Childline 116, verified in the repo
 * (SPEC.md); everywhere else points to the Get help page, since no other number
 * is verified yet. Both lines take the same space, so nothing moves when the
 * region is known.
 */
function HelpLine({ region }: { region: Region }) {
  const t = copy.landing.safe;
  const zw = region === "ZW";
  return (
    <span className="l-help">
      <span aria-hidden={!zw} className={zw ? undefined : "l-help-off"}>
        {t.helpZW}{" "}
        <a href="tel:116" tabIndex={zw ? undefined : -1}>
          {t.helpZWLink}
        </a>
      </span>
      <span aria-hidden={zw} className={zw ? "l-help-off" : undefined}>
        {t.helpOther}{" "}
        <Link to="/help" tabIndex={zw ? -1 : undefined}>
          {t.helpOtherLink}
        </Link>
      </span>
    </span>
  );
}
