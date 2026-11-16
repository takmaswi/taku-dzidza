import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { adultOnHome, closeSources, freshEmail, freshPhone, newNotebook, openSources, openTools, outboxCode, pasteNotes, setUp, signUp } from "./helpers";

/** Stage 1 hardening seen from the screen (docs/AUDIT-2026-11-16.md): U7, U1 and S4. Mock fixtures, no AI spend. */

test("several files dropped at once all become sources", async ({ page }, info) => {
  await adultOnHome(page, info, "e2e-drop");
  await newNotebook(page, "Biology");
  const pdf = readFileSync(join(process.cwd(), "tests", "fixtures", "sources", "biology-notes.pdf")).toString("base64");
  // A real drop: two files in one DataTransfer, on the notebook itself.
  const transfer = await page.evaluateHandle((data) => {
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], "chapter-one.pdf", { type: "application/pdf" }));
    dt.items.add(new File([bytes], "chapter-two.pdf", { type: "application/pdf" }));
    return dt;
  }, pdf);
  await page.dispatchEvent(".workspace", "drop", { dataTransfer: transfer });
  await expect(page.getByRole("button", { name: "Sources: 2" })).toBeVisible({ timeout: 60_000 });
  await openSources(page, info);
  await expect(page.getByText("chapter-one.pdf")).toBeVisible();
  await expect(page.getByText("chapter-two.pdf")).toBeVisible();
  await expect(page.getByText("2 pages")).toHaveCount(2, { timeout: 60_000 });
  await closeSources(page, info);
});

test("a study tool says which pages it was made from, and the learner can choose the source", async ({ page }, info) => {
  await adultOnHome(page, info, "e2e-scope");
  await newNotebook(page, "Biology");
  await pasteNotes(page, info, undefined, "Biology notes");
  await page.getByTestId("file-input").setInputFiles(join(process.cwd(), "tests", "fixtures", "sources", "biology-notes.pdf"));
  await expect(page.getByRole("button", { name: "Sources: 2" })).toBeVisible({ timeout: 60_000 });
  await openSources(page, info);
  await expect(page.getByText("2 pages")).toBeVisible({ timeout: 60_000 });
  await closeSources(page, info);

  await openTools(page, info);
  await page.getByRole("button", { name: /^Summary/ }).click();
  const scope = page.getByTestId("tool-scope");
  await expect(scope.getByLabel("Biology notes")).toBeChecked();
  await expect(scope.getByLabel("biology-notes.pdf")).toBeChecked();
  // With nothing chosen the tool cannot be made, and says why.
  await scope.getByLabel("Biology notes").uncheck();
  await scope.getByLabel("biology-notes.pdf").uncheck();
  await expect(scope.getByRole("alert")).toHaveText("Choose at least one source.");
  // One source alone: only the pasted notes.
  await scope.getByLabel("Biology notes").check();
  await page.getByRole("button", { name: "Make summary" }).click();
  await expect(page.getByTestId("coverage")).toHaveText("Made from page 1 of Biology notes.", { timeout: 60_000 });
});

test("a guardian deletes the learner's account from the consent link", async ({ page, browser }, info) => {
  await signUp(page, freshEmail(info.project.name, "e2e-gdel"));
  await setUp(page, "Tafara", new Date().getFullYear() - 14);
  await expect(page.getByRole("heading", { name: "Ask a parent or guardian" })).toBeVisible();
  await page.getByRole("button", { name: /link/i }).first().click();
  const link = await page.getByTestId("consent-link").inputValue();

  const guardianContext = await browser.newContext();
  const guardian = await guardianContext.newPage();
  await guardian.goto(link);
  await guardian.getByLabel("Your full name").fill("Rudo Moyo");
  await guardian.getByLabel("How are you related to the learner?").fill("mother");
  const phone = freshPhone();
  await guardian.getByLabel("Your phone number").fill(phone.typed);
  await guardian.getByLabel(/I am this learner's parent or legal guardian/).check();
  await guardian.getByLabel("I agree to the points above.").check();
  await guardian.getByRole("button", { name: "Send me the code" }).click();
  await guardian.getByLabel("6 digit code from the text message").fill(await outboxCode(phone.stored));
  await guardian.getByRole("button", { name: "Give permission" }).click();
  await expect(guardian.getByText(/Permission is given/)).toBeVisible();

  // The same link now offers deletion, behind a tick box.
  await expect(guardian.getByRole("heading", { name: "Delete the learner's account" })).toBeVisible();
  await guardian.getByLabel(/I understand that this deletes the account/).check();
  await guardian.getByRole("button", { name: "Delete the account now" }).click();
  await expect(guardian.getByText("The account is being deleted. Nobody can sign in to it any more.")).toBeVisible();
  await guardianContext.close();

  // The learner's own screen is signed out: the account no longer exists.
  await expect(page.getByRole("heading", { name: /Create your account|Welcome back|Your notes in/ }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Ask a parent or guardian" })).toHaveCount(0);
});
