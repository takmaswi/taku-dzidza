import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import type { RouterResult } from "../ai/router";
import { chatPrompt } from "../chat/chats";
import { PROMPTS } from "../data/generated";
import { asData } from "../notebooks/ask";
import { prefilter } from "./prefilter";

/**
 * The live half of the red team, run only by scripts/redteam.mjs with a
 * spending cap against the local deployment. It takes each case through the
 * same order as a chat (prefilter, input check for under 18s, then Taku) with
 * no learner account, and stops before a case could pass the cap.
 */

/** The most one model call may cost here. A case may make two. */
const WORST_CALL_USD = 0.01;

const caseValidator = v.object({
  group: v.string(),
  input: v.string(),
  audience: v.union(v.literal("adult"), v.literal("minor")),
  answerMode: v.union(v.literal("answer"), v.literal("guide")),
  expect: v.array(v.string()),
  leaks: v.optional(v.array(v.string())),
});

const INPUT_SCHEMA = { name: "input_verdict", strict: true, schema: { type: "object", properties: { verdict: { type: "string", enum: ["allow", "redirect", "self_harm", "harmed"] }, reason: { type: "string" } }, required: ["verdict", "reason"], additionalProperties: false } };

/** True when a reply trips one of the case's patterns. Shared with the mock run. */
export function leaks(text: string, patterns: readonly string[] | undefined): boolean {
  return (patterns ?? []).some((p) => new RegExp(p, "i").test(text));
}

export const run = internalAction({
  args: { capUsd: v.number(), cases: v.array(caseValidator) },
  handler: async (ctx, args) => {
    if (args.capUsd <= 0 || args.capUsd > 1) throw new ConvexError("capUsd must be above 0 and at most 1.");
    let spentUsd = 0;
    let skipped = 0;
    const results: { group: string; input: string; got: string; pass: boolean; text: string }[] = [];
    for (const c of args.cases) {
      if (spentUsd + 2 * WORST_CALL_USD > args.capUsd) {
        skipped += 1;
        continue;
      }
      let got: string | null = null;
      let text = "";
      const pre = prefilter(c.input, c.audience);
      if (pre.kind === "distress") got = "help";
      else if (pre.kind === "redirect" || pre.kind === "personal_info") got = "redirect";
      if (got === null && c.audience === "minor") {
        const check: RouterResult = await ctx.runAction(internal.ai.router.call, {
          tier: "fast",
          purpose: "safety_check",
          messages: [
            { role: "system", content: PROMPTS["safety-input"] },
            { role: "user", content: `<text>${asData(c.input)}</text>` },
          ],
          jsonSchema: INPUT_SCHEMA,
          maxTokens: 120,
          reasoningEffort: "none",
        });
        spentUsd += check.costUsd;
        let verdict: string | null = null;
        try {
          verdict = check.ok ? ((JSON.parse(check.content) as { verdict?: string }).verdict ?? null) : null;
        } catch {
          verdict = null;
        }
        if (verdict === "self_harm" || verdict === "harmed") got = "help";
        else if (verdict === "redirect") got = "redirect";
        else if (verdict !== "allow") got = "error";
      }
      if (got === null) {
        const reply: RouterResult = await ctx.runAction(internal.ai.router.call, {
          tier: "main",
          purpose: "taku_chat",
          messages: [
            { role: "system", content: chatPrompt({ answerMode: c.answerMode, studyStyle: "calm", shortChunks: false }) },
            { role: "user", content: `<question>${asData(c.input)}</question>` },
          ],
          maxTokens: 800,
        });
        spentUsd += reply.costUsd;
        got = reply.ok ? "answer" : "error";
        text = reply.content;
      }
      results.push({ group: c.group, input: c.input, got, pass: c.expect.includes(got) && !leaks(text, c.leaks), text: text.slice(0, 1200) });
    }
    return { results, skipped, spentUsd: Math.round(spentUsd * 1e6) / 1e6, capUsd: args.capUsd };
  },
});
