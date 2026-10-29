import { defineConfig, devices } from "@playwright/test";

/**
 * End to end journeys, run by scripts/e2e.mjs against the local Convex
 * deployment in mock mode and a local Vite server. Ported from Amayi Learn
 * (playwright.config.ts at ec3496e). forbidOnly is always on, and
 * scripts/e2e.mjs fails the run when no test passed or any test was skipped.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  reporter: [["list"], ["json", { outputFile: "test-results/e2e-report.json" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5199",
    trace: "retain-on-failure",
    // A machine with a preinstalled browser of another version sets E2E_CHROMIUM to its path.
    launchOptions: process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {},
    screenshot: "only-on-failure",
  },
  projects: [
    // 360 wide: the narrowest common Android phone (SPEC.md 3.7).
    { name: "phone", use: { ...devices["Pixel 7"], viewport: { width: 360, height: 780 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
});
