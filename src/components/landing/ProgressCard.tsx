import { CircleAlert, CircleCheck, Target, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { copy } from "../../copy/en";
import { useInView } from "./motion";

type Level = keyof typeof copy.landing.progress.levels;
/** Each level shows an icon and its word, never colour alone. */
const LEVEL_ICON: Record<Level, LucideIcon> = { strong: CircleCheck, good: CircleCheck, weak: CircleAlert };

/**
 * "Knows where you struggle": a sample card of four topic bars that fill in
 * once when the card comes on screen, with a Practise this button beside the
 * weakest. The bars rest full with less motion.
 */
export function ProgressCard({ signUp }: { signUp: string }) {
  const t = copy.landing.progress;
  const [ref, active] = useInView<HTMLDivElement>("0px 0px -15% 0px");
  const weakest = t.topics.reduce((low, topic, i) => (topic.score < t.topics[low].score ? i : low), 0);
  return (
    <div ref={ref} className="pg raised" data-in={active ? "true" : undefined}>
      <span className="eyebrow">{t.card}</span>
      <ul className="pg-list">
        {t.topics.map((topic, i) => {
          const level = topic.level as Level;
          const Icon = LEVEL_ICON[level];
          return (
            <li key={topic.name} className={`pg-row pg-${level}`} style={{ ["--i" as string]: i, ["--score" as string]: topic.score / 100 }}>
              <span className="pg-name">{topic.name}</span>
              <span className="pg-level">
                <Icon size={14} aria-hidden="true" />
                {t.levels[level]}
              </span>
              <span className="pg-bar" role="progressbar" aria-label={topic.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={topic.score}>
                <i />
              </span>
              {i === weakest && (
                <Link to={signUp} className="pill pg-cta">
                  <Target size={16} aria-hidden="true" />
                  {t.cta}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
