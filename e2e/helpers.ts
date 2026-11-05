import { expect, type Page, type TestInfo } from "@playwright/test";
import { spawnSync } from "node:child_process";

/** Shared steps for the journeys. The mock senders put their codes in a test outbox on the local backend. */

export const PASSWORD = "studyhard2026";

export const NOTES = "Photosynthesis\nGreen plants make glucose from carbon dioxide and water using light energy.\nChlorophyll in the chloroplasts absorbs the light.\nOxygen is released as a by product.";

let seq = 0;
export function freshEmail(project: string, tag = "e2e"): string {
  seq += 1;
  return `${tag}-${project}-${Date.now()}-${seq}@example.com`;
}

/** A new number each time: the app limits how many codes one phone can get in a day. */
export function freshPhone(): { typed: string; stored: string } {
  const digits = String(Date.now()).slice(-7);
  return { typed: `077${digits}`, stored: `+26377${digits}` };
}

function readOutbox(to: string): string | null {
  // Run with node directly and no shell, so the JSON argument reaches Convex untouched.
  const result = spawnSync(process.execPath, ["node_modules/convex/bin/main.js", "run", "accounts/outbox:latest", JSON.stringify({ to })], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`could not read the outbox: ${result.stderr}`);
  return JSON.parse(result.stdout.trim().split("\n").pop() ?? "null") as string | null;
}

export async function outboxCode(to: string): Promise<string> {
  let code: string | null = null;
  await expect.poll(() => (code = readOutbox(to)), { timeout: 20_000, intervals: [500] }).not.toBeNull();
  return code!;
}

export async function signUp(page: Page, email: string) {
  await page.goto("/signin?mode=signUp");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.getByLabel("Code from the email").fill(await outboxCode(email));
  await page.getByRole("button", { name: "Confirm" }).click();
}

export async function setUp(page: Page, name: string, birthYear: number) {
  await expect(page.getByRole("heading", { name: "Tell us about you" })).toBeVisible();
  await page.getByLabel("What should Taku call you?").fill(name);
  await page.getByLabel("Month").selectOption({ label: "January" });
  await page.getByLabel("Year").selectOption(String(birthYear));
  await page.getByRole("button", { name: "Continue" }).click();
}

/** A signed up adult who skipped the quiz, on home. */
export async function adultOnHome(page: Page, info: TestInfo, tag = "e2e", name = "Farai"): Promise<string> {
  const email = freshEmail(info.project.name, tag);
  await signUp(page, email);
  await setUp(page, name, new Date().getFullYear() - 22);
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`What are we studying today, ${name}`) })).toBeVisible();
  return email;
}

/** On phones the sources and settings live in a sheet; on wide screens they are always showing. */
export async function openSources(page: Page, info: TestInfo) {
  if (info.project.name === "phone") await page.getByRole("button", { name: /^Sources/ }).click();
}
export async function closeSources(page: Page, info: TestInfo) {
  if (info.project.name === "phone") await page.getByRole("button", { name: "Done" }).click();
}

export async function newNotebook(page: Page, title: string) {
  await page.getByRole("button", { name: "New notebook" }).first().click();
  await page.getByLabel("What is this notebook for?").fill(title);
  await page.getByRole("button", { name: "Create notebook" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

export async function pasteNotes(page: Page, info: TestInfo, text = NOTES) {
  await openSources(page, info);
  await page.getByRole("button", { name: "Paste text" }).click();
  await page.getByLabel("Your text").fill(text);
  await page.getByRole("button", { name: "Add text" }).click();
  await expect(page.getByText("1 page")).toBeVisible();
  await closeSources(page, info);
}
