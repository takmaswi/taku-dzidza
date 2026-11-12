import { Check } from "lucide-react";
import type { StudyStyle } from "../../convex/accounts/styles";
import { copy } from "../copy/en";
import { ObjectArt, type ObjectName } from "./ObjectArt";

const STYLES = ["locked_in", "cook", "calm"] as const;
/** The object on each study style card: a desk lamp for focus, a spark for energy, a cup of tea for calm. */
const STYLE_OBJECT: Record<StudyStyle, ObjectName> = { locked_in: "lamp", cook: "spark", calm: "tea-cup" };

export function StylePicker({ value, onPick, compact = false }: { value: StudyStyle; onPick: (s: StudyStyle) => void; compact?: boolean }) {
  if (compact) {
    // For Settings: plain choice cards. The cards with objects belong to onboarding.
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
        <button key={s} type="button" role="radio" aria-checked={value === s} aria-pressed={value === s} className="style-card rise" style={{ ["--i" as string]: i }} onClick={() => onPick(s)}>
          <ObjectArt name={STYLE_OBJECT[s]} alt="" size={132} />
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
