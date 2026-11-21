import { expect, test } from "@playwright/test";
import { adultOnHome } from "./helpers";

/**
 * The 21 November pass: the first run look picker with four looks, high
 * contrast in dark, the past chats panel that folds away (and the phone
 * sheet), and charts drawn from Taku's reply. Each test sets its own size.
 */

const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

test.describe("looks", () => {
  // A new device: the picker has not been seen.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the first run picker offers four looks, and high contrast has a dark mode", async ({ page }, info) => {
    await page.setViewportSize(DESKTOP);
    await adultOnHome(page, info, "looks");
    const dialog = page.getByTestId("look-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("radio")).toHaveCount(4);
    await dialog.getByTestId("look-contrast-dark").click();
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-contrast", "true");
    await expect(html).toHaveAttribute("data-theme", "dark");
    await dialog.getByRole("button", { name: "Continue" }).click();
    await expect(dialog).toBeHidden();
    // The sun and moon still switch light and dark while high contrast is on.
    await page.getByRole("button", { name: "Switch to light mode" }).first().click();
    await expect(html).toHaveAttribute("data-theme", "light");
    await expect(html).toHaveAttribute("data-contrast", "true");
    await page.reload();
    await expect(page.getByTestId("look-dialog")).toBeHidden();
    // Settings shows the same four, with high contrast light picked.
    await page.goto("/settings");
    await expect(page.getByTestId("look-contrast-light")).toHaveAttribute("aria-checked", "true");
    await page.getByTestId("look-warm-light").click();
    await expect(html).toHaveAttribute("data-contrast", "false");
  });
});

test("the chats panel folds away on wide screens and is a sheet on phones", async ({ page }, info) => {
  await page.setViewportSize(DESKTOP);
  await adultOnHome(page, info, "chatlist");
  await page.goto("/chat");
  await page.locator("#chat-input").fill("How do I factorise x^2 + 5x + 6?");
  await page.locator("#chat-input").press("Enter");
  await expect(page.getByTestId("chat-taku").last()).toContainText("factorise");
  const list = page.locator("#chat-list");
  await expect(list).toBeVisible();
  await expect(list.getByText("Today")).toBeVisible();
  // Typed maths shows as x² in the list and the bar.
  await expect(list.getByRole("link", { name: /x² \+ 5x/ })).toBeVisible();
  await page.getByRole("button", { name: "Hide chats" }).click();
  await expect(list).toBeHidden();
  const thread = await page.getByTestId("chat-thread").boundingBox();
  expect(thread!.width).toBeGreaterThan(1100);
  await page.reload();
  await expect(page.getByRole("button", { name: "Show chats" })).toBeVisible();
  await expect(page.locator("#chat-list")).toBeHidden();
  await page.keyboard.press("Control+b");
  await expect(page.locator("#chat-list")).toBeVisible();

  await page.setViewportSize(PHONE);
  await page.getByRole("button", { name: "Your chats" }).click();
  const sheet = page.getByTestId("chat-sheet");
  await expect(sheet).toBeVisible();
  await sheet.getByRole("link").first().click();
  await expect(sheet).toBeHidden();
});

test("Taku's chart blocks draw as charts that flip to a table", async ({ page }, info) => {
  await page.setViewportSize(DESKTOP);
  await adultOnHome(page, info, "charts");
  await page.goto("/chat");
  await page.locator("#chat-input").fill("Compare Pele, Maradona, Messi and Ronaldo");
  await page.locator("#chat-input").press("Enter");
  const chart = page.getByTestId("chart");
  await expect(chart).toBeVisible();
  await expect(chart).toContainText("Greatest footballer debate");
  await expect(chart.locator(".bar-group")).toHaveCount(5);
  await expect(page.getByTestId("chat-taku").last()).not.toContainText('"series"');
  await chart.getByRole("button", { name: "Table" }).click();
  await expect(chart.getByRole("table")).toBeVisible();
  await expect(chart.getByRole("columnheader", { name: "Messi" })).toBeVisible();
});
