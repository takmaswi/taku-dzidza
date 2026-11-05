import { expect, test } from "@playwright/test";
import { freshEmail, freshPhone, outboxCode, setUp, signUp } from "./helpers";

/**
 * Phase 1 journeys, against the local Convex backend in mock mode
 * (scripts/e2e.mjs).
 */

test("an adult signs up, takes the style quiz, changes settings and deletes the account", async ({ page }, info) => {
  const email = freshEmail(info.project.name);
  const year = new Date().getFullYear();
  await signUp(page, email);
  await setUp(page, "Chipo", year - 30);

  await expect(page.getByRole("heading", { name: "What are you studying for?" })).toBeVisible();
  await page.getByRole("button", { name: /A professional exam/ }).click();
  await page.getByRole("button", { name: /Straight to the point/ }).click();
  await page.getByRole("button", { name: /Dense summaries/ }).click();
  await page.getByRole("button", { name: /Like a patient teacher/ }).click();
  await expect(page.getByRole("heading", { name: "Locked In", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Let's go" }).click();

  await expect(page.getByRole("heading", { name: "What are we studying today, Chipo?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Explain IAS 16 in plain words" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-style", "locked_in");

  await page.getByRole("link", { name: "Get help" }).first().click();
  await expect(page.getByText("Childline Zimbabwe: call 116")).toBeVisible();
  await page.goBack();

  await page.getByRole("link", { name: "Settings" }).first().click();
  await page.getByRole("switch", { name: "Dyslexia friendly" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-dyslexia", "true");
  await page.getByRole("button", { name: /Guide me/ }).click();
  await expect(page.getByRole("button", { name: /Guide me/ })).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("Type your email address to confirm").fill(email);
  await page.getByRole("button", { name: "Delete my account for good" }).click();
  await expect(page.getByRole("link", { name: "Start studying free" }).first()).toBeVisible();
});

test("a 14 year old waits for a guardian, who consents from the link with a phone code", async ({ page, browser }, info) => {
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
  const phone = freshPhone();
  await guardian.getByLabel("Your phone number").fill(phone.typed);
  await guardian.getByLabel(/I am this learner's parent or legal guardian/).check();
  await guardian.getByLabel("I agree to the points above.").check();
  // The permission button comes only after a code has gone to the phone.
  await expect(guardian.getByRole("button", { name: "Give permission" })).toHaveCount(0);
  await guardian.getByRole("button", { name: "Send me the code" }).click();
  const codeField = guardian.getByLabel("6 digit code from the text message");
  await expect(codeField).toBeVisible();
  const code = await outboxCode(phone.stored);
  await codeField.fill(code === "000000" ? "000001" : "000000");
  await guardian.getByRole("button", { name: "Give permission" }).click();
  await expect(guardian.getByRole("alert")).toContainText("That code is not right");
  await codeField.fill(code);
  await guardian.getByRole("button", { name: "Give permission" }).click();
  await expect(guardian.getByText(/Permission is given/)).toBeVisible();
  await guardianContext.close();

  // The learner's page updates by itself.
  await expect(page.getByRole("heading", { name: "What are you studying for?" })).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("heading", { name: "What are we studying today, Tafara?" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-style", "cook");
});

test("under 12 is pointed to Amai Learn", async ({ page }, info) => {
  await signUp(page, freshEmail(info.project.name));
  await setUp(page, "Kuda", new Date().getFullYear() - 11);
  await expect(page.getByRole("heading", { name: "Takudzidza starts at Form 1" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to Amai Learn" })).toHaveAttribute("href", "https://amayi-learn.vercel.app");
});

test("from home, a starter question opens a chat with Taku's answer", async ({ page }, info) => {
  await signUp(page, freshEmail(info.project.name));
  await setUp(page, "Rudo", new Date().getFullYear() - 20);
  await page.getByRole("button", { name: "Skip" }).click();
  await page.getByRole("button", { name: "Explain osmosis simply" }).first().click();
  await expect(page).toHaveURL(/\/chat\/.+/);
  await expect(page.getByTestId("chat-learner").last()).toContainText("Explain osmosis simply");
  await expect(page.getByTestId("chat-taku").last()).toContainText("partially permeable membrane");
  await expect(page.getByRole("heading", { name: "Explain osmosis simply" })).toBeVisible();
});
