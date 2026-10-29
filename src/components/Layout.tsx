import { useAuthActions } from "@convex-dev/auth/react";
import { LifeBuoy, Menu, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { copy } from "../copy/en";

/** The frame of every page. Get help is always one tap away (SPEC.md 3.13). */
export function Layout({ children, signedIn = false }: { children: ReactNode; signedIn?: boolean }) {
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label={`${copy.appName} ${copy.byline}`}>
          <b>{copy.appName}</b>
          <span>{copy.byline}</span>
        </Link>
        <div className="topbar-actions">
          <Link to="/help" className="pill help small">
            <LifeBuoy size={18} aria-hidden="true" />
            {copy.menu.help}
          </Link>
          {signedIn && <AppMenu />}
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}

function AppMenu() {
  const { signOut } = useAuthActions();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current !== null && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div className="menu" ref={ref}>
      <button type="button" className="pill ghost small" aria-expanded={open} aria-label={open ? copy.menu.closeMenu : copy.menu.openMenu} onClick={() => setOpen(!open)}>
        {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
      </button>
      {open && (
        <nav className="menu-panel" onClick={() => setOpen(false)}>
          <Link to="/">{copy.menu.home}</Link>
          <Link to="/settings">{copy.menu.settings}</Link>
          <Link to="/help">{copy.menu.help}</Link>
          <button type="button" onClick={() => void signOut()}>
            {copy.menu.signOut}
          </button>
        </nav>
      )}
    </div>
  );
}
