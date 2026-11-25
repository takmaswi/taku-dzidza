import { Check, Radio, Trophy, Users } from "lucide-react";
import { copy } from "../../copy/en";

/**
 * "Revise with friends, live": a still sample of a group session that is not
 * built yet. Four friends online (a green ring on each), one live question
 * and the scores so far. A picture only, so nothing in it can be pressed.
 */
export function GroupCard() {
  const t = copy.landing.groups;
  return (
    <figure className="gp raised" aria-label={t.card}>
      <div className="gp-head">
        <b className="gp-session">{t.session}</b>
        <span className="gp-online">
          <span className="gp-faces" aria-hidden="true">
            {t.people.map((p) => (
              <span key={p.name} className="gp-face">
                {p.name.charAt(0)}
              </span>
            ))}
          </span>
          <Users size={14} aria-hidden="true" />
          {t.online}
        </span>
      </div>
      <div className="gp-q">
        <span className="gp-live">
          <Radio size={14} aria-hidden="true" />
          {t.live}
        </span>
        <p>{t.question}</p>
        <ul className="gp-options">
          {t.options.map((o, i) => (
            <li key={o} data-right={i === 0 ? "true" : undefined}>
              {i === 0 && <Check size={14} aria-hidden="true" />}
              {o}
            </li>
          ))}
        </ul>
      </div>
      <div className="gp-board">
        <span className="eyebrow">
          <Trophy size={14} aria-hidden="true" />
          {t.board}
        </span>
        <ol>
          {t.people.map((p) => (
            <li key={p.name}>
              <span>{p.name}</span>
              <b>{t.points(p.points)}</b>
            </li>
          ))}
        </ol>
      </div>
    </figure>
  );
}
