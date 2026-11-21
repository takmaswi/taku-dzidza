import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireMarket, requireMarketOwner } from "./access";

/**
 * Reports and reviews (Step 9). Anyone in the marketplace can report a
 * listing: it is hidden from new buyers at once, until the owner decides.
 * The owner restores it, or removes it, which ends reading for everyone.
 * Reports and decisions are kept. Reviews: buyers only, one each.
 */

export const reasonValidator = v.union(v.literal("copyright"), v.literal("exam_paper"), v.literal("wrong"), v.literal("harmful"));

export const report = mutation({
  args: { listingId: v.id("listings"), reason: reasonValidator, note: v.string() },
  handler: async (ctx, args) => {
    const { profile } = await requireMarket(ctx);
    const listing = await ctx.db.get(args.listingId);
    if (listing === null || listing.status !== "live") throw new ConvexError("Listing not found.");
    const mine = await ctx.db.query("reports").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(200);
    if (mine.some((r) => r.listingId === listing._id && r.decidedAt === undefined)) return null;
    const now = Date.now();
    await ctx.db.insert("reports", { listingId: listing._id, profileId: profile._id, reason: args.reason, note: args.note.trim().slice(0, 600), createdAt: now });
    if (listing.hiddenAt === undefined) await ctx.db.patch(listing._id, { hiddenAt: now });
    return null;
  },
});

/** The owner's open reports, newest first, grouped by listing. */
export const open = query({
  args: {},
  handler: async (ctx) => {
    await requireMarketOwner(ctx);
    const rows = await ctx.db.query("reports").withIndex("by_decided", (q) => q.eq("decidedAt", undefined)).order("desc").take(200);
    const byListing = new Map<string, { listingId: (typeof rows)[number]["listingId"]; title: string; seller: string; reports: { reason: string; note: string; createdAt: number }[] }>();
    for (const r of rows) {
      let entry = byListing.get(r.listingId);
      if (entry === undefined) {
        const listing = await ctx.db.get(r.listingId);
        const seller = listing === null ? null : await ctx.db.get(listing.sellerId);
        entry = { listingId: r.listingId, title: listing?.title ?? "", seller: seller?.realName ?? "", reports: [] };
        byListing.set(r.listingId, entry);
      }
      entry.reports.push({ reason: r.reason, note: r.note, createdAt: r.createdAt });
    }
    return [...byListing.values()];
  },
});

export const decide = mutation({
  args: { listingId: v.id("listings"), decision: v.union(v.literal("restored"), v.literal("removed")) },
  handler: async (ctx, args) => {
    await requireMarketOwner(ctx);
    const listing = await ctx.db.get(args.listingId);
    if (listing === null) throw new ConvexError("Listing not found.");
    const now = Date.now();
    for (const r of await ctx.db.query("reports").withIndex("by_listing", (q) => q.eq("listingId", listing._id)).take(500)) {
      if (r.decidedAt === undefined) await ctx.db.patch(r._id, { decidedAt: now, decision: args.decision });
    }
    if (args.decision === "restored") await ctx.db.patch(listing._id, { hiddenAt: undefined });
    else await ctx.db.patch(listing._id, { status: "removed", hiddenAt: undefined, pending: undefined, pendingAt: undefined, sellerNote: "Taken down after a report." });
    return null;
  },
});

export const review = mutation({
  args: { listingId: v.id("listings"), stars: v.number(), text: v.string() },
  handler: async (ctx, args) => {
    const { profile } = await requireMarket(ctx);
    const listing = await ctx.db.get(args.listingId);
    if (listing === null) throw new ConvexError("Listing not found.");
    const bought = (await ctx.db.query("purchases").withIndex("by_listing_buyer", (q) => q.eq("listingId", listing._id).eq("buyerProfileId", profile._id)).take(20)).some((p) => p.status !== "refunded");
    if (!bought) throw new ConvexError("Only buyers can review.");
    if ((await ctx.db.query("reviews").withIndex("by_profile", (q) => q.eq("profileId", profile._id).eq("listingId", listing._id)).first()) !== null) throw new ConvexError("You reviewed this already.");
    if (!Number.isInteger(args.stars) || args.stars < 1 || args.stars > 5) throw new ConvexError("Pick 1 to 5 stars.");
    const text = args.text.trim().replace(/\s+/g, " ");
    if (text.length > 300) throw new ConvexError("Keep the review under 300 characters.");
    await ctx.db.insert("reviews", { listingId: listing._id, profileId: profile._id, stars: args.stars, text, createdAt: Date.now() });
    await ctx.db.patch(listing._id, { ratingSum: listing.ratingSum + args.stars, ratingCount: listing.ratingCount + 1 });
    return null;
  },
});
