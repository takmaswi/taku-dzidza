import { Check } from "lucide-react";
import type { StudyStyle } from "../../convex/accounts/styles";
import { copy } from "../copy/en";
import { Cutout } from "./Art";
import { STYLE_ART } from "./styleArt";

const STYLES = ["locked_in", "cook", "calm"] as const;

export function StylePicker({ value, onPick, compact = false }: { value: StudyStyle; onPick: (s: StudyStyle) => void; compact?: boolean }) {
  if (compact) {
    // For Settings: choice cards with no photos. The photo cards belong to onboarding.
    return (
      <div className="choices three" role="radiogroup" aria-label={copy.home.styleTitle}>
        {STYLES.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={value === s} className="choice" onClick={() => onPick(s)}>
            <b>{copy.styles[s].name}</b>
            <span>{copy.styles[s].line}</span>
            <span className="ct-tick">
              <Check size={14} aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="style-cards" role="radiogroup" aria-label={copy.home.styleTitle}>
      {STYLES.map((s, i) => (
        <button key={s} type="button" role="radio" aria-checked={value === s} aria-pressed={value === s} className={`style-card ${STYLE_ART[s].cls} rise`} style={{ ["--i" as string]: i }} onClick={() => onPick(s)}>
          <Cutout slug={STYLE_ART[s].slug} alt={STYLE_ART[s].alt} sizes="(min-width: 760px) 260px, 70vw" />
          <span className="ct-tick">
            <Check size={16} aria-hidden="true" />
          </span>
          <span className="sc-body">
            <span className="tag">{copy.styles[s].tag}</span>
            <b>{copy.styles[s].name}</b>
            <span>{copy.styles[s].line}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
