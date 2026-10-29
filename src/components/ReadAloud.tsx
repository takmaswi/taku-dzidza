import { Square, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { copy } from "../copy/en";

/**
 * Read aloud with the phone's own voice (Web Speech API): free, no data, and
 * works offline on most Android phones. Shown when the learner turns on Read
 * aloud in Settings. Server voices (Amai Learn's speech.ts) come with audio
 * overviews.
 */
export function ReadAloud({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  if (!supported || text.trim() === "") return null;
  const toggle = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en";
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };
  return (
    <button type="button" className="pill ghost small" onClick={toggle} aria-pressed={speaking}>
      {speaking ? <Square size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />} {speaking ? copy.tools.stopReading : copy.tools.readAloud}
    </button>
  );
}
