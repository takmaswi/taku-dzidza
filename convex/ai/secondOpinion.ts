import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { PROMPTS } from "../data/generated";
import type { RouterResult } from "./router";

/**
 * A second opinion (SPEC.md 3.5): before a learner sees them, Taku's own ideas
 * and marking schemes are read by a second, fast model that looks for mistakes.
 * Nothing claims 100 percent. An item the check says is wrong is left out. An
 * item the check could not judge (the call failed, or the limit was reached)
 * is kept and marked as not checked, so the learner knows.
 */

export type OpinionItem = { id: string; text: string };
export type OpinionCheck = "ideas" | "marking";
export type Opinion = { rejected: ReadonlySet<string>; unchecked: ReadonlySet<string> };

const SCHEMA = {
  name: "second_opinion",
  strict: true,
  schema: {
    type: "object",
    properties: {
      verdicts: {
        type: "array",
        items: { type: "object", properties: { id: { type: "string" }, ok: { type: "boolean" } }, required: ["id", "ok"], additionalProperties: false },
      },
    },
    required: ["verdicts"],
    additionalProperties: false,
  },
};

export function readVerdicts(items: readonly OpinionItem[], content: string): Opinion {
  const all = new Set(items.map((i) => i.id));
  try {
    const parsed = JSON.parse(content) as { verdicts?: { id?: unknown; ok?: unknown }[] };
    const verdicts = new Map((parsed.verdicts ?? []).map((v) => [String(v.id), v.ok]));
    return {
      rejected: new Set(items.filter((i) => verdicts.get(i.id) === false).map((i) => i.id)),
      unchecked: new Set(items.filter((i) => typeof verdicts.get(i.id) !== "boolean").map((i) => i.id)),
    };
  } catch {
    return { rejected: new Set(), unchecked: all };
  }
}

export async function secondOpinion(ctx: ActionCtx, args: { profileId: string; check: OpinionCheck; items: readonly OpinionItem[] }): Promise<Opinion> {
  if (args.items.length === 0) return { rejected: new Set(), unchecked: new Set() };
  const everything = new Set(args.items.map((i) => i.id));
  const room = await ctx.runQuery(internal.ai.usage.check, { profileId: args.profileId });
  if (!room.allowed) return { rejected: new Set(), unchecked: everything };
  const block = args.items.map((i) => `<item id="${i.id}">\n${i.text.replace(/<\/?\s*item\b[^>]*>/gi, " ")}\n</item>`).join("\n");
  const result: RouterResult = await ctx.runAction(internal.ai.router.call, {
    tier: "fast",
    purpose: "second_opinion",
    messages: [
      { role: "system", content: PROMPTS["second-opinion"].replace("{{CHECK}}", args.check === "marking" ? "Each item is an exam question with its answer and marking points. Say ok false if the answer or a marking point is wrong, or does not answer the question." : "Each item is a study note a tutor added from general knowledge. Say ok false if it states something false or misleading.") },
      { role: "user", content: block },
    ],
    jsonSchema: SCHEMA,
    maxTokens: 1500,
    reasoningEffort: "none",
    stablePrefixCount: 1,
    fixtureKey: { kind: "second_opinion", check: args.check, items: args.items.map((i) => i.text) },
  });
  await ctx.runMutation(internal.ai.usage.record, { profileId: args.profileId, tool: "second_opinion", costUsd: result.costUsd });
  if (!result.ok) return { rejected: new Set(), unchecked: everything };
  return readVerdicts(args.items, result.content);
}
