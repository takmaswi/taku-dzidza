import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { adultOnHome, newNotebook, pasteNotes } from "./helpers";

/** Phase 3: study tools from a notebook (mock fixtures, no AI spend). */

async function notebook(page: Page, info: TestInfo) {
  await adultOnHome(page, info, "e2e-study");
  await newNotebook(page, "Biology");
  await pasteNotes(page, info);
  await page.getByRole("tab", { name: "Study tools" }).click();
}

test("flashcards, a quiz paper, Scroll and a summary", async ({ page }, info) => {
  await notebook(page, info);

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
