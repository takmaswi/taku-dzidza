/**
 * The syllabuses a class can follow. Plain TypeScript, shared with the
 * browser. Stage 3 adds the versioned packs behind each id
 * (convex/curriculum/packs.ts); a class stores only the id.
 */

export type SyllabusEntry = { id: string; board: string; subject: string; levels: readonly string[] };

export const FORM_LEVELS = ["Form 1", "Form 2", "Form 3", "Form 4"] as const;

export const SYLLABUSES: readonly SyllabusEntry[] = [
  { id: "zimsec-olevel-mathematics", board: "ZIMSEC", subject: "Mathematics", levels: FORM_LEVELS },
  { id: "zimsec-olevel-combined-science", board: "ZIMSEC", subject: "Combined Science", levels: FORM_LEVELS },
  { id: "zimsec-olevel-heritage-studies", board: "ZIMSEC", subject: "Heritage Studies", levels: FORM_LEVELS },
  { id: "zimsec-olevel-english", board: "ZIMSEC", subject: "English Language", levels: FORM_LEVELS },
];

export function syllabusById(id: string): SyllabusEntry | undefined {
  return SYLLABUSES.find((s) => s.id === id);
}
