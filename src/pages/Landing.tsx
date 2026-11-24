import { ArrowRight, Check } from "lucide-react";
import { useLayoutEffect, type MouseEvent } from "react";
import { Link } from "react-router";
import { STUDY_MODES } from "../../convex/accounts/voices";
import { CUTOUTS, SCENES, type CutoutSlug, type SceneSlug } from "../art.generated";
import { Cutout, Scene } from "../components/Art";
import { BrandMark } from "../components/BrandMark";
import { Layout } from "../components/Layout";
import { CiteDemo } from "../components/landing/CiteDemo";
import { CurriculumStrip } from "../components/landing/CurriculumStrip";
import { DropAnything } from "../components/landing/DropAnything";
import { HeroDemo } from "../components/landing/HeroDemo";
import { LandingHeader } from "../components/landing/LandingHeader";
import { isStill } from "../components/landing/motion";
import { REGIONS, useRegion, type Region } from "../components/landing/useRegion";
import { ObjectArt } from "../components/ObjectArt";
import { useReveal } from "../components/useReveal";
import { copy } from "../copy/en";

const scene = (want: string, fallback: SceneSlug): SceneSlug => (want in SCENES ? (want as SceneSlug) : fallback);
const cutout = (want: string, fallback: CutoutSlug): CutoutSlug => (want in CUTOUTS ? (want as CutoutSlug) : fallback);

/**
 * Every image on the landing page, in one place. Art batch 5 slugs first
 * (art/BRIEF-batch-5-landing.md); where one has not landed in the generated
 * manifests, the older art stands in. `real` says which, so the alt text matches.
 */
const ART = {
  ensemble: scene("landing-ensemble", "home-dashboard"),
  snap: cutout("learner-snap-notes", "onboarding-2-senior-student"),
  listening: cutout("learner-listening", "audio-overview"),
  flashcards: cutout("learner-flashcards", "study-planner"),
  seller: cutout("seller-notes", "exam-coach"),
  lecturer: cutout("lecturer-class", "class-share-teacher"),
} as const;
const real = (slug: string, batch5: string) => slug === batch5;

const SIGN_UP = "/signin?mode=signUp";

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
    <Layout top={<LandingHeader />} bleed>
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
            <HeroDemo />
          </div>
        </div>
        <span className="l-sky" aria-hidden="true">
          <ObjectArt name="sun" alt="" size={128} className="l-sky-sun" />
          <ObjectArt name="moon" alt="" size={128} className="l-sky-moon" />
        </span>
        <Scene slug={ART.ensemble} alt={real(ART.ensemble, "landing-ensemble") ? t.hero.sceneAlt : t.hero.sceneFallbackAlt} sizes="(min-width: 960px) 62vw, 100vw" max={1280} eager className="l-hero-scene" />
      </section>

      <CurriculumStrip region={region} />

      <section id="learners" className="l-section reveal" aria-labelledby="l-drop-title">
        <DropAnything art={<Cutout slug={ART.snap} alt={real(ART.snap, "learner-snap-notes") ? t.drop.art : t.drop.artFallback} sizes="(min-width: 900px) 340px, 64vw" className="l-person" />} />
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
        <div className="l-wrap">
          <span className="eyebrow">{t.tools.eyebrow}</span>
          <h2 id="l-tools-title" className="l-h2">
            {t.tools.title}
          </h2>
          <ul className="l-list">
            {Object.values(t.tools.items).map((x) => (
              <li key={x.name}>
                <b>{x.name}</b> <span className="soft">{x.line}</span>
              </li>
            ))}
          </ul>
          <Cutout slug={ART.flashcards} alt={real(ART.flashcards, "learner-flashcards") ? t.tools.art : t.tools.artFallback} sizes="(min-width: 900px) 320px, 60vw" className="l-person" />
        </div>
      </section>

      <section className="l-section reveal" aria-labelledby="l-modes-title">
        <div className="l-wrap">
          <span className="eyebrow">{t.modes.eyebrow}</span>
          <h2 id="l-modes-title" className="l-h2">
            {t.modes.title}
          </h2>
          <p className="lead soft">{t.modes.body}</p>
          <ul className="l-list">
            {STUDY_MODES.map((m) => (
              <li key={m}>
                <b>{copy.study.modes[m].name}</b> <span className="soft">{copy.study.modes[m].line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="marketplace" className="l-section l-band reveal" aria-labelledby="l-market-title">
        <div className="l-wrap l-split">
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
          <Cutout slug={ART.seller} alt={real(ART.seller, "seller-notes") ? t.market.art : t.market.artFallback} sizes="(min-width: 900px) 360px, 70vw" className="l-person" />
        </div>
      </section>

      <section className="l-section reveal" aria-labelledby="l-listen-title">
        <div className="l-wrap l-split">
          <div>
            <span className="eyebrow">{t.listen.eyebrow}</span>
            <h2 id="l-listen-title" className="l-h2">
              {t.listen.title}
            </h2>
            <p className="soft">{t.listen.honest}</p>
          </div>
          <Cutout slug={ART.listening} alt={real(ART.listening, "learner-listening") ? t.listen.art : t.listen.artFallback} sizes="(min-width: 900px) 360px, 70vw" className="l-person" />
        </div>
      </section>

      <section id="institutions" className="l-section l-band reveal" aria-labelledby="l-inst-title">
        <div className="l-wrap l-split">
          <div>
            <span className="eyebrow">{t.institutions.eyebrow}</span>
            <h2 id="l-inst-title" className="l-h2">
              {t.institutions.title}
            </h2>
            <ul className="l-checks">
              {t.institutions.points.map((p) => (
                <li key={p}>
                  <span className="l-check">
                    <Check size={16} aria-hidden="true" />
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <div className="actions">
              <Link to={SIGN_UP} className="pill">
                {t.institutions.cta}
              </Link>
            </div>
          </div>
          <Cutout slug={ART.lecturer} alt={real(ART.lecturer, "lecturer-class") ? t.institutions.art : t.institutions.artFallback} sizes="(min-width: 900px) 360px, 70vw" className="l-person" />
        </div>
      </section>

      <section className="l-section reveal" aria-labelledby="l-safe-title">
        <div className="l-wrap l-split">
          <div>
            <span className="eyebrow">{t.safe.eyebrow}</span>
            <h2 id="l-safe-title" className="l-h2">
              {t.safe.title}
            </h2>
            <ul className="l-checks">
              {t.safe.points.map((p) => (
                <li key={p}>
                  <span className="l-check">
                    <Check size={16} aria-hidden="true" />
                  </span>
                  <span>{p}</span>
                </li>
              ))}
              <li>
                <span className="l-check">
                  <Check size={16} aria-hidden="true" />
                </span>
                <HelpLine region={region} />
              </li>
            </ul>
          </div>
          <ObjectArt name="open-book" alt="" size={200} className="l-safe-art" />
        </div>
      </section>

      <section className="l-section reveal" aria-labelledby="l-faq-title">
        <div className="l-wrap l-narrow">
          <h2 id="l-faq-title" className="l-h2">
            {t.faq.title}
          </h2>
          {t.faq.items.map((f) => (
            <details key={f.q} className="l-faq">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="l-final reveal" aria-labelledby="l-final-title">
        <BrandMark variant="on-cream" className="l-final-mark" />
        <h2 id="l-final-title" className="l-h2">
          {t.final.title}
        </h2>
        <Link to={SIGN_UP} className="pill">
          {t.final.cta} <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

      <footer className="l-foot">
        <div className="l-wrap l-foot-row">
          <span>{t.footer.line}</span>
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
