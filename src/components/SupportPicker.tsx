import { SUPPORT_NEEDS, type SupportNeed } from "../../convex/accounts/voices";
import { copy } from "../copy/en";

/** The five things that can get in the way, as tick boxes. Used in onboarding and Settings. */
export function SupportPicker({ value, onChange, label }: { value: readonly SupportNeed[]; onChange: (next: SupportNeed[]) => void; label: string }) {
  const t = copy.support;
  return (
    <fieldset className="support-picker">
      <legend className="sr-only">{label}</legend>
      {SUPPORT_NEEDS.map((n) => (
        <label key={n} className="check-row support-row">
          <input type="checkbox" checked={value.includes(n)} onChange={(e) => onChange(e.target.checked ? [...value, n] : value.filter((x) => x !== n))} />
          <span>{t.needs[n]}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** The one sentence that says what the ticked needs switch on. */
export function SupportSentence({ value }: { value: readonly SupportNeed[] }) {
  return (
    <p className="lead soft" aria-live="polite" data-testid="support-sentence">
      {copy.support.recommend(...SUPPORT_NEEDS.filter((n) => value.includes(n)).map((n) => copy.support.gives[n]))}
    </p>
  );
}
