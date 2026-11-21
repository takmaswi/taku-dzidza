import { expect, test, type Page } from "@playwright/test";
import { adultOnHome, freshEmail, newNotebook, pasteNotes, phone, pickChip, setUp, signUp } from "./helpers";

/**
 * Study modes and support preferences (DECISIONS.md, Study modes and Taku's
 * voice). Each mode changes the shape of the session, not only the tone.
 */

async function sendChat(page: Page, text: string) {
  await page.getByLabel("Message Taku").fill(text);
  await page.getByRole("button", { name: "Send", exact: true }).click();
}

test("Test me in Ask Taku: one question at a time, each answer marked at once, then a final score", async ({ page }, info) => {
  await adultOnHome(page, info, "e2e-test-me");
  await page.goto("/chat");
  await pickChip(page, /^Study mode/, /^Test me/);
  await expect(page.getByTestId("study-mode-chip")).toContainText("Test me");
  await sendChat(page, "Test me on photosynthesis");
  await expect(page.getByTestId("test-question").last()).toHaveText("Question: What gas do plants take in for photosynthesis?");
  // The answer is kept on the server: it is nowhere on the page.
  await expect(page.getByText("Carbon dioxide", { exact: true })).toHaveCount(0);

  await sendChat(page, "Oxygen");
  await expect(page.getByTestId("test-mark").last()).toHaveText("Not quite");
  await expect(page.getByTestId("study-bar")).toContainText("Score: 0 out of 1");
  await sendChat(page, "Light energy");
  await expect(page.getByTestId("test-mark").last()).toHaveText("Right");
  await expect(page.getByTestId("study-bar")).toContainText("Score: 1 out of 2");
  await page.getByRole("button", { name: "Finish test" }).click();
  await expect(page.getByTestId("study-bar")).toContainText("You got 1 out of 2. Questions you missed are waiting in your review cards.");

  // The missed question is a review card.
  await page.goto("/notebooks");
  await page.getByRole("link", { name: /Test me questions/ }).first().click();
  await expect(page.getByRole("heading", { name: "Test me questions" })).toBeVisible();
});

test("Sprint: a timed bar, short answers, the chats panel folded, then a break prompt", async ({ page }, info) => {
  await adultOnHome(page, info, "e2e-sprint");
  await page.goto("/chat");
  await pickChip(page, /^Study mode/, /^Sprint/);
  await expect(page.getByTestId("study-bar")).toContainText("How long is this sprint?");
  await page.getByRole("button", { name: "10 minutes" }).click();
  await expect(page.getByRole("progressbar", { name: "Sprint progress" })).toBeVisible();
  await expect(page.getByTestId("study-bar")).toContainText("10 minutes left");
  if (!phone(info)) await expect(page.locator("#chat-list")).toHaveAttribute("inert", "");
  await sendChat(page, "Explain osmosis simply");
  await expect(page.getByTestId("chat-taku").last()).toContainText("Next step: say in your own words");

  // The sprint runs out: a break prompt, then back to Learn.
  await page.evaluate(() => {
    localStorage.setItem("takudzidza-sprint", JSON.stringify({ endsAt: Date.now() - 1000, minutes: 10 }));
    window.dispatchEvent(new Event("takudzidza-session"));
  });
  await expect(page.getByTestId("study-bar")).toContainText("Sprint done. Time for a short break.");
  await page.getByRole("button", { name: "Back to Learn" }).click();
  await expect(page.getByTestId("study-mode-chip")).toContainText("Learn");
  await expect(page.getByTestId("study-bar")).toHaveCount(0);
  if (!phone(info)) await expect(page.locator("#chat-list")).not.toHaveAttribute("inert", "");
});

test("onboarding: losing focus starts in Sprint, and test anxiety hides the countdown", async ({ page }, info) => {
  await signUp(page, freshEmail(info.project.name, "e2e-support"));
  await setUp(page, "Nyasha", new Date().getFullYear() - 19);
  await page.getByRole("button", { name: /University or college/ }).click();
  await page.getByLabel("I lose focus easily").check();
  await page.getByLabel("Tests make me anxious").check();
  await expect(page.getByTestId("support-sentence")).toHaveText(
    "We will start you with Sprint mode with short answers and break reminders and a gentle voice, no timers and scores only at the end. You can change any of it in Settings.",
  );
  await page.getByRole("button", { name: "Let's go" }).click();
  await expect(page.getByRole("heading", { name: /What are we studying today, Nyasha/ })).toBeVisible();
  await page.goto("/chat");
  await expect(page.getByTestId("study-mode-chip")).toContainText("Sprint");
  await page.getByRole("button", { name: "15 minutes" }).click();
  await expect(page.getByTestId("study-bar")).toContainText("Sprint under way");
  await expect(page.getByRole("progressbar", { name: "Sprint progress" })).toHaveCount(0);
  await page.goto("/settings");
  await expect(page.getByRole("switch", { name: "Shorter chunks" })).toBeChecked();
  await expect(page.getByRole("radiogroup", { name: "Taku's voice" }).getByRole("radio", { name: /Gentle/ })).toHaveAttribute("aria-checked", "true");
});

test("Test me in a notebook, and a timed practice paper from Exam prep", async ({ page }, info) => {
  await adultOnHome(page, info, "e2e-nb-test");
  await newNotebook(page, "Biology");
  await pasteNotes(page, info);
  await pickChip(page, /^Study mode/, /^Test me/);
  await page.getByLabel("Ask Taku about your notes").fill("Test me");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(page.getByTestId("test-question").last()).toHaveText("Question: What is released as a by product of photosynthesis?");
  await page.getByLabel("Ask Taku about your notes").fill("Carbon dioxide");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(page.getByTestId("test-mark").last()).toHaveText("Not quite");
  await expect(page.getByTestId("test-question").last()).toHaveText("Question: What absorbs the light in a leaf?");

  await pickChip(page, /^Study mode/, /^Exam prep/);
  await page.getByRole("button", { name: "Timed practice paper" }).click();
  await expect(page.getByText("Total: 7 marks")).toBeVisible();
  await expect(page.getByTestId("paper-clock")).toHaveText("15 minutes left");
});
