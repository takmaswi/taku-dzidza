import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copy } from "../../copy/en";
import { ReadAloud } from "../ReadAloud";
import { CUES, type Clip } from "./listenCues";
import { useInView } from "./motion";

/**
 * "Listen to your notes": the sample clips in public/audio/landing (art batch
 * 5, ElevenLabs; manifest.json there). Nothing downloads until play is tapped
 * (preload="none"), one clip plays at a time, the ring shows progress, the
 * bars move only while a clip plays, and the script runs as captions under
 * the player. If a file cannot load, the device's own voice reads the script.
 */


const SUMMARY_LINES = copy.landing.listen.summaryScript.match(/[^.]+\./g)?.map((s) => s.trim()) ?? [copy.landing.listen.summaryScript];

export function ListenDemo() {
  const t = copy.landing.listen;
  const [voice, setVoice] = useState<"calm" | "upbeat">("calm");
  const [ref, , idle] = useInView<HTMLDivElement>();
  const playing = useRef<HTMLAudioElement | null>(null);
  // Only one clip at a time: starting one pauses whichever was playing.
  const claim = (audio: HTMLAudioElement) => {
    if (playing.current !== null && playing.current !== audio) playing.current.pause();
    playing.current = audio;
  };
  return (
    <div ref={ref} className="ld" data-idle={idle ? "true" : undefined}>
      <div className="ld-card raised">
        <span className="eyebrow">{t.summaryTitle}</span>
        <div className="ld-voices" role="group" aria-label={t.voice}>
          {(["calm", "upbeat"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={voice === v} onClick={() => setVoice(v)}>
              {t[v]}
            </button>
          ))}
        </div>
        <Player key={voice} clip={voice === "calm" ? "summary-calm.mp3" : "summary-upbeat.mp3"} name={`${t.summaryTitle}, ${t[voice]}`} lines={SUMMARY_LINES} script={t.summaryScript} claim={claim} />
      </div>
      <div className="ld-card raised ld-duo">
        <span className="eyebrow">{t.overviewTitle}</span>
        <Player clip="overview-duo.mp3" name={t.overviewTitle} lines={t.overviewScript} script={t.overviewScript.join(" ")} claim={claim} speakers />
      </div>
    </div>
  );
}

type PlayerProps = { clip: Clip; name: string; lines: readonly string[]; script: string; claim: (a: HTMLAudioElement) => void; speakers?: boolean };

function Player({ clip, name, lines, script, claim, speakers = false }: PlayerProps) {
  const t = copy.landing.listen;
  const audio = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(0);
  const [broken, setBroken] = useState(false);
  const cues = CUES[clip];
  let line = 0;
  cues.forEach((start, i) => {
    if (time >= start) line = i;
  });
  const progress = length > 0 ? Math.min(1, time / length) : 0;

  useEffect(() => {
    const a = audio.current;
    return () => a?.pause();
  }, []);

  const toggle = () => {
    const a = audio.current;
    if (a === null) return;
    if (!a.paused) {
      a.pause();
      return;
    }
    claim(a);
    a.play().catch(() => setBroken(true));
  };

  if (broken) {
    return (
      <div className="ld-fallback">
        <ReadAloud text={script} />
        <p className="soft small-text">{t.deviceVoice}</p>
      </div>
    );
  }

  return (
    <div className="ld-player" data-on={on ? "true" : undefined}>
      <audio
        ref={audio}
        src={`/audio/landing/${clip}`}
        preload="none"
        onPlay={() => setOn(true)}
        onPause={() => setOn(false)}
        onEnded={() => {
          setOn(false);
          setTime(0);
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setLength(e.currentTarget.duration)}
        onError={() => setBroken(true)}
      />
      <div className="ld-controls">
        <button type="button" className="ld-play" onClick={toggle} aria-label={on ? t.pauseClip(name) : t.playClip(name)}>
          <svg className="ld-ring" viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="21" />
            <circle className="ld-ring-done" cx="24" cy="24" r="21" pathLength="100" style={{ strokeDashoffset: 100 - progress * 100 }} />
          </svg>
          {on ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
        </button>
        <span className="ld-bars" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ ["--i" as string]: i }} />
          ))}
        </span>
        <span className="sr-only" role="progressbar" aria-label={t.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} />
      </div>
      <figure className="ld-captions">
        <figcaption className="eyebrow">{t.captions}</figcaption>
        <p key={line} className="ld-line">
          {speakers && <span className="ld-host">{t.hosts[line % 2]}</span>}
          {lines[line]}
        </p>
      </figure>
    </div>
  );
}
