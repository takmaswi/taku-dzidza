import { Check } from "lucide-react";
import type { StudyStyle } from "../../convex/accounts/styles";
import { copy } from "../copy/en";
import { ImageSlot } from "./ImageSlot";
import { STYLE_ART } from "./styleArt";

export function StylePicker({ value, onPick, compact = false }: { value: StudyStyle; onPick: (s: StudyStyle) => void; compact?: boolean }) {
  if (compact) {
    // For Settings: the photo cards belong to onboarding, where choosing a style is the whole screen.
    return (
      <div className="style-compact" role="radiogroup" aria-label={copy.home.styleTitle}>
        {(["locked_in", "cook", "calm"] as const).map((s) => (
          <button key={s} type="button" role="radio" aria-checked={value === s} className={`style-chip ${STYLE_ART[s].cls}`} onClick={() => onPick(s)}>
            <span className="sc-band" />
            <span className="sc-name">
              <b>{copy.styles[s].name}</b>
              {value === s && <Check size={16} aria-hidden="true" />}
            </span>
            <small>{copy.styles[s].line}</small>
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="style-cards" role="radiogroup" aria-label={copy.home.styleTitle}>
      {(["locked_in", "cook", "calm"] as const).map((s, i) => {
        const art = STYLE_ART[s];
        return (
          <button key={s} type="button" role="radio" aria-checked={value === s} aria-pressed={value === s} className={`style-card ${art.cls} rise`} style={{ ["--i" as string]: i }} onClick={() => onPick(s)}>
            <span className="sc-band" />
            <ImageSlot slug={art.slug} fallback={art.fallback} alt={art.alt} />
            <span className="sc-check">
              <Check size={20} aria-hidden="true" />
            </span>
            <span className="sc-body">
              <span className="tag light" style={{ justifySelf: "start" }}>
                {copy.styles[s].tag}
              </span>
              <b>{copy.styles[s].name}</b>
              <span>{copy.styles[s].line}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
