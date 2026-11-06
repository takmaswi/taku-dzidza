import { useAction, useMutation, useQuery } from "convex/react";
import { MoreHorizontal, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { errorText } from "../access";
import { useTrack } from "../analytics";
import { Cutout } from "../components/Art";
import { BrandMark } from "../components/BrandMark";
import { Composer } from "../components/Composer";
import { AppShell } from "../components/Layout";
import { Markdown } from "../components/Markdown";
import { CopyAndRead, LearnerBubble, TakuMessage, Thread, Typing } from "../components/Thread";
import { useMedia, WIDE } from "../components/hooks";
import { Menu } from "../components/ui";
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
  const chats = useQuery(api.chat.chats.list);
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
  const bar = (
    <>
      {!wide && (
        <Link to="/" className="topbar-mark" aria-label={`${copy.appName}, ${copy.nav.home}`}>
          <BrandMark />
        </Link>
      )}
      <h1 className="bar-title">{data?.chat.title ?? t.title}</h1>
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
      <div className="workspace chat-workspace">
        {wide && (
          <aside className="chat-list" aria-label={t.list}>
            <div className="rail-head">
              <h2>{t.list}</h2>
            </div>
            <div className="rail-body">
              {(chats ?? []).length === 0 ? (
                <p className="soft small-text">{copy.home.noChats}</p>
              ) : (
                <ul className="past-chats">
                  {(chats ?? []).map((c) => (
                    <li key={c._id}>
                      <Link to={`/chat/${c._id}`} aria-current={c._id === id ? "page" : undefined}>
                        <b>{c.title}</b>
                        <small>{new Date(c.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        )}
        <section className="ws-center">
          <div className="chat-pane">
            <Thread follow={`${messages.length}:${last?.text.length ?? 0}:${pending ?? ""}`} testId="chat-thread" pin={!empty}>
              {empty && (
                <div className="chat-empty rise">
                  <Cutout slug="tile-ask" alt={t.emptyAlt} sizes="150px" className="chat-empty-art" />
                  <h2>{t.emptyTitle}</h2>
                  <p className="lead soft">{t.emptyBody}</p>
                  <div className="chips">
                    {starters.map((s) => (
                      <button key={s} type="button" className="chip" onClick={() => void submit(s)}>
                        <Sparkles size={14} aria-hidden="true" /> {s}
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
