import { useAction, useMutation, useQuery } from "convex/react";
import { ArrowRight, BookOpen, Check, Circle, FileUp, MessageCircle, Plus, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { errorText } from "../access";
import { useTrack } from "../analytics";
import { Decor, Scene } from "../components/Art";
import { Composer } from "../components/Composer";
import { AppShell } from "../components/Layout";
import { copy } from "../copy/en";

function today(): string {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

/**
 * Home is a dashboard, not a poster: a short greeting, the ask box, where to
 * carry on, cards due today, then starter questions and notebooks. The
 * dashboard scene is an accent. Two decor pieces at most: the highlighter
 * under the greeting and the sticky note on cards due.
 */
export default function Home({ profile }: { profile: Doc<"profiles"> }) {
  const t = copy.home;
  const navigate = useNavigate();
  const send = useAction(api.chat.chats.send);
  const start = useMutation(api.chat.chats.start);
  const firstRun = useQuery(api.accounts.progress.firstRun);
  const track = useTrack();
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
  const [pickFor, setPickFor] = useState<"cards" | null>(null);
  const starters = t.starters[profile.studyingFor ?? "olevel"];
  const readyNotebooks = (notebooks ?? []).filter((n) => n.sourceCount > 0);
  const lastNotebook = [...(notebooks ?? [])].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const lastChat = chats?.[0];

  const ask = async (text: string) => {
    if (text.trim().length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      track("chat_sent");
      // Open the chat straight away and let the reply arrive there.
      const chatId = await start({ message: text });
      void send({ chatId, message: text }).catch(() => undefined);
      navigate(`/chat/${chatId}`);
    } catch (e) {
      setError(errorText(e, copy.errors.generic));
      setBusy(false);
    }
  };

  const openCards = () => {
    if (readyNotebooks.length === 1) navigate(`/n/${readyNotebooks[0]._id}?tab=tools&tool=cards`);
    else setPickFor("cards");
  };

  const newNotebook = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = String(new FormData(event.currentTarget).get("title") ?? "");
    try {
      const id = await createNotebook({ title });
      track("notebook_created");
      navigate(`/n/${id}`);
    } catch (e) {
      setError(errorText(e, copy.errors.generic));
    }
  };

  const [first, ...rest] = t.greetingParts(profile.displayName);
  return (
    <AppShell title={t.title}>
      <div className="home">
        <section className="home-hero">
          <div className="home-ask rise">
            <span className="eyebrow">{today()}</span>
            <h1>
              {first} <span className="highlight">{t.greetingWord}</span> {rest.join(" ")}
            </h1>
            <Composer
              id="home-ask"
              label={t.askPlaceholder}
              placeholder={t.askPlaceholder}
              value={message}
              onChange={setMessage}
              onSend={() => void ask(message)}
              busy={busy}
              sendLabel={t.send}
              answerMode={profile.answerMode}
              onAnswerMode={(answerMode) => void setAnswerMode({ answerMode })}
              extra={
                <button type="button" className="icon-button" onClick={() => setNewOpen(true)}>
                  <FileUp size={16} aria-hidden="true" /> <span className="hide-narrow">{t.attach}</span>
                </button>
              }
            />
            {error !== null && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
          <Scene slug="home-dashboard" alt={t.sceneAlt} sizes="(min-width: 1100px) 420px, 0px" eager className="home-scene" />
        </section>

        {newOpen && (
          <form onSubmit={newNotebook} className="panel new-notebook rise">
            <div className="field">
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
        )}

        <div className="home-grid">
          {(lastNotebook !== undefined || lastChat !== undefined) && (
            <section className="panel continue rise" aria-labelledby="continue">
              <h2 id="continue">{t.continueTitle}</h2>
              <div className="continue-list">
                {lastNotebook !== undefined && (
                  <Link to={`/n/${lastNotebook._id}`} className="continue-item lift">
                    <span className="ct-icon">
                      <BookOpen size={18} aria-hidden="true" />
                    </span>
                    <span>
                      <b>{lastNotebook.title}</b>
                      <small>{t.sources(lastNotebook.sourceCount)}</small>
                    </span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                )}
                {lastChat !== undefined && (
                  <Link to={`/chat/${lastChat._id}`} className="continue-item lift">
                    <span className="ct-icon">
                      <MessageCircle size={18} aria-hidden="true" />
                    </span>
                    <span>
                      <b>{lastChat.title}</b>
                      <small>{copy.nav.chat}</small>
                    </span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                )}
              </div>
            </section>
          )}

          <section className={`panel due-today rise${due !== undefined && due.count > 0 ? " has-due" : ""}`} aria-labelledby="due">
            {due !== undefined && due.count > 0 && <Decor name="sticky-note-butter" className="due-note" />}
            <div className="due-text">
              <h2 id="due">{t.dueToday}</h2>
              {due !== undefined && due.count > 0 ? (
                <>
                  <p>{t.dueTitle(due.count)}</p>
                  <Link to={due.notebookId !== null ? `/n/${due.notebookId}/review` : "/notebooks"} className="pill small">
                    {copy.tools.startReview} <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </>
              ) : (
                <p className="soft">{t.noneDue}</p>
              )}
            </div>
          </section>

          {firstRun !== undefined && !(firstRun.addedNotes && firstRun.asked && firstRun.madeCards) && (
            <section className="panel checklist rise" aria-labelledby="first-run">
              <h2 id="first-run">{copy.firstRun.title}</h2>
              <ol>
                {[
                  { done: firstRun.addedNotes, step: copy.firstRun.notes, go: () => setNewOpen(true) },
                  { done: firstRun.asked, step: copy.firstRun.ask, go: () => navigate("/chat") },
                  { done: firstRun.madeCards, step: copy.firstRun.cards, go: openCards },
                ].map(({ done, step, go }) => (
                  <li key={step.label} className={done ? "done" : undefined}>
                    <span className="status">
                      {done ? <Check size={18} aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />}
                      <span className="status-label">{done ? copy.firstRun.done : copy.firstRun.todo}</span>
                    </span>
                    <span className="grow">
                      <b>{step.label}</b>
                      <small className="soft">{step.line}</small>
                    </span>
                    {!done && (
                      <button type="button" className="pill ghost small" aria-label={`${copy.firstRun.go}: ${step.label}`} onClick={go}>
                        {copy.firstRun.go}
                      </button>
                    )}
                  </li>
                ))}
              </ol>
              {pickFor !== null && (
                <div className="pick">
                  <b>{readyNotebooks.length === 0 ? t.needNotes : t.pickNotebook}</b>
                  <div className="chips">
                    {readyNotebooks.map((nb) => (
                      <Link key={nb._id} className="chip" to={`/n/${nb._id}?tab=tools&tool=${pickFor}`}>
                        {nb.title}
                      </Link>
                    ))}
                    <button type="button" className="chip" onClick={() => setPickFor(null)}>
                      {t.cancel}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        <section className="home-section">
          <h2>{t.startersTitle}</h2>
          <div className="chips">
            {starters.map((s, i) => (
              <button key={s} type="button" className="chip rise" style={{ ["--i" as string]: i }} onClick={() => void ask(s)} disabled={busy}>
                <Sparkles size={14} aria-hidden="true" /> {s}
              </button>
            ))}
          </div>
        </section>

        <section className="home-section">
          <div className="row-between">
            <h2>{t.notebooksTitle}</h2>
            <Link to="/notebooks" className="link">
              {t.seeAll}
            </Link>
          </div>
          <div className="nb-row">
            {(notebooks ?? []).slice(0, 6).map((nb) => (
              <Link key={nb._id} to={`/n/${nb._id}`} className="nb-card lift">
                <span className="ct-icon">
                  <BookOpen size={18} aria-hidden="true" />
                </span>
                <b>{nb.title}</b>
                <small>{t.sources(nb.sourceCount)}</small>
              </Link>
            ))}
            <button type="button" className="nb-card new" onClick={() => setNewOpen(true)}>
              <Plus size={20} aria-hidden="true" /> {t.newNotebook}
            </button>
            {(notebooks ?? []).length === 0 && (
              <button type="button" className="nb-card new" onClick={() => void createSample({}).then((id) => navigate(`/n/${id}`))}>
                <Sparkles size={20} aria-hidden="true" /> {t.tiles.sample.title}
              </button>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
