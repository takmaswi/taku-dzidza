import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { join } from "node:path";
import { adultOnHome, ask, closeSources, expectSource, freshEmail, newNotebook, NOTES, pasteNotes, phone, pickChip, setUp, signUp } from "./helpers";

/** A notebook with pasted notes and a PDF, and Taku's cited answers (mock fixtures, no AI spend). */

test("a learner adds notes, asks Taku, and checks the citation", async ({ page }, info) => {
  await signUp(page, freshEmail(info.project.name, "e2e-nb"));
  await setUp(page, "Rufaro", new Date().getFullYear() - 24);
  await page.getByRole("button", { name: "Skip" }).click();
  await newNotebook(page, "Form 4 Biology");

  await pasteNotes(page, info, NOTES, "Biology notes");
  await page.getByTestId("file-input").setInputFiles(join(process.cwd(), "tests", "fixtures", "sources", "biology-notes.pdf"));
  await expectSource(page, info, "2 pages", 60_000);

  await ask(page, "What does chlorophyll do?");
  const answer = page.getByTestId("message-taku").last();
  await expect(answer).toContainText("Chlorophyll absorbs the light");
  await expect(answer).toContainText("Taku's idea, not from your notes");

  // The numbered marker opens the page with the quote highlighted: in the rail on a wide screen, in a sheet on a phone.
  await answer.getByRole("button", { name: /page 1/ }).first().click();
  const sourcePage = page.getByTestId("source-page");
  await expect(sourcePage.locator("mark")).toHaveText("Chlorophyll in the chloroplasts absorbs the light");
  if (phone(info)) {
    await expect(page.getByRole("dialog")).toBeVisible();
    await closeSources(page, info);
  } else {
    await expect(page.getByTestId("sources-rail").getByTestId("source-page")).toBeVisible();
    await page.getByRole("button", { name: "All sources" }).click();
  }
  await expect(sourcePage).toHaveCount(0);

  await pickChip(page, /^Taku uses/, /^Only my notes/);
  await expect(page.getByRole("button", { name: "Taku uses: Only my notes" })).toBeVisible();
  await ask(page, "What does chlorophyll do?");
  await expect(page.getByTestId("message-taku").last()).toContainText("left out because they could not be found in your material");
});

async function biology(page: Page, info: TestInfo, tag: string) {
  await adultOnHome(page, info, tag);
  await newNotebook(page, "Biology");
  await pasteNotes(page, info);
}

/** Phone: chat first, sources in a sheet. Wide screen: the sources rail folds once chatting and remembers the choice. */
test("where the sources live", async ({ page }, info) => {
  await adultOnHome(page, info, "sources");
  await newNotebook(page, "Biology");
  // Empty: the middle is for adding notes, on every screen.
  await expect(page.getByRole("heading", { name: "Give Taku something to study from" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sources: 0" })).toBeVisible();
  await pasteNotes(page, info);
  await expect(page.getByLabel("Ask Taku about your notes")).toBeVisible();
  if (phone(info)) await phoneSheet(page, info);
  else await railMemory(page);
});

async function phoneSheet(page: Page, info: TestInfo) {
  await expect(page.getByText("1 page")).toBeHidden();
  await page.getByRole("button", { name: "Sources: 1" }).click();
  await expect(page.getByRole("dialog").getByText("1 page")).toBeVisible();
  await closeSources(page, info);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // The tab bar steps aside while typing.
  await page.getByLabel("Ask Taku about your notes").focus();
  await expect(page.locator("nav.tabbar")).toBeHidden();
}

async function railMemory(page: Page) {
  const rail = page.getByTestId("sources-rail");
  await expect(rail).toHaveAttribute("data-state", "open");
  await ask(page, "What does chlorophyll do?");
  await expect(page.getByTestId("message-taku").last()).toContainText("Chlorophyll absorbs the light");
  await expect(rail).toHaveAttribute("data-state", "folded");
  await expect(rail.getByText("1")).toBeVisible();

  await page.getByRole("button", { name: "Open sources, 1 source" }).click();
  await expect(rail).toHaveAttribute("data-state", "open");
  await page.reload();
  await expect(rail).toHaveAttribute("data-state", "open");

  await page.getByRole("button", { name: "Fold the sources" }).click();
  await expect(rail).toHaveAttribute("data-state", "folded");
  await page.reload();
  await expect(rail).toHaveAttribute("data-state", "folded");
}

/** A small phone at 360 by 640 in the phone project, a laptop at 1280 by 800 in the desktop project. */
test("after six answers the question box is still on screen", async ({ page }, info) => {
  const size = phone(info) ? { width: 360, height: 640 } : { width: 1280, height: 800 };
  await page.setViewportSize(size);
  await biology(page, info, "six");
  const answers = page.getByTestId("message-taku");
  for (let i = 1; i <= 6; i++) {
    await ask(page, "What does chlorophyll do?");
    await expect(answers).toHaveCount(i);
    await expect(answers.last()).toContainText("Chlorophyll absorbs the light");
  }
  const box = page.getByLabel("Ask Taku about your notes");
  await expect(box).toBeInViewport({ ratio: 1 });
  const r = (await box.boundingBox())!;
  expect(r.y + r.height).toBeLessThanOrEqual(size.height);
  // The page itself never scrolls; only the thread does.
  expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0);
  await expect(answers.last()).toBeInViewport();
});
