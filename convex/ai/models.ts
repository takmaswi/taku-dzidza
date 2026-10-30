/**
 * Model chains and pricing for Takudzidza. Ported from Amayi Learn
 * (convex/ai/models.ts at ec3496e). No I/O beyond process.env, so it is unit
 * testable.
 */

/** "fast" for safety checks and small classifications, "main" for Taku. */
export type Tier = "fast" | "main";

export const PURPOSES = [
  // Safety checks on learner input and on Taku's output.
  "safety_check",
  // Taku answering in a notebook, and the study tools (summaries, cards, quizzes).
  "taku_answer",
  "taku_tool",
  // Taku in a general chat, from general knowledge.
  "taku_chat",
  // Reading an uploaded source (PDF pages, photos) into text.
  "source_read",
] as const;

export type Purpose = (typeof PURPOSES)[number];

function env(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.trim() === "" ? undefined : value.trim();
}

/**
 * Default chain for both tiers: the model Amayi Learn checked against the
 * OpenRouter models endpoint on 12 October 2026 (it exists, has zero data
 * retention endpoints and supports structured outputs). Re check on the day
 * live calls start (SPEC.md section 5) and override with
 * `npx convex env set MODEL_MAIN <id>[,<id>]` or MODEL_FAST.
 */
export const DEFAULT_CHAIN: readonly string[] = ["anthropic/claude-haiku-5.5"];

export function modelChain(tier: Tier): string[] {
  const raw = env(tier === "main" ? "MODEL_MAIN" : "MODEL_FAST");
  const fromEnv = (raw ?? "").split(",").map((m) => m.trim()).filter((m) => m.length > 0);
  return fromEnv.length > 0 ? [...new Set(fromEnv)] : [...DEFAULT_CHAIN];
}

/**
 * Providers that enforce a strict json_schema (from Amayi Learn, OpenRouter
 * endpoints API, 24 October 2026). require_parameters alone is not enough:
 * some providers list response_format with JSON mode only.
 */
export const STRUCTURED_OUTPUT_PROVIDERS: readonly string[] = ["google-vertex", "anthropic", "azure"];

/**
 * Models that reject temperature, top_p and top_k. Their OpenRouter
 * supported_parameters list none of the three (models endpoint, 12 October
 * 2026). A chain that contains one is sent no sampling parameters at all.
 */
export const NO_SAMPLING_MODELS: readonly string[] = [
  "anthropic/claude-haiku-5.5",
  "anthropic/claude-sonnet-5.5",
  "anthropic/claude-opus-5.5",
  "anthropic/claude-fable-5.1",
  "anthropic/claude-fable-5",
  "anthropic/claude-opus-5",
  "anthropic/claude-sonnet-5",
  "anthropic/claude-opus-4.8",
  "anthropic/claude-opus-4.7",
];

export function acceptsSampling(chain: readonly string[]): boolean {
  return !chain.some((model) => NO_SAMPLING_MODELS.includes(model));
}

/** Model families that need an explicit cache breakpoint (OpenRouter prompt caching docs, 17 Sep 2026). */
export function needsCacheMarker(modelId: string): boolean {
  return modelId.startsWith("qwen/") || modelId.startsWith("anthropic/");
}

export type ModelPrice = {
  /** USD per token, not per million. */
  promptUsdPerToken: number;
  completionUsdPerToken: number;
  cachedPromptUsdPerToken: number;
};

const PER_MILLION = 1_000_000;

export function priceFromPerMillion(promptPerM: number, cachedPerM: number, completionPerM: number): ModelPrice {
  return {
    promptUsdPerToken: promptPerM / PER_MILLION,
    cachedPromptUsdPerToken: cachedPerM / PER_MILLION,
    completionUsdPerToken: completionPerM / PER_MILLION,
  };
}

/**
 * Seed prices, USD per million tokens: input / cached input / output. The
 * daily cron (crons.ts) overwrites these in modelPrices from the models
 * endpoint.
 */
export const SEED_PRICES_PER_MILLION: Record<string, { prompt: number; cached: number; completion: number }> = {
  // Read from the OpenRouter models endpoint on 12 October 2026.
  "anthropic/claude-haiku-5.5": { prompt: 0.1, cached: 0.01, completion: 0.5 },
};

export function seedPrice(model: string): ModelPrice {
  const seed = SEED_PRICES_PER_MILLION[model];
  if (seed === undefined) {
    // An unknown model is priced at zero rather than guessed.
    return { promptUsdPerToken: 0, cachedPromptUsdPerToken: 0, completionUsdPerToken: 0 };
  }
  return priceFromPerMillion(seed.prompt, seed.cached, seed.completion);
}

export type Usage = {
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
};

/** Cached prompt tokens are subtracted from the uncached count, not double counted. */
export function costOf(usage: Usage, price: ModelPrice): number {
  const uncachedPrompt = Math.max(usage.promptTokens - usage.cachedTokens, 0);
  return (
    uncachedPrompt * price.promptUsdPerToken +
    usage.cachedTokens * price.cachedPromptUsdPerToken +
    usage.completionTokens * price.completionUsdPerToken
  );
}

export function roundCost(usd: number): number {
  return Math.round(usd * 1e8) / 1e8;
}

export function openRouterAttribution(): { siteUrl: string; appName: string } {
  return {
    siteUrl: env("OPENROUTER_SITE_URL") ?? env("SITE_URL") ?? "http://localhost:5173",
    appName: env("OPENROUTER_APP_NAME") ?? "Takudzidza by Taku",
  };
}
