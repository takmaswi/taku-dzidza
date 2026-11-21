import { join } from "node:path";
import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import { adultOnHome, adultSignedUp, newNotebook, openTools, pasteNotes, phone } from "./helpers";

/**
 * Stage 2 (TEACHER_MODE on locally). The teacher's first run is counted:
 * from a signed in teacher with a practice paper in a notebook, class made,
 * code shared, notes shared and first quiz set in under ten steps.
 */

async function teacherWithPaper(page: Page, info: TestInfo) {
  await adultOnHome(page, info, "e2e-teach", "Chipo");
  await newNotebook(page, "Biology");
  await pasteNotes(page, info);
  await openTools(page, info);
  await page.getByRole("button", { name: /^Practice paper/ }).click();
  await page.getByLabel("How many").fill("4");
  await page.getByLabel("Minutes").fill("15");
  await page.getByRole("button", { name: "Make practice paper" }).click();
  await expect(page.getByText("Total: 7 marks")).toBeVisible();
  await page.goto("/settings");
}

/** The teacher's first run. Every click or typed field is one step. */
async function firstRun(page: Page): Promise<{ code: string; steps: number }> {
  let steps = 0;
  const step = async (act: () => Promise<unknown>) => {
    steps += 1;
    await act();
  };
  await step(() => page.getByRole("switch", { name: "I teach" }).check());
  await step(() => page.getByRole("link", { name: "Open your classes" }).click());
  await expect(page.getByRole("heading", { name: "Set up your first class" })).toBeVisible();
  await step(() => page.getByLabel("Class name").fill("Form 3 Blue"));
  await step(() => page.getByLabel("Syllabus").selectOption({ label: "ZIMSEC Combined Science" }));
  await step(() => page.getByRole("button", { name: "Create class" }).click());
  const code = (await page.getByTestId("class-code").textContent())?.trim() ?? "";
  expect(code).toMatch(/^[A-Z0-9]{6}$/);
  await step(() => page.getByRole("button", { name: "Show QR code" }).click());
  await expect(page.getByTestId("qr")).toBeVisible();
  await expect(page.getByRole("link", { name: "Share on WhatsApp" })).toHaveAttribute("href", new RegExp(`wa\\.me.*join%2F${code}`));
  await step(() => page.getByLabel("Share Biology with the class").check());
  await step(() => page.getByRole("button", { name: "Set for the class" }).click());
  await expect(page.getByText("Set. Learners can see it now.")).toBeVisible();
  return { code, steps };
}

async function learnerPage(browser: Browser, info: TestInfo): Promise<Page> {
  const context = await browser.newContext({ storageState: "e2e/look-chosen.json", ...(phone(info) ? { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } }) });
  return await context.newPage();
}

test("a teacher sets up a class in under ten steps; a learner joins by link, does the quiz, and results show by topic", async ({ page, browser }, info) => {
  test.setTimeout(180_000);
  await teacherWithPaper(page, info);
  const { code, steps } = await firstRun(page);
  expect(steps).toBeLessThan(10);

  // A learner opens the link before signing in, signs up, and comes back to join.
  const learner = await learnerPage(browser, info);
  await learner.goto(`/join/${code}`);
  await expect(learner.getByRole("heading", { name: "Join the class" })).toBeVisible();
  await adultSignedUp(learner, info, "e2e-join", "Kuda");
  await expect(learner.getByRole("heading", { name: "Join the class" })).toBeVisible();
  await learner.getByRole("button", { name: "Join", exact: true }).click();
  await expect(learner.getByText("You are in Form 3 Blue.")).toBeVisible();
  await learner.goto("/");
  await learner.getByRole("link", { name: /Form 3 Blue/ }).click();
  await expect(learner.getByRole("heading", { name: "Form 3 Blue" })).toBeVisible();
  await expect(learner.getByText("Biology")).toBeVisible();
  await learner.getByRole("link", { name: "Start" }).click();
  // No scheme before hand in.
  await expect(learner.getByText("Award a mark for")).toHaveCount(0);
  await learner.getByRole("radio", { name: /Oxygen/ }).check();
  await learner.getByLabel("Your answer 2").fill("carbon dioxide and water");
  await learner.getByRole("button", { name: "Hand in" }).click();
  await expect(learner.getByText("Award a mark for").first()).toBeVisible();
  await learner.getByRole("button", { name: "Save my marks" }).click();
  await expect(learner.getByText(/Your mark: \d out of 7/)).toBeVisible();
  await learner.context().close();

  // The teacher sees the learner by first name and results by topic, numbers only.
  await page.reload();
  await expect(page.getByTestId("roster")).toContainText("Kuda");
  const results = page.getByTestId("results");
  await expect(results).toContainText("Results by topic");
  await expect(results).toContainText("percent");
  await expect(results).not.toContainText("Kuda");
});

test("one phone classroom: a listed name, a photographed script marked with a second check, then confirmed", async ({ page }, info) => {
  test.setTimeout(150_000);
  await teacherWithPaper(page, info);
  await firstRun(page);
  await page.getByText("Learners without a phone").click();
  await page.getByLabel("First name").fill("Tendai");
  await page.getByRole("button", { name: "Add name" }).click();
  await page.getByRole("link", { name: "Marks" }).click();
  const row = page.getByTestId("mark-row").filter({ hasText: "Tendai" });
  await row.getByRole("button", { name: "Type marks" }).click();
  await row.getByTestId("script-input").setInputFiles(join(process.cwd(), "tests", "fixtures", "scripts", "script-photo.png"));
  await expect(row).toContainText("To check: 6 out of 7", { timeout: 30_000 });
  await expect(row.getByText("Check question 4 first")).toBeVisible();
  await expect(row).toContainText("it keeps energy from the sun");
  await row.getByLabel(/Question 4/).selectOption("0");
  await row.getByRole("button", { name: "Confirm marks" }).click();
  await expect(row).toContainText("Marked: 5 out of 7");
});
