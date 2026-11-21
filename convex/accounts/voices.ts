/**
 * Taku's voice, study modes and support preferences (DECISIONS.md, Study modes
 * and Taku's voice). Plain TypeScript, shared with the browser and unit tested.
 *
 * The voice is a profile setting and only changes tone. A study mode is picked
 * per session and changes the shape of the session. Support preferences are
 * what the learner says gets in the way; they are preferences, never a
 * diagnosis, and are never sent to analytics.
 */

export const VOICES = ["gentle", "direct", "upbeat"] as const;
export type Voice = (typeof VOICES)[number];

export const STUDY_MODES = ["learn", "test", "sprint", "exam"] as const;
export type StudyMode = (typeof STUDY_MODES)[number];

export const SUPPORT_NEEDS = ["focus", "reading", "anxious", "english", "clearer"] as const;
export type SupportNeed = (typeof SUPPORT_NEEDS)[number];

/** The study styles before 21 November 2026, still on older profiles until the migration runs. */
export type LegacyStyle = "locked_in" | "cook" | "calm";
export const VOICE_FROM_STYLE: Record<LegacyStyle, Voice> = { calm: "gentle", locked_in: "direct", cook: "upbeat" };

/** Teens start upbeat, adults gentle: the same split as the old Cook Mode and Calm defaults. */
export function defaultVoice(age: number): Voice {
  return age < 18 ? "upbeat" : "gentle";
}

/** The voice to use: the profile's own, else the one its old study style maps to. */
export function voiceOf(profile: { voice?: Voice; studyStyle?: LegacyStyle }): Voice {
  return profile.voice ?? VOICE_FROM_STYLE[profile.studyStyle ?? "calm"];
}

export function needs(profile: { support?: readonly SupportNeed[] }, need: SupportNeed): boolean {
  return (profile.support ?? []).includes(need);
}

/** The study mode a device starts in before the learner picks one. */
export function defaultStudyMode(profile: { support?: readonly SupportNeed[] }): StudyMode {
  return needs(profile, "focus") ? "sprint" : "learn";
}

/** No countdowns, and scores shown only at the end, for a learner who said tests make them anxious. */
export function calmTests(profile: { support?: readonly SupportNeed[] }): boolean {
  return needs(profile, "anxious");
}

type Access = { dyslexia: boolean; largeText: boolean; readAloud: boolean; shortChunks: boolean; highContrast: boolean; reducedMotion: boolean };

/**
 * What onboarding switches on for the needs ticked, applied once. Each change
 * is an ordinary setting the learner can switch back in Settings. Nothing is
 * switched off. Behaviour with no setting of its own (Sprint as the default
 * mode, no timers, simpler English) follows the stored needs instead.
 */
export function supportSettings(picked: readonly SupportNeed[], current: { accessibility: Access; voice: Voice }): { accessibility: Access; voice: Voice } {
  const has = (n: SupportNeed) => picked.includes(n);
  const a = current.accessibility;
  return {
    accessibility: {
      ...a,
      shortChunks: a.shortChunks || has("focus"),
      dyslexia: a.dyslexia || has("reading"),
      readAloud: a.readAloud || has("reading"),
      largeText: a.largeText || has("reading") || has("clearer"),
      highContrast: a.highContrast || has("clearer"),
    },
    voice: has("anxious") ? "gentle" : current.voice,
  };
}

/** Only known needs, each once, in the order they are offered. */
export function cleanNeeds(raw: readonly string[]): SupportNeed[] {
  return SUPPORT_NEEDS.filter((n) => raw.includes(n));
}
