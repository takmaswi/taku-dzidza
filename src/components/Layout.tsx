import { useQuery } from "convex/react";
import { BookOpen, Home, Layers, LifeBuoy, MessageCircle, Settings, Store, X } from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { api } from "../../convex/_generated/api";
import { useFlags } from "../classes/flags";
import { copy } from "../copy/en";
import { BrandMark, Lockup } from "./BrandMark";
import { SignedInContext } from "./signedIn";
import { lookPicked, markLookPicked } from "../theme";
import { ThemeWelcome } from "./ThemePicker";
import { ThemeToggle } from "./ThemeToggle";

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

type Tab = "home" | "chat" | "notebooks" | "review" | "market" | "settings";

function activeTab(path: string): Tab | null {
  if (path === "/") return "home";
  if (path.startsWith("/chat")) return "chat";
  if (/^\/n\/[^/]+\/review/.test(path)) return "review";
  if (path.startsWith("/notebooks") || path.startsWith("/n/")) return "notebooks";
  if (path.startsWith("/market")) return "market";
  if (path.startsWith("/settings")) return "settings";
  return null;
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
  const flags = useFlags();
  // The marketplace shows only while MARKETPLACE_MODE lets this account in (convex/lib/features.ts).
  const items: { tab: Tab; to: string; label: string; short?: string; Icon: typeof Home; badge?: number }[] = [
    { tab: "home", to: "/", label: n.home, Icon: Home },
    { tab: "chat", to: "/chat", label: n.chat, Icon: MessageCircle },
    { tab: "notebooks", to: "/notebooks", label: n.notebooks, Icon: BookOpen },
    { tab: "review", to: reviewTo, label: n.review, Icon: Layers, badge: dueCount },
    ...(flags.market ? [{ tab: "market" as const, to: "/market", label: copy.market.nav, short: copy.market.navShort, Icon: Store }] : []),
    { tab: "settings", to: "/settings", label: n.settings, Icon: Settings },
  ];
  const current = activeTab(pathname);
  const active = items.findIndex((i) => i.tab === current);
  const [welcome, setWelcome] = useState(() => !lookPicked());
  const indicator = { ["--active" as string]: Math.max(active, 0), opacity: active < 0 ? 0 : 1 } as CSSProperties;
  const tabCount = { ["--tabs" as string]: items.length } as CSSProperties;

  return (
    <div className="app">
      {ready && (
        <nav className="rail" aria-label="Main">
          <Link to="/" className="rail-mark" aria-label={`${copy.appName} ${copy.byline}`}>
            <BrandMark />
          </Link>
          <div className="rail-items">
            <span className="rail-indicator" style={indicator} aria-hidden="true" />
            {items.map(({ to, label, short, Icon, badge }, i) => (
              <Link key={label} to={to} className={i === active ? "active" : undefined} aria-current={i === active ? "page" : undefined} aria-label={short === undefined ? undefined : label}>
                <Icon size={20} aria-hidden="true" />
                <span>{short ?? label}</span>
                {badge !== undefined && badge > 0 && <span className="badge">{badge}</span>}
              </Link>
            ))}
          </div>
          <ThemeToggle className="icon-button rail-theme" />
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
              <ThemeToggle className="icon-button bar-theme" />
              <Link to="/help" className="pill ghost small">
                <LifeBuoy size={16} aria-hidden="true" />
                <span className="hide-narrow">{copy.menu.help}</span>
                <span className="sr-only show-narrow">{copy.menu.help}</span>
              </Link>
            </>
          )}
        </header>
        {ready && welcome && me?.profile != null && (
          <ThemeWelcome
            access={me.profile.accessibility}
            onDone={() => {
              markLookPicked();
              setWelcome(false);
            }}
          />
        )}
        <main className={`app-main${scroll === "panes" ? " panes" : ""}`}>
          <SignedInContext.Provider value={ready}>{children}</SignedInContext.Provider>
        </main>
        {ready && tabs && (
          <nav className="tabbar" aria-label="Main" style={tabCount}>
            <span className="tab-indicator" style={indicator} aria-hidden="true" />
            {items.map(({ to, label, short, Icon, badge }, i) => (
              <Link key={label} to={to} className={i === active ? "active" : undefined} aria-current={i === active ? "page" : undefined} aria-label={short === undefined ? undefined : label}>
                <Icon size={20} aria-hidden="true" />
                {short ?? label}
                {badge !== undefined && badge > 0 && <span className="badge">{badge}</span>}
              </Link>
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
      <main className="focus-main">
        <SignedInContext.Provider value={true}>{children}</SignedInContext.Provider>
      </main>
    </div>
  );
}

