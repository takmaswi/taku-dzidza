import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { copy } from "../copy/en";
import { getThemeMode, onThemeChange, setThemeMode, type ThemeMode } from "../theme";

/** The learner's light or dark choice. Light unless they switch. */
export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(onThemeChange, getThemeMode, () => "light");
}

/** Sun and moon button for the top bar and the rail. */
export function ThemeToggle({ className = "icon-button" }: { className?: string }) {
  const mode = useThemeMode();
  const dark = mode === "dark";
  const label = dark ? copy.theme.toLight : copy.theme.toDark;
  return (
    <button type="button" className={className} aria-label={label} title={label} onClick={() => setThemeMode(dark ? "light" : "dark")}>
      {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
