import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import type { RouterResult } from "../ai/router";
import { PROMPTS } from "../data/generated";

/**
 * The model safety checks (SPEC.md 3.8, audit S5 and S6), on the fast tier.
 *   inputCheck   every learner's message, whatever age they gave: age is self
 *                declared, so an adult birth year must not skip it.
 *   outputCheck  what Taku is about to show an under 18. Their replies are
 *                never streamed, so nothing is seen before this passes.
 *   sourceCheck  a page of an under 18's material that the word filter flagged.
 * All three fail closed: no clear allow, no answer.
 */

/** Data goes inside tags; text cannot close a tag and talk to the model. */
function asText(text: string): string {
  return text.replace(/<\/?\s*text\b[^>]*>/gi, " ");
}

const INPUT_SCHEMA = {
  name: "input_verdict",
  strict: true,
  schema: { type: "object", properties: { verdict: { type: "string", enum: ["allow", "redirect", "self_harm", "harmed"] }, reason: { type: "string" } }, required: ["verdict", "reason"], additionalProperties: false },
};
const BLOCK_SCHEMA = {
  name: "block_verdict",
  strict: true,
  schema: { type: "object", properties: { verdict: { type: "string", enum: ["allow", "block"] }, reason: { type: "string" } }, required: ["verdict", "reason"], additionalProperties: false },
};

function verdictOf(result: RouterResult): string | null {
  if (!result.ok) return null;
  try {
    const verdict = (JSON.parse(result.content) as { verdict?: unknown }).verdict;
    return typeof verdict === "string" ? verdict : null;
  } catch {
    return null;
  }
}

async function run(ctx: ActionCtx, profileId: string, prompt: string, schema: unknown, text: string, fixtureKey: unknown): Promise<string | null> {
  const result: RouterResult = await ctx.runAction(internal.ai.router.call, {
    tier: "fast",
    purpose: "safety_check",
    messages: [
      { role: "system", content: PROMPTS[prompt] },
      { role: "user", content: `<text>${asText(text)}</text>` },
    ],
    jsonSchema: schema,
    maxTokens: 120,
    reasoningEffort: "none",
    stablePrefixCount: 1,
    fixtureKey,
  });
  await ctx.runMutation(internal.ai.usage.record, { profileId, tool: "safety_check", costUsd: result.costUsd });
  return verdictOf(result);
}

export type InputVerdict = "allow" | "redirect" | "help" | "fail";

export async function inputCheck(ctx: ActionCtx, args: { profileId: string; question: string }): Promise<InputVerdict> {
  const verdict = await run(ctx, args.profileId, "safety-input", INPUT_SCHEMA, args.question, { kind: "input_check", question: args.question });
  if (verdict === "self_harm" || verdict === "harmed") return "help";
  if (verdict === "redirect") return "redirect";
  return verdict === "allow" ? "allow" : "fail";
}

/** Characters of a reply or a tool sent to the output check. */
export const OUTPUT_CHECK_CHARS = 6000;

/** True only on a clear allow. `key` names the fixture in mock mode. */
export async function outputAllowed(ctx: ActionCtx, args: { profileId: string; text: string; key: Record<string, unknown> }): Promise<boolean> {
  if (args.text.trim() === "") return true;
  const verdict = await run(ctx, args.profileId, "safety-output", BLOCK_SCHEMA, args.text.slice(0, OUTPUT_CHECK_CHARS), { kind: "output_check", ...args.key });
  return verdict === "allow";
}

export async function sourceAllowed(ctx: ActionCtx, args: { profileId: string; text: string }): Promise<boolean> {
  const text = args.text.slice(0, OUTPUT_CHECK_CHARS);
  const verdict = await run(ctx, args.profileId, "safety-source", BLOCK_SCHEMA, text, { kind: "source_check", text: text.slice(0, 200) });
  return verdict === "allow";
}

export const BLOCKED_REPLY = "I could not check that answer, so I am not showing it. Try asking in another way.";
