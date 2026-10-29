import { useMutation, useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Layout } from "../components/Layout";
import { copy } from "../copy/en";

/** Flashcard review: one card at a time, Show answer, then Got it or Try again (ts-fsrs schedules the next time). */
export default function Review() {
  const { id = "" } = useParams();
  const notebookId = id as Id<"notebooks">;
  const [now] = useState(() => Date.now());
  const due = useQuery(api.study.cards.due, { notebookId, now });
  const review = useMutation(api.study.cards.review);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
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
    setShown(false);
    setIndex(index + 1);
  };

  return (
    <Layout signedIn>
      <div className="narrow stack">
        <Link to={`/n/${id}?tab=tools`} className="back-link">
          <ArrowLeft size={18} aria-hidden="true" /> {t.back}
        </Link>
        <h1>{t.reviewTitle}</h1>
        {session === null && <p>{copy.loading}</p>}
        {session !== null && card === undefined && <p className="notice">{cards.length === 0 ? t.reviewNone : t.reviewDone}</p>}
        {card !== undefined && (
          <div className="flashcard card" data-testid="flashcard">
            <p className="soft small-text">
              {index + 1} / {cards.length}
            </p>
            <p className="flash-front">{card.front}</p>
            {shown ? (
              <>
                <p className="flash-back">{card.back}</p>
                <div className="actions">
                  <button type="button" className="pill" onClick={() => void answer(true)}>
                    {t.gotIt}
                  </button>
                  <button type="button" className="pill ghost" onClick={() => void answer(false)}>
                    {t.tryAgain}
                  </button>
                </div>
              </>
            ) : (
              <button type="button" className="pill" onClick={() => setShown(true)}>
                {t.showAnswer}
              </button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
