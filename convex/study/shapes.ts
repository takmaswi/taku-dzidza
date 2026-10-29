import { z } from "zod";
import type { OutputKind } from "../modes/package";

/**
 * The JSON each study tool asks the model for (raw, with ref, page and quote
 * per item) and the checked shape stored after citations are settled. Plain
 * TypeScript, shared with the browser.
 */

const cite = { ref: z.string(), page: z.number(), quote: z.string() };
export const originSchema = z.union([
  z.object({ kind: z.literal("source"), sourceId: z.string(), page: z.number(), quote: z.string() }),
  z.object({ kind: z.literal("added") }),
]);

export const rawSchemas = {
  summary: z.object({ title: z.string(), sections: z.array(z.object({ heading: z.string(), points: z.array(z.object({ text: z.string(), ...cite })) })), missing: z.string() }),
  cards: z.object({ cards: z.array(z.object({ front: z.string(), back: z.string(), ...cite })), missing: z.string() }),
  quiz: z.object({
    title: z.string(),
    minutes: z.number(),
    questions: z.array(
      z.object({
        kind: z.enum(["mcq", "short", "structured"]),
        prompt: z.string(),
        options: z.array(z.string()),
        marks: z.number(),
        answer: z.string(),
        markingPoints: z.array(z.string()),
        ...cite,
      }),
    ),
    missing: z.string(),
  }),
  mindmap: z.object({ central: z.string(), branches: z.array(z.object({ label: z.string(), leaves: z.array(z.object({ text: z.string(), ...cite })) })), missing: z.string() }),
  scroll: z.object({ cards: z.array(z.object({ hook: z.string(), type: z.enum(["fact", "question", "truefalse"]), text: z.string(), answer: z.string(), ...cite })), missing: z.string() }),
} satisfies Record<OutputKind, z.ZodTypeAny>;

export type SummaryContent = { title: string; sections: { heading: string; points: { text: string; origin: z.infer<typeof originSchema> }[] }[] };
export type QuizQuestion = { number: number; kind: "mcq" | "short" | "structured"; prompt: string; options: string[]; marks: number; answer: string; markingPoints: string[]; origin: z.infer<typeof originSchema> };
export type QuizContent = { title: string; minutes: number; totalMarks: number; questions: QuizQuestion[] };
export type MindmapContent = { central: string; branches: { label: string; leaves: { text: string; origin: z.infer<typeof originSchema> }[] }[] };
export type ScrollCard = { hook: string; type: "fact" | "question" | "truefalse"; text: string; answer: string; origin: z.infer<typeof originSchema> };
export type ScrollContent = { cards: ScrollCard[] };
export type CardsContent = { count: number };

const citeJson = { ref: { type: "string" }, page: { type: "integer" }, quote: { type: "string" } };
const citeKeys = ["ref", "page", "quote"];
function obj(properties: Record<string, unknown>, required: string[]) {
  return { type: "object", properties, required, additionalProperties: false };
}
const str = { type: "string" };

/** Strict json_schema for each kind, matching rawSchemas. */
export const JSON_SCHEMAS: Record<OutputKind, unknown> = {
  summary: obj({ title: str, sections: { type: "array", items: obj({ heading: str, points: { type: "array", items: obj({ text: str, ...citeJson }, ["text", ...citeKeys]) } }, ["heading", "points"]) }, missing: str }, ["title", "sections", "missing"]),
  cards: obj({ cards: { type: "array", items: obj({ front: str, back: str, ...citeJson }, ["front", "back", ...citeKeys]) }, missing: str }, ["cards", "missing"]),
  quiz: obj(
    {
      title: str,
      minutes: { type: "integer" },
      questions: {
        type: "array",
        items: obj(
          { kind: { type: "string", enum: ["mcq", "short", "structured"] }, prompt: str, options: { type: "array", items: str }, marks: { type: "integer" }, answer: str, markingPoints: { type: "array", items: str }, ...citeJson },
          ["kind", "prompt", "options", "marks", "answer", "markingPoints", ...citeKeys],
        ),
      },
      missing: str,
    },
    ["title", "minutes", "questions", "missing"],
  ),
  mindmap: obj({ central: str, branches: { type: "array", items: obj({ label: str, leaves: { type: "array", items: obj({ text: str, ...citeJson }, ["text", ...citeKeys]) } }, ["label", "leaves"]) }, missing: str }, ["central", "branches", "missing"]),
  scroll: obj({ cards: { type: "array", items: obj({ hook: str, type: { type: "string", enum: ["fact", "question", "truefalse"] }, text: str, answer: str, ...citeJson }, ["hook", "type", "text", "answer", ...citeKeys]) }, missing: str }, ["cards", "missing"]),
};
