import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { adultOnHome, ask, newNotebook, NOTES } from "./helpers";

/**
 * The polish pass: the phone question box, the folded Study tools in an empty
 * notebook, citation markers, the action chips and the answer footer. Each
 * test sets its own screen size, so it runs the same on both projects.
 */

const PHONE = { width: 390, height: 844 };
const NARROW = { width: 360, height: 780 };
const DESKTOP = { width: 1280, height: 800 };

/** Paste notes from the empty notebook's middle tiles, which every screen size shows. */
async function paste(page: Page) {
  await page.getByRole("button", { name: /^Paste text/ }).first().click();
  await page.getByLabel("Your text").fill(NOTES);
  await page.getByRole("button", { name: "Add text" }).click();
  await expect(page.getByLabel("Ask Taku about your notes")).toBeVisible({ timeout: 30_000 });
}

async function answered(page: Page) {
  await ask(page, "What does chlorophyll do?");
  const last = page.getByTestId("message-taku").last();
  await expect(last).toContainText("Chlorophyll absorbs the light");
  await expect(last.locator(".answer-actions")).toBeVisible();
  return last;
}

/** A notebook with notes and the given number of answers, at the given size. */
async function chatting(page: Page, info: TestInfo, size: { width: number; height: number }, answers: number) {
  await page.setViewportSize(size);
  await adultOnHome(page, info, "polish");
  await newNotebook(page, "Biology");
  await paste(page);
  for (let i = 0; i < answers; i++) await answered(page);
  await page.locator("#question").blur();
}

async function box(l: Locator) {
  const b = await l.boundingBox();
  if (b === null) throw new Error("not on screen");
  return b;
}

test("phone notebook: both chips on one row, no tab bar, and the chat takes most of the screen", async ({ page }, info) => {
  await chatting(page, info, PHONE, 1);
  await expect(page.locator("nav.tabbar")).toHaveCount(0);

  for (const size of [PHONE, NARROW]) {
    await page.setViewportSize(size);
    const chips = page.locator(".composer .chip-menu");
    await expect(chips).toHaveCount(2);
    const [a, b, send] = [await box(chips.nth(0)), await box(chips.nth(1)), await box(page.locator(".composer .send"))];
    expect(Math.abs(a.y - b.y), `chips on one row at ${size.width}`).toBeLessThan(4);
    expect(Math.abs(a.y + a.height / 2 - (send.y + send.height / 2))).toBeLessThan(6);
    expect(send.x + send.width).toBeLessThanOrEqual(size.width);
    // Short labels on the chips; the full text stays in the button name and the menu.
    await expect(page.getByRole("button", { name: "Taku uses: My notes plus Taku's ideas" })).toContainText("Notes plus ideas");
    await expect(page.getByRole("button", { name: "How Taku answers: Show me the answer" })).toContainText("Answer");
  }

  await page.setViewportSize(PHONE);
  const chat = await box(page.locator(".thread-scroll"));
  expect(chat.height, "chat area at least 70 percent of a 390 by 844 screen").toBeGreaterThanOrEqual(0.7 * PHONE.height);

  // Ask Taku has no tab bar either, and its empty state shows the whole cutout inside the screen.
  await page.goto("/chat");
  await expect(page.getByRole("heading", { name: "Ask anything you are studying." })).toBeVisible();
  await expect(page.locator("nav.tabbar")).toHaveCount(0);
  const art = page.locator(".chat-empty-art img").first();
  await expect(art).toBeVisible();
  await page.waitForFunction(() => Array.from(document.querySelectorAll<HTMLImageElement>(".chat-empty-art img")).every((i) => i.complete));
  const [a, bar] = [await box(art), await box(page.locator(".topbar"))];
  expect(a.y).toBeGreaterThanOrEqual(bar.y + bar.height);
  expect(a.x).toBeGreaterThanOrEqual(0);
  expect(a.x + a.width).toBeLessThanOrEqual(PHONE.width);
  expect(a.width).toBeLessThanOrEqual(120);
});

test("desktop empty notebook: Study tools folded until there is a source, the add tiles in one row", async ({ page }, info) => {
  await page.setViewportSize(DESKTOP);
  await adultOnHome(page, info, "emptytools");
  await newNotebook(page, "Biology");
  await expect(page.getByRole("heading", { name: "Give Taku something to study from" })).toBeVisible();
  await expect(page.getByTestId("study-panel")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Study tools", exact: true })).toHaveAttribute("aria-expanded", "false");

  const tiles = page.locator(".add-tile");
  await expect(tiles).toHaveCount(4);
  const tops = await tiles.evaluateAll((els) => els.map((e) => (e as HTMLElement).offsetTop));
  expect(new Set(tops).size, "four tiles in one row").toBe(1);
  const wrapped = await tiles.evaluateAll((els) =>
    els.filter((e) => {
      const title = e.querySelector("b")!;
      return title.getBoundingClientRect().height > 1.5 * parseFloat(getComputedStyle(title).lineHeight);
    }).map((e) => e.textContent),
  );
  expect(wrapped, "no tile title wraps").toEqual([]);

  // Opening it by hand still works, and a source brings it out on its own.
  await page.getByRole("button", { name: "Study tools", exact: true }).click();
  await expect(page.getByTestId("study-panel")).toBeVisible();
  await page.getByRole("button", { name: "Close the study tools" }).click();
  await expect(page.getByTestId("study-panel")).toHaveCount(0);
  await paste(page);
  await expect(page.getByTestId("study-panel")).toBeVisible();
});

test("citation markers take a 32 px tap and show a focus ring", async ({ page }, info) => {
  await chatting(page, info, NARROW, 1);
  const cite = page.getByTestId("message-taku").last().locator(".cite-mark").first();
  await cite.scrollIntoViewIfNeeded();
  const b = await box(cite);
  const [cx, cy] = [b.x + b.width / 2, b.y + b.height / 2];
  const hits = await cite.evaluate(
    (el, [x, y]) =>
      [
        [x - 15, y],
        [x + 15, y],
        [x, y - 15],
        [x, y + 15],
      ].map(([px, py]) => document.elementFromPoint(px, py)?.closest(".cite-mark") === el),
    [cx, cy],
  );
  expect(hits, "a tap 15 px from the centre in any direction lands on the marker").toEqual([true, true, true, true]);

  await cite.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  const ring = await cite.evaluate((el) => {
    const s = getComputedStyle(el);
    return { focused: el === document.activeElement && el.matches(":focus-visible"), style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
  });
  expect(ring.focused).toBe(true);
  expect(ring.style).not.toBe("none");
  expect(ring.width).toBeGreaterThanOrEqual(2);
});

test("the action chips wrap on a phone, none clipped, and older answers keep their footer out of the way", async ({ page }, info) => {
  await chatting(page, info, NARROW, 2);
  const latest = page.getByTestId("message-taku").last();
  const row = latest.locator(".action-chips");
  expect(await row.evaluate((el) => getComputedStyle(el).flexWrap)).toBe("wrap");
  expect(await row.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  const body = await box(latest.locator(".msg-body"));
  const chips = row.locator(".chip");
  expect(await chips.count()).toBeGreaterThanOrEqual(2);
  for (let i = 0; i < (await chips.count()); i++) {
    const c = await box(chips.nth(i));
    expect(c.x).toBeGreaterThanOrEqual(body.x - 1);
    expect(c.x + c.width, `chip ${i} inside the answer`).toBeLessThanOrEqual(Math.min(body.x + body.width, NARROW.width) + 1);
  }

  // The latest footer shows; an older one shows on hover only.
  const older = page.getByTestId("message-taku").nth(-2);
  const opacity = (l: Locator) => l.locator(".answer-actions").evaluate((el) => Number(getComputedStyle(el).opacity));
  await expect.poll(() => opacity(latest)).toBe(1);
  await page.mouse.move(1, 1);
  await expect.poll(() => opacity(older)).toBe(0);
  await older.hover();
  await expect.poll(() => opacity(older)).toBe(1);

  // How the answer was checked sits behind a small info icon.
  const note = latest.getByTestId("answer-note");
  await expect(note).toBeHidden();
  await latest.getByRole("button", { name: "How this answer was checked" }).click();
  await expect(note).toBeVisible();
  await expect(note).toContainText("left out");
});
