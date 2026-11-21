import { Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { copy } from "../copy/en";
import { prettyPlain } from "./math";

type Group = keyof typeof copy.chat.groups;

function groupOf(at: number, now: Date): Group {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (at >= day) return "today";
  if (at >= day - 86_400_000) return "yesterday";
  if (at >= day - 6 * 86_400_000) return "week";
  return "older";
}

/**
 * Past chats, newest first, under Today, Yesterday, Earlier this week and
 * Older, the way most chat apps sort them. A search box appears once there
 * are enough chats to need one.
 */
export function ChatList({ chats, current, canLoadMore, onLoadMore, onPick }: { chats: Doc<"chats">[]; current?: Id<"chats">; canLoadMore: boolean; onLoadMore: () => void; onPick?: () => void }) {
  const t = copy.chat;
  const [query, setQuery] = useState("");
  const [now] = useState(() => new Date());
  const q = query.trim().toLowerCase();
  const shown = q === "" ? chats : chats.filter((c) => c.title.toLowerCase().includes(q) || prettyPlain(c.title).toLowerCase().includes(q));
  const groups = new Map<Group, Doc<"chats">[]>();
  for (const c of shown) {
    const g = groupOf(c.updatedAt, now);
    groups.set(g, [...(groups.get(g) ?? []), c]);
  }

  if (chats.length === 0) return <p className="soft small-text">{copy.home.noChats}</p>;
  return (
    <>
      {chats.length >= 6 && (
        <label className="chat-search">
          <Search size={15} aria-hidden="true" />
          <input type="search" value={query} placeholder={t.search} aria-label={t.search} onChange={(e) => setQuery(e.target.value)} />
        </label>
      )}
      {shown.length === 0 && <p className="soft small-text">{t.noMatch}</p>}
      {(Object.keys(t.groups) as Group[]).map((g) =>
        groups.has(g) ? (
          <section key={g} className="chat-group">
            <h3>{t.groups[g]}</h3>
            <ul className="past-chats">
              {groups.get(g)!.map((c) => (
                <li key={c._id}>
                  <Link to={`/chat/${c._id}`} aria-current={c._id === current ? "page" : undefined} onClick={onPick} title={prettyPlain(c.title)}>
                    <b>{prettyPlain(c.title)}</b>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
      {canLoadMore && q === "" && (
        <button type="button" className="link" onClick={onLoadMore}>
          {t.older}
        </button>
      )}
    </>
  );
}
