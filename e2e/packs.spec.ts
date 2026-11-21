import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import { adultOnHome, ask, closeSources, newNotebook, openSources, openTools, pasteNotes, phone } from "./helpers";

/**
 * Course packs (DECISIONS.md, Course packs). A teacher publishes notes once;
 * a learner adds the pack and gets their own notebook that reads the pack's
 * sources and tools. TEACHER_MODE is on locally.
 */

async function otherPage(browser: Browser, info: TestInfo): Promise<Page> {
  const context = await browser.newContext({ storageState: "e2e/look-chosen.json", ...(phone(info) ? { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } }) });
  return await context.newPage();
}

test("a teacher publishes a course pack; a learner adds it, reads its sources and tools, and asks Taku about it", async ({ page, browser }, info) => {
  test.setTimeout(240_000);
  const school = `Pack${String(Date.now()).slice(-6)} High School`;

  // The teacher's notes, then a school they set up.
  await adultOnHome(page, info, "e2e-pack-teacher", "Chipo");
  await newNotebook(page, "Biology master");
  await pasteNotes(page, info);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Set up my school or institution" }).click();
  await page.getByLabel("Full name").fill(school);
  await page.getByLabel("Town or city").fill("Masvingo");
  await page.getByRole("button", { name: "Set it up" }).click();
  await expect(page.getByRole("heading", { name: school })).toBeVisible();
  const orgUrl = page.url();
  await page.getByRole("link", { name: "Open the admin page" }).click();
  const learnerCode = ((await page.getByTestId("learner-code").textContent()) ?? "").replace("Learner code: ", "").trim();
  await page.goto(new URL(orgUrl).pathname);

  // A draft from the notebook, then publish with the rights box ticked.
  await page.getByRole("button", { name: "New course pack" }).click();
  await expect(page.getByLabel("From your notebook")).toHaveValue(/.+/);
  await page.getByLabel("Pack name").fill("Form 3 Biology");
  await page.getByLabel("Subject").fill("Biology");
  await page.getByLabel("Level", { exact: true }).fill("Form 3");
  await page.getByRole("button", { name: "Make draft" }).click();
  const row = page.getByRole("listitem", { name: "Form 3 Biology" });
  await expect(row).toContainText("Biology, Form 3. Draft. 0 learners");
  await row.getByRole("button", { name: "Publish" }).click();
  await expect(row.getByRole("alert")).toHaveText("Tick the box to confirm you own these notes or are licensed to share them.");
  await row.getByLabel(/I own these notes/).check();
  await row.getByRole("button", { name: "Publish" }).click();
  await expect(row.getByRole("status")).toHaveText("Published. Version 1 is with every learner who added it.", { timeout: 60_000 });

  // A learner joins with the learner code, then adds the pack from the school's page.
  const learner = await otherPage(browser, info);
  await adultOnHome(learner, info, "e2e-pack-learner", "Kuda");
  await learner.goto("/settings");
  await learner.getByLabel("Have a code?").fill(learnerCode);
  await learner.getByRole("button", { name: "Join", exact: true }).click();
  await expect(learner.getByRole("status")).toHaveText(`You joined ${school}.`);
  await learner.goto(new URL(orgUrl).pathname);
  const packs = learner.getByRole("list", { name: "Course packs" });
  await expect(packs).toContainText("Form 3 Biology");
  await packs.getByRole("button", { name: "Add to my notebooks: Form 3 Biology" }).click();
  await expect(learner.getByRole("heading", { name: "Form 3 Biology" })).toBeVisible();

  // The pack's source is there, marked and not removable; the pack's tools are listed read only.
  await openSources(learner, info);
  await expect(learner.getByTestId("pack-line").first()).toHaveText(`From ${school}: Form 3 Biology`);
  await expect(learner.getByText("1 page. From the course pack").first()).toBeVisible();
  await expect(learner.getByRole("button", { name: "Remove Notes" })).toHaveCount(0);
  await closeSources(learner, info);
  await ask(learner, "What does chlorophyll do?");
  await expect(learner.getByTestId("message-taku").last()).toContainText("Chlorophyll absorbs the light");
  await openTools(learner, info);
  await expect(learner.locator(".made-list").getByText("From the course pack", { exact: true })).toHaveCount(3);

  // In Ask Taku the pack is one of the notebooks the learner can pick.
  await learner.goto("/chat");
  await learner.getByRole("button", { name: "Use my notebooks" }).click();
  await expect(learner.getByTestId("notebook-picker").getByRole("listitem").filter({ hasText: "Form 3 Biology" })).toContainText("Course pack");
  await learner.getByTestId("notebook-picker").getByRole("button", { name: "Done" }).click();

  // The teacher sees one learner, nothing about them.
  await page.goto(new URL(orgUrl).pathname);
  await expect(page.getByRole("listitem", { name: "Form 3 Biology" })).toContainText("Published, version 1. 1 learner");
});
