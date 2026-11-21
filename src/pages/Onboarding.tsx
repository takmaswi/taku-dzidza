import { useMutation } from "convex/react";
import { ArrowLeft, Briefcase, Check, GraduationCap, Lightbulb, School, Sparkles } from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import type { SupportNeed } from "../../convex/accounts/voices";
import { BrandMark } from "../components/BrandMark";
import { SupportPicker, SupportSentence } from "../components/SupportPicker";
import { copy } from "../copy/en";

type StudyingFor = NonNullable<Doc<"profiles">["studyingFor"]>;
const FOR_ICONS: Record<StudyingFor, typeof School> = { olevel: School, alevel: GraduationCap, university: Sparkles, professional: Briefcase, learning: Lightbulb };

/**
 * Onboarding after sign up, one question per screen with a progress bar:
 * what you are studying for, then an optional "What gets in the way when you
 * study?". Skip at the top keeps the age based defaults.
 */
export default function Onboarding({ profile }: { profile: Doc<"profiles"> }) {
  const t = copy.onboarding;
  const setStudyingFor = useMutation(api.accounts.profiles.setStudyingFor);
  const finish = useMutation(api.accounts.profiles.finishOnboarding);
  const skip = useMutation(api.accounts.profiles.skipOnboarding);
  const steps = ["for", "support"] as const;
  const total = steps.length;
  const [step, setStep] = useState(0);
  const [support, setSupport] = useState<SupportNeed[]>(profile.support ?? []);

  const pickFor = (value: StudyingFor) => {
    void setStudyingFor({ studyingFor: value });
    setStep(step + 1);
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

      {steps[step] === "for" && (
        <section className="step-body step-in" key="for">
          <div>
            <span className="eyebrow">{t.stepLabel(step + 1, total)}</span>
            <h1>{t.forTitle}</h1>
            <p className="lead soft">{t.lead}</p>
          </div>
          <div className="choices three">
            {t.forOptions.map((o, i) => {
              const Icon = FOR_ICONS[o.value as StudyingFor];
              return (
                <button key={o.value} type="button" className="choice rise" style={{ ["--i" as string]: i }} aria-pressed={profile.studyingFor === o.value} onClick={() => pickFor(o.value as StudyingFor)}>
                  <span className="ct-icon">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <b>{o.label}</b>
                  <span>{o.line}</span>
                  <span className="ct-tick">
                    <Check size={14} aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {steps[step] === "support" && (
        <section className="step-body step-in" key="support">
          <div>
            <span className="eyebrow">{t.stepLabel(step + 1, total)}</span>
            <h1>{copy.support.title}</h1>
            <p className="lead soft">{copy.support.lead}</p>
          </div>
          <SupportPicker value={support} onChange={setSupport} label={copy.support.title} />
          <SupportSentence value={support} />
          <div className="actions">
            <button type="button" className="pill" onClick={() => void finish({ support })}>
              {t.start}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
