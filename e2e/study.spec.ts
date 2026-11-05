import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { adultOnHome, newNotebook, openTools, pasteNotes } from "./helpers";

/** Study tools from a notebook (mock fixtures, no AI spend). */

async function notebook(page: Page, info: TestInfo) {
  await adultOnHome(page, info, "e2e-study");
  await newNotebook(page, "Biology");
  await pasteNotes(page, info);
  await openTools(page, info);
}

/** Focus mode hides the app around the work, and Exit goes back to the notebook. */
async function exitFocus(page: Page) {
  const focus = page.getByTestId("focus-mode");
  await expect(focus).toBeVisible();
  await expect(page.locator("nav.rail")).toBeHidden();
  await expect(page.locator("nav.tabbar")).toBeHidden();
  await focus.getByRole("link", { name: "Exit" }).click();
  await expect(focus).toHaveCount(0);
  await expect(page.getByLabel("Ask Taku about your notes")).toBeVisible();
}

test("flashcards, a practice paper, Scroll and a summary", async ({ page }, info) => {
  await notebook(page, info);

  // Flashcards and review, in focus mode.
  await page.getByRole("button", { name: /^Flashcards/ }).click();
  await page.getByLabel("How many").fill("5");
  await page.getByRole("button", { name: "Make flashcards" }).click();
  await expect(page.getByTestId("flashcard")).toContainText("1 / 5");
  await page.getByRole("button", { name: "Show answer", exact: true }).click();
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(page.getByTestId("flashcard")).toContainText("2 / 5");
  await page.getByRole("button", { name: "Show answer", exact: true }).click();
  await page.getByRole("button", { name: "Try again" }).click();
  await exitFocus(page);

  // A practice paper in exam board style, in focus mode.
  await openTools(page, info);
  await page.getByRole("button", { name: /^Practice paper/ }).click();
  await page.getByLabel("How many").fill("4");
  await page.getByLabel("Minutes").fill("15");
  await page.getByRole("button", { name: "Make practice paper" }).click();
  await expect(page.getByText("Time: 15 minutes")).toBeVisible();
  await expect(page.getByText("Total: 7 marks")).toBeVisible();
  await expect(page.getByText("[2 marks]").first()).toBeVisible();
  await page.getByRole("radio", { name: /Oxygen/ }).check();
  await page.getByRole("button", { name: "Mark my answers" }).click();
  await expect(page.getByText("Correct").first()).toBeVisible();
  await page.getByRole("button", { name: "Save my marks" }).click();
  await expect(page.getByText("You scored 1 out of 7.")).toBeVisible();
  await exitFocus(page);

  // Scroll, in dark focus mode.
  await openTools(page, info);
  await page.getByRole("button", { name: /^Scroll/ }).click();
  await page.getByLabel("How many").fill("8");
  await page.getByRole("button", { name: "Make scroll" }).click();
  const feed = page.getByTestId("scroll-feed");
  await expect(feed.getByText("This is why leaves are green")).toBeVisible();
  await feed.getByRole("button", { name: "Tap to see the answer" }).first().click();
  await expect(feed.getByText("Glucose, from carbon dioxide and water using light energy.")).toBeVisible();
  await exitFocus(page);

  // Summary, cited, inside the panel.
  await openTools(page, info);
  await page.getByRole("button", { name: /^Summary/ }).click();
  await page.getByRole("button", { name: "Make summary" }).click();
  const result = page.getByTestId("panel-output");
  await expect(result.getByRole("heading", { name: "Photosynthesis" })).toBeVisible();
  await expect(result.getByText("Untitled, page 1").or(result.getByText("Pasted text, page 1")).first()).toBeVisible();
  await expect(result.getByText("Taku's idea, not from your notes")).toBeVisible();
  await result.getByRole("button", { name: "All tools" }).click();
  await expect(page.getByRole("group", { name: "Study tools" })).toBeVisible();
  await expect(page.getByText("Made from this notebook")).toBeVisible();
});
