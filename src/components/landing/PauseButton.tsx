import { Pause, Play } from "lucide-react";

type Props = { playing: boolean; onToggle: () => void; pauseLabel: string; playLabel: string; className?: string };

/** The visible pause control every looping part of the landing page carries (WCAG 2.2.2). Icon plus a name, never colour alone. */
export function PauseButton({ playing, onToggle, pauseLabel, playLabel, className = "" }: Props) {
  return (
    <button type="button" className={`l-pause ${className}`.trim()} onClick={onToggle} aria-label={playing ? pauseLabel : playLabel} title={playing ? pauseLabel : playLabel}>
      {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
    </button>
  );
}
