import { ArrowRight, BookOpen, Check, Layers, ListChecks, Network, ScrollText, Sparkles } from "lucide-react";
import { useLayoutEffect } from "react";
import { Link } from "react-router";
import { Cutout, Decor, DecorLine, Scene } from "../components/Art";
import { BrandMark } from "../components/BrandMark";
import { Layout } from "../components/Layout";
import { STYLE_ART } from "../components/styleArt";
import { useReveal } from "../components/useReveal";
import { copy } from "../copy/en";

const RING_COLOURS = ["var(--butter)", "var(--tint)", "var(--cream)", "var(--butter-pick)", "var(--white)", "var(--paper)"];
const RING_ICONS = [Layers, ListChecks, ScrollText, Sparkles, Network, BookOpen];

/**
 * The public front door. The hero is the landing scene, people stand on the
 * page as cutouts in the feature sections, and a few stationery marks sit in
 * the margins (never behind body text, at most two on a screen). Motion: a
 * rolling headline, rise on scroll and a ring of tool cards, all still with
 * reduced motion.
 */
export default function Landing() {
  const t = copy.landing;
  useReveal();
  useLayoutEffect(() => {
    // The real page is about to paint, so the prerendered copy (scripts/prerender.mjs) can go.
    document.getElementById("prerender")?.remove();
  }, []);
  return (
    <Layout>
      <section className="l-hero">
        <Scene slug="landing-hero" alt={t.heroAlt} sizes="(min-width: 960px) 72vw, 100vw" eager className="l-hero-scene" />
        <div className="l-hero-text rise">
          <p className="eyebrow l-eyebrow">
            <span>
              {copy.appName} {copy.byline}
            </span>
            <span>{t.eyebrow}</span>
          </p>
          <h1>
            {t.titleStart}{" "}
            <span className="roller" aria-label={t.roller.join(", ")}>
              <span aria-hidden="true">
                {[...t.roller, t.roller[0]].map((w, i) => (
                  <span key={i}>{w}</span>
                ))}
              </span>
            </span>
            <DecorLine name="underline-swoop" className="l-swoop" />
          </h1>
          <p className="lead">{t.lead}</p>
          <div className="actions">
            <Link to="/signin?mode=signUp" className="pill">
              {t.start} <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link to="/signin" className="pill ghost">
              {t.signIn}
            </Link>
          </div>
          <div className="raised l-float">
            <BrandMark variant="on-cream" className="mark" />
            <span>{t.floatCard}</span>
          </div>
        </div>
      </section>

      <section className="l-split reveal">
        <div>
          <span className="eyebrow">{t.howEyebrow}</span>
          <h2 className="l-h2">{t.howTitle}</h2>
          <ol className="l-steps">
            {t.howSteps.map((s) => (
              <li key={s.title}>
                <span>
                  <b>{s.title}</b>
                  <br />
                  <span className="soft">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="l-demo">
          <Cutout slug="landing-form1" alt={t.howAlt} sizes="(min-width: 900px) 420px, 80vw" className="l-demo-art" />
          <div className="mock-chat raised" aria-hidden="true">
            <span className="eyebrow">Form 3 Biology</span>
            <div className="msg learner">
              <p>What does chlorophyll do?</p>
            </div>
            <div className="msg taku">
              <BrandMark variant="on-cream" className="msg-mark" />
              <div className="msg-body">
                <p>
                  Chlorophyll absorbs light energy, which the plant uses to make glucose.<span className="cite-mark static">1</span>
                </p>
                <p className="part added">
                  Think of it like a solar panel. <span className="added-tag">{copy.notebook.addedByTaku}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="l-band reveal">
        <div className="l-split">
          <div>
            <span className="eyebrow">{t.citeEyebrow}</span>
            <h2 className="l-h2">{t.citeTitle}</h2>
            <p className="lead soft">{t.citeBody}</p>
          </div>
          <div className="cite-demo raised">
            <span className="eyebrow">Biology notes, page 1</span>
            <p>
              Green plants make their own food by photosynthesis. <mark>Chlorophyll, the green pigment in the chloroplasts, absorbs light energy.</mark> The plant uses this energy to turn carbon dioxide and water into glucose.
            </p>
            <Decor name="page-corner-curl" className="cite-curl" />
          </div>
        </div>
      </section>

      <section className="reveal l-tools">
        <div className="l-center">
          <span className="eyebrow">{t.toolsEyebrow}</span>
          <h2 className="l-h2">{t.toolsTitle}</h2>
        </div>
        <div className="tool-ring" aria-label={t.tools.map((x) => x.name).join(", ")}>
          <div className="ring">
            {t.tools.map((tool, i) => {
              const Icon = RING_ICONS[i];
              return (
                <div key={tool.name} className="ring-card" style={{ ["--i" as string]: i, background: RING_COLOURS[i] }}>
                  <Icon size={24} aria-hidden="true" />
                  <span>
                    <b>{tool.name}</b>
                    <br />
                    <span className="small-text">{tool.line}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="l-styles reveal">
        <span className="eyebrow">{t.stylesEyebrow}</span>
        <h2 className="l-h2">{t.stylesTitle}</h2>
        <p className="lead">{t.stylesBody}</p>
        <div className="style-cards">
          {(["locked_in", "cook", "calm"] as const).map((s) => (
            <div key={s} className={`style-card ${STYLE_ART[s].cls}`}>
              <Cutout slug={STYLE_ART[s].slug} alt={STYLE_ART[s].alt} sizes="(min-width: 760px) 300px, 80vw" />
              <span className="sc-body">
                <span className="tag">{copy.styles[s].tag}</span>
                <b>{copy.styles[s].name}</b>
                <span>{copy.styles[s].line}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="l-band l-safe reveal">
        <div className="l-split">
          <div>
            <span className="eyebrow">{t.safeEyebrow}</span>
            <h2 className="l-h2">{t.safeTitle}</h2>
            <ul className="l-checks">
              {t.safePoints.map((p) => (
                <li key={p}>
                  <span className="l-check">
                    <Check size={16} aria-hidden="true" />
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <Cutout slug="guardian-consent" alt={t.safeAlt} sizes="(min-width: 900px) 460px, 80vw" className="l-safe-art" />
        </div>
      </section>

      <section className="l-final reveal">
        <DecorLine name="sparks" className="l-sparks" />
        <BrandMark variant="on-cream" className="l-final-mark" />
        <h2 className="l-h2">{t.finalTitle}</h2>
        <Link to="/signin?mode=signUp" className="pill">
          {t.finalCta} <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

      <footer className="l-foot">
        <span>
          {copy.appName} {copy.byline}. {t.footer}
        </span>
        <Link to="/help">{copy.menu.help}</Link>
        <Link to="/privacy">{copy.legal.privacyLink}</Link>
        <Link to="/terms">{copy.legal.termsLink}</Link>
      </footer>
    </Layout>
  );
}
