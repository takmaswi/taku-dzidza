import { Link } from "react-router";
import { copy } from "../../copy/en";
import { BrandMark } from "../BrandMark";

/** The landing page's own top bar: the mark and name, links to the page's sections, Sign in and Start free. */
export function LandingHeader() {
  const t = copy.landing.nav;
  return (
    <header className="l-top">
      <div className="l-top-row">
        <Link to="/" className="l-brand" aria-label={t.home}>
          <BrandMark variant="on-cream" className="l-brand-mark" />
          <span aria-hidden="true">
            <b>{copy.appName}</b> {copy.byline}
          </span>
        </Link>
        <nav className="l-nav" aria-label={t.label}>
          <a href="#learners">{t.learners}</a>
          <a href="#institutions">{t.institutions}</a>
          <a href="#marketplace">{t.marketplace}</a>
          <Link to="/signin">{t.signIn}</Link>
        </nav>
        <Link to="/signin?mode=signUp" className="pill honey l-start">
          {t.start}
        </Link>
      </div>
    </header>
  );
}
