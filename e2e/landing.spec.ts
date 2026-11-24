import { expect, test, type Page, type TestInfo } from "@playwright/test";

/**
 * The signed out landing page (src/pages/Landing.tsx) at 375 by 812 on the
 * phone project and 1440 by 900 on the desktop project: no sideways scroll,
 * the tools scroller and its dots, a working pause button on everything that
 * loops, tappable citations, the mode switcher, and still states with less motion.
 */

const PHONE = { width: 375, height: 812 };
const DESKTOP = { width: 1440, height: 900 };
const isPhone = (info: TestInfo) => info.project.name === "phone";

async function openLanding(page: Page, info: TestInfo) {
  await page.setViewportSize(isPhone(info) ? PHONE : DESKTOP);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Turn your notes into a tutor that shows its working." })).toBeVisible();
}

/** Scrolls down the whole page in steps, so every section has been on screen. */
async function scrollThrough(page: Page) {
  for (let y = 0; y < 16; y++) {
    await page.evaluate(() => window.scrollBy(0, 700));
    await page.waitForTimeout(60);
  }
}

/** Takes focus and the pointer off the page, since hover and focus also pause the strip. */
async function letGo(page: Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(0, 0);
}

/** Running animations inside an element, by the browser's own count. */
async function running(page: Page, selector: string): Promise<number> {
  return page.locator(selector).first().evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length);
}

test("the page never scrolls sideways and nothing pokes past the edge", async ({ page }, info) => {
  await openLanding(page, info);
  await scrollThrough(page);
  const result = await page.evaluate(() => {
    const scrollers = ".l-marquee, .tb-track, .msh, .l-hero-scene";
    const poking = Array.from(document.querySelectorAll(".bleed *"))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > innerWidth + 1 && el.closest(scrollers) === null;
      })
      .map((el) => `${el.tagName.toLowerCase()}.${el.getAttribute("class") ?? ""}`);
    return { scrollWidth: document.documentElement.scrollWidth, width: innerWidth, poking };
  });
  expect(result.scrollWidth).toBeLessThanOrEqual(result.width);
  expect(result.poking).toEqual([]);
});

test("the study tools scroller swipes and its dots follow; arrows move it too", async ({ page }, info) => {
  await openLanding(page, info);
  const track = page.locator(".tb-track");
  await track.scrollIntoViewIfNeeded();
  const current = page.locator('.tb-dot[aria-current="true"]');
  if (!isPhone(info)) {
    // On a computer the six tools sit in a 3 by 2 grid with no scroller controls.
    await expect(page.locator(".tb-controls")).toBeHidden();
    const boxes = await page.locator(".tb-tile").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top));
    expect(new Set(boxes.map((t) => Math.round(t))).size).toBe(2);
    return;
  }
  await expect(current).toHaveAttribute("aria-label", "Show Flashcards");
  // A swipe: the row scrolls by about one card and snaps.
  await track.evaluate((el) => el.scrollBy({ left: el.clientWidth * 0.82, behavior: "instant" }));
  await expect(current).toHaveAttribute("aria-label", "Show Practice papers");
  await track.evaluate((el) => el.scrollBy({ left: el.clientWidth * 0.82 * 2, behavior: "instant" }));
  await expect(current).toHaveAttribute("aria-label", "Show Summaries");
  await page.getByRole("button", { name: "Next tool" }).click();
  await expect(current).toHaveAttribute("aria-label", "Show Mind maps");
  await page.getByRole("button", { name: "Show Flashcards" }).click();
  await expect(current).toHaveAttribute("aria-label", "Show Flashcards");
  await expect(page.getByRole("button", { name: "Previous tool" })).toBeDisabled();
});

test("everything that loops has a pause button that stops it", async ({ page }, info) => {
  await openLanding(page, info);

  // The hero demo: paused, its step holds and nothing in the phone moves.
  const demo = page.locator(".hd");
  await demo.scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Pause the demo" }).click();
  await expect(demo).toHaveAttribute("data-paused", "true");
  const step = await demo.getAttribute("data-step");
  await page.waitForTimeout(3000);
  await expect(demo).toHaveAttribute("data-step", step ?? "");
  expect(await running(page, ".hd-screen")).toBe(0);
  await page.getByRole("button", { name: "Play the demo" }).click();
  await expect(demo).not.toHaveAttribute("data-step", step ?? "", { timeout: 4000 });

  // The curriculum strip.
  const strip = page.locator(".l-strip");
  await strip.scrollIntoViewIfNeeded();
  await letGo(page);
  await expect.poll(() => running(page, ".l-marquee")).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Pause the list of exams" }).click();
  await letGo(page);
  await expect(strip).toHaveAttribute("data-paused", "true");
  await expect.poll(() => running(page, ".l-marquee")).toBe(0);
  await page.getByRole("button", { name: "Play the list of exams" }).click();
  await letGo(page);
  await expect.poll(() => running(page, ".l-marquee")).toBeGreaterThan(0);
});

test("tapping a citation opens the source page with the line highlighted", async ({ page }, info) => {
  await openLanding(page, info);
  const cite = page.locator(".cd").getByRole("button", { name: "Show source 1" });
  await cite.scrollIntoViewIfNeeded();
  const sheet = page.locator("#cd-page");
  await expect(sheet).toBeHidden();
  await cite.click();
  await expect(sheet).toBeVisible();
  await expect(sheet.locator("mark")).toHaveText("Chlorophyll, the green pigment in the chloroplasts, absorbs light energy.");
  await page.locator(".cd").getByRole("button", { name: "Hide source 1" }).click();
  await expect(sheet).toBeHidden();

  // In the hero demo the citation shows the cited page on demand.
  const demo = page.locator(".hd");
  await demo.scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Pause the demo" }).click();
  const demoCite = demo.getByRole("button", { name: "Show source 1" });
  if ((await demoCite.count()) > 0) {
    await demoCite.click();
    await expect(demo).toHaveAttribute("data-step", "3");
    await expect(demo.locator(".hd-sheet mark")).toBeVisible();
  }
});

test("the mode switcher changes the answer for the same question", async ({ page }, info) => {
  await openLanding(page, info);
  const modes = page.getByRole("group", { name: "Study mode" });
  await modes.scrollIntoViewIfNeeded();
  const answer = page.locator(".ms-answer");
  await expect(answer).toContainText("Light is a mix of colours.");
  await modes.getByRole("button", { name: "Test me" }).click();
  await expect(answer).toContainText("Which pigment makes leaves look green?");
  await answer.getByRole("button", { name: "Chlorophyll" }).click();
  await expect(answer.getByRole("status").first()).toHaveText("Right.");
  await modes.getByRole("button", { name: "Sprint" }).click();
  await expect(answer).toContainText("That energy powers photosynthesis.");
  await modes.getByRole("button", { name: "Exam prep" }).click();
  await expect(answer).toContainText("(3 marks)");
  await expect(answer).toContainText("3 out of 3");
  await expect(modes.getByRole("button", { name: "Exam prep" })).toHaveAttribute("aria-pressed", "true");
});

test("with less motion every part shows a still state", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openLanding(page, info);
  const demo = page.locator(".hd");
  await demo.scrollIntoViewIfNeeded();
  // The demo is one still frame, the cited page, with no pause button because nothing moves.
  await expect(demo).toHaveAttribute("data-step", "3");
  await expect(demo.locator(".hd-sheet mark")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause the demo" })).toHaveCount(0);
  await page.waitForTimeout(2500);
  await expect(demo).toHaveAttribute("data-step", "3");
  // The strip is a still list, read once.
  await expect(page.getByRole("button", { name: "Pause the list of exams" })).toHaveCount(0);
  await expect(page.locator(".l-chips-copy")).toBeHidden();
  // Nothing on the page is animating, and the tools show their finished look.
  await scrollThrough(page);
  await page.waitForTimeout(500);
  expect(await running(page, "main")).toBe(0);
  await expect(page.locator(".tb-back").first()).toBeVisible();
  await expect(page.locator(".tb")).not.toHaveAttribute("data-state", /./);
});
