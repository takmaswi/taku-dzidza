import { useMutation } from "convex/react";
import { ArrowLeft, Briefcase, GraduationCap, Lightbulb, School, Sparkles } from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { scoreQuiz, type StudyStyle } from "../../convex/accounts/styles";
import { BrandMark } from "../components/BrandMark";
import { StylePicker } from "../components/StylePicker";
import { copy } from "../copy/en";
import { applyTheme } from "../theme";

type StudyingFor = NonNullable<Doc<"profiles">["studyingFor"]>;
const FOR_ICONS: Record<StudyingFor, typeof School> = { olevel: School, alevel: GraduationCap, university: Sparkles, professional: Briefcase, learning: Lightbulb };

/**
 * Onboarding after sign up: what you are studying for, three quick style
 * questions, then your style on photo cards. One question per screen with a
 * progress bar (the goal step makes a small commitment, as Duolingo does).
 * Skipping keeps the age based default.
 */
export default function StyleQuiz({ profile }: { profile: Doc<"profiles"> }) {
  const t = copy.quiz;
  const setStyle = useMutation(api.accounts.profiles.setStyle);
  const setStudyingFor = useMutation(api.accounts.profiles.setStudyingFor);
  const skip = useMutation(api.accounts.profiles.skipStyleQuiz);
  const total = t.questions.length + 2;
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<(StudyStyle | null)[]>(t.questions.map(() => null));
  const [chosen, setChosen] = useState<StudyStyle>(profile.studyStyle);

  const preview = (s: StudyStyle) => {
    setChosen(s);
    applyTheme({ studyStyle: s, accessibility: profile.accessibility });
  };

  const pickFor = (value: StudyingFor) => {
    void setStudyingFor({ studyingFor: value });
    setStep(1);
  };

  const answer = (qi: number, s: StudyStyle) => {
    const next = picks.map((p, i) => (i === qi ? s : p));
    setPicks(next);
    if (qi === t.questions.length - 1) {
      preview(scoreQuiz(next.filter((p): p is StudyStyle => p !== null), profile.studyStyle));
      setStep(total - 1);
    } else setStep(step + 1);
  };

  return (
    <div className="steps-shell">
      <header className="steps-top">
        {step > 0 ? (
          <button type="button" className="icon-button" aria-label={t.back} onClick={() => setStep(step - 1)}>
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
        ) : (
          <BrandMark />
        )}
        <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1} aria-label={t.stepLabel(step + 1, total)}>
          <span style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>
        <button type="button" className="link" onClick={() => void skip({})}>
          {t.skip}
        </button>
      </header>

      {step === 0 && (
        <section className="step-body step-in" key="for">
          <div>
            <span className="eyebrow">{t.stepLabel(1, total)}</span>
            <h1>{t.forTitle}</h1>
            <p className="lead soft">{t.lead}</p>
          </div>
          <div className="answer-cards">
            {t.forOptions.map((o, i) => {
              const Icon = FOR_ICONS[o.value as StudyingFor];
              return (
                <button key={o.value} type="button" className="answer-card rise" style={{ ["--i" as string]: i }} aria-pressed={profile.studyingFor === o.value} onClick={() => pickFor(o.value as StudyingFor)}>
                  <span className="ac-icon">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <b>{o.label}</b>
                  <span className="soft">{o.line}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {step >= 1 && step <= t.questions.length && (
        <section className="step-body step-in" key={`q${step}`}>
          <div>
            <span className="eyebrow">{t.stepLabel(step + 1, total)}</span>
            <h1>{t.questions[step - 1].question}</h1>
          </div>
          <div className="answer-cards">
            {t.questions[step - 1].options.map((o, i) => (
              <button key={o.label} type="button" className="answer-card rise" style={{ ["--i" as string]: i }} aria-pressed={picks[step - 1] === o.style} onClick={() => answer(step - 1, o.style as StudyStyle)}>
                <b>{o.label}</b>
                <span className="soft">{o.line}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === total - 1 && (
        <section className="step-body step-in" key="result">
          <div>
            <span className="eyebrow">{t.resultEyebrow}</span>
            <h1>{copy.styles[chosen].name}</h1>
            <p className="lead soft">{copy.landing.stylesBody}</p>
          </div>
          <StylePicker value={chosen} onPick={preview} />
          <div className="actions">
            <button type="button" className="pill" onClick={() => void setStyle({ studyStyle: chosen })}>
              {t.start}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
