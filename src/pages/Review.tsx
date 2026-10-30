import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Check, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Layout } from "../components/Layout";
import { copy } from "../copy/en";

/**
 * Flashcard review. The card flips in 3D (perspective on the wrapper,
 * preserve 3d inside, hidden back faces) and fades instead when the learner
 * or the phone asks for less motion. Tap, Space or Enter flips it. Got it and
 * Try again feed ts-fsrs, which schedules the next time.
 */
export default function Review() {
  const { id = "" } = useParams();
  const notebookId = id as Id<"notebooks">;
  const [now] = useState(() => Date.now());
  const due = useQuery(api.study.cards.due, { notebookId, now });
  const review = useMutation(api.study.cards.review);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState({ got: 0, again: 0 });
  const t = copy.tools;
  // The set is fixed when the review starts: a reviewed card leaves the live due list.
  const [session, setSession] = useState<Doc<"cards">[] | null>(null);
  useEffect(() => {
    if (session === null && due !== undefined) setSession(due.cards);
  }, [due, session]);
  const cards = session ?? [];
  const card = cards[index];

  const answer = async (got: boolean) => {
    if (card === undefined) return;
    await review({ cardId: card._id, got });
    setDone({ got: done.got + (got ? 1 : 0), again: done.again + (got ? 0 : 1) });
    setShown(false);
    setIndex(index + 1);
  };

  return (
    <Layout signedIn>
      <div className="narrow stack">
        <Link to={`/n/${id}?tab=tools`} className="back-link">
          <ArrowLeft size={18} aria-hidden="true" /> {t.back}
        </Link>
        <div>
          <span className="eyebrow">{card !== undefined ? `${index + 1} / ${cards.length}` : t.reviewTitle}</span>
          <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 2.6rem)" }}>{t.reviewTitle}</h1>
        </div>
        {cards.length > 0 && (
          <div className="progress" aria-hidden="true">
            <span style={{ width: `${(Math.min(index, cards.length) / cards.length) * 100}%` }} />
          </div>
        )}
        {session === null && <p>{copy.loading}</p>}
        {session !== null && card === undefined && (
          <div className="card warm rise">
            <h2>{cards.length === 0 ? t.reviewNone : t.reviewDone}</h2>
            {cards.length > 0 && (
              <p className="eyebrow" style={{ margin: 0 }}>
                {t.gotIt}: {done.got} · {t.tryAgain}: {done.again}
              </p>
            )}
          </div>
        )}
        {card !== undefined && (
          <div data-testid="flashcard" className="stack">
            <p className="sr-only">
              {index + 1} / {cards.length}
            </p>
            <div
              className={`flip${shown ? " flipped" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={shown ? card.back : `${card.front}. ${t.showAnswer}`}
              onClick={() => setShown(!shown)}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  setShown(!shown);
                }
              }}
            >
              <div className="flip-inner">
                <div className="flip-face flip-front" aria-hidden={shown}>
                  <span className="eyebrow">Question</span>
                  <p>{card.front}</p>
                </div>
                <div className="flip-face flip-back" aria-hidden={!shown}>
                  <span className="eyebrow on-ink">Answer</span>
                  <p className="flash-back-text">{card.back}</p>
                </div>
              </div>
            </div>
            {shown ? (
              <div className="review-actions">
                <button type="button" className="pill ghost" onClick={() => void answer(false)}>
                  <RotateCcw size={18} aria-hidden="true" /> {t.tryAgain}
                </button>
                <button type="button" className="pill" onClick={() => void answer(true)}>
                  <Check size={18} aria-hidden="true" /> {t.gotIt}
                </button>
              </div>
            ) : (
              <button type="button" className="pill" style={{ width: "100%" }} onClick={() => setShown(true)}>
                {t.showAnswer}
              </button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
