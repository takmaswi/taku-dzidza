import { expect, test, type Page } from "@playwright/test";
import { adultOnHome, ask, freshEmail, newNotebook, NOTES, openTools, outboxCode, PASSWORD, pasteNotes, pickChip, setUp } from "./helpers";

/** The MVP hardening items: accounts, maths, widgets and the phone fixes (mock fixtures, no AI spend). */

test.describe("accounts", () => {
  test("a forgotten password is reset with an emailed code, and sign out lives in Settings", async ({ page }, info) => {
    const email = await adultOnHome(page, info, "reset");

    // No sign out in the header any more.
    await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
    await page.getByRole("link", { name: "Settings" }).first().click();
    await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("link", { name: "Start studying free" }).first()).toBeVisible();

    await page.goto("/signin");
    await page.getByRole("button", { name: "Forgot your password?" }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send the code" }).click();
    await expect(page.getByRole("heading", { name: "Set a new password" })).toBeVisible();
    await page.getByLabel("Code from the email").fill(await outboxCode(email));
    await page.getByLabel("New password").fill("brandnewpassword26");
    await page.getByRole("button", { name: "Set new password" }).click();
    await expect(page.getByRole("heading", { name: /What are we studying today/ })).toBeVisible();

    // The old password no longer works, the new one does.
    await page.getByRole("link", { name: "Settings" }).first().click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("link", { name: "Start studying free" }).first()).toBeVisible();
    await page.goto("/signin");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await page.getByLabel("Password", { exact: true }).fill("brandnewpassword26");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("heading", { name: /What are we studying today/ })).toBeVisible();
  });

  test("a wrong email code is refused, and Google stays hidden without its keys", async ({ page }, info) => {
    await page.goto("/signin");
    await expect(page.getByRole("heading", { name: "Welcome back" }).or(page.getByRole("button", { name: "Sign in", exact: true })).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Forgot your password?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(0);

    const email = freshEmail(info.project.name, "wrongcode");
    await page.goto("/signin?mode=signUp");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    await page.getByLabel("Code from the email").fill("00000000");
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByRole("alert")).toContainText("That code did not work");
    await page.getByLabel("Code from the email").fill(await outboxCode(email));
    await page.getByRole("button", { name: "Confirm" }).click();
    await setUp(page, "Tino", new Date().getFullYear() - 25);
    await expect(page.getByRole("heading", { name: "What are you studying for?" })).toBeVisible();
  });

  test("the first run checklist follows what the learner has done, and an adult can switch on usage counts", async ({ page }, info) => {
    await adultOnHome(page, info, "checklist");
    const checklist = page.locator(".checklist");
    await expect(checklist.getByRole("heading", { name: "Three steps to get going" })).toBeVisible();
    await expect(checklist.getByRole("listitem").filter({ hasText: "Add notes" })).toContainText("To do");

    await newNotebook(page, "Biology");
    await pasteNotes(page, info);
    await page.getByRole("link", { name: "Home" }).first().click();
    await expect(checklist.getByRole("listitem").filter({ hasText: "Add notes" })).toContainText("Done");
    await expect(checklist.getByRole("listitem").filter({ hasText: "Ask one question" })).toContainText("To do");

    await page.getByRole("link", { name: "Settings" }).first().click();
    const counts = page.getByRole("switch", { name: "Share usage counts" });
    await expect(counts).not.toBeChecked();
    await counts.check();
    await expect(counts).toBeChecked();
    // The compact style picker: all three, no photos.
    await expect(page.getByRole("radio")).toHaveCount(3);
    await expect(page.getByRole("radiogroup").locator("img")).toHaveCount(0);
  });

  test("the privacy notice and terms are public and marked as drafts", async ({ page }) => {
    for (const [path, heading] of [
      ["/privacy", "Privacy notice"],
      ["/terms", "Terms of use"],
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
      await expect(page.getByRole("note")).toContainText("Draft for legal review");
    }
    await page.goto("/");
    await page.locator(".l-foot").getByRole("link", { name: "Privacy notice" }).click();
    await expect(page.getByRole("heading", { name: "Privacy notice", level: 1 })).toBeVisible();
  });
});

test.describe("Ask Taku on a small phone", () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test("the composer does not cover the intro or the starter chips", async ({ page }, info) => {
    await adultOnHome(page, info, "composer");
    await page.goto("/chat");
    const composer = page.locator("form.composer");
    const intro = page.locator(".chat-empty .lead");
    const chips = page.locator(".chat-empty .chips");
    await expect(composer).toBeVisible();
    await expect(intro).toBeVisible();
    await expect(chips).toBeVisible();

    const overlap = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    const check = async () => {
      const c = (await composer.boundingBox())!;
      expect(overlap(c, (await intro.boundingBox())!)).toBe(false);
      expect(overlap(c, (await chips.boundingBox())!)).toBe(false);
    };
    await check();
    await chips.getByRole("button").last().scrollIntoViewIfNeeded();
    await check();
    // Whatever is scrolled to, a real tap lands on the chip itself.
    const chip = chips.getByRole("button").first();
    await chip.scrollIntoViewIfNeeded();
    await chip.click({ trial: true, timeout: 5_000 });
    // Nothing runs off the side of the screen.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});

test.describe("streaming and progress", () => {
  test("a chat reply grows as it arrives, with maths drawn", async ({ page }, info) => {
    await adultOnHome(page, info, "stream");
    await page.goto("/chat");
    await page.getByLabel("Ask Taku anything").or(page.locator("#chat-input")).first().fill("How do I factorise x^2 + 5x + 6?");
    await page.getByRole("button", { name: "Send" }).click();
    const live = page.locator('[data-testid="chat-taku"][data-streaming="true"]');
    await expect(live).toBeVisible();
    await expect(live.locator(".md")).not.toBeEmpty();
    const final = page.getByTestId("chat-taku").last();
    await expect(live).toHaveCount(0);
    await expect(final.locator(".katex").first()).toBeVisible();
    // The source is not left showing around the drawn maths.
    await expect(final).not.toContainText("$");
  });

  test("a notebook answer shows its stages", async ({ page }, info) => {
    await adultOnHome(page, info, "stages");
    await newNotebook(page, "Biology");
    await pasteNotes(page, info);
    // Record every stage shown, because each one may pass quicker than a check can look.
    await page.evaluate(() => {
      const seen: string[] = [];
      (window as unknown as { __stages: string[] }).__stages = seen;
      new MutationObserver(() => {
        for (const el of Array.from(document.querySelectorAll(".stage"))) {
          const text = el.textContent ?? "";
          if (!seen.includes(text)) seen.push(text);
        }
      }).observe(document.body, { subtree: true, childList: true, characterData: true });
    });
    await ask(page, "What does chlorophyll do?");
    const answer = page.getByTestId("message-taku").last();
    await expect(answer).toContainText("Chlorophyll absorbs the light");
    await expect(page.locator(".stage")).toHaveCount(0);
    const stages = await page.evaluate(() => (window as unknown as { __stages: string[] }).__stages);
    expect(stages).toContain("Reading your notes");
    expect(stages).toContain("Checking quotes");
  });
});

async function toolsTab(page: Page, info: Parameters<typeof pasteNotes>[1]) {
  await adultOnHome(page, info, "tools");
  await newNotebook(page, "Biology");
  await pasteNotes(page, info);
  await openTools(page, info);
}

/** Step by step widgets sit behind one tile in the Study tools panel. */
async function openWidget(page: Page, info: Parameters<typeof pasteNotes>[1], name: RegExp) {
  await toolsTab(page, info);
  await page.getByRole("button", { name: /^Step by step/ }).click();
  await page.getByRole("button", { name }).click();
}

test.describe("maths on papers", () => {
  test("a practice paper draws maths and chemistry, on screen and in the print scheme", async ({ page }, info) => {
    await toolsTab(page, info);
    await page.getByRole("button", { name: /^Practice paper/ }).click();
    await page.getByLabel("How many").fill("3");
    await page.getByLabel("Difficulty").selectOption("easy");
    await page.getByLabel("Minutes").fill("10");
    await page.getByRole("button", { name: "Make practice paper" }).click();
    await expect(page.getByText("Time: 10 minutes")).toBeVisible();
    await expect(page.locator(".qtext .katex").first()).toBeVisible();
    await expect(page.locator(".qtext").first()).not.toContainText("$");
    // The recorded second opinion rejected the question with a wrong answer.
    await expect(page.locator(".qtext")).toHaveCount(2);

    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".scheme-print .katex").first()).toBeVisible();
    await page.emulateMedia({ media: "screen" });
  });
});

test.describe("widgets", () => {
  test("equation steps marks each line, from the Study tools panel", async ({ page }, info) => {
    await openWidget(page, info, /^Equation steps/);
    const widget = page.getByTestId("widget-equation");
    await expect(widget).toBeVisible();
    const line = widget.getByLabel("Your next line");
    await line.fill("this is not maths");
    await widget.getByRole("button", { name: "Check this line" }).click();
    await expect(widget).toContainText("That could not be read");
    await line.fill("2x = 9");
    await widget.getByRole("button", { name: "Check this line" }).click();
    await expect(widget.getByRole("listitem").last()).toContainText("Not yet");
    await line.fill("2x = 8");
    await widget.getByRole("button", { name: "Check this line" }).click();
    await expect(widget.getByRole("listitem").last()).toContainText("Right");
    await widget.getByRole("button", { name: "Give me a hint" }).click();
    await expect(widget.locator(".widget-hints li")).toHaveCount(1);
    await line.fill("x = 4");
    await widget.getByRole("button", { name: "Check this line" }).click();
    await expect(widget).toContainText("Solved. Every line checks out.");
  });

  test("fill in the blanks marks each blank and cites the page", async ({ page }, info) => {
    await openWidget(page, info, /^Fill in the blanks/);
    const widget = page.getByTestId("widget-blanks");
    await expect(widget).toBeVisible();
    // The recorded response has a third blank that is not in the notes, so only two are left.
    await expect(widget.locator(".blanks > li")).toHaveCount(2);
    await expect(widget).toContainText("page 1");
    const first = widget.locator(".blanks > li").first();
    await first.getByLabel("Gap 1").fill("wrong word");
    await first.getByRole("button", { name: "Check" }).click();
    await expect(first).toContainText("Not yet");
    await first.getByLabel("Gap 1").fill("wrong again");
    await first.getByRole("button", { name: "Check" }).click();
    await first.getByRole("button", { name: "Show me" }).click();
    await expect(first.locator("b")).not.toBeEmpty();
    await expect(widget).toContainText("0 of 2 right");
  });

  test("long division goes one step at a time, with a hint after two tries", async ({ page }, info) => {
    await openWidget(page, info, /^Long division/);
    const widget = page.getByTestId("widget-division");
    await expect(widget).toBeVisible();
    const answer = widget.getByRole("textbox");
    const check = widget.getByRole("button", { name: "Check" });
    await answer.fill("99");
    await check.click();
    await expect(widget).toContainText("Have another go");
    await answer.fill("98");
    await check.click();
    await expect(widget).toContainText("Count up");
    // Work through to the end with Show me, so this test does not depend on the recorded numbers.
    for (let i = 0; i < 40; i++) {
      if (await widget.getByText(/^Done\./).isVisible()) break;
      await answer.fill("99");
      await check.click();
      await answer.fill("98");
      await check.click();
      await widget.getByRole("button", { name: "Show me this step" }).click();
    }
    await expect(widget.getByText(/^Done\./)).toBeVisible();
  });

  test("Guide me in chat can hand back a working widget, with no answer given away", async ({ page }, info) => {
    await adultOnHome(page, info, "guide");
    await page.goto("/chat");
    await pickChip(page, /^How Taku answers/, /^Guide me/);
    await page.locator("#chat-input").fill("Solve 2x + 3 = 11");
    await page.getByRole("button", { name: "Send" }).click();
    const widget = page.getByTestId("widget-equation");
    await expect(widget).toBeVisible();
    await expect(page.getByTestId("chat-taku").last()).not.toContainText("```");
    await widget.getByLabel("Your next line").fill("x = 4");
    await widget.getByRole("button", { name: "Check this line" }).click();
    await expect(widget).toContainText("Solved");
  });

  test("Guide me in a notebook can hand back a fill in the blanks", async ({ page }, info) => {
    await adultOnHome(page, info, "nbguide");
    await page.getByRole("link", { name: "Settings" }).first().click();
    await page.getByRole("button", { name: /Guide me/ }).click();
    await page.getByRole("link", { name: "Home" }).first().click();
    await newNotebook(page, "Biology");
    await pasteNotes(page, info, NOTES);
    await ask(page, "Test me on what chlorophyll does");
    await expect(page.getByTestId("message-taku").last().getByTestId("widget-blanks")).toBeVisible();
  });
});
