import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { copy } from "../../copy/en";
import { BrandMark } from "../BrandMark";

/**
 * The landing page's own top bar: the mark and name, links to the page's
 * sections, Sign in and Start free. After 40 px of scroll it grows compact
 * and gains a soft shadow. On a phone the links fold into a sheet menu.
 */
export function LandingHeader() {
  const t = copy.landing.nav;
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setCompact(window.scrollY > 40));
    };
    check();
    addEventListener("scroll", check, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", check);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    sheet.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!sheet.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    addEventListener("keydown", onKey);
    addEventListener("pointerdown", onDown);
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const close = () => setOpen(false);
  const links = (
    <>
      <a href="#learners" onClick={close}>
        {t.learners}
      </a>
      <a href="#institutions" onClick={close}>
        {t.institutions}
      </a>
      <a href="#marketplace" onClick={close}>
        {t.marketplace}
      </a>
      <Link to="/signin" onClick={close}>
        {t.signIn}
      </Link>
    </>
  );

  return (
    <header className={`l-top${compact ? " compact" : ""}`}>
      <div className="l-top-row">
        <Link to="/" className="l-brand" aria-label={t.home}>
          <BrandMark variant="on-cream" className="l-brand-mark" />
          <span aria-hidden="true">
            <b>{copy.appName}</b> <span className="l-by">{copy.byline}</span>
          </span>
        </Link>
        <nav className="l-nav" aria-label={t.label}>
          {links}
        </nav>
        <Link to="/signin?mode=signUp" className="pill honey l-start">
          {t.start}
        </Link>
        <button ref={button} type="button" className="icon-button l-menu" aria-expanded={open} aria-controls="l-sheet" aria-label={open ? t.closeMenu : t.menu} onClick={() => setOpen((o) => !o)}>
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>
      <div ref={sheet} id="l-sheet" className="l-sheet" hidden={!open}>
        <nav aria-label={t.label}>{links}</nav>
      </div>
    </header>
  );
}
