import { describe, expect, test } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { MARKET_OFF } from "../../convex/market/access";
import { DELETED_ACCOUNT, MONEY_ERRORS } from "../../convex/market/money";
import { CHECKOUT_ERRORS } from "../../convex/market/purchases";
import { examPaperFlag, split } from "../../convex/market/rules";
import { SELLER_ERRORS } from "../../convex/market/sellers";
import { addConsent, makeLearner, makeT, settle, type Person, type T } from "./people";

/** Step 9: the notes marketplace with demo payments, behind MARKETPLACE_MODE (DECISIONS.md, Notes marketplace). */

const NOTES = "Photosynthesis\nGreen plants make glucose from carbon dioxide and water using light energy.\nChlorophyll in the chloroplasts absorbs the light.\nOxygen is released as a by product.";
const DESCRIPTION = "Clear notes on photosynthesis for Form 4, with worked examples.";
const DAY = 24 * 60 * 60 * 1000;

async function withEnv<R>(values: Record<string, string | undefined>, run: () => Promise<R>): Promise<R> {
  const before = Object.fromEntries(Object.keys(values).map((k) => [k, process.env[k]]));
  for (const [k, val] of Object.entries(values)) {
    if (val === undefined) delete process.env[k];
    else process.env[k] = val;
  }
  try {
    return await run();
  } finally {
    for (const [k, val] of Object.entries(before)) {
      if (val === undefined) delete process.env[k];
      else process.env[k] = val;
    }
  }
}

async function verify(t: T, p: Person): Promise<void> {
  await t.run(async (ctx) => await ctx.db.patch(p.userId, { emailVerificationTime: Date.now() }));
}

/** An adult seller with a notebook of notes made into a draft listing. */
async function draftListing(t: T, title = "Form 4 Biology notes", text = NOTES, prices: { buyCents?: number; rentCents?: { d7?: number; d30?: number; d90?: number } } = { buyCents: 500, rentCents: { d7: 100, d30: 250 } }) {
  const seller = await makeLearner(t, 30, "Chipo Dube");
  await seller.as.mutation(api.market.sellers.become, { realName: "Chipo Dube", payoutNumber: "077 123 4567", rights: true });
  const notebookId = await seller.as.mutation(api.notebooks.notebooks.create, { title: "My biology" });
  await seller.as.mutation(api.notebooks.sources.addText, { notebookId, title: "Leaf notes", text });
  await settle(t);
  const listingId = await seller.as.mutation(api.market.listings.create, { notebookId, title, subject: "Biology", level: "O Level", exam: "ZIMSEC O Level Biology", description: DESCRIPTION, previewCount: 1, ...prices });
  return { seller, notebookId, listingId };
}

/** The owner: on ADMIN_EMAILS, verified. The caller sets ADMIN_EMAILS. */
async function owner(t: T): Promise<Person> {
  const o = await makeLearner(t, 40, "Owner");
  await verify(t, o);
  return o;
}

/** A listing that is live: sent, then approved by the owner. */
async function liveListing(t: T, o: Person, title?: string, text?: string, prices?: Parameters<typeof draftListing>[3]) {
  const d = await draftListing(t, title, text, prices);
  expect(await d.seller.as.action(api.market.publish.submit, { listingId: d.listingId, rights: true })).toEqual({ ok: true });
  const approved = await o.as.action(api.market.publish.approve, { listingId: d.listingId });
  expect(approved.ok).toBe(true);
  return d;
}

async function buy(buyer: Person, listingId: Id<"listings">, kind: "buy" | "rent" = "buy", days?: number) {
  const checkoutId = await buyer.as.mutation(api.market.purchases.checkout, { listingId, kind, ...(days === undefined ? {} : { days }) });
  const paid = await buyer.as.mutation(api.market.purchases.pay, { checkoutId, method: "ecocash", succeed: true });
  if (!paid.ok) throw new Error(paid.message);
  return paid.notebookId;
}

describe("MARKETPLACE_MODE and TEACHER_MODE take off, admins or on", () => {
  test("off refuses everyone, admins lets only a verified ADMIN_EMAILS account in, on lets everyone in", async () => {
    const t = makeT();
    const learner = await makeLearner(t, 25);
    const admin = await makeLearner(t, 40);
    await withEnv({ ADMIN_EMAILS: admin.email, MARKETPLACE_MODE: undefined, TEACHER_MODE: "off" }, async () => {
      await expect(learner.as.query(api.market.listings.browse, {})).rejects.toThrow(MARKET_OFF);
      await expect(admin.as.query(api.market.listings.browse, {})).rejects.toThrow(MARKET_OFF);
      expect(await admin.as.query(api.flags.get, {})).toMatchObject({ teacher: false, market: false });
      await expect(learner.as.query(api.organisations.organisations.mine, {})).rejects.toThrow(/not on yet/);
    });
    await withEnv({ ADMIN_EMAILS: admin.email, MARKETPLACE_MODE: "admins", TEACHER_MODE: "admins" }, async () => {
      // An address on the list counts only once it is verified.
      await expect(admin.as.query(api.market.listings.browse, {})).rejects.toThrow(MARKET_OFF);
      await verify(t, admin);
      expect(await admin.as.query(api.market.listings.browse, {})).toMatchObject({ results: null });
      expect(await admin.as.query(api.flags.get, {})).toMatchObject({ teacher: true, market: true });
      await expect(learner.as.query(api.market.listings.browse, {})).rejects.toThrow(MARKET_OFF);
      expect(await learner.as.query(api.flags.get, {})).toMatchObject({ teacher: false, market: false });
      await expect(learner.as.query(api.organisations.organisations.mine, {})).rejects.toThrow(/not on yet/);
      expect(await admin.as.query(api.organisations.organisations.mine, {})).toBeDefined();
      // Signed out pages see the feature as off.
      expect(await t.query(api.flags.get, {})).toMatchObject({ teacher: false, market: false });
    });
    await withEnv({ MARKETPLACE_MODE: "on", TEACHER_MODE: "on" }, async () => {
      expect(await learner.as.query(api.market.listings.browse, {})).toMatchObject({ results: null });
      expect(await learner.as.query(api.flags.get, {})).toMatchObject({ teacher: true, market: true });
    });
  });
});

describe("becoming a seller and listing notes", () => {
  test("sellers are adults with a real name, a mobile money number and the rights tick", async () => {
    const t = makeT();
    const teen = await makeLearner(t, 16);
    await addConsent(t, teen);
    expect(await teen.as.query(api.market.sellers.me, {})).toEqual({ canSell: false, seller: null });
    await expect(teen.as.mutation(api.market.sellers.become, { realName: "Tino Moyo", payoutNumber: "0771234567", rights: true })).rejects.toThrow(SELLER_ERRORS.adult);
    const adult = await makeLearner(t, 22);
    await expect(adult.as.mutation(api.market.sellers.become, { realName: "Tino", payoutNumber: "0771234567", rights: true })).rejects.toThrow(SELLER_ERRORS.name);
    await expect(adult.as.mutation(api.market.sellers.become, { realName: "Tino Moyo", payoutNumber: "12", rights: true })).rejects.toThrow(SELLER_ERRORS.number);
    await expect(adult.as.mutation(api.market.sellers.become, { realName: "Tino Moyo", payoutNumber: "0771234567", rights: false })).rejects.toThrow(SELLER_ERRORS.rights);
    await adult.as.mutation(api.market.sellers.become, { realName: "Tino Moyo", payoutNumber: "077 123 4567", rights: true });
    expect(await adult.as.query(api.market.sellers.me, {})).toMatchObject({ canSell: true, seller: { realName: "Tino Moyo", payoutNumber: "+263771234567" } });
  });

  test("a listing waits for approval, is checked for under 18s then, and only then can be found", async () => {
    const t = makeT();
    const o = await owner(t);
    await withEnv({ ADMIN_EMAILS: o.email }, async () => {
      const { seller, notebookId, listingId } = await draftListing(t);
      const buyer = await makeLearner(t, 20);
      expect((await buyer.as.query(api.market.listings.browse, { text: "biology" })).results).toEqual([]);
      await expect(seller.as.action(api.market.publish.submit, { listingId, rights: false })).resolves.toMatchObject({ ok: false });
      expect(await seller.as.action(api.market.publish.submit, { listingId, rights: true })).toEqual({ ok: true });
      // Waiting: in the owner's queue, still not for sale.
      expect(await o.as.query(api.market.publish.queue, {})).toEqual([expect.objectContaining({ title: "Form 4 Biology notes", seller: "Chipo Dube", newVersion: false, flag: null })]);
      await expect(seller.as.query(api.market.publish.queue, {})).rejects.toThrow(/Only the owner/);
      expect((await buyer.as.query(api.market.listings.browse, { text: "biology" })).results).toEqual([]);
      // The seller's notebook stays while the listing does.
      await expect(seller.as.mutation(api.notebooks.notebooks.remove, { notebookId })).rejects.toThrow(/marketplace/);

      expect(await o.as.action(api.market.publish.approve, { listingId })).toEqual({ ok: true, adultsOnly: false });
      const listing = (await t.run(async (ctx) => await ctx.db.get(listingId)))!;
      expect(listing).toMatchObject({ status: "live", version: 1 });
      expect(listing.outputIds).toHaveLength(3);
      await t.run(async (ctx) => {
        const copy = (await ctx.db.get(listing.notebookId!))!;
        expect(copy.profileId).toBeUndefined();
        expect(copy.organisationId).toBeUndefined();
        for (const id of listing.outputIds) expect((await ctx.db.get(id))!.minorCheck).toBe("allowed");
      });
      expect(await o.as.query(api.market.publish.queue, {})).toEqual([]);
      const found = await buyer.as.query(api.market.listings.browse, { text: "zimsec biology" });
      expect(found.results).toEqual([expect.objectContaining({ title: "Form 4 Biology notes", author: "Chipo Dube", from: 100, buy: true, rent: true })]);
      expect((await buyer.as.query(api.market.listings.browse, { text: "chemistry" })).results).toEqual([]);
      expect((await buyer.as.query(api.market.listings.browse, { offer: "rent", maxCents: 100 })).results).toHaveLength(1);
      expect((await buyer.as.query(api.market.listings.browse, { maxCents: 50 })).results).toEqual([]);
      expect((await buyer.as.query(api.market.listings.browse, { minStars: 4 })).results).toEqual([]);
      const page = await buyer.as.query(api.market.listings.page, { listingId });
      expect(page).toMatchObject({ author: "Chipo Dube", paperLabel: "Written by Chipo Dube, not an exam board paper", buyCents: 500, rent: [{ days: 7, cents: 100 }, { days: 30, cents: 250 }], forSale: true, access: null, canReview: false });
      expect(page.previews).toEqual([expect.objectContaining({ title: "Leaf notes", page: 1 })]);
    });
  });

  test("a version that fails the under 18 checks is shown to adults only, and the seller is told", async () => {
    const t = makeT();
    const o = await owner(t);
    await withEnv({ ADMIN_EMAILS: o.email }, async () => {
      const { seller, listingId } = await draftListing(t, "Biology for grown ups");
      await seller.as.action(api.market.publish.submit, { listingId, rights: true });
      expect(await o.as.action(api.market.publish.approve, { listingId })).toEqual({ ok: true, adultsOnly: true });
      const mine = await seller.as.query(api.market.listings.mine, {});
      expect(mine.listings[0]).toMatchObject({ adultsOnly: true, note: expect.stringMatching(/^Shown to adults only, because this did not pass the check for learners under 18: Summary/) });
      const adult = await makeLearner(t, 20);
      expect((await adult.as.query(api.market.listings.browse, { text: "grown" })).results).toHaveLength(1);
      const teen = await makeLearner(t, 15);
      await addConsent(t, teen);
      expect((await teen.as.query(api.market.listings.browse, { text: "grown" })).results).toEqual([]);
      await expect(teen.as.mutation(api.market.purchases.checkout, { listingId, kind: "buy" })).rejects.toThrow(CHECKOUT_ERRORS.gone);
    });
  });

  test("notes naming an exam board with a mark scheme or a session are flagged; the owner can turn a version down", async () => {
    expect(examPaperFlag("ZIMSEC Biology marking scheme for paper 2")).toMatch(/ZIMSEC/);
    expect(examPaperFlag("Cambridge IGCSE Physics, May/June 2019")).toMatch(/session/);
    expect(examPaperFlag("ACCA TX past papers with answers")).toMatch(/past paper/);
    expect(examPaperFlag("My own ZIMSEC revision notes on cells")).toBeNull();
    expect(examPaperFlag("A mark scheme I wrote for my class")).toBeNull();
    const t = makeT();
    const o = await owner(t);
    await withEnv({ ADMIN_EMAILS: o.email }, async () => {
      const { seller, listingId } = await draftListing(t, "Form 4 Biology notes", `${NOTES}\nZIMSEC November 2023 question paper`);
      await seller.as.action(api.market.publish.submit, { listingId, rights: true });
      expect((await o.as.query(api.market.publish.queue, {}))[0].flag).toMatch(/ZIMSEC/);
      await expect(o.as.mutation(api.market.publish.reject, { listingId, reason: "no" })).rejects.toThrow(/Say why/);
      await o.as.mutation(api.market.publish.reject, { listingId, reason: "This looks like a ZIMSEC question paper." });
      expect((await seller.as.query(api.market.listings.mine, {})).listings[0]).toMatchObject({ status: "draft", waiting: false, note: "Not approved: This looks like a ZIMSEC question paper." });
      const listing = (await t.run(async (ctx) => await ctx.db.get(listingId)))!;
      expect(listing.pending).toBeUndefined();
      await t.run(async (ctx) => {
        expect(await ctx.db.query("outputs").collect()).toHaveLength(0);
      });
    });
  });
});

describe("buying, reading and renting", () => {
  test("a demo payment can fail; a paid one links the listing into the buyer's notebooks, split 80 and 20", async () => {
    const t = makeT();
    const o = await owner(t);
    await withEnv({ ADMIN_EMAILS: o.email }, async () => {
      const { seller, listingId } = await liveListing(t, o);
      await expect(seller.as.mutation(api.market.purchases.checkout, { listingId, kind: "buy" })).rejects.toThrow(CHECKOUT_ERRORS.own);
      const buyer = await makeLearner(t, 21, "Kuda Banda");
      await expect(buyer.as.mutation(api.market.purchases.checkout, { listingId, kind: "rent", days: 90 })).rejects.toThrow(CHECKOUT_ERRORS.option);
      const checkoutId = await buyer.as.mutation(api.market.purchases.checkout, { listingId, kind: "buy" });
      expect(await buyer.as.query(api.market.purchases.checkoutInfo, { checkoutId })).toMatchObject({ demo: true, amountCents: 500, methods: ["ecocash", "onemoney", "innbucks", "card"], status: "open" });
      expect(await buyer.as.mutation(api.market.purchases.pay, { checkoutId, method: "onemoney", succeed: false })).toEqual({ ok: false, message: expect.stringMatching(/No money was taken/) });
      await t.run(async (ctx) => {
        expect(await ctx.db.query("purchases").collect()).toEqual([]);
      });
      await expect(buyer.as.mutation(api.market.purchases.pay, { checkoutId, method: "onemoney", succeed: true })).rejects.toThrow(/finished/);

      const notebookId = await buy(buyer, listingId);
      await expect(buyer.as.mutation(api.market.purchases.checkout, { listingId, kind: "buy" })).rejects.toThrow(CHECKOUT_ERRORS.have);
      expect(split(500)).toEqual({ commissionCents: 100, sellerCents: 400 });
      await t.run(async (ctx) => {
        expect(await ctx.db.query("ledger").collect()).toEqual([expect.objectContaining({ amountCents: 500, commissionCents: 100, sellerCents: 400, provider: "demo", status: "paid" })]);
      });

      const nb = await buyer.as.query(api.notebooks.notebooks.get, { notebookId });
      expect(nb.bought).toMatchObject({ title: "Form 4 Biology notes", author: "Chipo Dube", access: "bought", endsAt: null, watermark: `Kuda Banda · ${buyer.email}` });
      expect(nb.sources).toEqual([expect.objectContaining({ title: "Leaf notes", fromPack: true })]);
      const tools = await buyer.as.query(api.study.tools.list, { notebookId });
      expect(tools.filter((x) => x.fromPack).map((x) => x.kind).sort()).toEqual(["cards", "quiz", "summary"]);
      // Review cards are the buyer's own.
      await t.run(async (ctx) => {
        expect((await ctx.db.query("cards").withIndex("by_notebook_due", (q) => q.eq("notebookId", notebookId)).collect()).length).toBeGreaterThan(0);
      });
      // In Ask Taku's notebook picker, marked Bought.
      expect(await buyer.as.query(api.chat.fromNotebooks.pickable, {})).toEqual(expect.arrayContaining([expect.objectContaining({ notebookId, kind: "bought" })]));
      expect((await buyer.as.query(api.market.purchases.mine, {}))[0]).toMatchObject({ title: "Form 4 Biology notes", kind: "buy", amountCents: 500, method: "ecocash", state: "active", notebookId, reference: expect.stringMatching(/^DEMO-/) });
      expect(await buyer.as.query(api.market.listings.page, { listingId })).toMatchObject({ access: { kind: "buy", endsAt: null }, notebookId, canReview: true });
      // A stranger cannot read the listing's pages.
      const stranger = await makeLearner(t, 30);
      const sourceId = nb.sources[0]._id;
      await expect(stranger.as.query(api.notebooks.sources.page, { sourceId, page: 1 })).rejects.toThrow();
      expect(await buyer.as.query(api.notebooks.sources.page, { sourceId, page: 1 })).toBeDefined();
    });
  });

  test("a rental reads until it ends, exactly, and can be renewed", async () => {
    const t = makeT();
    const o = await owner(t);
    await withEnv({ ADMIN_EMAILS: o.email }, async () => {
      const { listingId } = await liveListing(t, o);
      const teen = await makeLearner(t, 16, "Rufaro");
      await addConsent(t, teen);
      // Under 18s can buy and rent.
      const notebookId = await buy(teen, listingId, "rent", 7);
      const nb = await teen.as.query(api.notebooks.notebooks.get, { notebookId });
      expect(nb.bought).toMatchObject({ access: "rented" });
      expect(nb.bought!.endsAt! - Date.now()).toBeGreaterThan(7 * DAY - 60_000);
      await expect(teen.as.mutation(api.market.purchases.checkout, { listingId, kind: "rent", days: 7 })).rejects.toThrow(CHECKOUT_ERRORS.have);
      // The rental's end: reading stops at endsAt even before the scheduled step runs.
      const purchase = await t.run(async (ctx) => (await ctx.db.query("purchases").collect())[0]);
      await t.run(async (ctx) => await ctx.db.patch(purchase._id, { endsAt: Date.now() - 1 }));
      const ended = await teen.as.query(api.notebooks.notebooks.get, { notebookId });
      expect(ended.bought).toMatchObject({ access: "ended" });
      expect(ended.sources).toEqual([]);
      await t.mutation(internal.market.purchases.expire, { purchaseId: purchase._id });
      expect((await t.run(async (ctx) => await ctx.db.get(purchase._id)))!.status).toBe("ended");
      expect((await teen.as.query(api.market.purchases.mine, {}))[0].state).toBe("ended");
      // Renew: the same notebook reads again.
      expect(await buy(teen, listingId, "rent", 30)).toBe(notebookId);
      expect((await teen.as.query(api.notebooks.notebooks.get, { notebookId })).sources).toHaveLength(1);
    });
  });

  test("buyers review once; a report hides the listing from new buyers until the owner decides", async () => {
    const t = makeT();
    const o = await owner(t);
    await withEnv({ ADMIN_EMAILS: o.email }, async () => {
      const { listingId } = await liveListing(t, o);
      const buyer = await makeLearner(t, 21);
      const other = await makeLearner(t, 22);
      await expect(other.as.mutation(api.market.reports.review, { listingId, stars: 5, text: "Great" })).rejects.toThrow(/Only buyers/);
      const notebookId = await buy(buyer, listingId);
      await buyer.as.mutation(api.market.reports.review, { listingId, stars: 4, text: "Clear and short." });
      await expect(buyer.as.mutation(api.market.reports.review, { listingId, stars: 5, text: "Again" })).rejects.toThrow(/already/);
      expect(await other.as.query(api.market.listings.page, { listingId })).toMatchObject({ stars: 4, ratingCount: 1, reviews: [expect.objectContaining({ stars: 4, text: "Clear and short." })] });
      expect((await other.as.query(api.market.listings.browse, { minStars: 4 })).results).toHaveLength(1);

      await other.as.mutation(api.market.reports.report, { listingId, reason: "copyright", note: "Copied from my book." });
      // The reporter still sees the page, marked hidden, with no previews; nobody else new does.
      expect(await other.as.query(api.market.listings.page, { listingId })).toMatchObject({ hidden: true, forSale: false, previews: [] });
      const newcomer = await makeLearner(t, 26);
      await expect(newcomer.as.query(api.market.listings.page, { listingId })).rejects.toThrow(/not found/);
      expect((await other.as.query(api.market.listings.browse, { text: "biology" })).results).toEqual([]);
      await expect(other.as.mutation(api.market.purchases.checkout, { listingId, kind: "buy" })).rejects.toThrow(CHECKOUT_ERRORS.gone);
      // The buyer keeps reading while the owner decides.
      expect((await buyer.as.query(api.notebooks.notebooks.get, { notebookId })).sources).toHaveLength(1);
      expect(await o.as.query(api.market.reports.open, {})).toEqual([expect.objectContaining({ title: "Form 4 Biology notes", reports: [expect.objectContaining({ reason: "copyright", note: "Copied from my book." })] })]);
      await o.as.mutation(api.market.reports.decide, { listingId, decision: "restored" });
      expect((await other.as.query(api.market.listings.browse, { text: "biology" })).results).toHaveLength(1);
      await other.as.mutation(api.market.reports.report, { listingId, reason: "exam_paper", note: "" });
      await o.as.mutation(api.market.reports.decide, { listingId, decision: "removed" });
      // Removed: nobody reads it any more; the reports and decisions stay.
      expect((await buyer.as.query(api.notebooks.notebooks.get, { notebookId })).sources).toEqual([]);
      await t.run(async (ctx) => {
        expect((await ctx.db.query("reports").collect()).map((r) => r.decision)).toEqual(["restored", "removed"]);
      });
    });
  });
});

describe("money", () => {
  test("pending for 7 days then owed; the owner marks it paid, refunds within 7 days, and downloads the ledger", async () => {
    const t = makeT();
    const o = await owner(t);
    await withEnv({ ADMIN_EMAILS: o.email }, async () => {
      const { seller, listingId } = await liveListing(t, o);
      const buyer = await makeLearner(t, 21, "Kuda Banda");
      const second = await makeLearner(t, 23, "Nyasha");
      await buy(buyer, listingId);
      await buy(second, listingId, "rent", 7);
      expect(await seller.as.query(api.market.money.seller, {})).toMatchObject({ pendingCents: 480, owedCents: 0, paidCents: 0 });
      expect((await seller.as.query(api.market.money.seller, {}))!.sales).toHaveLength(2);

      // The rental is refunded: its access ends and the seller's pending share drops.
      const [rental] = await t.run(async (ctx) => (await ctx.db.query("purchases").collect()).filter((p) => p.kind === "rent"));
      expect((await o.as.query(api.market.money.refundable, {})).map((r) => r.purchaseId)).toContain(rental._id);
      await expect(seller.as.mutation(api.market.money.refund, { purchaseId: rental._id })).rejects.toThrow(/Only the owner/);
      await o.as.mutation(api.market.money.refund, { purchaseId: rental._id });
      expect(await seller.as.query(api.market.money.seller, {})).toMatchObject({ pendingCents: 400 });
      expect((await second.as.query(api.market.purchases.mine, {}))[0].state).toBe("refunded");

      // Eight days on: the sale is owed, and too old to refund.
      await t.run(async (ctx) => {
        for (const r of await ctx.db.query("ledger").collect()) await ctx.db.patch(r._id, { createdAt: r.createdAt - 8 * DAY });
        for (const p of await ctx.db.query("purchases").collect()) await ctx.db.patch(p._id, { createdAt: p.createdAt - 8 * DAY });
      });
      const [sale] = await t.run(async (ctx) => (await ctx.db.query("purchases").collect()).filter((p) => p.kind === "buy"));
      await expect(o.as.mutation(api.market.money.refund, { purchaseId: sale._id })).rejects.toThrow(MONEY_ERRORS.window);
      expect(await seller.as.query(api.market.money.seller, {})).toMatchObject({ pendingCents: 0, owedCents: 400 });
      const [row] = await o.as.query(api.market.money.owed, {});
      expect(row).toMatchObject({ name: "Chipo Dube", payoutNumber: "+263771234567", owedCents: 400 });
      await expect(o.as.mutation(api.market.money.markPaid, { sellerId: row.sellerId, amountCents: 500, paidOn: "2026-11-21", reference: "EC123" })).rejects.toThrow(MONEY_ERRORS.amount);
      await expect(o.as.mutation(api.market.money.markPaid, { sellerId: row.sellerId, amountCents: 400, paidOn: "21 Nov", reference: "EC123" })).rejects.toThrow(MONEY_ERRORS.date);
      await o.as.mutation(api.market.money.markPaid, { sellerId: row.sellerId, amountCents: 400, paidOn: "2026-11-21", reference: "EC123" });
      expect(await seller.as.query(api.market.money.seller, {})).toMatchObject({ owedCents: 0, paidCents: 400, payouts: [expect.objectContaining({ amountCents: 400, reference: "EC123" })] });

      const ledger = await o.as.query(api.market.money.ledger, {});
      expect(ledger.map((r) => [r.status, r.amountCents, r.sellerCents]).sort()).toEqual([["paid", 100, 80], ["paid", 500, 400], ["refund", -100, -80]].sort());
      expect(ledger.every((r) => r.provider === "demo" && r.listing === "Form 4 Biology notes" && r.seller === "Chipo Dube")).toBe(true);
    });
  });
});

describe("deleting accounts", () => {
  test("a buyer's ledger rows show a deleted account; a deleted seller's listing stops selling but buyers keep it", async () => {
    const t = makeT();
    const o = await owner(t);
    await withEnv({ ADMIN_EMAILS: o.email }, async () => {
      const { seller, listingId } = await liveListing(t, o);
      const buyer = await makeLearner(t, 21, "Kuda Banda");
      const keeper = await makeLearner(t, 24, "Tsitsi");
      await buy(buyer, listingId);
      const keeperNotebook = await buy(keeper, listingId);
      await buyer.as.mutation(api.market.reports.review, { listingId, stars: 5, text: "Good" });

      await buyer.as.mutation(api.accounts.deletion.deleteMyAccount, { confirmEmail: buyer.email });
      await settle(t);
      const rows = await o.as.query(api.market.money.ledger, {});
      expect(rows.map((r) => r.buyer).sort()).toEqual([DELETED_ACCOUNT, "Tsitsi"].sort());
      expect((await t.run(async (ctx) => await ctx.db.get(listingId)))!).toMatchObject({ ratingCount: 0, ratingSum: 0 });
      await t.run(async (ctx) => {
        expect(await ctx.db.query("reviews").collect()).toEqual([]);
      });

      await seller.as.mutation(api.accounts.deletion.deleteMyAccount, { confirmEmail: seller.email });
      await settle(t);
      const other = await makeLearner(t, 30);
      expect((await other.as.query(api.market.listings.browse, { text: "biology" })).results).toEqual([]);
      expect((await keeper.as.query(api.notebooks.notebooks.get, { notebookId: keeperNotebook })).sources).toHaveLength(1);
      // Money is still owed, so the owner page keeps the seller's payout details.
      expect((await o.as.query(api.market.money.owed, {}))[0]).toMatchObject({ name: "Chipo Dube", deleted: true });
    });
  });
});
