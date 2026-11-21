import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import { adultOnHome, freshEmail, PASSWORD, phone, setUp, signUp } from "./helpers";

/**
 * Organisations (DECISIONS.md, Schools become organisations). The list starts
 * empty: people add a missing one, the owner lists it or merges a duplicate,
 * and others then find and follow it. TEACHER_MODE is on locally.
 */

async function otherPage(browser: Browser, info: TestInfo): Promise<Page> {
  const context = await browser.newContext({ storageState: "e2e/look-chosen.json", ...(phone(info) ? { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } }) });
  return await context.newPage();
}

/** The e2e owner (on ADMIN_EMAILS in local mock mode, scripts/setup-env.mjs): signs in, or signs up the first time. */
async function ownerSignedIn(page: Page, info: TestInfo) {
  const email = `e2e-owner-${info.project.name}@example.com`;
  await page.goto("/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  const home = page.getByRole("heading", { name: /What are we studying today/ });
  const wrong = page.getByText("That email and password did not match.");
  await expect(home.or(wrong)).toBeVisible();
  if (await wrong.isVisible()) {
    await signUp(page, email);
    await setUp(page, "Takunda", new Date().getFullYear() - 30);
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(home).toBeVisible();
  }
}

/** Search matches any word, so each run's names share one made up word nobody else uses. */
async function addMissing(page: Page, name: string, word: string) {
  await page.goto("/settings");
  await page.getByLabel("Search by name").fill(word);
  await expect(page.getByText("No matches.")).toBeVisible();
  await page.getByRole("button", { name: "Not listed? Add it" }).click();
  await expect(page.getByLabel("Full name")).toHaveValue(word);
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Type", { exact: true }).selectOption({ label: "College" });
  await page.getByLabel("Town or city").fill("Gweru");
  await page.getByRole("button", { name: "Add it" }).click();
  await expect(page.getByRole("status")).toHaveText(`${name} was added. It shows in search once it has been checked.`);
  await expect(page.getByRole("list", { name: "Yours" })).toContainText(`${name}Following. Waiting to be checked`);
}

test("added organisations wait for the owner, who lists one and merges a duplicate into it; others then find and follow it", async ({ page, browser }, info) => {
  test.setTimeout(150_000);
  const word = `Ridge${String(Date.now()).slice(-6)}`;
  const real = `${word} College`;
  const duplicate = `${word} Colege`;

  await adultOnHome(page, info, "e2e-org-add", "Rudo");
  await addMissing(page, real, word);
  const second = await otherPage(browser, info);
  await adultOnHome(second, info, "e2e-org-dup", "Tendai");
  await addMissing(second, duplicate, word);

  // Not in search for anyone until the owner lists it.
  const third = await otherPage(browser, info);
  await adultOnHome(third, info, "e2e-org-find", "Kuda");
  await third.goto("/settings");
  await third.getByLabel("Search by name").fill(word);
  await expect(third.getByText("No matches.")).toBeVisible();

  const owner = await otherPage(browser, info);
  await ownerSignedIn(owner, info);
  await owner.goto("/settings");
  await owner.getByRole("link", { name: "Organisations to check" }).click();
  await expect(owner.getByRole("heading", { name: "Organisations to check" })).toBeVisible();
  const realRow = owner.getByRole("listitem", { name: real });
  await expect(realRow).toContainText("College. Gweru, Zimbabwe. 0 members, 1 following");
  await realRow.getByRole("button", { name: "List it" }).click();
  await expect(realRow).toHaveCount(0);
  const dupRow = owner.getByRole("listitem", { name: duplicate });
  await dupRow.getByRole("button", { name: "Merge into" }).click();
  await dupRow.getByLabel("Search by name").fill(word);
  await dupRow.getByRole("button", { name: "Merge", exact: true }).click();
  await expect(owner.getByRole("status")).toHaveText(`Merged into ${real}.`);
  await expect(owner.getByRole("listitem", { name: duplicate })).toHaveCount(0);

  // The person who added the duplicate now follows the real one.
  await second.reload();
  await expect(second.getByRole("list", { name: "Yours" })).toContainText(`${real}Following`);
  await expect(second.getByRole("list", { name: "Yours" })).not.toContainText(duplicate);

  // Others find it after 2 letters and follow it; following shares nothing about them.
  await third.getByLabel("Search by name").fill("R");
  await expect(third.getByText("No matches.")).toHaveCount(0);
  await third.getByLabel("Search by name").fill(word);
  const results = third.getByRole("list", { name: "Results" });
  await expect(results.getByRole("listitem")).toHaveCount(1);
  await results.getByRole("button", { name: `Follow ${real}` }).click();
  await expect(results.getByText("Following", { exact: true })).toBeVisible();
  await results.getByRole("link", { name: real }).click();
  await expect(third.getByRole("heading", { name: real })).toBeVisible();
  await expect(third.getByText("Following shows you what it shares. It does not share anything about you.")).toBeVisible();
  await third.getByRole("button", { name: "Stop following" }).click();
  await expect(third.getByRole("button", { name: "Follow", exact: true })).toBeVisible();
});

test("a stranger cannot open the owner page or see its link", async ({ page }, info) => {
  await adultOnHome(page, info, "e2e-org-stranger", "Farai");
  await page.goto("/owner/organisations");
  await expect(page.getByRole("heading", { name: /What are we studying today/ })).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByRole("link", { name: "Organisations to check" })).toHaveCount(0);
});

async function setUpFromSettings(page: Page, name: string, type: string) {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Set up my school or institution" }).click();
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Type", { exact: true }).selectOption({ label: type });
  await page.getByLabel("Town or city").fill("Mutare");
  await page.getByRole("button", { name: "Set it up" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText("Waiting to be checked")).toBeVisible();
  await expect(page.getByText("Your role here: admin.")).toBeVisible();
}

test("an adult sets up a school, the owner lists it; a learner finds it by type in onboarding and joins with its code; a teacher joins with a staff code", async ({ page, browser }, info) => {
  test.setTimeout(180_000);
  const word = `Chido${String(Date.now()).slice(-6)}`;
  const school = `${word} High School`;
  const university = `${word} University`;

  await adultOnHome(page, info, "e2e-org-admin", "Rumbi");
  await setUpFromSettings(page, university, "University");
  await setUpFromSettings(page, school, "Secondary school");
  const learnerCode = ((await page.getByTestId("learner-code").textContent()) ?? "").replace("Learner code: ", "").trim();
  expect(learnerCode).toMatch(/^[A-Z0-9]{6}$/);
  await page.getByRole("button", { name: "Make a teacher code" }).click();
  const staffList = page.getByRole("list", { name: "Staff codes" });
  await expect(staffList).toContainText("for a teacher");
  const teacherCode = ((await staffList.locator(".code-line").first().textContent()) ?? "").split(",")[0].trim();

  const owner = await otherPage(browser, info);
  await ownerSignedIn(owner, info);
  await owner.goto("/owner/organisations");
  for (const name of [school, university]) {
    const row = owner.getByRole("listitem", { name });
    await row.getByRole("button", { name: "List it" }).click();
    await expect(row).toHaveCount(0);
  }

  // A learner doing A Level sees secondary schools only, follows one, then joins with its code, all in onboarding.
  const learner = await otherPage(browser, info);
  await signUp(learner, freshEmail(info.project.name, "e2e-org-learner"));
  await setUp(learner, "Nyasha", new Date().getFullYear() - 19);
  await learner.getByRole("button", { name: /A Level/ }).click();
  await expect(learner.getByRole("heading", { name: "Where do you study?" })).toBeVisible();
  await learner.getByLabel("Search by name").fill(word);
  const results = learner.getByRole("list", { name: "Results" });
  await expect(results.getByRole("listitem")).toHaveCount(1);
  await expect(results).toContainText(school);
  await expect(results).not.toContainText(university);
  await expect(learner.getByRole("button", { name: "Set up my school or institution" })).toHaveCount(0);
  await results.getByRole("button", { name: `Follow ${school}` }).click();
  await expect(results.getByText("Following", { exact: true })).toBeVisible();
  await learner.getByLabel("Have a code?").fill(learnerCode.toLowerCase());
  await learner.getByRole("button", { name: "Join", exact: true }).click();
  await expect(learner.getByRole("status")).toHaveText(`You joined ${school}.`);
  await learner.getByRole("button", { name: "Next" }).click();
  await learner.getByRole("button", { name: "Let's go" }).click();
  await expect(learner.getByRole("heading", { name: /What are we studying today, Nyasha/ })).toBeVisible();
  await learner.goto("/settings");
  await expect(learner.getByRole("list", { name: "Yours" })).toContainText(`${school}Member: learner`);

  // A teacher types the staff code on the Teach page.
  const teacher = await otherPage(browser, info);
  await adultOnHome(teacher, info, "e2e-org-teacher", "Farai");
  await teacher.goto("/settings");
  await teacher.getByRole("switch", { name: "I teach" }).check();
  await teacher.getByRole("link", { name: "Open your classes" }).click();
  await teacher.getByText("Your school or institution").click();
  await teacher.getByLabel("Have a code?").fill(teacherCode);
  await teacher.getByRole("button", { name: "Join", exact: true }).click();
  await expect(teacher.getByRole("status")).toHaveText(`You joined ${school} as teacher.`);
  await expect(teacher.getByRole("list", { name: "Your school or institution" })).toContainText(`${school} Member: teacher`);
});