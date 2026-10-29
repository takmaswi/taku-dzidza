/** Shapes of the modules written by scripts/gen-data.mjs. */

export type AiFixture = {
  content?: string;
  usage?: { promptTokens?: number; cachedTokens?: number; completionTokens?: number };
  source: string;
};
