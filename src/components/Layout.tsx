import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { BookOpen, Home, Layers, LifeBuoy, LogOut, MessageCircle, Settings } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { api } from "../../convex/_generated/api";
import { copy } from "../copy/en";
import { BrandMark } from "./BrandMark";

/**
 * The frame of every page. Public pages get a light top bar. Signed in pages
 * get an ink sidebar on desktop and a bottom tab bar on phones (the pattern
 * from Takubasa's home). Get help is always one tap away (SPEC.md 3.13).
 */
export function Layout({ children, signedIn = false }: { children: ReactNode; signedIn?: boolean }) {
  if (signedIn) return <AppShell>{children}</AppShell>;
  return (
    <div className="public-shell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label={`${copy.appName} ${copy.byline}`}>
          <BrandMark />
          <b>{copy.appName}</b>
        </Link>
        <div className="topbar-actions">
          <Link to="/help" className="pill ghost small">
            <LifeBuoy size={18} aria-hidden="true" />
            {copy.menu.help}
          </Link>
        </div>
      </header>
      <main className="public-main">{children}</main>
    </div>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const me = useQuery(api.accounts.profiles.me);
  const ready = me?.profile != null && (me.profile.consentState === "not_needed" || me.profile.consentState === "given") && me.profile.styleChosen;
  const [now] = useState(() => Date.now());
  const due = useQuery(api.study.cards.dueCount, ready ? { now } : "skip");
  const chats = useQuery(api.chat.chats.list, ready ? {} : "skip");
  const notebooks = useQuery(api.notebooks.notebooks.list, ready ? {} : "skip");
  const { signOut } = useAuthActions();
  const n = copy.nav;
  const dueCount = due?.count ?? 0;
  const reviewTo = due?.notebookId != null ? `/n/${due.notebookId}/review` : "/notebooks";
  const style = me?.profile ? copy.styles[me.profile.studyStyle] : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <BrandMark inverse />
          <span>
            <b>{copy.appName}</b>
            <br />
            <small>{copy.byline}</small>
          </span>
        </Link>
        {ready && (
          <nav className="side-nav" aria-label="Main">
            <NavLink to="/" end>
              <Home size={18} aria-hidden="true" /> {n.home}
            </NavLink>
            <NavLink to="/chat">
              <MessageCircle size={18} aria-hidden="true" /> {n.chat}
            </NavLink>
            <NavLink to="/notebooks">
              <BookOpen size={18} aria-hidden="true" /> {n.notebooks}
            </NavLink>
            <NavLink to={reviewTo} className={({ isActive }) => (isActive ? "active" : "")}>
              <Layers size={18} aria-hidden="true" /> {n.review}
              {dueCount > 0 && <span className="badge">{dueCount}</span>}
            </NavLink>
            <NavLink to="/settings">
              <Settings size={18} aria-hidden="true" /> {n.settings}
            </NavLink>
          </nav>
        )}
        {ready && (notebooks?.length ?? 0) > 0 && (
          <div>
            <p className="side-section">{n.notebooksList}</p>
            <div className="side-list">
              {notebooks!.slice(0, 5).map((nb) => (
                <Link key={nb._id} to={`/n/${nb._id}`}>
                  {nb.title}
                </Link>
              ))}
            </div>
          </div>
        )}
        {ready && (chats?.length ?? 0) > 0 && (
          <div>
            <p className="side-section">{n.recentChats}</p>
            <div className="side-list">
              {chats!.slice(0, 5).map((c) => (
                <Link key={c._id} to={`/chat/${c._id}`}>
                  {c.title}
                </Link>
              ))}
            </div>
          </div>
        )}
        <div className="side-foot">
          {me?.profile && (
            <div className="who">
              <b>{me.profile.displayName}</b>
              {style && <small>{style.name}</small>}
            </div>
          )}
          <div className="actions">
            <Link to="/help" className="pill small">
              <LifeBuoy size={16} aria-hidden="true" /> {copy.menu.help}
            </Link>
            <button type="button" className="pill small" onClick={() => void signOut()} aria-label={copy.menu.signOut}>
              <LogOut size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <header className="app-top">
        <Link to="/" className="brand" aria-label={copy.appName}>
          <BrandMark />
          <b>{copy.appName}</b>
        </Link>
        <div className="topbar-actions">
          <Link to="/help" className="pill ghost small">
            <LifeBuoy size={16} aria-hidden="true" />
            {copy.menu.help}
          </Link>
          <button type="button" className="icon-button" onClick={() => void signOut()} aria-label={copy.menu.signOut}>
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="app-main">{children}</main>

      {ready && (
        <nav className="tabbar" aria-label="Main">
          <NavLink to="/" end>
            <Home size={20} aria-hidden="true" />
            {n.home}
          </NavLink>
          <NavLink to="/chat">
            <MessageCircle size={20} aria-hidden="true" />
            {n.chat}
          </NavLink>
          <NavLink to="/notebooks">
            <BookOpen size={20} aria-hidden="true" />
            {n.notebooks}
          </NavLink>
          <NavLink to={reviewTo}>
            <Layers size={20} aria-hidden="true" />
            {n.review}
            {dueCount > 0 && <span className="badge">{dueCount}</span>}
          </NavLink>
          <NavLink to="/settings">
            <Settings size={20} aria-hidden="true" />
            {n.settings}
          </NavLink>
        </nav>
      )}
    </div>
  );
}
