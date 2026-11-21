import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import { adultOnHome, newNotebook, openTools, pasteNotes, phone } from "./helpers";

/**
 * The organisation admin page (Step 7, behind TEACHER_MODE): members by role,
 * join codes as link, QR and WhatsApp, course packs with their learner count,
 * and results by topic across the organisation's classes. Also: long display
 * maths stays inside the message on a 360 px phone.
 */

async function otherPage(browser: Browser, info: TestInfo): Promise<Page> {
  const context = await browser.newContext({ storageState: "e2e/look-chosen.json", ...(phone(info) ? { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } }) });
  return await context.newPage();
}

/** An adult sets up a school and opens its admin page. */
async function schoolWithAdmin(page: Page, info: TestInfo, school: string, name = "Rumbi") {
  await adultOnHome(page, info, "e2e-admin", name);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Set up my school or institution" }).click();
  await page.getByLabel("Full name").fill(school);
  await page.getByLabel("Town or city").fill("Gweru");
  await page.getByRole("button", { name: "Set it up" }).click();
  await expect(page.getByRole("heading", { name: school })).toBeVisible();
  await page.getByRole("link", { name: "Open the admin page" }).click();
  await expect(page.getByRole("heading", { name: `${school}: Admin` })).toBeVisible();
}

async function noSideScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
}

test("an admin shares join codes by link, QR and WhatsApp; a teacher and a learner join by link; members by role; make admin, revoke and remove; in all four looks", async ({ page, browser }, info) => {
  test.setTimeout(180_000);
  const school = `Admin${String(Date.now()).slice(-6)} High School`;
  await schoolWithAdmin(page, info, school);
  const adminUrl = new URL(page.url()).pathname;

  // The learner code: link, WhatsApp text and QR.
  const learnerCode = ((await page.getByTestId("learner-code").textContent()) ?? "").replace("Learner code: ", "").trim();
  expect(learnerCode).toMatch(/^[A-Z0-9]{6}$/);
  await expect(page.getByRole("link", { name: `Share on WhatsApp: ${learnerCode}` })).toHaveAttribute("href", new RegExp(`wa\\.me.*join%2F${learnerCode}`));
  await page.getByRole("button", { name: `Show QR code: ${learnerCode}` }).click();
  await expect(page.getByRole("img", { name: `QR code for the code ${learnerCode}` })).toBeVisible();

  // A teacher code, and a second one to revoke.
  await page.getByRole("button", { name: "Make a teacher code" }).click();
  const staff = page.getByRole("list", { name: "Staff codes" });
  await expect(staff.locator(".code-line")).toHaveCount(1);
  const teacherCode = ((await staff.locator(".code-line").first().textContent()) ?? "").split(",")[0].trim();
  await expect(staff.getByRole("link", { name: `Share on WhatsApp: ${teacherCode}` })).toHaveAttribute("href", /as%20a%20teacher/);
  await page.getByRole("button", { name: "Make a teacher code" }).click();
  await expect(staff.locator(".code-line")).toHaveCount(2);
  const spare = ((await staff.locator(".code-line").nth(1).textContent()) ?? "").split(",")[0].trim();
  await staff.getByRole("button", { name: `Revoke ${spare}` }).click();
  await expect(staff.locator(".code-line")).toHaveCount(1);
  await expect(staff).not.toContainText(spare);

  // Both join by opening the link.
  const teacher = await otherPage(browser, info);
  await adultOnHome(teacher, info, "e2e-admin-teacher", "Chipo Dube");
  await teacher.goto(`/join/${teacherCode}`);
  await expect(teacher.getByRole("heading", { name: "Join with a code" })).toBeVisible();
  await teacher.getByRole("button", { name: "Join", exact: true }).click();
  await expect(teacher.getByRole("status")).toHaveText(`You joined ${school} as teacher.`);
  const learner = await otherPage(browser, info);
  await adultOnHome(learner, info, "e2e-admin-learner", "Tariro Moyo");
  await learner.goto(`/join/${learnerCode}`);
  await learner.getByRole("button", { name: "Join", exact: true }).click();
  await expect(learner.getByRole("status")).toHaveText(`You joined ${school}.`);

  // Members by role; a learner by first name only.
  await page.reload();
  await expect(page.getByRole("list", { name: "Admins" })).toContainText("Rumbi");
  await expect(page.getByRole("list", { name: "Teachers" })).toContainText("Chipo Dube");
  const learners = page.getByRole("list", { name: "Learners" });
  await expect(learners).toContainText("Tariro");
  await expect(learners).not.toContainText("Moyo");
  await expect(page.getByRole("listitem", { name: "Rumbi" }).getByRole("button")).toHaveCount(0);

  // Make the teacher an admin, then remove the learner.
  await page.getByRole("listitem", { name: "Chipo Dube" }).getByRole("button", { name: "Make admin" }).click();
  await expect(page.getByRole("status")).toHaveText("Chipo Dube is now an admin.");
  await expect(page.getByRole("list", { name: "Admins" })).toContainText("Chipo Dube");
  await learners.getByRole("listitem", { name: "Tariro" }).getByRole("button", { name: "Remove" }).click();
  await page.getByRole("button", { name: "Yes, remove" }).click();
  await expect(page.getByRole("status")).toHaveText("Tariro was removed.");
  await expect(page.getByRole("list", { name: "Learners" })).toHaveCount(0);
  await learner.goto("/settings");
  await expect(learner.getByRole("list", { name: "Yours" })).toHaveCount(0);

  // Layout: two columns on a wide screen, one on a phone, never wider than the screen.
  const members = await page.locator("#members").boundingBox();
  const codes = await page.locator("#codes").boundingBox();
  if (phone(info)) expect(codes!.y).toBeGreaterThan(members!.y + members!.height - 1);
  else expect(Math.abs(codes!.y - members!.y)).toBeLessThan(2);
  await noSideScroll(page);

  // All four looks: the page reads in each, with the same layout.
  for (const look of ["warm-light", "warm-dark", "contrast-light", "contrast-dark"]) {
    await page.goto("/settings");
    await page.getByTestId(`look-${look}`).click();
    await page.goto(adminUrl);
    await expect(page.getByRole("heading", { name: `${school}: Admin` })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-contrast", look.startsWith("contrast") ? "true" : "false");
    await expect(page.locator("html")).toHaveAttribute("data-theme", look.endsWith("dark") ? "dark" : "light");
    await expect(page.getByRole("list", { name: "Admins" })).toContainText("Chipo Dube");
    await noSideScroll(page);
    await page.screenshot({ path: info.outputPath(`admin-${look}.png`), fullPage: true });
  }
});

test("the admin page lists course packs with version and learner count, never who added them, and results by topic across the classes", async ({ page, browser }, info) => {
  test.setTimeout(240_000);
  const school = `Results${String(Date.now()).slice(-6)} High School`;
  await schoolWithAdmin(page, info, school, "Rumbi");
  const adminUrl = new URL(page.url()).pathname;
  const learnerCode = ((await page.getByTestId("learner-code").textContent()) ?? "").replace("Learner code: ", "").trim();

  // The admin's notes and a practice paper.
  await page.goto("/");
  await newNotebook(page, "Biology");
  await pasteNotes(page, info);
  await openTools(page, info);
  await page.getByRole("button", { name: /^Practice paper/ }).click();
  await page.getByLabel("How many").fill("4");
  await page.getByLabel("Minutes").fill("15");
  await page.getByRole("button", { name: "Make practice paper" }).click();
  await expect(page.getByText("Total: 7 marks")).toBeVisible();

  // A class in the school: the paper set, a listed name, marks typed in.
  await page.goto("/settings");
  await page.getByRole("switch", { name: "I teach" }).check();
  await page.getByRole("link", { name: "Open your classes" }).click();
  await page.getByLabel("Class name").fill("Form 3 Blue");
  await page.getByLabel("Syllabus").selectOption({ label: "ZIMSEC Combined Science" });
  await page.getByRole("button", { name: "Create class" }).click();
  await page.getByRole("button", { name: "Set for the class" }).click();
  await expect(page.getByText("Set. Learners can see it now.")).toBeVisible();
  await page.getByText("Learners without a phone").click();
  await page.getByLabel("First name").fill("Tendai");
  await page.getByRole("button", { name: "Add name" }).click();
  await page.getByRole("link", { name: "Marks" }).click();
  const row = page.getByTestId("mark-row").filter({ hasText: "Tendai" });
  await row.getByRole("button", { name: "Type marks" }).click();
  for (const [q, got] of [[1, "1"], [2, "2"], [3, "2"], [4, "0"]] as const) await row.getByLabel(new RegExp(`Question ${q}`)).selectOption(got);
  await row.getByRole("button", { name: "Save marks" }).click();
  await expect(row).toContainText("Marked: 5 out of 7");

  // A course pack made and published from the admin page.
  await page.goto(adminUrl);
  await page.getByRole("button", { name: "New course pack" }).click();
  await page.getByLabel("Pack name").fill("Form 3 Biology");
  await page.getByLabel("Subject").fill("Biology");
  await page.getByLabel("Level", { exact: true }).fill("Form 3");
  await page.getByRole("button", { name: "Make draft" }).click();
  const pack = page.getByRole("listitem", { name: "Form 3 Biology" });
  await expect(pack).toContainText("Biology, Form 3. Draft. 0 learners");
  await pack.getByLabel(/I own these notes/).check();
  await pack.getByRole("button", { name: "Publish" }).click();
  await expect(pack.getByRole("status")).toHaveText("Published. Version 1 is with every learner who added it.", { timeout: 60_000 });
  await expect(pack).toContainText("Published, version 1. 0 learners");

  // A learner adds it: the count goes up, and nobody is named.
  const learner = await otherPage(browser, info);
  await adultOnHome(learner, info, "e2e-admin-pack", "Kuda");
  await learner.goto(`/join/${learnerCode}`);
  await learner.getByRole("button", { name: "Join", exact: true }).click();
  await expect(learner.getByRole("status")).toHaveText(`You joined ${school}.`);
  await learner.goto(adminUrl.replace(/\/admin$/, ""));
  await learner.getByRole("button", { name: "Add to my notebooks: Form 3 Biology" }).click();
  await expect(learner.getByRole("heading", { name: "Form 3 Biology" })).toBeVisible();
  await expect(pack).toContainText("Published, version 1. 1 learner");
  await expect(page.locator("#staff-packs-title").locator("..")).not.toContainText("Kuda");

  // Results by topic across the school's classes, with the teacher's first name and no learner named.
  const results = page.getByTestId("org-results");
  await expect(results.getByRole("columnheader", { name: "Topic" })).toBeVisible();
  await expect(results.getByRole("row", { name: /Pasted text/ })).toContainText("100%");
  await expect(results.getByRole("table", { name: "By class" })).toContainText("Form 3 Blue");
  await expect(results.getByRole("table", { name: "By class" })).toContainText("Rumbi");
  await expect(results.getByRole("table", { name: "By class" })).toContainText("71%");
  await expect(results).not.toContainText("Tendai");
  await noSideScroll(page);
});

test("a long worked equation scrolls inside Taku's answer on a 360 px phone, never past the screen", async ({ page }, info) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await adultOnHome(page, info, "e2e-equation");
  await page.goto("/chat");
  await page.locator("#chat-input").fill("Expand (x+2)(x+3) and show every step on one line");
  await page.locator("#chat-input").press("Enter");
  const line = page.getByTestId("chat-taku").last().locator(".math-display");
  await expect(line.locator(".katex-display")).toBeVisible();
  const body = await page.getByTestId("chat-taku").last().boundingBox();
  const box = await line.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(body!.x + body!.width + 1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(360);
  // The line is wider than the screen, so it scrolls on its own.
  expect(await line.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await noSideScroll(page);
});
