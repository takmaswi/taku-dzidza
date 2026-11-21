import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, mutation, query, type QueryCtx } from "../_generated/server";
import { aiMode } from "../lib/env";
import { isAdminUser } from "../lib/features";
import { requireMarket, requireMarketOwner, sellerOf } from "./access";
import { DAY_MS, REFUND_DAYS } from "./rules";

/**
 * Money (Step 9). Every sale or rental wrote a ledger row; a refund writes a
 * reversing row. A seller's share is pending for REFUND_DAYS (the owner may
 * refund it), then owed. The owner pays sellers by hand and records it here;
 * nothing is paid out automatically.
 */

const MAX_ROWS = 5000;
const MAX_SELLERS = 1000;
export const DELETED_ACCOUNT = "deleted account";
export const DELETED_SELLER = "Deleted seller";

type Balance = { pendingCents: number; owedCents: number; paidCents: number };

async function balanceOf(ctx: QueryCtx, sellerId: Id<"sellers">, now: number): Promise<Balance & { rows: Doc<"ledger">[] }> {
  const rows = await ctx.db.query("ledger").withIndex("by_seller", (q) => q.eq("sellerId", sellerId)).order("desc").take(MAX_ROWS);
  let pendingCents = 0;
  let cleared = 0;
  // A refund counts from its sale's time, so a refunded sale never shows as owed meanwhile.
  const saleAt = new Map(rows.filter((r) => r.status === "paid").map((r) => [r.purchaseId as string, r.createdAt]));
  for (const r of rows) {
    const at = r.status === "refund" ? (saleAt.get(r.purchaseId) ?? r.createdAt) : r.createdAt;
    if (at > now - REFUND_DAYS * DAY_MS) pendingCents += r.sellerCents;
    else cleared += r.sellerCents;
  }
  const paidCents = (await ctx.db.query("payouts").withIndex("by_seller", (q) => q.eq("sellerId", sellerId)).take(MAX_ROWS)).reduce((n, p) => n + p.amountCents, 0);
  return { pendingCents, owedCents: cleared - paidCents, paidCents, rows };
}

async function titleOf(ctx: QueryCtx, listingId: Id<"listings">, cache: Map<string, string>): Promise<string> {
  const hit = cache.get(listingId);
  if (hit !== undefined) return hit;
  const title = (await ctx.db.get(listingId))?.title ?? "";
  cache.set(listingId, title);
  return title;
}

/** Settings > Money for a seller: what is owed, pending and paid, and every sale and rental. */
export const seller = query({
  args: {},
  handler: async (ctx) => {
    const { profile } = await requireMarket(ctx);
    const s = await sellerOf(ctx, profile);
    if (s === null) return null;
    const now = Date.now();
    const { rows, ...balance } = await balanceOf(ctx, s._id, now);
    const titles = new Map<string, string>();
    const sales = [];
    for (const r of rows.slice(0, 200)) {
      const purchase = await ctx.db.get(r.purchaseId);
      sales.push({ _id: r._id, title: await titleOf(ctx, r.listingId, titles), kind: purchase?.kind ?? "buy", days: purchase?.days ?? null, amountCents: r.amountCents, sellerCents: r.sellerCents, status: r.status, createdAt: r.createdAt, pending: r.createdAt > now - REFUND_DAYS * DAY_MS });
    }
    const payouts = (await ctx.db.query("payouts").withIndex("by_seller", (q) => q.eq("sellerId", s._id)).order("desc").take(50)).map((p) => ({ _id: p._id, amountCents: p.amountCents, paidOn: p.paidOn, reference: p.reference }));
    return { ...balance, sales, payouts };
  },
});

// ---------- The owner's money page ----------

/** Whether to show the owner's marketplace page and link. */
export const isOwner = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireMarket(ctx);
    return isAdminUser(user);
  },
});

/** Amounts owed per seller, with what is still pending. */
export const owed = query({
  args: {},
  handler: async (ctx) => {
    await requireMarketOwner(ctx);
    const now = Date.now();
    const out = [];
    for (const s of await ctx.db.query("sellers").take(MAX_SELLERS)) {
      const { rows, ...b } = await balanceOf(ctx, s._id, now);
      if (rows.length === 0 && b.paidCents === 0) continue;
      out.push({ sellerId: s._id, name: s.realName, payoutNumber: s.payoutNumber, deleted: s.deletedAt !== undefined, ...b });
    }
    return out.sort((a, b) => b.owedCents - a.owedCents);
  },
});

/** Sales and rentals the owner can still refund (within REFUND_DAYS). */
export const refundable = query({
  args: {},
  handler: async (ctx) => {
    await requireMarketOwner(ctx);
    const since = Date.now() - REFUND_DAYS * DAY_MS;
    const titles = new Map<string, string>();
    const out = [];
    for (const r of await ctx.db.query("ledger").withIndex("by_created", (q) => q.gt("createdAt", since)).order("desc").take(500)) {
      if (r.status !== "paid" || r.amountCents === 0) continue;
      const p = await ctx.db.get(r.purchaseId);
      if (p === null || p.status === "refunded") continue;
      out.push({ purchaseId: p._id, title: await titleOf(ctx, r.listingId, titles), buyer: p.buyerProfileId === undefined ? DELETED_ACCOUNT : ((await ctx.db.get(p.buyerProfileId))?.displayName ?? DELETED_ACCOUNT), amountCents: r.amountCents, kind: p.kind, reference: p.reference, createdAt: p.createdAt });
    }
    return out;
  },
});

/** The full ledger, for the CSV the owner downloads. */
export const ledger = query({
  args: {},
  handler: async (ctx) => {
    await requireMarketOwner(ctx);
    const titles = new Map<string, string>();
    const names = new Map<string, string>();
    const out = [];
    for (const r of await ctx.db.query("ledger").withIndex("by_created").order("desc").take(MAX_ROWS)) {
      let buyer = DELETED_ACCOUNT;
      if (r.buyerProfileId !== undefined) {
        buyer = names.get(r.buyerProfileId) ?? ((await ctx.db.get(r.buyerProfileId))?.displayName ?? DELETED_ACCOUNT);
        names.set(r.buyerProfileId, buyer);
      }
      const seller = await ctx.db.get(r.sellerId);
      out.push({ date: new Date(r.createdAt).toISOString(), buyer, listing: await titleOf(ctx, r.listingId, titles), seller: seller?.realName ?? DELETED_SELLER, amountCents: r.amountCents, commissionCents: r.commissionCents, sellerCents: r.sellerCents, provider: r.provider, status: r.status });
    }
    return out;
  },
});

export const MONEY_ERRORS = {
  amount: "Enter an amount above $0, no more than what is owed.",
  date: "Enter the date you paid, like 2026-11-21.",
  reference: "Enter the payment reference.",
  window: `Refunds are possible for ${REFUND_DAYS} days after a sale.`,
} as const;

/** The owner records a payment made to a seller by hand. */
export const markPaid = mutation({
  args: { sellerId: v.id("sellers"), amountCents: v.number(), paidOn: v.string(), reference: v.string() },
  handler: async (ctx, args) => {
    await requireMarketOwner(ctx);
    const s = await ctx.db.get(args.sellerId);
    if (s === null) throw new ConvexError("Seller not found.");
    const b = await balanceOf(ctx, s._id, Date.now());
    if (!Number.isInteger(args.amountCents) || args.amountCents <= 0 || args.amountCents > b.owedCents) throw new ConvexError(MONEY_ERRORS.amount);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.paidOn) || Number.isNaN(Date.parse(args.paidOn))) throw new ConvexError(MONEY_ERRORS.date);
    const reference = args.reference.trim().slice(0, 80);
    if (reference.length < 2) throw new ConvexError(MONEY_ERRORS.reference);
    await ctx.db.insert("payouts", { sellerId: s._id, amountCents: args.amountCents, paidOn: args.paidOn, reference, createdAt: Date.now() });
    // A deleted seller's payout details are kept only while money is owed to them.
    if (s.deletedAt !== undefined && b.owedCents - args.amountCents === 0 && b.pendingCents === 0) await ctx.db.patch(s._id, { realName: DELETED_SELLER, payoutNumber: "" });
    return null;
  },
});

/** The owner refunds a sale or rental within REFUND_DAYS. Access ends, and the seller's pending share drops. */
export const refund = mutation({
  args: { purchaseId: v.id("purchases") },
  handler: async (ctx, args) => {
    await requireMarketOwner(ctx);
    const p = await ctx.db.get(args.purchaseId);
    if (p === null) throw new ConvexError("Purchase not found.");
    if (p.status === "refunded") throw new ConvexError("This was refunded already.");
    const now = Date.now();
    if (p.createdAt < now - REFUND_DAYS * DAY_MS) throw new ConvexError(MONEY_ERRORS.window);
    const paid = await ctx.db.query("ledger").withIndex("by_purchase", (q) => q.eq("purchaseId", p._id)).first();
    if (paid === null) throw new ConvexError("Purchase not found.");
    await ctx.db.insert("ledger", { purchaseId: p._id, listingId: paid.listingId, sellerId: paid.sellerId, ...(p.buyerProfileId === undefined ? {} : { buyerProfileId: p.buyerProfileId }), amountCents: -paid.amountCents, commissionCents: -paid.commissionCents, sellerCents: -paid.sellerCents, provider: paid.provider, status: "refund", createdAt: now });
    await ctx.db.patch(p._id, { status: "refunded", refundedAt: now });
    const listing = await ctx.db.get(p.listingId);
    if (listing !== null) await ctx.db.patch(listing._id, { sales: Math.max(0, listing.sales - 1) });
    return null;
  },
});

/**
 * Tests only (mock mode, like the mock outbox): moves a listing's sales back
 * `days`, so a journey can see pending money become owed.
 */
export const ageSalesForTest = internalMutation({
  args: { listingTitle: v.string(), days: v.number() },
  handler: async (ctx, args) => {
    if (aiMode() !== "mock") throw new ConvexError("Only in mock mode.");
    for (const l of (await ctx.db.query("listings").withIndex("by_status", (q) => q.eq("status", "live")).take(500)).filter((x) => x.title === args.listingTitle)) {
      for (const r of await ctx.db.query("ledger").withIndex("by_created").take(MAX_ROWS)) {
        if (r.listingId === l._id) await ctx.db.patch(r._id, { createdAt: r.createdAt - args.days * DAY_MS });
      }
    }
    return null;
  },
});
