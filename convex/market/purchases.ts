import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "../_generated/server";
import { MAX_NOTEBOOKS } from "../notebooks/notebooks";
import { syncCards } from "../packs/packs";
import { activePurchase, listingNotebook } from "../packs/scope";
import { requireMarket } from "./access";
import { forSale } from "./listings";
import { isPayMethod, paymentProvider } from "./payments";
import { aiMode } from "../lib/env";
import { DAY_MS, isRentDays, priceOf, split } from "./rules";

/**
 * Buying and renting (Step 9). A checkout records the choice; the payment
 * provider (only the demo for now) says yes or no. A paid checkout becomes a
 * purchase, a ledger row and, the first time, the buyer's own notebook linked
 * to the listing, which reads the listing like a course pack. A rental ends
 * exactly at endsAt: reading checks the time, and a scheduled step marks it
 * ended so open pages update at that moment.
 */

const MAX_PURCHASES = 200;

export const CHECKOUT_ERRORS = {
  gone: "This listing is not for sale right now.",
  own: "This is your own listing.",
  option: "Pick one of the prices on offer.",
  have: "You have this already.",
} as const;

export const checkout = mutation({
  args: { listingId: v.id("listings"), kind: v.union(v.literal("buy"), v.literal("rent")), days: v.optional(v.number()) },
  handler: async (ctx, args): Promise<Id<"checkouts">> => {
    const { profile } = await requireMarket(ctx);
    const listing = await ctx.db.get(args.listingId);
    if (listing === null || !forSale(listing, profile)) throw new ConvexError(CHECKOUT_ERRORS.gone);
    if (listing.profileId === profile._id) throw new ConvexError(CHECKOUT_ERRORS.own);
    if (args.kind === "rent" && (args.days === undefined || !isRentDays(args.days))) throw new ConvexError(CHECKOUT_ERRORS.option);
    const amountCents = priceOf(listing, args.kind, args.days);
    if (amountCents === null) throw new ConvexError(CHECKOUT_ERRORS.option);
    const active = await activePurchase(ctx, listing._id, profile._id);
    if (active !== null && (active.kind === "buy" || args.kind === "rent")) throw new ConvexError(CHECKOUT_ERRORS.have);
    return await ctx.db.insert("checkouts", { listingId: listing._id, buyerProfileId: profile._id, kind: args.kind, ...(args.kind === "rent" ? { days: args.days } : {}), amountCents, provider: paymentProvider().name, status: "open", createdAt: Date.now() });
  },
});

export const checkoutInfo = query({
  args: { checkoutId: v.id("checkouts") },
  handler: async (ctx, args) => {
    const { profile } = await requireMarket(ctx);
    const c = await ctx.db.get(args.checkoutId);
    if (c === null || c.buyerProfileId !== profile._id) throw new ConvexError("Checkout not found.");
    const listing = await ctx.db.get(c.listingId);
    return { _id: c._id, listingId: c.listingId, title: listing?.title ?? "", kind: c.kind, days: c.days ?? null, amountCents: c.amountCents, provider: c.provider, demo: c.provider === "demo", methods: paymentProvider().methods, status: c.status };
  },
});

/** The buyer's notebook for the listing, made at the first purchase. */
async function ensureNotebook(ctx: MutationCtx, listing: Doc<"listings">, profile: Doc<"profiles">): Promise<Id<"notebooks">> {
  const existing = await listingNotebook(ctx, listing._id, profile._id);
  if (existing !== null) return existing._id;
  const count = (await ctx.db.query("notebooks").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(MAX_NOTEBOOKS + 1)).length;
  if (count >= MAX_NOTEBOOKS) throw new ConvexError(`You can have up to ${MAX_NOTEBOOKS} notebooks.`);
  const now = Date.now();
  return await ctx.db.insert("notebooks", { profileId: profile._id, title: listing.title, sourceMode: "mine_plus", createdAt: now, updatedAt: now, listingId: listing._id });
}

/** A paid checkout becomes a purchase, a ledger row and access. */
async function complete(ctx: MutationCtx, c: Doc<"checkouts">, profile: Doc<"profiles">, method: string, reference: string): Promise<Id<"notebooks">> {
  const listing = await ctx.db.get(c.listingId);
  if (listing === null || listing.notebookId === undefined) throw new ConvexError(CHECKOUT_ERRORS.gone);
  const now = Date.now();
  const endsAt = c.kind === "rent" && c.days !== undefined ? now + c.days * DAY_MS : undefined;
  const purchaseId = await ctx.db.insert("purchases", {
    listingId: listing._id,
    buyerProfileId: profile._id,
    kind: c.kind,
    ...(c.days === undefined ? {} : { days: c.days }),
    amountCents: c.amountCents,
    provider: c.provider,
    method,
    reference,
    startsAt: now,
    ...(endsAt === undefined ? {} : { endsAt }),
    status: "active",
    createdAt: now,
  });
  const { commissionCents, sellerCents } = split(c.amountCents);
  await ctx.db.insert("ledger", { purchaseId, listingId: listing._id, sellerId: listing.sellerId, buyerProfileId: profile._id, amountCents: c.amountCents, commissionCents, sellerCents, provider: c.provider, status: "paid", createdAt: now });
  await ctx.db.patch(listing._id, { sales: listing.sales + 1 });
  await ctx.db.patch(c._id, { status: "paid" });
  if (endsAt !== undefined) await ctx.scheduler.runAt(endsAt, internal.market.purchases.expire, { purchaseId });
  const notebookId = await ensureNotebook(ctx, listing, profile);
  const notebook = await ctx.db.get(notebookId);
  if (notebook !== null && listing.notebookId !== undefined) await syncCards(ctx, notebook, { notebookId: listing.notebookId, outputIds: listing.outputIds, version: listing.version });
  return notebookId;
}

export type PayResult = { ok: true; notebookId: Id<"notebooks"> } | { ok: false; message: string };

/**
 * The demo checkout's buttons: pay (succeed true) or see a failed payment
 * (succeed false). A free listing needs no payment and completes at once.
 */
export const pay = mutation({
  args: { checkoutId: v.id("checkouts"), method: v.string(), succeed: v.boolean() },
  handler: async (ctx, args): Promise<PayResult> => {
    const { profile } = await requireMarket(ctx);
    const c = await ctx.db.get(args.checkoutId);
    if (c === null || c.buyerProfileId !== profile._id) throw new ConvexError("Checkout not found.");
    if (c.status !== "open") throw new ConvexError("This checkout is finished. Start again from the listing.");
    const listing = await ctx.db.get(c.listingId);
    if (listing === null || !forSale(listing, profile)) throw new ConvexError(CHECKOUT_ERRORS.gone);
    if (c.amountCents === 0) return { ok: true, notebookId: await complete(ctx, c, profile, "free", "FREE") };
    if (!isPayMethod(args.method)) throw new ConvexError("Pick how to pay.");
    const provider = paymentProvider();
    if (provider.name !== c.provider) throw new ConvexError("This checkout is finished. Start again from the listing.");
    const settled = provider.settle({ checkoutId: c._id, amountCents: c.amountCents, method: args.method, succeed: args.succeed });
    if (!settled.ok) {
      await ctx.db.patch(c._id, { status: "failed" });
      return { ok: false, message: settled.reason };
    }
    return { ok: true, notebookId: await complete(ctx, c, profile, args.method, settled.reference) };
  },
});

/** The buyer's notebook for a listing they have now, made again if they deleted it. */
export const openNotebook = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args): Promise<Id<"notebooks">> => {
    const { profile } = await requireMarket(ctx);
    const listing = await ctx.db.get(args.listingId);
    if (listing === null || listing.notebookId === undefined || (await activePurchase(ctx, listing._id, profile._id)) === null) throw new ConvexError("Listing not found.");
    const notebookId = await ensureNotebook(ctx, listing, profile);
    const notebook = await ctx.db.get(notebookId);
    if (notebook !== null && notebook.packVersion !== listing.version) await syncCards(ctx, notebook, { notebookId: listing.notebookId, outputIds: listing.outputIds, version: listing.version });
    return notebookId;
  },
});

/** Runs at the moment a rental ends. Reading already stops at endsAt; this marks it so open pages update. */
export const expire = internalMutation({
  args: { purchaseId: v.id("purchases") },
  handler: async (ctx, args) => {
    const p = await ctx.db.get(args.purchaseId);
    if (p === null || p.status !== "active" || p.endsAt === undefined) return null;
    if (p.endsAt > Date.now()) {
      await ctx.scheduler.runAt(p.endsAt, internal.market.purchases.expire, { purchaseId: p._id });
      return null;
    }
    await ctx.db.patch(p._id, { status: "ended" });
    return null;
  },
});

/** Settings > Money: what this account bought and rented, with receipts. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const { profile } = await requireMarket(ctx);
    const rows = await ctx.db.query("purchases").withIndex("by_buyer", (q) => q.eq("buyerProfileId", profile._id)).order("desc").take(MAX_PURCHASES);
    const now = Date.now();
    const out = [];
    for (const p of rows) {
      const listing = await ctx.db.get(p.listingId);
      const notebook = await listingNotebook(ctx, p.listingId, profile._id);
      const state = p.status === "refunded" ? "refunded" : p.status === "ended" || (p.endsAt !== undefined && p.endsAt <= now) ? "ended" : "active";
      out.push({ _id: p._id, listingId: p.listingId, title: listing?.title ?? "", kind: p.kind, days: p.days ?? null, amountCents: p.amountCents, method: p.method, reference: p.reference, provider: p.provider, createdAt: p.createdAt, endsAt: p.endsAt ?? null, state, notebookId: notebook?._id ?? null });
    }
    return out;
  },
});

/**
 * Tests only (mock mode, like the mock outbox): brings the newest rental of a
 * listing to an end `seconds` from now, so a journey can watch access stop.
 */
export const endRentalSoon = internalMutation({
  args: { listingTitle: v.string(), seconds: v.number() },
  handler: async (ctx, args) => {
    if (aiMode() !== "mock") throw new ConvexError("Only in mock mode.");
    const listing = (await ctx.db.query("listings").withIndex("by_status", (q) => q.eq("status", "live")).take(500)).filter((l) => l.title === args.listingTitle).sort((a, b) => (b.liveAt ?? 0) - (a.liveAt ?? 0))[0];
    if (listing === undefined) throw new ConvexError("Listing not found.");
    const rental = (await ctx.db.query("purchases").withIndex("by_listing_buyer", (q) => q.eq("listingId", listing._id)).take(500)).filter((p) => p.kind === "rent" && p.status === "active").sort((a, b) => b.createdAt - a.createdAt)[0];
    if (rental === undefined) throw new ConvexError("No rental to end.");
    const endsAt = Date.now() + args.seconds * 1000;
    await ctx.db.patch(rental._id, { endsAt });
    await ctx.scheduler.runAt(endsAt, internal.market.purchases.expire, { purchaseId: rental._id });
    return null;
  },
});
