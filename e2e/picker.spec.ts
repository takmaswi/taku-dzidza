import { expect, test } from "@playwright/test";
import { adultOnHome, newNotebook, pasteNotes } from "./helpers";

/**
 * Step 8: in Ask Taku, "Use my notebooks" picks up to 5 of the learner's
 * notebooks. Taku then answers from them with citations, the choice stays
 * with the chat, and each picked notebook can be removed above the box.
 */

const CHEMISTRY = "Acids and bases\nAn acid turns blue litmus paper red.\nA base turns red litmus paper blue.";

test("a learner picks two notebooks in Ask Taku, gets an answer cited to both, opens a cited page, and the choice stays with the chat", async ({ page }, info) => {
  test.setTimeout(150_000);
  await adultOnHome(page, info, "e2e-picker");
  await newNotebook(page, "Biology");
  await pasteNotes(page, info, undefined, "Plant notes");
  await page.goto("/");
  await newNotebook(page, "Chemistry");
  await pasteNotes(page, info, CHEMISTRY, "Acid notes");

  await page.goto("/chat");
  await page.getByRole("button", { name: "Use my notebooks" }).click();
  const picker = page.getByTestId("notebook-picker");
  await expect(picker).toBeVisible();
  await picker.getByLabel("Search your notebooks").fill("bio");
  await expect(picker.getByRole("checkbox")).toHaveCount(1);
  await picker.getByLabel("Biology").check();
  await picker.getByLabel("Search your notebooks").fill("");
  await picker.getByLabel("Chemistry").check();
  await picker.getByRole("button", { name: "Done" }).click();
  await expect(picker).toBeHidden();
  const chips = page.getByTestId("picked-notebooks");
  await expect(chips).toContainText("Biology");
  await expect(chips).toContainText("Chemistry");
  await expect(page.getByRole("button", { name: "Notebooks: 2" })).toBeVisible();

  await page.locator("#chat-input").fill("What does chlorophyll do?");
  await page.locator("#chat-input").press("Enter");
  const answer = page.getByTestId("chat-taku").last();
  await expect(answer.getByRole("button", { name: "Source 1: Plant notes, page 1" })).toBeVisible({ timeout: 30_000 });
  await expect(answer.getByRole("button", { name: "Source 2: Acid notes, page 1" })).toBeVisible();
  await expect(answer).toContainText("From your notebooks");
  await answer.getByRole("button", { name: "Source 2: Acid notes, page 1" }).click();
  const source = page.getByTestId("chat-source");
  await expect(source).toContainText("An acid turns blue litmus paper red");
  await source.getByRole("button", { name: "Done" }).click();

  // Kept with the chat.
  await page.reload();
  await expect(page.getByTestId("picked-notebooks")).toContainText("Chemistry");
  await page.getByRole("button", { name: "Stop using Chemistry" }).click();
  await expect(page.getByTestId("picked-notebooks")).not.toContainText("Chemistry");
  await expect(page.getByRole("button", { name: "Notebooks: 1" })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("picked-notebooks")).not.toContainText("Chemistry");
  await expect(page.getByTestId("picked-notebooks")).toContainText("Biology");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

  // A new chat starts on general knowledge.
  await page.getByRole("link", { name: "New chat" }).click();
  await expect(page.getByRole("button", { name: "Use my notebooks" })).toBeVisible();
  await expect(page.getByTestId("picked-notebooks")).toHaveCount(0);
});
