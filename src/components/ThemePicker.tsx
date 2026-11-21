import { useMutation } from "convex/react";
import { Check } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { copy } from "../copy/en";
import { previewLook, setThemeMode, type Look, type ThemeMode } from "../theme";
import { useThemeMode } from "./ThemeToggle";

type Access = Doc<"profiles">["accessibility"];

const OPTIONS: { look: Look; mode: ThemeMode }[] = [
  { look: "warm", mode: "light" },
  { look: "warm", mode: "dark" },
  { look: "contrast", mode: "light" },
  { look: "contrast", mode: "dark" },
];

/**
 * Four looks as small pictures of the app: Warm and High contrast, each in
 * light and dark. Light or dark is kept on this device; high contrast is an
 * accessibility setting on the account, so it follows the learner.
 */
export function ThemePicker({ access, onAccess }: { access: Access; onAccess?: (next: Access) => void }) {
  const t = copy.theme;
  const setAccessibility = useMutation(api.accounts.profiles.setAccessibility);
  const mode = useThemeMode();
  const look: Look = access.highContrast ? "contrast" : "warm";

  const pick = (o: { look: Look; mode: ThemeMode }) => {
    if (o.mode !== mode) setThemeMode(o.mode);
    if (o.look !== look) {
      previewLook(o.look);
      const next = { ...access, highContrast: o.look === "contrast" };
      onAccess?.(next);
      void setAccessibility({ accessibility: next });
    }
  };

  return (
    <div className="looks" role="radiogroup" aria-label={t.pickTitle}>
      {OPTIONS.map((o) => {
        const on = o.look === look && o.mode === mode;
        const name = `${t.looks[o.look].name}, ${t.modes[o.mode].toLowerCase()}`;
        return (
          <button key={`${o.look}-${o.mode}`} type="button" role="radio" aria-checked={on} className="look" aria-label={name} onClick={() => pick(o)} data-testid={`look-${o.look}-${o.mode}`}>
            <span className={`look-art look-${o.look}-${o.mode}`} aria-hidden="true">
              <span className="la-rail" />
              <span className="la-card">
                <span className="la-line w1" />
                <span className="la-line w2" />
                <span className="la-pill" />
              </span>
              <span className="la-bubble" />
            </span>
            <span className="look-name">
              <b>{t.looks[o.look].name}</b> {t.modes[o.mode]}
            </span>
            {on && (
              <span className="look-tick">
                <Check size={13} aria-hidden="true" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** The first time the app opens on a device: choose a look, then carry on. Esc or Continue keeps whatever is picked. */
export function ThemeWelcome({ access, onDone }: { access: Access; onDone: () => void }) {
  const t = copy.theme;
  return (
    <>
      <div className="scrim" />
      <div className="look-dialog" role="dialog" aria-modal="true" aria-labelledby="look-title" data-testid="look-dialog" onKeyDown={(e) => e.key === "Escape" && onDone()}>
        <h2 id="look-title">{t.pickTitle}</h2>
        <p className="soft">{t.pickLead}</p>
        <ThemePicker access={access} />
        <div className="actions">
          <button type="button" className="pill" onClick={onDone} autoFocus>
            {t.pickDone}
          </button>
        </div>
      </div>
    </>
  );
}
