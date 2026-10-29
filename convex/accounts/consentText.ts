/**
 * The consent a guardian gives. Changing the words means a new version; the
 * version is stored with every consent. No hyphens or dashes (copy rule).
 */
export const CONSENT_TEXT_VERSION = "2026-10-29";

export const CONSENT_POINTS: readonly string[] = [
  "I am this learner's parent or legal guardian and I am 18 or older.",
  "I agree that Takudzidza may store the learner's name, birth month and year, settings, study material they upload and their study progress, to help them study.",
  "The learner's material is never used to train AI models and is never shown to advertisers. There are no adverts.",
  "AI answers are made by providers that do not keep what is sent to them.",
  "I can withdraw consent at any time with this link, and the learner can delete their account at any time, which deletes their data.",
];
