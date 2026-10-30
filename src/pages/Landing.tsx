import { ArrowRight, BookOpen, Check, Layers, ListChecks, Network, ScrollText, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { BrandMark, Chevron } from "../components/BrandMark";
import { ImageSlot } from "../components/ImageSlot";
import { Layout } from "../components/Layout";
import { STYLE_ART } from "../components/styleArt";
import { useReveal } from "../components/useReveal";
import { copy } from "../copy/en";

const RING_COLOURS = ["var(--butter)", "var(--honey)", "var(--sage-tint)", "var(--msasa-tint)", "var(--white)", "var(--butter-tint)"];
const RING_ICONS = [Layers, ListChecks, ScrollText, Sparkles, Network, BookOpen];

/**
 * The public front door. Motion follows Takunda's portfolio (a rolling
 * headline, rise on scroll, a 3D ring of cards) and layout follows the
 * Takubasa landing (photos in arches and pills, a chevron divider, colour
 * bands). Everything is still with reduced motion.
 */
export default function Landing() {
  const t = copy.landing;
  useReveal();
  return (
    <Layout>
      <section className="l-hero">
        <div className="rise">
          <span className="eyebrow">{t.eyebrow}</span>
          <h1>
            {t.titleStart}{" "}
            <span className="roller" aria-label={t.roller.join(", ")}>
              <span aria-hidden="true">
                {[...t.roller, t.roller[0]].map((w, i) => (
                  <span key={i}>{w}</span>
                ))}
              </span>
            </span>
          </h1>
          <p className="lead soft">{t.lead}</p>
          <div className="actions" style={{ marginTop: "1.5rem" }}>
            <Link to="/signin?mode=signUp" className="pill">
              {t.start} <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link to="/signin" className="pill ghost">
              {t.signIn}
            </Link>
          </div>
        </div>
        <div className="collage rise" style={{ ["--i" as string]: 2 }}>
          <span className="blob" />
          <div className="c1">
            <ImageSlot slug="landing-form1" fallback="onboarding-1-secondary-student" alt="A secondary school learner studying" shape="arch" eager />
          </div>
          <div className="c2">
            <ImageSlot slug="dashboard-hero-university" alt="Two university students revising together" shape="pill" eager />
          </div>
          <div>
            <ImageSlot slug="onboarding-3-professional" alt="An adult studying for a professional exam" shape="arch" />
          </div>
          <div className="chip-float">
            <span className="eyebrow" style={{ marginBottom: "0.3rem" }}>
              Taku
            </span>
            {t.floatCard}
          </div>
        </div>
      </section>

      <Chevron />

      <section className="l-split reveal" style={{ padding: "3rem 0" }}>
        <div>
          <span className="eyebrow">{t.howEyebrow}</span>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>{t.howTitle}</h2>
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
        <div className="mock-phone" aria-hidden="true">
          <span className="eyebrow">Form 3 Biology</span>
          <div className="bubble learner">What does chlorophyll do?</div>
          <div className="bubble taku">
            Chlorophyll absorbs light energy, which the plant uses to make glucose. <span className="cite static">Biology notes, page 1</span>
          </div>
          <div className="bubble taku" style={{ borderLeft: "4px solid var(--honey)" }}>
            Think of it like a solar panel. <span className="added-tag">{copy.notebook.addedByTaku}</span>
          </div>
        </div>
      </section>

      <section className="l-band ink grain reveal">
        <div className="l-split">
          <div>
            <span className="eyebrow on-ink">{t.citeEyebrow}</span>
            <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>{t.citeTitle}</h2>
            <p className="lead soft">{t.citeBody}</p>
          </div>
          <div className="cite-demo">
            <span className="eyebrow">Biology notes, page 1</span>
            <p style={{ margin: 0 }}>
              Green plants make their own food by photosynthesis. <mark>Chlorophyll, the green pigment in the chloroplasts, absorbs light energy.</mark> The plant uses this energy to turn carbon dioxide and water into glucose.
            </p>
          </div>
        </div>
      </section>

      <section className="reveal" style={{ padding: "3rem 0 1rem" }}>
        <div style={{ textAlign: "center" }}>
          <span className="eyebrow">{t.toolsEyebrow}</span>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>{t.toolsTitle}</h2>
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

      <section className="l-band butter grain reveal">
        <span className="eyebrow">{t.stylesEyebrow}</span>
        <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>{t.stylesTitle}</h2>
        <p className="lead">{t.stylesBody}</p>
        <div className="style-cards" style={{ marginTop: "1.5rem" }}>
          {(["locked_in", "cook", "calm"] as const).map((s) => (
            <div key={s} className={`style-card ${STYLE_ART[s].cls}`}>
              <span className="sc-band" />
              <ImageSlot slug={STYLE_ART[s].slug} fallback={STYLE_ART[s].fallback} alt={STYLE_ART[s].alt} />
              <span className="sc-body">
                <b>{copy.styles[s].name}</b>
                <span>{copy.styles[s].line}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="l-band sage grain reveal">
        <div className="l-split">
          <div>
            <span className="eyebrow on-ink">{t.safeEyebrow}</span>
            <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>{t.safeTitle}</h2>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.9rem" }}>
            {t.safePoints.map((p) => (
              <li key={p} style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start" }}>
                <span style={{ background: "var(--honey)", color: "var(--ink)", borderRadius: "50%", width: 28, height: 28, display: "grid", placeItems: "center", flex: "none" }}>
                  <Check size={16} aria-hidden="true" />
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="l-final reveal">
        <BrandMark className="brand-mark" />
        <h2 style={{ fontSize: "clamp(2rem, 5.5vw, 3.6rem)", maxWidth: "16ch" }}>{t.finalTitle}</h2>
        <Link to="/signin?mode=signUp" className="pill">
          {t.finalCta} <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

      <footer className="l-foot">
        <span>
          {copy.appName} {copy.byline}. {t.footer}
        </span>
        <Link to="/help">{copy.menu.help}</Link>
      </footer>
    </Layout>
  );
}
