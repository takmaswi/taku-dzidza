import { useAction, useMutation } from "convex/react";
import { Layers, ListChecks, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { errorText } from "../../access";
import { useTrack } from "../../analytics";
import { Composer } from "../../components/Composer";
import { MathText } from "../../components/MathText";
import { CopyAndRead, InfoNote, LearnerBubble, Stages, TakuMessage, Thread } from "../../components/Thread";
import { copy } from "../../copy/en";
import { WidgetHost } from "../../widgets/WidgetHost";

type Origin = { kind: "source"; sourceId: string; page: number; quote: string } | { kind: "added"; unchecked?: boolean };
export type Citation = { sourceId: Id<"sources">; page: number; quote: string };
/** An answer this old that never finished has lost its server, so the progress line stops. */
const STUCK_MS = 3 * 60 * 1000;

/** The notebook chat: the conversation scrolls on its own, the question box stays docked below it. */
export function NotebookChat({
  notebook,
  profile,
  messages,
  titles,
  onCite,
}: {
  notebook: Doc<"notebooks">;
  profile: Doc<"profiles">;
  messages: Doc<"messages">[];
  titles: Map<string, string>;
  onCite: (c: Citation) => void;
}) {
  const t = copy.notebook;
  const ask = useAction(api.notebooks.ask.ask);
  const setSourceMode = useMutation(api.notebooks.notebooks.setSourceMode);
  const setAnswerMode = useMutation(api.accounts.profiles.setAnswerMode);
  const track = useTrack();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRecord = Object.fromEntries(titles);
  const working = messages[messages.length - 1]?.stage !== undefined;
  const [now] = useState(() => Date.now());

  const send = async (text: string) => {
    if (text.trim().length === 0 || busy) return;
    setBusy(true);
    setError(null);
    track("question_asked");
    setQuestion("");
    try {
      await ask({ notebookId: notebook._id, question: text });
    } catch (e) {
      setQuestion(text);
      setError(errorText(e, copy.errors.generic));
    } finally {
      setBusy(false);
    }
  };

  const lastLength = messages.length + (messages[messages.length - 1]?.parts?.length ?? 0);
  const latestTaku = messages.findLastIndex((m) => m.role !== "learner");
  return (
    <div className="chat-pane">
      <Thread follow={`${lastLength}:${messages[messages.length - 1]?.stage ?? ""}`} testId="notebook-thread">
        {messages.length === 0 && (
          <div className="thread-intro">
            <p className="lead">{t.chatIntro}</p>
          </div>
        )}
        {messages.map((m, i) => {
          if (m.role === "learner") return <LearnerBubble key={m._id} text={m.text} testId="message-learner" />;
          const asked = messages[i - 1]?.role === "learner" ? messages[i - 1].text : "";
          return <Answer key={m._id} message={m} asked={asked} notebookId={notebook._id} titles={titles} titleRecord={titleRecord} onCite={onCite} onAsk={send} latest={i === latestTaku} stuck={m.stage !== undefined && now - m.createdAt > STUCK_MS} />;
        })}
        {busy && !working && (
          <TakuMessage testId="message-pending">
            <Stages stage="reading" stuck={false} />
          </TakuMessage>
        )}
      </Thread>
      <div className="dock">
        <Composer
          id="question"
          label={t.askLabel}
          placeholder={t.askPlaceholder}
          value={question}
          onChange={setQuestion}
          onSend={() => void send(question)}
          busy={busy}
          sendLabel={t.ask}
          answerMode={profile.answerMode}
          onAnswerMode={(answerMode) => void setAnswerMode({ answerMode })}
          sourceMode={notebook.sourceMode}
          onSourceMode={(sourceMode) => void setSourceMode({ notebookId: notebook._id, sourceMode })}
        />
        {error !== null && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function Answer({
  message: m,
  asked,
  notebookId,
  titles,
  titleRecord,
  onCite,
  onAsk,
  stuck,
  latest,
}: {
  message: Doc<"messages">;
  asked: string;
  notebookId: Id<"notebooks">;
  titles: Map<string, string>;
  titleRecord: Record<string, string>;
  onCite: (c: Citation) => void;
  onAsk: (text: string) => Promise<void>;
  stuck: boolean;
  latest: boolean;
}) {
  const t = copy.notebook;
  // One number per distinct quote, in the order they first appear.
  const numbers = new Map<string, number>();
  for (const p of m.parts ?? []) {
    const o = p.origin as Origin;
    if (o.kind === "source") {
      const key = `${o.sourceId}|${o.page}|${o.quote}`;
      if (!numbers.has(key)) numbers.set(key, numbers.size + 1);
    }
  }
  const plain = [m.text, ...(m.parts ?? []).map((p) => p.text)].filter((x) => x !== "").join(" ");
  const done = m.stage === undefined;
  return (
    <TakuMessage testId="message-taku" latest={latest}>
      {m.stage !== undefined && <Stages stage={m.stage} stuck={stuck} />}
      {m.text !== "" && <p>{m.text}</p>}
      {(m.parts?.length ?? 0) > 0 && (
        <div className="answer-text">
          {m.parts!.map((part, i) => {
            const o = part.origin as Origin;
            if (o.kind === "added") {
              return (
                <p key={i} className="part added">
                  <MathText text={part.text} /> <span className="added-tag">{o.unchecked === true ? t.uncheckedByTaku : t.addedByTaku}</span>
                </p>
              );
            }
            const n = numbers.get(`${o.sourceId}|${o.page}|${o.quote}`) ?? 0;
            const title = titles.get(o.sourceId) ?? "";
            return (
              <p key={i} className="part">
                <MathText text={part.text} />
                <button type="button" className="cite-mark" aria-label={t.citeLabel(n, title, o.page)} title={t.fromPage(title, o.page)} onClick={() => onCite({ sourceId: o.sourceId as Id<"sources">, page: o.page, quote: o.quote })}>
                  {n}
                </button>
              </p>
            );
          })}
        </div>
      )}
      {m.widget !== undefined && <WidgetHost widget={m.widget} titles={titleRecord} />}
      {m.kind === "help" && (
        <Link to="/help" className="pill small">
          {t.getHelp}
        </Link>
      )}
      {done && m.kind === "answer" ? <AnswerActions notebookId={notebookId} asked={asked} text={plain} note={m.note} onAsk={onAsk} /> : m.note !== undefined && <InfoNote text={m.note} />}
    </TakuMessage>
  );
}

/** Under each answer: the next step. Quiz, flashcards, a simpler explanation, how it was checked, copy and read aloud. */
function AnswerActions({ notebookId, asked, text, note, onAsk }: { notebookId: Id<"notebooks">; asked: string; text: string; note?: string; onAsk: (text: string) => Promise<void> }) {
  const t = copy.thread;
  const generate = useAction(api.study.tools.generate);
  const navigate = useNavigate();
  const track = useTrack();
  const [making, setMaking] = useState<"quiz" | "flashcards" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const make = async (mode: "quiz" | "flashcards") => {
    setMaking(mode);
    setError(null);
    try {
      const options = mode === "quiz" ? { count: 4, difficulty: "medium", minutes: 15 } : { count: 5, difficulty: "medium" };
      const result = await generate({ notebookId, mode, options });
      if (!result.ok) return setError(result.message);
      track("tool_made");
      navigate(mode === "flashcards" ? `/n/${notebookId}/review` : `/n/${notebookId}/o/${result.outputId}`);
    } catch (e) {
      setError(errorText(e, copy.errors.generic));
    } finally {
      setMaking(null);
    }
  };

  return (
    <div className="answer-actions">
      <span className="action-chips">
      <button type="button" className="chip" disabled={making !== null} onClick={() => void make("quiz")}>
        <ListChecks size={15} aria-hidden="true" /> {making === "quiz" ? copy.tools.making : t.quizMe}
      </button>
      <button type="button" className="chip" disabled={making !== null} onClick={() => void make("flashcards")}>
        <Layers size={15} aria-hidden="true" /> {making === "flashcards" ? copy.tools.making : t.fiveCards}
      </button>
      {asked !== "" && (
        <button type="button" className="chip" disabled={making !== null} onClick={() => void onAsk(t.simplerQuestion(asked))}>
          <Sparkles size={15} aria-hidden="true" /> {t.simpler}
        </button>
      )}
      </span>
      <span className="answer-tools">
        {note !== undefined && <InfoNote text={note} />}
        <CopyAndRead text={text} />
      </span>
      {error !== null && (
        <p className="error small-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
