import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    environmentMatchGlobs: [["tests/convex/**", "edge-runtime"]],
    testTimeout: 30_000,
    server: { deps: { inline: ["convex-test"] } },
    env: { AI_MODE: "mock" },
  },
});
