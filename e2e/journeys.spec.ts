import { expect, test, type Page } from "@playwright/test";

/**
 * Phase 1 journeys, against the local Convex backend in mock mode
 * (scripts/e2e.mjs). No AI is called in Phase 1.
 */

let seq = 0;
function freshEmail(project: string): string {
  seq += 1;
  return `e2e-${project}-${Date.now()}-${seq}@example.com`;
}

const PASSWORD = "studyhard2026";

async function signUp(page: Page, email: string) {
  await page.goto("/");
  await page.getByRole("link", { name: "Get started" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
}

async function setUp(page: Page, name: string, birthYear: number) {
  await expect(page.getByRole("heading", { name: "Tell us about you" })).toBeVisible();
  await page.getByLabel("What should Taku call you?").fill(name);
  await page.getByLabel("Month").selectOption({ label: "January" });
  await page.getByLabel("Year").selectOption(String(birthYear));
  await page.getByRole("button", { name: "Continue" }).click();
}

test("an adult signs up, takes the style quiz, changes settings and deletes the account", async ({ page }, info) => {
  const email = freshEmail(info.project.name);
  const year = new Date().getFullYear();
  await signUp(page, email);
  await setUp(page, "Chipo", year - 30);

  await expect(page.getByRole("heading", { name: "How do you like to study?" })).toBeVisible();
  await page.getByRole("button", { name: "Straight to the point, nothing extra" }).click();
  await page.getByRole("button", { name: "Dense summaries I can read fast" }).click();
  await page.getByRole("button", { name: "A patient teacher" }).click();
  await page.getByRole("button", { name: "See my style" }).click();
  await expect(page.getByRole("heading", { name: "Locked In" })).toBeVisible();
  await page.getByRole("button", { name: "Start studying" }).click();

  await expect(page.getByRole("heading", { name: "Hello, Chipo" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-style", "locked_in");

  await page.getByRole("link", { name: "Get help" }).click();
  await expect(page.getByText("Childline Zimbabwe: call 116")).toBeVisible();
  await page.goBack();

  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("switch", { name: "Dyslexia friendly" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-dyslexia", "true");
  await page.getByRole("button", { name: /Guide me/ }).click();
  await expect(page.getByRole("button", { name: /Guide me/ })).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("Type your email address to confirm").fill(email);
  await page.getByRole("button", { name: "Delete my account for good" }).click();
  await expect(page.getByRole("heading", { name: "Study smarter with your own notes." })).toBeVisible();
});

test("a 14 year old waits for a guardian, who consents from the link", async ({ page, browser }, info) => {
  const year = new Date().getFullYear();
  await signUp(page, freshEmail(info.project.name));
  await setUp(page, "Tafara", year - 14);

  await expect(page.getByRole("heading", { name: "Ask a parent or guardian" })).toBeVisible();
  await page.getByRole("button", { name: "Make the link" }).click();
  const link = await page.getByTestId("consent-link").inputValue();
  expect(link).toContain("/consent/");

  const guardianContext = await browser.newContext();
  const guardian = await guardianContext.newPage();
  await guardian.goto(link);
  await expect(guardian.getByText(/Tafara would like to use Takudzidza/)).toBeVisible();
  await guardian.getByLabel("Your full name").fill("Rudo Moyo");
  await guardian.getByLabel("How are you related to the learner?").fill("mother");
  await guardian.getByLabel("Your email or phone number").fill("+263 77 123 4567");
  await guardian.getByLabel(/I am this learner's parent or legal guardian/).check();
  await guardian.getByLabel("I agree to the points above.").check();
  await guardian.getByRole("button", { name: "Give permission" }).click();
  await expect(guardian.getByText(/Permission is given/)).toBeVisible();
  await guardianContext.close();

  // The learner's page updates by itself.
  await expect(page.getByRole("heading", { name: "How do you like to study?" })).toBeVisible();
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page.getByRole("heading", { name: "Hello, Tafara" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-style", "cook");
});

test("under 12 is pointed to Amai Learn", async ({ page }, info) => {
  await signUp(page, freshEmail(info.project.name));
  await setUp(page, "Kuda", new Date().getFullYear() - 11);
  await expect(page.getByRole("heading", { name: "Takudzidza starts at Form 1" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to Amai Learn" })).toHaveAttribute("href", "https://amayi-learn.vercel.app");
});
