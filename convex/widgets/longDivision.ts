import { z } from "zod";

/**
 * Long division: guided one step at a time. Taku supplies only the two
 * numbers. Every step and its answer are worked out here, so a wrong sum from
 * a model can never reach a learner. Plain TypeScript, shared with the browser.
 */

export const dataSchema = z.object({
  title: z.string().min(1).max(120),
  dividend: z.number().int().min(1).max(999_999_999),
  divisor: z.number().int().min(2).max(9999),
});
export type DivisionData = z.infer<typeof dataSchema>;

export const jsonSchema = {
  type: "object",
  properties: { title: { type: "string" }, dividend: { type: "integer" }, divisor: { type: "integer" } },
  required: ["title", "dividend", "divisor"],
  additionalProperties: false,
};

/**
 * One question for the learner. `current` is the number being worked on.
 * divide: how many times does divisor go into current? multiply: quotient digit
 * times divisor. subtract: current take away product. bring: the number after
 * bringing down the next digit.
 */
export type DivisionStep =
  | { kind: "divide"; current: number; divisor: number; answer: number }
  | { kind: "multiply"; digit: number; divisor: number; answer: number }
  | { kind: "subtract"; current: number; product: number; answer: number }
  | { kind: "bring"; remainder: number; digit: number; answer: number };

export function divisionSteps(dividend: number, divisor: number): DivisionStep[] {
  const digits = String(dividend).split("").map(Number);
  const steps: DivisionStep[] = [];
  // Start with the fewest leading digits the divisor goes into.
  let index = 0;
  let current = digits[0];
  while (current < divisor && index + 1 < digits.length) {
    index += 1;
    current = current * 10 + digits[index];
  }
  for (;;) {
    const quotientDigit = Math.floor(current / divisor);
    steps.push({ kind: "divide", current, divisor, answer: quotientDigit });
    const product = quotientDigit * divisor;
    let remainder = current;
    // Nothing to multiply or take away when the digit is zero.
    if (quotientDigit > 0) {
      steps.push({ kind: "multiply", digit: quotientDigit, divisor, answer: product });
      remainder = current - product;
      steps.push({ kind: "subtract", current, product, answer: remainder });
    }
    if (index + 1 >= digits.length) return steps;
    index += 1;
    current = remainder * 10 + digits[index];
    steps.push({ kind: "bring", remainder, digit: digits[index], answer: current });
  }
}

export function checkStep(step: DivisionStep, typed: string): boolean {
  const cleaned = typed.trim();
  return /^\d+$/.test(cleaned) && Number(cleaned) === step.answer;
}

export function result(dividend: number, divisor: number): { quotient: number; remainder: number } {
  return { quotient: Math.floor(dividend / divisor), remainder: dividend % divisor };
}

export function prepare(raw: unknown): DivisionData | null {
  const parsed = dataSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
