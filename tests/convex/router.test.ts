import { describe, expect, test } from "vitest";
import { internal } from "../../convex/_generated/api";
import { makeT } from "./people";

/** Mock mode (vitest.config.ts sets AI_MODE=mock): recorded fixtures only, never a default, never the network. */
describe("AI router in mock mode", () => {
  test("returns the recorded fixture for a known key", async () => {
    const t = makeT();
    const result = await t.action(internal.ai.router.call, {
      tier: "fast",
      purpose: "safety_check",
      messages: [{ role: "user", content: "anything" }],
      fixtureKey: { test: "router mock example" },
    });
    expect(result).toMatchObject({ ok: true, content: '{"verdict":"allow"}', model: "mock", costUsd: 0 });
  });

  test("throws MissingFixtureError for an unknown key instead of calling a model", async () => {
    const t = makeT();
    const before = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    try {
      await expect(
        t.action(internal.ai.router.call, { tier: "main", purpose: "taku_answer", messages: [{ role: "user", content: "x" }], fixtureKey: { test: "no such fixture" } }),
      ).rejects.toThrow(/MissingFixtureError/);
    } finally {
      if (before !== undefined) process.env.OPENROUTER_API_KEY = before;
    }
  });
});
