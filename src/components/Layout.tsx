import { useQuery } from "convex/react";
import { BookOpen, Home, Layers, LifeBuoy, MessageCircle, Settings, X } from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { api } from "../../convex/_generated/api";
import { copy } from "../copy/en";
import { BrandMark, Lockup } from "./BrandMark";

/**
 * The frame of every page. Public pages: a light top bar with the lockup.
 * Signed in pages: a full height shell that never scrolls (100dvh). A slim
 * icon rail on wide screens, a frosted top bar, and a bottom tab bar on
 * phones that hides while the learner types. Only the content pane scrolls.
 */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="public-shell">
      <header className="public-top">
        <Link to="/" className="brand-link">
          <Lockup />
        </Link>
        <Link to="/help" className="pill ghost small">
          <LifeBuoy size={16} aria-hidden="true" />
          {copy.menu.help}
        </Link>
      </header>
      <main className="public-main">{children}</main>
    </div>
  );
}

/** Marks <html> while the app shell is up: the page itself stops scrolling and dark mode may apply. */
function useAppShellMarker() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.shell = "app";
    return () => {
      delete root.dataset.shell;
    };
  }, []);
}

function activeIndex(path: string): number {
  if (path === "/") return 0;
  if (path.startsWith("/chat")) return 1;
  if (/^\/n\/[^/]+\/review/.test(path)) return 3;
  if (path.startsWith("/notebooks") || path.startsWith("/n/")) return 2;
  if (path.startsWith("/settings")) return 4;
  return -1;
}

/** tabs={false}: no phone tab bar, for the notebook and Ask Taku, where the conversation takes the screen. The mark still leads home. */
export function AppShell({ children, bar, title, scroll = "page", tabs = true }: { children: ReactNode; bar?: ReactNode; title?: string; scroll?: "page" | "panes"; tabs?: boolean }) {
  useAppShellMarker();
  const me = useQuery(api.accounts.profiles.me);
  const ready = me?.profile != null && (me.profile.consentState === "not_needed" || me.profile.consentState === "given") && me.profile.styleChosen;
  const [now] = useState(() => Date.now());
  const due = useQuery(api.study.cards.dueCount, ready ? { now } : "skip");
  const { pathname } = useLocation();
  const n = copy.nav;
  const dueCount = due?.count ?? 0;
  const reviewTo = due?.notebookId != null ? `/n/${due.notebookId}/review` : "/notebooks";
  const name = me?.profile?.displayName ?? "";
  const active = activeIndex(pathname);
  const items = [
    { to: "/", label: n.home, Icon: Home, end: true },
    { to: "/chat", label: n.chat, Icon: MessageCircle },
    { to: "/notebooks", label: n.notebooks, Icon: BookOpen },
    { to: reviewTo, label: n.review, Icon: Layers, badge: dueCount },
    { to: "/settings", label: n.settings, Icon: Settings },
  ];
  const indicator = { ["--active" as string]: Math.max(active, 0), opacity: active < 0 ? 0 : 1 } as CSSProperties;

  return (
    <div className="app">
      {ready && (
        <nav className="rail" aria-label="Main">
          <Link to="/" className="rail-mark" aria-label={`${copy.appName} ${copy.byline}`}>
            <BrandMark />
          </Link>
          <div className="rail-items">
            <span className="rail-indicator" style={indicator} aria-hidden="true" />
            {items.map(({ to, label, Icon, end, badge }, i) => (
              <NavLink key={label} to={to} end={end} className={i === active ? "active" : undefined} aria-current={i === active ? "page" : undefined}>
                <Icon size={20} aria-hidden="true" />
                <span>{label}</span>
                {badge !== undefined && badge > 0 && <span className="badge">{badge}</span>}
              </NavLink>
            ))}
          </div>
          <Link to="/settings" className="avatar" aria-label={`${name}, ${n.settings}`} title={name}>
            {name.slice(0, 1).toUpperCase()}
          </Link>
        </nav>
      )}
      <div className="app-col">
        <header className="topbar">
          {bar ?? (
            <>
              <Link to="/" className="topbar-mark" aria-label={`${copy.appName}, ${copy.nav.home}`}>
                <BrandMark />
              </Link>
              <span className="topbar-title">{title ?? copy.appName}</span>
              <span className="spacer" />
              <Link to="/help" className="pill ghost small">
                <LifeBuoy size={16} aria-hidden="true" />
                <span className="hide-narrow">{copy.menu.help}</span>
                <span className="sr-only show-narrow">{copy.menu.help}</span>
              </Link>
            </>
          )}
        </header>
        <main className={`app-main${scroll === "panes" ? " panes" : ""}`}>{children}</main>
        {ready && tabs && (
          <nav className="tabbar" aria-label="Main">
            <span className="tab-indicator" style={indicator} aria-hidden="true" />
            {items.map(({ to, label, Icon, end, badge }, i) => (
              <NavLink key={label} to={to} end={end} className={i === active ? "active" : undefined} aria-current={i === active ? "page" : undefined}>
                <Icon size={20} aria-hidden="true" />
                {label}
                {badge !== undefined && badge > 0 && <span className="badge">{badge}</span>}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

/** Focus mode: flashcards, practice papers and Scroll take the whole screen with the menus hidden, and a clear way out. */
export function FocusShell({ children, exitTo, title, dark = false }: { children: ReactNode; exitTo: string; title: string; dark?: boolean }) {
  useAppShellMarker();
  return (
    <div className={`focus${dark ? " focus-dark" : ""}`} data-testid="focus-mode">
      <header className="focus-bar">
        <Link to={exitTo} className="pill ghost small focus-exit">
          <X size={16} aria-hidden="true" /> {copy.focus.exit}
        </Link>
        <span className="focus-title">{title}</span>
      </header>
      <main className="focus-main">{children}</main>
    </div>
  );
}

