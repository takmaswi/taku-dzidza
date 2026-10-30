import { useAction, useMutation, useQuery } from "convex/react";
import { ArrowRight, ArrowUp, BookOpen, FileUp, Layers, ListChecks, Plus, ScrollText, Sparkles } from "lucide-react";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { errorText } from "../access";
import { ImageSlot } from "../components/ImageSlot";
import { Layout } from "../components/Layout";
import { copy } from "../copy/en";

const NB_COLOURS = ["var(--butter)", "var(--sage-tint)", "var(--msasa-tint)", "var(--honey)"];

function today(): string {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

/**
 * Home: one big action first (ask Taku), then the notes based tools as
 * tiles, then what is waiting (cards due, notebooks, chats). Research: the
 * strongest study apps open on the main action plus a few input cards, and a
 * sample notebook fixes the empty start.
 */
export default function Home({ profile }: { profile: Doc<"profiles"> }) {
  const t = copy.home;
  const navigate = useNavigate();
  const send = useAction(api.chat.chats.send);
  const setAnswerMode = useMutation(api.accounts.profiles.setAnswerMode);
  const createNotebook = useMutation(api.notebooks.notebooks.create);
  const createSample = useMutation(api.notebooks.sample.create);
  const notebooks = useQuery(api.notebooks.notebooks.list);
  const chats = useQuery(api.chat.chats.list);
  const [now] = useState(() => Date.now());
  const due = useQuery(api.study.cards.dueCount, { now });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [pickFor, setPickFor] = useState<"test" | "cards" | "scroll" | null>(null);
  const starters = t.starters[profile.studyingFor ?? "olevel"];
  const style = copy.styles[profile.studyStyle];
  const readyNotebooks = (notebooks ?? []).filter((n) => n.sourceCount > 0);

  const ask = async (text: string) => {
    if (text.trim().length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { chatId } = await send({ message: text });
      navigate(`/chat/${chatId}`);
    } catch (e) {
      setError(errorText(e, copy.errors.generic));
      setBusy(false);
    }
  };

  const openTool = (tool: "test" | "cards" | "scroll") => {
    if (readyNotebooks.length === 1) navigate(`/n/${readyNotebooks[0]._id}?tab=tools&tool=${tool}`);
    else setPickFor(tool);
  };

  const newNotebook = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = String(new FormData(event.currentTarget).get("title") ?? "");
    try {
      const id = await createNotebook({ title });
      navigate(`/n/${id}`);
    } catch (e) {
      setError(errorText(e, copy.errors.generic));
    }
  };

  return (
    <Layout signedIn>
      <div className="stack-lg">
        <section className="home-head">
          <div className="stack rise">
            <span className="eyebrow">{today()}</span>
            <h1>{t.greeting(profile.displayName)}</h1>
            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                void ask(message);
              }}
            >
              <label htmlFor="home-ask" className="sr-only">
                {t.askPlaceholder}
              </label>
              <textarea
                id="home-ask"
                value={message}
                placeholder={t.askPlaceholder}
                maxLength={2000}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void ask(message);
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
                <button type="button" className="pill ghost small" onClick={() => setNewOpen(true)}>
                  <FileUp size={16} aria-hidden="true" /> {t.attach}
                </button>
                <button type="submit" className="pill small" disabled={busy || message.trim().length === 0}>
                  {busy ? copy.chat.thinking : t.send} <ArrowUp size={16} aria-hidden="true" />
                </button>
              </div>
            </form>
            <div className="chips">
              {starters.map((s, i) => (
                <button key={s} type="button" className="chip rise" style={{ ["--i" as string]: i + 2 }} onClick={() => void ask(s)} disabled={busy}>
                  {s}
                </button>
              ))}
            </div>
            {error !== null && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="home-photo rise" style={{ ["--i" as string]: 3 }}>
            <ImageSlot slug="tile-ask" fallback="onboarding-1-secondary-student" alt="A student typing a question on her phone at her desk" shape="arch" eager />
          </div>
        </section>

        {due !== undefined && due.count > 0 && (
          <section className="due-banner rise grain">
            <div>
              <b>{t.dueTitle(due.count)}</b>
              <p className="eyebrow on-ink" style={{ margin: "0.3rem 0 0" }}>
                {t.dueBody}
              </p>
            </div>
            <Link to={due.notebookId !== null ? `/n/${due.notebookId}/review` : "/notebooks"} className="pill honey">
              {t.dueCta} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </section>
        )}

        <section>
          <div className="section-head">
            <h2>{t.tilesTitle}</h2>
          </div>
          <div className="bento">
            <button type="button" className="tile photo t-wide rise" style={{ ["--i" as string]: 1 }} onClick={() => setNewOpen(true)}>
              <span className="tile-photo">
                <ImageSlot slug="empty-notebook" alt="" />
              </span>
              <span className="tile-icon">
                <FileUp size={22} aria-hidden="true" />
              </span>
              <h3>{t.tiles.notes.title}</h3>
              <p>{t.tiles.notes.body}</p>
            </button>
            <button type="button" className="tile photo t-tall rise" style={{ ["--i" as string]: 2 }} onClick={() => openTool("test")}>
              <span className="tile-photo">
                <ImageSlot slug="empty-quiz" fallback="exam-coach" alt="" />
              </span>
              <span className="tile-icon">
                <ListChecks size={22} aria-hidden="true" />
              </span>
              <h3>{t.tiles.test.title}</h3>
              <p>{t.tiles.test.body}</p>
            </button>
            <button type="button" className="tile sage rise" style={{ ["--i" as string]: 3 }} onClick={() => openTool("cards")}>
              <span className="tile-icon">
                <Layers size={22} aria-hidden="true" />
              </span>
              <h3>{t.tiles.cards.title}</h3>
              <p>{t.tiles.cards.body}</p>
            </button>
            <button type="button" className="tile ink rise" style={{ ["--i" as string]: 4 }} onClick={() => openTool("scroll")}>
              <span className="scroll-sample">{t.tiles.scroll.sample}</span>
              <h3>
                <ScrollText size={18} aria-hidden="true" /> {t.tiles.scroll.title}
              </h3>
              <p style={{ color: "var(--on-ink-soft)" }}>{t.tiles.scroll.body}</p>
            </button>
            <button type="button" className="tile butter t-half rise" style={{ ["--i" as string]: 5 }} onClick={() => void createSample({}).then((id) => navigate(`/n/${id}`))}>
              <span className="tile-icon">
                <Sparkles size={22} aria-hidden="true" />
              </span>
              <h3>{t.tiles.sample.title}</h3>
              <p>{t.tiles.sample.body}</p>
            </button>
            <Link to="/settings" className="tile msasa t-half rise" style={{ ["--i" as string]: 6 }}>
              <span className="tag light" style={{ position: "absolute", top: "1rem", left: "1rem" }}>
                {t.styleTitle}
              </span>
              <h3>{style.name}</h3>
              <p>{t.change}</p>
            </Link>
          </div>
        </section>

        {pickFor !== null && (
          <section className="card rise">
            <h2>{readyNotebooks.length === 0 ? t.needNotes : t.pickNotebook}</h2>
            <div className="chips">
              {readyNotebooks.map((nb) => (
                <Link key={nb._id} className="chip" to={`/n/${nb._id}?tab=tools&tool=${pickFor}`}>
                  {nb.title}
                </Link>
              ))}
              {readyNotebooks.length === 0 && (
                <button type="button" className="pill small" onClick={() => setNewOpen(true)}>
                  <FileUp size={16} aria-hidden="true" /> {t.tiles.notes.title}
                </button>
              )}
              <button type="button" className="pill ghost small" onClick={() => setPickFor(null)}>
                {t.cancel}
              </button>
            </div>
          </section>
        )}

        {newOpen && (
          <section className="card rise">
            <form onSubmit={newNotebook} className="stack">
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="title">{t.newName}</label>
                <input id="title" name="title" type="text" placeholder={t.newPlaceholder} maxLength={80} required autoFocus />
              </div>
              <div className="actions">
                <button className="pill" type="submit">
                  {t.create}
                </button>
                <button className="pill ghost" type="button" onClick={() => setNewOpen(false)}>
                  {t.cancel}
                </button>
              </div>
            </form>
          </section>
        )}

        <section>
          <div className="section-head">
            <h2>{t.notebooksTitle}</h2>
            <Link to="/notebooks" className="link">
              {t.seeAll}
            </Link>
          </div>
          <div className="rail">
            {(notebooks ?? []).map((nb, i) => (
              <Link key={nb._id} to={`/n/${nb._id}`} className="nb-card" style={{ ["--nb" as string]: NB_COLOURS[i % NB_COLOURS.length] }}>
                <BookOpen size={20} aria-hidden="true" style={{ position: "relative" }} />
                <span>
                  <b>{nb.title}</b>
                  <br />
                  <span className="eyebrow" style={{ margin: 0 }}>
                    {t.sources(nb.sourceCount)}
                  </span>
                </span>
              </Link>
            ))}
            <button type="button" className="nb-card new" onClick={() => setNewOpen(true)}>
              <Plus size={22} aria-hidden="true" /> {t.newNotebook}
            </button>
          </div>
        </section>

        <section>
          <div className="section-head">
            <h2>{t.chatsTitle}</h2>
            <Link to="/chat" className="link">
              {copy.chat.newChat}
            </Link>
          </div>
          {chats !== undefined && chats.length === 0 ? (
            <p className="soft">{t.noChats}</p>
          ) : (
            <ul className="list-rows">
              {(chats ?? []).slice(0, 5).map((c) => (
                <li key={c._id}>
                  <Link to={`/chat/${c._id}`}>
                    <span className="grow">
                      <b>{c.title}</b>
                      <span className="meta">{new Date(c.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                    </span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Layout>
  );
}
