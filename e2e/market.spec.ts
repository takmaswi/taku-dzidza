import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { adultOnHome, ask, closeSources, newNotebook, openSources, otherPage, ownerSignedIn, pasteNotes, phone } from "./helpers";

/**
 * Step 9: the notes marketplace with demo payments (MARKETPLACE_MODE is on
 * locally). A seller lists notes, the owner approves them, a buyer finds,
 * buys and reads them (view only, with their name and email across the
 * page), asks Taku from them and reviews them; rentals end on time and can
 * be renewed; a report hides a listing; the owner refunds and pays sellers.
 */

/** A made up word in letters, so this run's listing, seller and buyer are the only matches. */
function runWord(): string {
  return String(Date.now())
    .slice(-8)
    .split("")
    .map((d) => "abcdefghij"[Number(d)])
    .join("");
}

/** The mock AI checks listings by title (tests/fixtures/ai/safety_check/listing-*.json), so the title is fixed per screen size. */
function titleFor(info: TestInfo): string {
  return `Leaf notes ${info.project.name}`;
}

/** Runs an internal function on the local mock backend, as e2e/helpers.ts reads the outbox. */
function convexRun(fn: string, args: Record<string, unknown>): void {
  const result = spawnSync(process.execPath, ["node_modules/convex/bin/main.js", "run", fn, JSON.stringify(args)], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`convex run ${fn} failed: ${result.stderr}`);
}

type Listing = { title: string; word: string; seller: Page; sellerName: string };

/** A new seller lists notes and sends them; the owner approves them. Returns the live listing's page. */
async function sellAndApprove(browser: Browser, info: TestInfo): Promise<Listing> {
  const word = runWord();
  const title = titleFor(info);
  const sellerName = `Chipo ${word}`;
  const seller = await otherPage(browser, info);
  await adultOnHome(seller, info, "e2e-seller", "Chipo");
  await newNotebook(seller, "Leaf master");
  await pasteNotes(seller, info, undefined, "Leaf notes");

  await seller.goto("/market/sell");
  const become = seller.getByRole("form", { name: "Become a seller" });
  await become.getByLabel("Your full real name").fill(sellerName);
  await become.getByLabel("Mobile money number for payouts").fill("077 123 4567");
  await become.getByLabel("This is my own work, or I have the right to sell it.").check();
  await become.getByRole("button", { name: "Become a seller" }).click();

  await seller.getByRole("button", { name: "New listing" }).click();
  const form = seller.getByRole("form", { name: "New listing" });
  await expect(form.getByText(/Not allowed: exam board past papers or marking schemes/)).toBeVisible();
  await form.getByLabel("Title", { exact: true }).fill(title);
  await form.getByLabel("Subject", { exact: true }).fill("Biology");
  await form.getByLabel("Level", { exact: true }).fill("O Level");
  await form.getByLabel(/^Exam/).fill(`ZIMSEC ${word}`);
  await form.getByLabel("Description", { exact: true }).fill("Short clear notes on how leaves make food, for O Level Biology.");
  await form.getByLabel("Price to buy, in US dollars (0 for free)").fill("5");
  await form.getByLabel("Price to rent for 7 days").fill("1");
  await form.getByRole("button", { name: "Create listing" }).click();

  const row = seller.getByRole("region", { name: title });
  await expect(row).toContainText("Draft");
  await row.getByLabel("This is my own work, or I have the right to sell it.").check();
  await row.getByRole("button", { name: "Send for approval" }).click();
  await expect(row.getByRole("status")).toHaveText("Sent. We will check it before anyone can buy it.", { timeout: 60_000 });
  await expect(row).toContainText("Waiting for approval");

  const owner = await otherPage(browser, info);
  await ownerSignedIn(owner, info);
  await owner.goto("/owner/market");
  const item = owner.getByRole("article", { name: title }).filter({ hasText: sellerName });
  await item.getByRole("button", { name: "Approve" }).click();
  await expect(owner.getByRole("region", { name: "Waiting for approval" }).getByRole("status")).toHaveText("Approved.", { timeout: 30_000 });
  await expect(item).toHaveCount(0);
  await owner.context().close();
  await expect(seller.getByRole("region", { name: title })).toContainText("Live");
  return { title, word, seller, sellerName };
}

/** Finds this run's listing through search and opens it. */
async function findListing(page: Page, l: Listing): Promise<string> {
  await page.goto("/");
  await page.getByRole("link", { name: "Marketplace" }).click();
  await expect(page.getByRole("heading", { name: "Marketplace", level: 1 })).toBeVisible();
  await page.getByLabel("Search by subject, exam or level").fill(l.word);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("status")).toHaveText("1 listing");
  await page.getByRole("link", { name: new RegExp(l.title) }).click();
  await expect(page.getByRole("heading", { name: l.title, level: 1 })).toBeVisible();
  return page.url();
}

async function pay(page: Page, option: RegExp) {
  await page.getByRole("button", { name: option }).click();
  await expect(page.getByTestId("demo-banner")).toContainText("Demo payment, no real money");
  await page.getByRole("button", { name: "Pay (demo succeeds)" }).click();
  // The notebook opens; on a phone its "Bought" line sits in the Sources sheet (boughtLine).
  await expect(page).toHaveURL(/\/n\//, { timeout: 20_000 });
}

/** The notebook's sources: in the rail on a wide screen, behind the chip on a phone. */
async function boughtLine(page: Page, info: TestInfo) {
  await openSources(page, info);
  const line = page.getByTestId("bought-line").first();
  await expect(line).toBeVisible();
  return line;
}

test("a seller lists notes, the owner approves; a buyer finds them, a payment fails then succeeds, and they read, ask Taku and review; the seller is paid", async ({ page, browser }, info) => {
  test.setTimeout(300_000);
  const l = await sellAndApprove(browser, info);
  const buyerName = `Kuda${l.word}`;
  const email = await adultOnHome(page, info, "e2e-buyer", buyerName);
  const url = await findListing(page, l);
  await expect(page.getByText("Leaf notes, page 1")).toBeVisible();
  await expect(page.getByText("Written by", { exact: false })).toContainText(`Written by ${l.sellerName}, not an exam board paper`);

  // A demo payment that fails takes nothing.
  await page.getByRole("button", { name: "Buy for $5.00" }).click();
  await expect(page.getByTestId("demo-banner")).toContainText("Demo payment, no real money");
  for (const m of ["EcoCash", "OneMoney", "InnBucks", "Card"]) await expect(page.getByRole("radio", { name: m })).toBeVisible();
  await page.getByRole("radio", { name: "OneMoney" }).check();
  await page.getByRole("button", { name: "Try a failed payment" }).click();
  await expect(page.getByRole("status")).toHaveText("This payment did not go through. No money was taken. Start again from the listing.");
  await page.getByRole("link", { name: "Back to the listing" }).click();
  await pay(page, /^Buy for \$5\.00$/);

  // In the buyer's notebooks, marked Bought; read view only, with their name and email across the page.
  const line = await boughtLine(page, info);
  await expect(line).toContainText("Bought");
  await page.getByRole("button", { name: "Read Leaf notes" }).click();
  const reader = page.getByTestId("protected-reader");
  await expect(reader).toContainText("Chlorophyll in the chloroplasts absorbs the light");
  await expect(page.getByTestId("watermark").first()).toContainText(email);
  await expect(page.getByTestId("watermark").first()).toContainText(buyerName);
  expect(await reader.evaluate((el) => getComputedStyle(el).userSelect)).toBe("none");
  await expect(page.getByRole("link", { name: /download/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /download|print/i })).toHaveCount(0);
  if (phone(info)) await page.getByRole("dialog").getByRole("button", { name: "Done" }).click();
  else await page.getByRole("button", { name: "All sources" }).click();

  // Taku answers from it.
  await ask(page, "What does chlorophyll do?");
  await expect(page.getByRole("button", { name: /Leaf notes, page 1/ }).first()).toBeVisible({ timeout: 30_000 });

  // Buyers review, once.
  await page.goto(url);
  await page.getByLabel("A few words (optional)").fill("Short and clear.");
  await page.getByRole("button", { name: "Post review" }).click();
  await expect(page.getByRole("region", { name: "Reviews" })).toContainText("Short and clear.");
  await expect(page.getByRole("button", { name: "Post review" })).toHaveCount(0);

  // The seller's money: pending for 7 days, then owed; the owner marks it paid.
  const seller = l.seller;
  await seller.goto("/settings");
  const money = seller.getByTestId("settings-money");
  await expect(money.getByTestId("balance-pending")).toHaveText("$4.00");
  await expect(money.getByTestId("balance-owed")).toHaveText("$0.00");
  await expect(money).toContainText(l.title);
  convexRun("market/money:ageSalesForTest", { listingTitle: l.title, days: 8 });
  await expect(money.getByTestId("balance-owed")).toHaveText("$4.00");
  const owner = await otherPage(browser, info);
  await ownerSignedIn(owner, info);
  await owner.goto("/owner/market");
  const due = owner.getByRole("article", { name: l.sellerName });
  await expect(due).toContainText("$4.00");
  await due.getByLabel("Amount in US dollars").fill("4");
  await due.getByLabel("Payment reference").fill(`EC${l.word}`);
  await due.getByRole("button", { name: "Mark as paid" }).click();
  await expect(money.getByTestId("balance-paid")).toHaveText("$4.00");
  await expect(money.getByTestId("balance-owed")).toHaveText("$0.00");
  expect(await owner.getByRole("link", { name: "Download the ledger (CSV)" }).getAttribute("href")).toContain(encodeURIComponent(l.title));
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test("a rental ends on time and is renewed; a report hides the listing; the owner refunds and the buyer's access ends", async ({ page, browser }, info) => {
  test.setTimeout(300_000);
  const l = await sellAndApprove(browser, info);
  const buyerName = `Rudo${l.word}`;
  await adultOnHome(page, info, "e2e-renter", buyerName);
  const url = await findListing(page, l);
  await pay(page, /^Rent for 7 days, \$1\.00$/);
  await expect(await boughtLine(page, info)).toContainText("Rented until");
  await closeSources(page, info);
  const notebookUrl = page.url();

  // The rental ends: access stops at that moment, with a way to renew.
  convexRun("market/purchases:endRentalSoon", { listingTitle: l.title, seconds: 3 });
  await expect(page.getByText("Your rental has ended.").first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole("link", { name: "Renew" }).first().click();
  await expect(page).toHaveURL(url);
  await pay(page, /^Rent for 7 days, \$1\.00$/);
  expect(page.url()).toBe(notebookUrl);

  // Anyone can report it: hidden from new buyers at once.
  const reporter = await otherPage(browser, info);
  await adultOnHome(reporter, info, "e2e-reporter", "Tendai");
  await reporter.goto(url);
  await reporter.getByRole("button", { name: "Report this" }).click();
  const sheet = reporter.getByTestId("report-sheet");
  await sheet.getByLabel("It is an exam board paper or marking scheme").check();
  await sheet.getByRole("button", { name: "Send report" }).click();
  await expect(reporter.getByRole("status")).toHaveText("Thank you. The listing is hidden while we check it.");
  await reporter.goto("/market");
  await reporter.getByLabel("Search by subject, exam or level").fill(l.word);
  await reporter.getByRole("button", { name: "Search" }).click();
  await expect(reporter.getByRole("status")).toHaveText("0 listings");

  // The owner sees the report, restores it, and refunds the rental: the buyer's access ends.
  const owner = await otherPage(browser, info);
  await ownerSignedIn(owner, info);
  await owner.goto("/owner/market");
  const reported = owner.getByRole("region", { name: "Reports" }).getByRole("article", { name: l.title }).filter({ hasText: l.sellerName });
  await expect(reported).toContainText("It is an exam board paper or marking scheme");
  await reported.getByRole("button", { name: "Restore" }).click();
  await expect(reported).toHaveCount(0);
  await reporter.getByRole("button", { name: "Search" }).click();
  await expect(reporter.getByRole("status")).toHaveText("1 listing");
  const refunds = owner.getByRole("region", { name: "Refunds (within 7 days)" });
  await refunds.getByRole("button", { name: `Refund: ${l.title}, ${buyerName}` }).first().click();
  await expect(refunds.getByRole("button", { name: `Refund: ${l.title}, ${buyerName}` })).toHaveCount(1);
  await refunds.getByRole("button", { name: `Refund: ${l.title}, ${buyerName}` }).click();
  await expect(refunds.getByRole("button", { name: `Refund: ${l.title}, ${buyerName}` })).toHaveCount(0);
  await expect(page.getByText("Your rental has ended.").first()).toBeVisible({ timeout: 20_000 });

  // Settings > Money: both rentals, with receipts.
  await page.goto("/settings");
  const money = page.getByTestId("settings-money");
  await expect(money.getByRole("list", { name: "Your purchases and rentals" }).getByRole("listitem")).toHaveCount(2);
  await expect(money).toContainText("Refunded");
  await money.getByText("Receipt").first().click();
  await expect(money).toContainText("Reference DEMO-");
});
