/** Output kinds that read well in the Study tools panel. Practice papers, Scroll and flashcards open in focus mode. */
export const PANEL_KINDS = new Set(["summary", "mindmap", "widget"]);

/** Which tool a link like ?tool=test opens. */
export function toolFromParam(param: string | null): string | null {
  return param === "test" ? "quiz" : param === "cards" ? "flashcards" : param === "scroll" ? "scroll" : null;
}
