import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { MessagesSquare, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { errorText } from "../access";
import { useTrack } from "../analytics";
import { BrandMark } from "../components/BrandMark";
import { Composer } from "../components/Composer";
import { AppShell } from "../components/Layout";
import { Markdown } from "../components/Markdown";
import { ObjectArt } from "../components/ObjectArt";
import { CopyAndRead, LearnerBubble, TakuMessage, Thread, Typing } from "../components/Thread";
import { ChatList } from "../components/ChatList";
import { useMedia, useStored, WIDE } from "../components/hooks";
import { prettyPlain } from "../components/math";
import { Menu, Sheet } from "../components/ui";
import { copy } from "../copy/en";
import { WidgetHost } from "../widgets/WidgetHost";

/** Replies this old that never finished have lost their server, so the dots stop. */
const STUCK_MS = 3 * 60 * 1000;

/**
 * A normal chat with Taku, from general knowledge, on the same layout as a
 * notebook: the conversation scrolls on its own and the question box stays
 * docked. Past chats sit in a side list on wide screens.
 */
export default function Chat({ profile }: { profile: Doc<"profiles"> }) {
  const { chatId } = useParams();
  const id = chatId as Id<"chats"> | undefined;
  const data = useQuery(api.chat.chats.get, id !== undefined ? { chatId: id } : "skip");
  const { results: chats, status: chatsStatus, loadMore } = usePaginatedQuery(api.chat.chats.list, {}, { initialNumItems: 20 });
  const send = useAction(api.chat.chats.send);
  const start = useMutation(api.chat.chats.start);
  const remove = useMutation(api.chat.chats.remove);
  const setAnswerMode = useMutation(api.accounts.profiles.setAnswerMode);
  const track = useTrack();
  const navigate = useNavigate();
  const wide = useMedia(WIDE);
  const t = copy.chat;
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  // The past chats panel: open by default on wide screens, folded away when the learner wants the whole width. Kept on this device.
  const [listPref, setListPref] = useStored("takudzidza-chat-list");
  const listOpen = listPref !== "closed";
  const toggleList = () => setListPref(listOpen ? "closed" : "open");
  const [sheet, setSheet] = useState(false);
  useEffect(() => {
    // Ctrl B or Cmd B folds and opens the panel, as in most editors.
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b" && wide) {
        e.preventDefault();
        setListPref(listOpen ? "closed" : "open");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [wide, listOpen, setListPref]);
  const messages = data?.messages ?? [];
  const starters = copy.home.starters[profile.studyingFor ?? "olevel"];
  const last = messages[messages.length - 1];
  const empty = id === undefined && messages.length === 0 && pending === null;
  const latestTaku = messages.findLastIndex((m) => m.role !== "learner");
  // The question shows at once; its saved copy replaces this as soon as it arrives.
  const showPending = pending !== null && !messages.some((m) => m.role === "learner" && m.text === pending);

  const submit = async (text: string) => {
    const q = text.trim();
    if (q.length === 0 || pending !== null) return;
    setPending(q);
    setMessage("");
    setError(null);
    try {
      track("chat_sent");
      // A new chat exists first, so the reply can be watched as it arrives.
      const newId = id ?? (await start({ message: q }));
      if (id === undefined) navigate(`/chat/${newId}`, { replace: true });
      await send({ chatId: newId, message: q });
    } catch (e) {
      setError(errorText(e, copy.errors.generic));
      setMessage(q);
    } finally {
      setPending(null);
    }
  };

  const title = data?.chat.title ?? t.newChat;
  const listLabel = listOpen ? t.hideList : t.showList;
  const bar = (
    <>
      {!wide && (
        <Link to="/" className="topbar-mark" aria-label={`${copy.appName}, ${copy.nav.home}`}>
          <BrandMark />
        </Link>
      )}
      {wide ? (
        <button type="button" className="icon-button list-toggle" aria-label={listLabel} title={`${listLabel} (${t.shortcut})`} aria-expanded={listOpen} aria-controls="chat-list" onClick={toggleList}>
          {listOpen ? <PanelLeftClose size={20} aria-hidden="true" /> : <PanelLeftOpen size={20} aria-hidden="true" />}
        </button>
      ) : (
        <button type="button" className="icon-button" aria-label={t.openList} title={t.openList} onClick={() => setSheet(true)}>
          <MessagesSquare size={20} aria-hidden="true" />
        </button>
      )}
      <h1 className="bar-title">{prettyPlain(data?.chat.title ?? t.title)}</h1>
      <span className="spacer" />
      <Link to="/chat" className="pill ghost small">
        <Plus size={16} aria-hidden="true" />
        <span className="hide-narrow">{t.newChat}</span>
        <span className="sr-only show-narrow">{t.newChat}</span>
      </Link>
      {id !== undefined && (
        <Menu
          label={t.more}
          align="end"
          button={
            <span className="icon-button">
              <MoreHorizontal size={20} aria-hidden="true" />
            </span>
          }
        >
          {(close) => (
            <button type="button" role="menuitem" className="danger-item" onClick={() => (close(), void remove({ chatId: id }).then(() => navigate("/chat")))}>
              <Trash2 size={16} aria-hidden="true" /> {t.remove}
            </button>
          )}
        </Menu>
      )}
    </>
  );

  return (
    <AppShell scroll="panes" tabs={false} bar={bar} title={title}>
      <div className={`workspace chat-workspace${listOpen ? "" : " list-closed"}`}>
        {wide && (
          <aside className="chat-list" id="chat-list" aria-label={t.list} inert={!listOpen}>
            <div className="rail-head">
              <h2>{t.list}</h2>
            </div>
            <div className="rail-body">
              <ChatList chats={chats} current={id} canLoadMore={chatsStatus === "CanLoadMore"} onLoadMore={() => loadMore(20)} />
            </div>
          </aside>
        )}
        {!wide && sheet && (
          <Sheet title={t.list} onClose={() => setSheet(false)} testId="chat-sheet">
            <ChatList chats={chats} current={id} canLoadMore={chatsStatus === "CanLoadMore"} onLoadMore={() => loadMore(20)} onPick={() => setSheet(false)} />
          </Sheet>
        )}
        <section className="ws-center">
          <div className="chat-pane">
            <Thread follow={`${messages.length}:${last?.text.length ?? 0}:${pending ?? ""}`} testId="chat-thread" pin={!empty}>
              {empty && (
                <div className="chat-empty rise">
                  <ObjectArt name="speech-bubble" alt="" size={112} />
                  <h2>{t.emptyTitle}</h2>
                  <p className="lead soft">{t.emptyBody}</p>
                  <div className="chips">
                    {starters.map((s) => (
                      <button key={s} type="button" className="chip" onClick={() => void submit(s)}>
                        <Sparkles size={14} aria-hidden="true" /> {prettyPlain(s)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => {
                if (m.role === "learner") return <LearnerBubble key={m._id} text={m.text} testId="chat-learner" />;
                const stuck = m.streaming === true && now - m.createdAt > STUCK_MS;
                const live = m.streaming === true && !stuck;
                return (
                  <TakuMessage key={m._id} testId="chat-taku" streaming={live} latest={i === latestTaku}>
                    {live && m.text === "" && <Typing />}
                    <Markdown text={stuck && m.text === "" ? copy.notebook.stuck : m.text} />
                    {m.widget !== undefined && <WidgetHost widget={m.widget} />}
                    {m.kind === "help" && (
                      <Link to="/help" className="pill small">
                        {t.getHelp}
                      </Link>
                    )}
                    {m.kind === "answer" && m.streaming !== true && (
                      <div className="answer-actions">
                        <span className="general-note">{t.general}</span>
                        <button type="button" className="chip" onClick={() => void submit(copy.thread.simplerQuestion(previousQuestion(messages, m)))} disabled={pending !== null}>
                          <Sparkles size={15} aria-hidden="true" /> {copy.thread.simpler}
                        </button>
                        <span className="answer-tools">
                          <CopyAndRead text={m.text} />
                        </span>
                      </div>
                    )}
                  </TakuMessage>
                );
              })}
              {showPending && (
                <>
                  <LearnerBubble text={pending} testId="chat-learner-pending" />
                  <TakuMessage testId="chat-pending">
                    <Typing />
                  </TakuMessage>
                </>
              )}
            </Thread>
            <div className="dock">
              <Composer
                id="chat-input"
                label={t.placeholder}
                placeholder={t.placeholder}
                value={message}
                onChange={setMessage}
                onSend={() => void submit(message)}
                busy={pending !== null}
                sendLabel={t.send}
                answerMode={profile.answerMode}
                onAnswerMode={(answerMode) => void setAnswerMode({ answerMode })}
              />
              {error !== null && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function previousQuestion(messages: Doc<"chatMessages">[], answer: Doc<"chatMessages">): string {
  const i = messages.indexOf(answer);
  for (let j = i - 1; j >= 0; j--) if (messages[j].role === "learner") return messages[j].text;
  return "";
}
