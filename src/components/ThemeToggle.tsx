import { useId, useSyncExternalStore } from "react";
import { copy } from "../copy/en";
import { getThemeMode, onThemeChange, setThemeMode, type ThemeMode } from "../theme";

/** The learner's light or dark choice. Light unless they switch. */
export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(onThemeChange, getThemeMode, () => "light");
}

/**
 * Sun and moon button for the top bar and the rail. In light mode it shows the
 * moon (switch to dark); in dark mode the sun. One drawing morphs between the
 * two: the cut slides off the disc, the disc shrinks and the rays turn in
 * (src/styles/polish.css). Each toggle has its own mask id, because the rail
 * copy is hidden on phones and a hidden mask would not draw.
 */
export function ThemeToggle({ className = "icon-button" }: { className?: string }) {
  const mode = useThemeMode();
  const dark = mode === "dark";
  const label = dark ? copy.theme.toLight : copy.theme.toDark;
  const cut = `theme-cut${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <button type="button" className={className} aria-label={label} title={label} onClick={() => setThemeMode(dark ? "light" : "dark")}>
      <svg className="theme-icon" data-show={dark ? "sun" : "moon"} width={20} height={20} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <mask id={cut}>
          <rect width="24" height="24" fill="#fff" />
          <circle className="ti-cut" cx="17" cy="7" r="7" fill="#000" />
        </mask>
        <circle className="ti-body" cx="12" cy="12" r="8.5" fill="currentColor" mask={`url(#${cut})`} />
        <g className="ti-rays" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 1.5v2M12 20.5v2M1.5 12h2M20.5 12h2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M4.6 19.4L6 18M18 6l1.4-1.4" />
        </g>
      </svg>
    </button>
  );
}
