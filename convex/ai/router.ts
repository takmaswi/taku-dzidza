import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { AI_FIXTURES } from "../data/fixtures.generated";
import { canonicalJson, sha256Hex } from "../lib/canonical";
import {
  PURPOSES,
  acceptsSampling,
  costOf,
  modelChain,
  needsCacheMarker,
  openRouterAttribution,
  roundCost,
  STRUCTURED_OUTPUT_PROVIDERS,
  type Usage,
} from "./models";

/**
 * THE AI LAYER. Ported from Amayi Learn (convex/ai/router.ts at ec3496e),
 * which ported it from Takubasa and Taku Finance. Kept: the model chain per
 * tier, structured output routing, speech and the price refresh. Music is
 * dropped until the study music phase (SPEC.md 3.12).
 *
 * This is the only file in the repository that knows OpenRouter exists.
 * ESLint fails the build if any other file names the endpoint or the
 * credential.
 *
 * On every call, in order:
 *   1. The caller has already checked the learner's budget.
 *   2. In mock mode, return the recorded fixture for (purpose, key) or throw
 *      MissingFixtureError. Never a default response.
 *   3. POST the tier's chain with data_collection "deny" and zdr true, always.
 *      The zdr argument is kept for callers but cannot switch it off.
 *   4. Add a cache breakpoint for model families that need one.
 *   5. Read usage and price it. The caller records the cost; the prompt and
 *      reply are never logged here.
 *   6. Retry once on 429 or 5xx, then return a canned failure. Never let a
 *      provider error reach the client.
 *
 * No streaming: replies are returned when complete.
 */

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const MODELS_ENDPOINT = "https://openrouter.ai/api/v1/models";
const SPEECH_ENDPOINT = "https://openrouter.ai/api/v1/audio/speech";
const SPEECH_TIMEOUT_MS = 25_000;

const REQUEST_TIMEOUT_MS = 90_000;
const RETRY_BASE_DELAY_MS = 400;

export const CANNED_FAILURE =
  "I could not reach the assistant just now. Nothing you entered was lost. Try again in a moment.";
export const NOT_CONFIGURED = "AI is not configured yet.";

export class MissingFixtureError extends Error {
  constructor(purpose: string, key: string) {
    super(`MissingFixtureError: no recorded AI response for purpose "${purpose}" and key "${key}". Add tests/fixtures/ai/${purpose}/<name>.json with this key material, then run pnpm gen.`);
    this.name = "MissingFixtureError";
  }
}

/**
 * A part of a user message: text, a page image, or a PDF. Files go by their
 * storage URL, so a 15 MB scheme of work never has to fit in this action's
 * memory; the model reads the PDF itself (the file-parser plugin's native
 * engine, no third party OCR). Learner uploads (notes, PDFs, photos) use these.
 */
export type RouterPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

export type RouterMessage = {
  role: "system" | "user" | "assistant";
  content: string | RouterPart[];
};

export type RouterResult = {
  ok: boolean;
  content: string;
  model: string;
  finishReason: string | null;
  usage: Usage;
  costUsd: number;
  latencyMs: number;
  refusedReason: string | null;
};

export const purposeValidator = v.union(...PURPOSES.map((p) => v.literal(p)));

const partValidator = v.union(
  v.object({ type: v.literal("text"), text: v.string() }),
  v.object({ type: v.literal("image_url"), image_url: v.object({ url: v.string() }) }),
  v.object({ type: v.literal("file"), file: v.object({ filename: v.string(), file_data: v.string() }) }),
);

const messageValidator = v.object({
  role: v.union(v.literal("system"), v.literal("user"), v.literal("assistant")),
  content: v.union(v.string(), v.array(partValidator)),
});

function hasFile(messages: readonly RouterMessage[]): boolean {
  return messages.some((m) => Array.isArray(m.content) && m.content.some((p) => p.type === "file"));
}

function envValue(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.trim() === "" ? undefined : value.trim();
}

function isMock(): boolean {
  return envValue("AI_MODE") === "mock";
}

function jitter(ms: number): number {
  return ms + Math.floor(Math.random() * ms);
}

function parseUsage(raw: unknown): Usage {
  const usage = (raw ?? {}) as {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
  return {
    promptTokens: usage.prompt_tokens ?? 0,
    completionTokens: usage.completion_tokens ?? 0,
    cachedTokens: usage.prompt_tokens_details?.cached_tokens ?? 0,
  };
}

export async function fixtureKeyFor(material: unknown): Promise<string> {
  return (await sha256Hex(canonicalJson(material))).slice(0, 16);
}

/**
 * Wire format for messages. When the primary model needs an explicit cache
 * breakpoint, the last message of the stable prefix becomes a content part
 * array carrying cache_control (OpenRouter prompt caching docs).
 */
export function wireMessages(messages: RouterMessage[], primaryModel: string, stablePrefixCount: number | undefined): unknown[] {
  if (stablePrefixCount === undefined || stablePrefixCount <= 0 || !needsCacheMarker(primaryModel)) {
    return messages;
  }
  const index = Math.min(stablePrefixCount, messages.length) - 1;
  return messages.map((m, i) =>
    i === index && typeof m.content === "string" ? { ...m, content: [{ type: "text", text: m.content, cache_control: { type: "ephemeral" } }] } : m,
  );
}

export const call = internalAction({
  args: {
    tier: v.union(v.literal("fast"), v.literal("main")),
    messages: v.array(messageValidator),
    purpose: purposeValidator,
    jsonSchema: v.optional(v.any()),
    maxTokens: v.optional(v.number()),
    temperature: v.optional(v.number()),
    zdr: v.optional(v.boolean()),
    /** Number of leading messages that are byte identical across requests. */
    stablePrefixCount: v.optional(v.number()),
    /** Mock mode key material. Ignored in live mode. */
    fixtureKey: v.optional(v.any()),
    /**
     * Reasoning budget. On most providers max_tokens covers reasoning and the
     * visible reply together, so short structured calls pass "none" or they
     * can end with no content.
     */
    reasoningEffort: v.optional(v.union(v.literal("none"), v.literal("low"), v.literal("medium"), v.literal("high"))),
  },
  handler: async (ctx, args): Promise<RouterResult> => {
    const startedAt = Date.now();
    const empty: Usage = { promptTokens: 0, cachedTokens: 0, completionTokens: 0 };
    const refuse = (content: string, model: string, reason: string): RouterResult => ({
      ok: false,
      content,
      model,
      finishReason: "refused",
      usage: empty,
      costUsd: 0,
      latencyMs: Date.now() - startedAt,
      refusedReason: reason,
    });

    // ---- Mock mode ---------------------------------------------------------
    if (isMock()) {
      const key = await fixtureKeyFor(args.fixtureKey ?? null);
      const fixture = args.fixtureKey === undefined ? undefined : AI_FIXTURES[`${args.purpose}/${key}`];
      if (fixture === undefined) throw new MissingFixtureError(args.purpose, key);
      return {
        ok: true,
        content: fixture.content ?? "",
        model: "mock",
        finishReason: "stop",
        usage: {
          promptTokens: fixture.usage?.promptTokens ?? 0,
          cachedTokens: fixture.usage?.cachedTokens ?? 0,
          completionTokens: fixture.usage?.completionTokens ?? 0,
        },
        costUsd: 0,
        latencyMs: Date.now() - startedAt,
        refusedReason: null,
      };
    }

    // ---- Live: configuration -----------------------------------------------
    const chain = modelChain(args.tier);
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (apiKey === undefined || apiKey.trim() === "") return refuse(NOT_CONFIGURED, chain[0], "not_configured");

    const attribution = openRouterAttribution();
    const provider: Record<string, unknown> = {
      sort: "price",
      // Nothing a learner types ever goes to a provider that retains prompts.
      data_collection: "deny",
      allow_fallbacks: true,
    };
    // Zero data retention routes only, on every call (DECISIONS.md, Phase 2).
    provider.zdr = true;
    // Structured replies must match their schema: only providers that enforce
    // structured outputs may serve them (a provider that ignored the schema broke an Amayi Learn quiz).
    if (args.jsonSchema !== undefined) provider.require_parameters = true;
    // Structured JSON goes only to providers that enforce the schema itself (models.ts).
    if (args.jsonSchema !== undefined) provider.only = [...STRUCTURED_OUTPUT_PROVIDERS];

    const body: Record<string, unknown> = {
      models: chain,
      messages: wireMessages(args.messages, chain[0], args.stablePrefixCount),
      usage: { include: true },
      provider,
      max_tokens: args.maxTokens ?? 3200,
    };
    // Newer Claude models reject temperature, top_p and top_k (models.ts).
    if (acceptsSampling(chain)) body.temperature = args.temperature ?? 0.3;
    if (args.reasoningEffort !== undefined) body.reasoning = { effort: args.reasoningEffort };
    if (args.jsonSchema !== undefined) body.response_format = { type: "json_schema", json_schema: args.jsonSchema };
    // The model reads PDFs itself; never a separate OCR service, which would be another processor.
    if (hasFile(args.messages)) body.plugins = [{ id: "file-parser", pdf: { engine: "native" } }];

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": attribution.siteUrl,
      "X-Title": attribution.appName,
    };

    let lastError = "unknown error";
    let modelUsed = chain[0];
    let zdrUnavailable = false;

    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, jitter(RETRY_BASE_DELAY_MS)));
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        let response: Response;
        try {
          response = await fetch(ENDPOINT, { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal });
        } finally {
          clearTimeout(timer);
        }

        if (response.status === 429 || response.status >= 500) {
          lastError = `provider returned ${response.status}`;
          continue;
        }
        if (!response.ok) {
          const text = await response.text();
          lastError = `provider returned ${response.status}`;
          if (/no (allowed )?(endpoints|providers)|zdr|data polic/i.test(text)) zdrUnavailable = true;
          break;
        }

        const payload = (await response.json()) as {
          model?: string;
          choices?: { finish_reason?: string; message?: { content?: string | null } }[];
          usage?: unknown;
          error?: { message?: string };
        };
        if (payload.error !== undefined) {
          lastError = "provider reported an error";
          break;
        }

        const choice = payload.choices?.[0];
        modelUsed = payload.model ?? chain[0];
        if ((choice?.message?.content ?? "") === "") {
          console.warn(`model call returned no content (${args.purpose}, ${modelUsed}, finish ${choice?.finish_reason ?? "none"})`);
        }
        const usage = parseUsage(payload.usage);
        const price = await ctx.runQuery(internal.ai.prices.priceFor, { model: modelUsed });
        return {
          ok: true,
          content: choice?.message?.content ?? "",
          model: modelUsed,
          finishReason: choice?.finish_reason ?? null,
          usage,
          costUsd: roundCost(costOf(usage, price)),
          latencyMs: Date.now() - startedAt,
          refusedReason: null,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.name : "request failed";
      }
    }

    // ---- Failure. Log the status only, never learner text, and return the canned message.
    console.warn(`model call failed (${args.purpose}, ${modelUsed}): ${lastError.slice(0, 160)}`);
    return {
      ok: false,
      content: CANNED_FAILURE,
      model: modelUsed,
      finishReason: "error",
      usage: empty,
      costUsd: 0,
      latencyMs: Date.now() - startedAt,
      refusedReason: zdrUnavailable ? "no_zdr_provider" : null,
    };
  },
});

/**
 * Text to speech ("Read it to me"). Same credential and data policy. The
 * caller verifies what may be spoken and owns the accounting: it counts the
 * cost against the learner's budget and stores no learner content, so the text is
 * never logged, only the status.
 */
export const speech = internalAction({
  args: { model: v.string(), voice: v.string(), input: v.string() },
  handler: async (_ctx, args): Promise<{ ok: true; audio: ArrayBuffer; mime: string } | { ok: false; error: string }> => {
    if (isMock()) return { ok: false, error: "mock_mode" };
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (apiKey === undefined || apiKey.trim() === "") return { ok: false, error: "not_configured" };
    const attribution = openRouterAttribution();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SPEECH_TIMEOUT_MS);
    try {
      const response = await fetch(SPEECH_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": attribution.siteUrl,
          "X-Title": attribution.appName,
        },
        body: JSON.stringify({ model: args.model, voice: args.voice, input: args.input, response_format: "mp3", provider: { data_collection: "deny" } }),
        signal: controller.signal,
      });
      if (!response.ok) {
        console.warn(`speech failed (${args.model}): ${response.status}`);
        return { ok: false, error: `provider returned ${response.status}` };
      }
      return { ok: true, audio: await response.arrayBuffer(), mime: response.headers.get("content-type") ?? "audio/mpeg" };
    } catch (error) {
      console.warn(`speech failed (${args.model}): ${error instanceof Error ? error.name : "error"}`);
      return { ok: false, error: "speech request failed" };
    } finally {
      clearTimeout(timer);
    }
  },
});

/** Refresh the chains' prices from OpenRouter. Daily cron (crons.ts). */
export const refreshPrices = internalAction({
  args: {},
  handler: async (ctx): Promise<{ updated: number }> => {
    if (isMock()) return { updated: 0 };
    const apiKey = process.env.OPENROUTER_API_KEY;
    const headers: Record<string, string> = apiKey === undefined ? {} : { Authorization: `Bearer ${apiKey}` };
    const response = await fetch(MODELS_ENDPOINT, { headers });
    if (!response.ok) return { updated: 0 };
    const payload = (await response.json()) as {
      data?: { id: string; pricing?: { prompt?: string; completion?: string; input_cache_read?: string } }[];
    };
    const wanted = new Set([...modelChain("fast"), ...modelChain("main")]);
    let updated = 0;
    for (const model of payload.data ?? []) {
      if (!wanted.has(model.id)) continue;
      const pricing = model.pricing;
      if (pricing === undefined) continue;
      const prompt = Number(pricing.prompt ?? "0");
      const completion = Number(pricing.completion ?? "0");
      const cached = Number(pricing.input_cache_read ?? pricing.prompt ?? "0");
      if (!Number.isFinite(prompt) || !Number.isFinite(completion)) continue;
      await ctx.runMutation(internal.ai.prices.upsertPrice, {
        model: model.id,
        promptUsdPerToken: prompt,
        completionUsdPerToken: completion,
        cachedPromptUsdPerToken: Number.isFinite(cached) ? cached : prompt,
      });
      updated++;
    }
    return { updated };
  },
});
