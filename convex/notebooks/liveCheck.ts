import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { PROMPTS } from "../data/generated";
import { DEFAULT_CHAIN, modelChain } from "../ai/models";
import type { RouterResult } from "../ai/router";
import { settleParts } from "../sources/modes";
import { buildContent, checkOptions, toolPrompt } from "../study/tools";
import { JSON_SCHEMAS } from "../study/shapes";
import { ANSWER_SCHEMA, parseAnswer, systemPrompt } from "./ask";

/**
 * A small live check of the real model, run only by scripts/live-check.mjs
 * with a spending cap. One cited answer on a short note, then one photo read.
 * Before each call the worst case cost (all input plus the full output
 * allowance) must fit in what is left of the cap.
 */

const NOTE = "Photosynthesis\nGreen plants make glucose from carbon dioxide and water using light energy.\nChlorophyll in the chloroplasts absorbs the light.\nOxygen is released as a by product.";
const QUESTION = "What does chlorophyll do, and what gas is released?";

export const run = internalAction({
  args: { capUsd: v.number(), photoBase64: v.string(), only: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    if (args.capUsd <= 0 || args.capUsd > 1) throw new ConvexError("capUsd must be above 0 and at most 1.");
    const model = modelChain("main")[0] ?? DEFAULT_CHAIN[0];
    const price = await ctx.runQuery(internal.ai.prices.priceFor, { model });
    const worst = (inputTokens: number, outputTokens: number) => inputTokens * price.promptUsdPerToken + outputTokens * price.completionUsdPerToken;
    let spent = 0;
    const report: Record<string, unknown> = { model };

    if (args.only === "quiz") {
      const options = checkOptions("quiz", { count: 4, difficulty: "medium", minutes: 15 });
      if (worst(4000, 7000) > args.capUsd) throw new ConvexError("The cap is too small for the quiz check.");
      const quiz: RouterResult = await ctx.runAction(internal.ai.router.call, {
        tier: "main",
        purpose: "taku_tool",
        messages: [
          { role: "system", content: toolPrompt("quiz", { sourceMode: "only_mine", studyStyle: "locked_in" }, options) },
          { role: "user", content: `<source ref="S1" title="Biology notes" page="1">\n${NOTE}\n</source>` },
        ],
        jsonSchema: { name: "taku_quiz", strict: true, schema: JSON_SCHEMAS.quiz },
        maxTokens: 7000,
      });
      let built = null;
      try {
        built = quiz.ok ? buildContent("quiz", JSON.parse(quiz.content), "only_mine", (ref, page) => (ref === "S1" && page === 1 ? { sourceId: "S1", text: NOTE } : null)) : null;
      } catch {
        built = null;
      }
      return { model, quiz: { ok: quiz.ok, refused: quiz.refusedReason, usage: quiz.usage, costUsd: quiz.costUsd, latencyMs: quiz.latencyMs, kept: built?.items ?? 0, dropped: built?.dropped ?? 0, missing: built?.missing ?? null, content: built?.content ?? null, raw: quiz.content.slice(0, 4000) }, totalUsd: quiz.costUsd, capUsd: args.capUsd };
    }

    // 1. A cited answer.
    const answerWorst = worst(4000, 1200);
    if (spent + answerWorst > args.capUsd) throw new ConvexError("The cap is too small for the answer check.");
    const c = { sourceMode: "only_mine" as const, answerMode: "answer" as const, studyStyle: "calm" as const, shortChunks: false };
    const answer = await ctx.runAction(internal.ai.router.call, {
      tier: "main",
      purpose: "taku_answer",
      messages: [
        { role: "system", content: systemPrompt(c) },
        { role: "user", content: `<source ref="S1" title="Biology notes" page="1">\n${NOTE}\n</source>\n<question>${QUESTION}</question>` },
      ],
      jsonSchema: ANSWER_SCHEMA,
      maxTokens: 1200,
      stablePrefixCount: 1,
    });
    spent += answer.costUsd;
    const parsed = answer.ok ? parseAnswer(answer.content) : null;
    const settled = parsed === null ? null : settleParts(parsed.parts, "only_mine", (ref, page) => (ref === "S1" && page === 1 ? { sourceId: "S1", text: NOTE } : null));
    report.answer = { ok: answer.ok, refused: answer.refusedReason, usage: answer.usage, costUsd: answer.costUsd, latencyMs: answer.latencyMs, parts: parsed?.parts ?? null, kept: settled?.kept.length ?? 0, dropped: settled?.dropped ?? 0, missing: parsed?.missing ?? null };

    // 2. Reading a photo of notes.
    const photoWorst = worst(3000, 1500);
    if (spent + photoWorst > args.capUsd) {
      report.photo = "skipped: would exceed the cap";
    } else {
      const photo = await ctx.runAction(internal.ai.router.call, {
        tier: "main",
        purpose: "source_read",
        messages: [
          { role: "system", content: PROMPTS["source-transcribe"] },
          { role: "user", content: [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${args.photoBase64}` } }] },
        ],
        jsonSchema: { name: "page_text", strict: true, schema: { type: "object", properties: { pages: { type: "array", items: { type: "string" } } }, required: ["pages"], additionalProperties: false } },
        maxTokens: 1500,
        reasoningEffort: "none",
      });
      spent += photo.costUsd;
      report.photo = { ok: photo.ok, refused: photo.refusedReason, usage: photo.usage, costUsd: photo.costUsd, latencyMs: photo.latencyMs, content: photo.content.slice(0, 800) };
    }
    report.totalUsd = Math.round(spent * 1e6) / 1e6;
    report.capUsd = args.capUsd;
    return report;
  },
});
