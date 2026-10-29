/**
 * Study styles and the optional style quiz (SPEC.md 3.10). Plain TypeScript,
 * shared with the browser and unit tested.
 */

export const STUDY_STYLES = ["locked_in", "cook", "calm"] as const;
export type StudyStyle = (typeof STUDY_STYLES)[number];

/** Without the quiz: teens get Cook Mode, adults Calm. */
export function defaultStyle(age: number): StudyStyle {
  return age < 18 ? "cook" : "calm";
}

export type QuizAnswer = { question: string; style: StudyStyle };

/** Most picked style wins; a tie goes to the earliest of locked_in, calm, cook (quietest first). */
export function scoreQuiz(picks: readonly StudyStyle[], fallback: StudyStyle): StudyStyle {
  if (picks.length === 0) return fallback;
  const counts = new Map<StudyStyle, number>();
  for (const p of picks) counts.set(p, (counts.get(p) ?? 0) + 1);
  const order: StudyStyle[] = ["locked_in", "calm", "cook"];
  let best = order[0];
  for (const s of order) if ((counts.get(s) ?? 0) > (counts.get(best) ?? 0)) best = s;
  return best;
}
