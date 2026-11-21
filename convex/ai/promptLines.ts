import type { Doc } from "../_generated/dataModel";

/** Prompt lines shared by Ask Taku chats and notebook answers (study modes and support preferences). */
export const SIMPLE_ENGLISH =
  "LANGUAGE: English is not the learner's first language. Use short sentences and common words, and explain a subject word the first time you use it. End with a short list headed Key words: up to 5 key terms from your answer, each with a plain meaning.";

/** What the learner is preparing for, in the words an exam prep prompt uses. */
export function examFor(studyingFor: Doc<"profiles">["studyingFor"]): string {
  if (studyingFor === "olevel") return "O Level (ZIMSEC or Cambridge IGCSE)";
  if (studyingFor === "alevel") return "A Level (ZIMSEC or Cambridge)";
  if (studyingFor === "university") return "a university or college exam";
  if (studyingFor === "professional") return "a professional exam such as ACCA";
  return "an exam";
}

export const EXAM_TEXT = (exam: string) =>
  `STUDY MODE: EXAM PREP. The learner is preparing for ${exam}. Use the exam board's wording and its command words (State, Describe, Explain, Calculate, Compare, Evaluate), and say what a command word asks for when it matters. When you set a question, put its marks in brackets, like [3 marks]. When the learner answers, mark it the way a mark scheme does: one mark for each creditworthy point, say which points earned marks and which were missing, and give the total, like 2 out of 3. Never say a question comes from a real past paper.`;
