/**
 * Test me in a chat reply. Taku ends each reply with a fenced block holding
 * the mark for the learner's last answer and the next question with its
 * answer. The block is taken off before anything is shown, and the answer is
 * kept on the server, so the learner sees the question and the mark only.
 * Plain TypeScript, unit tested.
 */

const OPEN = "```test";

export type TestTurn = { correct: boolean | null; question: string; answer: string };

const clip = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);

export function extractTest(reply: string): { text: string; turn: TestTurn | null } {
  const start = reply.indexOf(OPEN);
  if (start < 0) return { text: reply, turn: null };
  const rest = reply.slice(start + OPEN.length);
  const end = rest.indexOf("```");
  const text = (reply.slice(0, start) + (end < 0 ? "" : rest.slice(end + 3))).trim();
  try {
    const raw = JSON.parse((end < 0 ? rest : rest.slice(0, end)).trim()) as { correct?: unknown; question?: unknown; answer?: unknown };
    const question = typeof raw.question === "string" ? clip(raw.question, 600) : "";
    const answer = typeof raw.answer === "string" ? clip(raw.answer, 600) : "";
    const correct = typeof raw.correct === "boolean" ? raw.correct : null;
    return { text, turn: { correct, question, answer } };
  } catch {
    return { text, turn: null };
  }
}

/** While a reply streams in, nothing of the block shows, not even its first backticks. */
export function stripTestBlock(partial: string): string {
  const start = partial.indexOf(OPEN);
  if (start >= 0) return partial.slice(0, start);
  const held = partial.match(/`{1,3}t?e?s?t?$/);
  return held === null ? partial : partial.slice(0, held.index);
}

/** The run of Test me marks at the end of a conversation: what the score line counts. */
export function testScore(turns: readonly { studyMode?: string; test?: { correct?: boolean } }[]): { right: number; marked: number } {
  let right = 0;
  let marked = 0;
  for (let i = turns.length - 1; i >= 0; i--) {
    const t = turns[i];
    if (t.studyMode === undefined) continue;
    if (t.studyMode !== "test") break;
    if (t.test?.correct === undefined) continue;
    marked += 1;
    if (t.test.correct) right += 1;
  }
  return { right, marked };
}
