import { useAction, useMutation, useQuery } from "convex/react";
import { ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useTrack } from "../analytics";
import { errorText } from "../access";
import { ImageSlot } from "../components/ImageSlot";
import { Layout } from "../components/Layout";
import { Markdown } from "../components/Markdown";
import { ReadAloud } from "../components/ReadAloud";
import { copy } from "../copy/en";
import { WidgetHost } from "../widgets/WidgetHost";

/** Replies this old that never finished have lost their server, so the dots stop. */
const STUCK_MS = 3 * 60 * 1000;

/** A normal chat with Taku, from general knowledge. Notebooks are for answers cited to your own notes. */
export default function Chat({ profile }: { profile: Doc<"profiles"> }) {
  const { chatId } = useParams();
  const id = chatId as Id<"chats"> | undefined;
  const data = useQuery(api.chat.chats.get, id !== undefined ? { chatId: id } : "skip");
  const chats = useQuery(api.chat.chats.list);
  const send = useAction(api.chat.chats.send);
  const start = useMutation(api.chat.chats.start);
  const track = useTrack();
  const remove = useMutation(api.chat.chats.remove);
  const setAnswerMode = useMutation(api.accounts.profiles.setAnswerMode);
  const navigate = useNavigate();
  const t = copy.chat;
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const messages = data?.messages ?? [];
  const starters = copy.home.starters[profile.studyingFor ?? "olevel"];
  const last = messages[messages.length - 1];
  const growing = last?.streaming === true ? last.text.length : 0;
  const empty = id === undefined && messages.length === 0 && pending === null;
  // The question shows at once; its saved copy replaces this as soon as it arrives.
  const showPending = pending !== null && !messages.some((m) => m.role === "learner" && m.text === pending);

  useEffect(() => {
    void end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, pending, growing]);

  const submit = async (text: string) => {
    const q = text.trim();
    if (q.length === 0 || pending !== null) return;
    setPending(q);
    setMessage("");
    setError(null);
    try {
      track("chat_sent");
      // A new chat exists first, so the reply can be watched as it arrives.
      const chatId = id ?? (await start({ message: q }));
      if (id === undefined) navigate(`/chat/${chatId}`, { replace: true });
      await send({ chatId, message: q });
    } catch (e) {
      setError(errorText(e, copy.errors.generic));
      setMessage(q);
    } finally {
      setPending(null);
    }
  };

  const composer = (
    <form
      className={`composer${empty ? "" : " chat-dock"}`}
      onSubmit={(e) => {
        e.preventDefault();
        void submit(message);
      }}
    >
      <label htmlFor="chat-input" className="sr-only">
        {t.placeholder}
      </label>
      <textarea
        id="chat-input"
        value={message}
        placeholder={t.placeholder}
        maxLength={2000}
        style={{ minHeight: 56 }}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit(message);
          }
        }}
      />
      <div className="composer-bar">
        <div className="mode-switch" role="group" aria-label={copy.notebook.answerTitle}>
          <button type="button" aria-pressed={profile.answerMode === "answer"} onClick={() => void setAnswerMode({ answerMode: "answer" })}>
            {copy.settings.answer.name}
          </button>
          <button type="button" aria-pressed={profile.answerMode === "guide"} onClick={() => void setAnswerMode({ answerMode: "guide" })}>
            {copy.settings.guide.name}
          </button>
        </div>
        <span className="spacer" />
        <button type="submit" className="pill small" disabled={pending !== null || message.trim().length === 0}>
          {t.send} <ArrowUp size={16} aria-hidden="true" />
        </button>
      </div>
    </form>
  );

  return (
    <Layout signedIn>
      <div className="chat-layout">
        <div>
          <div className="row-between" style={{ marginBottom: "1rem" }}>
            <div>
              <span className="eyebrow">{t.title}</span>
              <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.3rem)", margin: 0 }}>{data?.chat.title ?? t.emptyTitle}</h1>
            </div>
            {id !== undefined && (
              <button type="button" className="icon-button" aria-label={t.remove} onClick={() => void remove({ chatId: id }).then(() => navigate("/chat"))}>
                <Trash2 size={18} aria-hidden="true" />
              </button>
            )}
          </div>

          {empty && (
            <div className="chat-empty rise">
              <div className="chat-empty-photo">
                <ImageSlot slug="tile-ask" fallback="onboarding-2-senior-student" alt="A student asking a question on a phone" shape="arch" />
              </div>
              <p className="lead soft">{t.emptyBody}</p>
              {/* Part of the page here, not docked over it, so it never covers the intro or the starters on a small phone. */}
              {composer}
              <div className="chips">
                {starters.map((s) => (
                  <button key={s} type="button" className="chip" onClick={() => void submit(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="thread" aria-live="polite">
            {messages.map((m) => {
              const stuck = m.streaming === true && Date.now() - m.createdAt > STUCK_MS;
              const live = m.streaming === true && !stuck;
              return (
              <article key={m._id} className={`bubble ${m.role} rise`} data-testid={`chat-${m.role}`} data-streaming={live ? "true" : undefined}>
                <span className="who">{m.role === "learner" ? t.you : t.taku}</span>
                {live && m.text === "" && (
                  <div className="typing" aria-label={t.thinking}>
                    <span />
                    <span />
                    <span />
                  </div>
                )}
                {m.role === "taku" ? <Markdown text={stuck && m.text === "" ? copy.notebook.stuck : m.text} /> : <p style={{ margin: 0 }}>{m.text}</p>}
                {m.widget !== undefined && <WidgetHost widget={m.widget} />}
                {m.role === "taku" && m.kind === "answer" && m.streaming !== true && (
                  <p className="eyebrow" style={{ margin: "0.7rem 0 0" }}>
                    {t.general}
                  </p>
                )}
                {m.kind === "help" && (
                  <Link to="/help" className="pill small" style={{ marginTop: "0.6rem" }}>
                    {t.getHelp}
                  </Link>
                )}
                {m.role === "taku" && m.streaming !== true && profile.accessibility.readAloud && <ReadAloud text={m.text} />}
              </article>
              );
            })}
            {showPending && (
              <>
                <article className="bubble learner rise">
                  <span className="who">{t.you}</span>
                  <p style={{ margin: 0 }}>{pending}</p>
                </article>
                <div className="typing" aria-label={t.thinking}>
                  <span />
                  <span />
                  <span />
                </div>
              </>
            )}
            <div ref={end} />
          </div>

          {!empty && composer}
          {error !== null && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>

        <aside className="chat-side">
          <div className="row-between" style={{ alignItems: "center" }}>
            <h3>{t.list}</h3>
            <Link to="/chat" className="icon-button" aria-label={t.newChat}>
              <Plus size={18} aria-hidden="true" />
            </Link>
          </div>
          <ul className="list-rows">
            {(chats ?? []).map((c) => (
              <li key={c._id}>
                <Link to={`/chat/${c._id}`} aria-current={c._id === id ? "page" : undefined}>
                  <span className="grow">
                    <b>{c.title}</b>
                    <span className="meta">{new Date(c.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </Layout>
  );
}
