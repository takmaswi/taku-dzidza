import { expect, test, type Page } from "@playwright/test";
import { adultOnHome, newNotebook } from "./helpers";

/**
 * People stand on the page as cutouts and scenes melt into it. No photo sits
 * in an arch, a circle or a clipped box: neither the image nor anything around
 * it may round or clip it.
 */

async function framedImages(page: Page): Promise<string[]> {
  await page.waitForLoadState("load");
  return page.evaluate(() => {
    const framed: string[] = [];
    for (const img of Array.from(document.querySelectorAll("img"))) {
      const box = img.getBoundingClientRect();
      if (box.width < 40 || box.height < 40) continue;
      for (let el: Element | null = img; el !== null && el !== document.body; el = el.parentElement) {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const radius = Math.max(...[s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomLeftRadius, s.borderBottomRightRadius].map((v) => (v.endsWith("%") ? (parseFloat(v) / 100) * Math.min(r.width, r.height) : parseFloat(v) || 0)));
        const clips = el === img || s.overflow !== "visible" || s.overflowX !== "visible";
        const rounded = clips && radius >= 0.2 * Math.min(r.width, r.height);
        const clipped = s.clipPath !== "none" && /circle|ellipse|round|path/.test(s.clipPath);
        // Only a frame if the image fills most of the shape, so a rounded card with a small picture inside does not count.
        const fills = box.width * box.height >= 0.5 * r.width * r.height;
        if ((rounded || clipped) && fills) {
          framed.push(`${img.currentSrc || img.src} inside ${el.tagName.toLowerCase()}.${(el.getAttribute("class") ?? "").replace(/\s+/g, ".")}`);
          break;
        }
      }
    }
    return framed;
  });
}

test("no image sits inside an arch, a circle or a box frame", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Start studying free" }).first().waitFor();
  for (let y = 0; y < 8; y++) await page.mouse.wheel(0, 900);
  expect(await framedImages(page)).toEqual([]);

  await page.goto("/signin");
  expect(await framedImages(page)).toEqual([]);

  await adultOnHome(page, info, "frames");
  expect(await framedImages(page)).toEqual([]);

  await page.goto("/chat");
  await expect(page.getByRole("heading", { name: "Ask anything you are studying." })).toBeVisible();
  expect(await framedImages(page)).toEqual([]);

  await page.goto("/");
  await newNotebook(page, "Biology");
  await expect(page.getByRole("heading", { name: "Give Taku something to study from" })).toBeVisible();
  expect(await framedImages(page)).toEqual([]);
});
