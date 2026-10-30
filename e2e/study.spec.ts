import { expect, test, type Page } from "@playwright/test";

/** Phase 3: study tools from a notebook (mock fixtures, no AI spend). */

const NOTES = "Photosynthesis\nGreen plants make glucose from carbon dioxide and water using light energy.\nChlorophyll in the chloroplasts absorbs the light.\nOxygen is released as a by product.";

async function notebook(page: Page, project: string) {
  await page.goto("/signin?mode=signUp");
  await page.getByLabel("Email").fill(`e2e-study-${project}-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("studyhard2026");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("What should Taku call you?").fill("Farai");
  await page.getByLabel("Month").selectOption({ label: "January" });
  await page.getByLabel("Year").selectOption(String(new Date().getFullYear() - 22));
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await page.getByRole("button", { name: "New notebook" }).first().click();
  await page.getByLabel("What is this notebook for?").fill("Biology");
  await page.getByRole("button", { name: "Create notebook" }).click();
  await page.getByRole("button", { name: "Paste text" }).click();
  await page.getByLabel("Your text").fill(NOTES);
  await page.getByRole("button", { name: "Add text" }).click();
  await expect(page.getByText("1 page")).toBeVisible();
  await page.getByRole("tab", { name: "Study tools" }).click();
}

test("flashcards, a quiz paper, Scroll and a summary", async ({ page }, info) => {
  await notebook(page, info.project.name);

  // Flashcards and review.
  await page.getByRole("button", { name: /^Flashcards/ }).click();
  await page.getByLabel("How many").fill("5");
  await page.getByRole("button", { name: "Make flashcards" }).click();
  await expect(page.getByTestId("flashcard")).toContainText("1 / 5");
  await page.getByRole("button", { name: "Show answer", exact: true }).click();
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(page.getByTestId("flashcard")).toContainText("2 / 5");
  await page.getByRole("button", { name: "Show answer", exact: true }).click();
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByRole("link", { name: "Back to notebook" }).click();

  // A quiz paper in exam board style.
  await page.getByRole("button", { name: /^Quiz/ }).click();
  await page.getByLabel("How many").fill("4");
  await page.getByLabel("Minutes").fill("15");
  await page.getByRole("button", { name: "Make quiz" }).click();
  await expect(page.getByText("Time: 15 minutes")).toBeVisible();
  await expect(page.getByText("Total: 7 marks")).toBeVisible();
  await expect(page.getByText("[2 marks]").first()).toBeVisible();
  await page.getByRole("radio", { name: /Oxygen/ }).check();
  await page.getByRole("button", { name: "Mark my answers" }).click();
  await expect(page.getByText("Correct").first()).toBeVisible();
  await page.getByRole("button", { name: "Save my marks" }).click();
  await expect(page.getByText("You scored 1 out of 7.")).toBeVisible();
  await page.getByRole("link", { name: "Back to notebook" }).click();

  // Scroll.
  await page.getByRole("button", { name: /^Scroll/ }).click();
  await page.getByLabel("How many").fill("8");
  await page.getByRole("button", { name: "Make scroll" }).click();
  const feed = page.getByTestId("scroll-feed");
  await expect(feed.getByText("This is why leaves are green")).toBeVisible();
  await feed.getByRole("button", { name: "Tap to see the answer" }).first().click();
  await expect(feed.getByText("Glucose, from carbon dioxide and water using light energy.")).toBeVisible();
  await feed.getByRole("link", { name: "Back to notebook" }).first().click();

  // Summary, cited.
  await page.getByRole("button", { name: /^Summary/ }).click();
  await page.getByRole("button", { name: "Make summary" }).click();
  await expect(page.getByRole("heading", { name: "Photosynthesis" })).toBeVisible();
  await expect(page.getByText("Untitled, page 1").or(page.getByText("Pasted text, page 1")).first()).toBeVisible();
  await expect(page.getByText("Taku's idea, not from your notes")).toBeVisible();
});
