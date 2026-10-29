import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { scoreQuiz, type StudyStyle } from "../../convex/accounts/styles";
import { ImageSlot } from "../components/ImageSlot";
import { Layout } from "../components/Layout";
import { copy } from "../copy/en";

const STYLE_ART: Record<StudyStyle, { slug: string; alt: string }> = {
  locked_in: { slug: "style-locked-in", alt: "A woman reading printed notes at a clear desk, fully focused" },
  cook: { slug: "style-cook-mode", alt: "A teenage boy in a bright room celebrating a right answer on his phone" },
  calm: { slug: "style-calm", alt: "A man reading on a tablet in a quiet living room" },
};

/** The optional style quiz (SPEC.md 3.10). Skipping keeps the age based default. */
export default function StyleQuiz({ profile }: { profile: Doc<"profiles"> }) {
  const setStyle = useMutation(api.accounts.profiles.setStyle);
  const skip = useMutation(api.accounts.profiles.skipStyleQuiz);
  const t = copy.quiz;
  const [picks, setPicks] = useState<(StudyStyle | null)[]>(t.questions.map(() => null));
  const [result, setResult] = useState<StudyStyle | null>(null);
  const done = picks.every((p) => p !== null);

  if (result !== null) {
    const s = copy.styles[result];
    return (
      <Layout signedIn>
        <div className="narrow stack">
          <ImageSlot slug={STYLE_ART[result].slug} alt={STYLE_ART[result].alt} />
          <div className="card warm">
            <h1>{s.name}</h1>
            <p>{s.line}</p>
            <button className="pill" type="button" onClick={() => void setStyle({ studyStyle: result })}>
              {t.start}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout signedIn>
      <div className="narrow stack">
        <div>
          <h1>{t.title}</h1>
          <p className="soft">{t.lead}</p>
        </div>
        {t.questions.map((q, qi) => (
          <fieldset key={q.question} className="card" style={{ margin: 0 }}>
            <legend className="sr-only">{q.question}</legend>
            <h2>{q.question}</h2>
            <div className="choices">
              {q.options.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  className="choice"
                  aria-pressed={picks[qi] === o.style}
                  onClick={() => setPicks(picks.map((p, i) => (i === qi ? (o.style as StudyStyle) : p)))}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
        <div className="actions">
          <button className="pill" type="button" disabled={!done} onClick={() => setResult(scoreQuiz(picks.filter((p): p is StudyStyle => p !== null), profile.studyStyle))}>
            {t.done}
          </button>
          <button className="pill ghost" type="button" onClick={() => void skip({})}>
            {t.skip}
          </button>
        </div>
      </div>
    </Layout>
  );
}
