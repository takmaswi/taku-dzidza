import { expect, test } from "@playwright/test";
import { join } from "node:path";

/** Phase 2: a notebook with pasted notes and a PDF, and Taku's cited answers (mock fixtures, no AI spend). */

const NOTES = "Photosynthesis\nGreen plants make glucose from carbon dioxide and water using light energy.\nChlorophyll in the chloroplasts absorbs the light.\nOxygen is released as a by product.";

test("a learner adds notes, asks Taku, and checks the citation", async ({ page }, info) => {
  const year = new Date().getFullYear();
  await page.goto("/signin?mode=signUp");
  await page.getByLabel("Email").fill(`e2e-nb-${info.project.name}-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("studyhard2026");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("What should Taku call you?").fill("Rufaro");
  await page.getByLabel("Month").selectOption({ label: "January" });
  await page.getByLabel("Year").selectOption(String(year - 24));
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Skip for now" }).click();

  await page.getByRole("button", { name: "New notebook" }).click();
  await page.getByLabel("Notebook name").fill("Form 4 Biology");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name: "Form 4 Biology" })).toBeVisible();

  await page.getByRole("button", { name: "Paste text" }).click();
  await page.getByLabel("Title").fill("Biology notes");
  await page.getByLabel("Your text").fill(NOTES);
  await page.getByRole("button", { name: "Add text" }).click();
  await expect(page.getByText("1 page")).toBeVisible();

  await page.getByTestId("file-input").setInputFiles(join(process.cwd(), "tests", "fixtures", "sources", "biology-notes.pdf"));
  await expect(page.getByText("2 pages")).toBeVisible({ timeout: 60_000 });

  await page.getByLabel("Ask Taku about your notes").fill("What does chlorophyll do?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  const answer = page.getByTestId("message-taku").last();
  await expect(answer).toContainText("Chlorophyll absorbs the light");
  await expect(answer).toContainText("Taku's idea, not from your notes");

  await answer.getByRole("button", { name: /page 1/ }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("mark")).toHaveText("Chlorophyll in the chloroplasts absorbs the light");
  await dialog.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Only my material" }).click();
  await page.getByLabel("Ask Taku about your notes").fill("What does chlorophyll do?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(page.getByTestId("message-taku").last()).toContainText("left out because they could not be found in your material");
});
