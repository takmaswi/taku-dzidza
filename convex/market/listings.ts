import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type QueryCtx } from "../_generated/server";
import { isAdult } from "../classes/access";
import { isAdminUser } from "../lib/features";
import { MAX_NOTEBOOKS } from "../notebooks/notebooks";
import { activePurchase, listingNotebook } from "../packs/scope";
import { requireMarket, requireSeller } from "./access";
import { authorLabel, lowestPrice, MAX_PREVIEW_PAGES, MAX_PRICE_CENTS, priceOf, RENT_DAYS, type Prices } from "./rules";

/**
 * Listings (Step 9). A seller makes a draft from one of their own notebooks,
 * then sends it for approval (convex/market/publish.ts). Anyone in the
 * marketplace can find live listings; under 18s never see one marked adults
 * only. A reported listing is hidden from new buyers until the owner decides.
 */

const MAX_LISTINGS = 50;
const MAX_LIVE = 500;
const MAX_REVIEWS = 20;

export const detailsValidator = { title: v.string(), subject: v.string(), level: v.string(), exam: v.string(), description: v.string() };
export const pricesValidator = {
  previewCount: v.number(),
  buyCents: v.optional(v.number()),
  rentCents: v.optional(v.object({ d7: v.optional(v.number()), d30: v.optional(v.number()), d90: v.optional(v.number()) })),
};

export type Details = { title: string; subject: string; level: string; exam: string; description: string };

function clean(text: string, min: number, max: number, message: string): string {
  const out = text.trim().replace(/[ \t]+/g, " ");
  if (out.length < min || out.length > max) throw new ConvexError(message);
  return out;
}

export function cleanDetails(d: Details): Details {
  return {
    title: clean(d.title, 3, 80, "Give the listing a title."),
    subject: clean(d.subject, 2, 60, "Say which subject it covers."),
    level: clean(d.level, 1, 40, "Say which level it is for."),
    exam: clean(d.exam, 0, 60, "Keep the exam name short."),
    description: clean(d.description, 20, 1200, "Describe the notes in 20 to 1200 characters."),
  };
}

function cleanCents(n: number | undefined): number | undefined {
  if (n === undefined) return undefined;
  if (!Number.isInteger(n) || n < 0 || n > MAX_PRICE_CENTS) throw new ConvexError("Prices are from $0 to $500.");
  return n;
}

function cleanPrices(p: { previewCount: number; buyCents?: number; rentCents?: Prices["rentCents"] }): { previewCount: number; buyCents?: number; rentCents?: Prices["rentCents"] } {
  if (!Number.isInteger(p.previewCount) || p.previewCount < 0 || p.previewCount > MAX_PREVIEW_PAGES) throw new ConvexError("Show up to 3 preview pages.");
  const buyCents = cleanCents(p.buyCents);
  const rent = p.rentCents === undefined ? undefined : { d7: cleanCents(p.rentCents.d7), d30: cleanCents(p.rentCents.d30), d90: cleanCents(p.rentCents.d90) };
  const rentCents = rent === undefined || (rent.d7 === undefined && rent.d30 === undefined && rent.d90 === undefined) ? undefined : Object.fromEntries(Object.entries(rent).filter(([, c]) => c !== undefined));
  if (buyCents === undefined && rentCents === undefined) throw new ConvexError("Offer it to buy, to rent, or both.");
  return { previewCount: p.previewCount, ...(buyCents === undefined ? {} : { buyCents }), ...(rentCents === undefined ? {} : { rentCents }) };
}

/** A listing the signed in seller owns. */
export async function ownListing(ctx: QueryCtx, listingId: Id<"listings">): Promise<{ profile: Doc<"profiles">; seller: Doc<"sellers">; listing: Doc<"listings"> }> {
  const { profile, seller } = await requireSeller(ctx);
  const listing = await ctx.db.get(listingId);
  if (listing === null || listing.sellerId !== seller._id) throw new ConvexError("Listing not found.");
  return { profile, seller, listing };
}

/** A seller's notebooks that can become a listing: their own, not linked to a pack or listing, not already listed. */
async function sellable(ctx: QueryCtx, profile: Doc<"profiles">): Promise<{ _id: Id<"notebooks">; title: string }[]> {
  const out = [];
  for (const n of await ctx.db.query("notebooks").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).order("desc").take(MAX_NOTEBOOKS)) {
    if (n.deletingAt !== undefined || n.testReview === true || n.packId !== undefined || n.listingId !== undefined) continue;
    const listed = await ctx.db.query("listings").withIndex("by_master", (q) => q.eq("masterNotebookId", n._id)).first();
    if (listed !== null && listed.status !== "removed") continue;
    out.push({ _id: n._id, title: n.title });
  }
  return out;
}

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const { profile, seller } = await requireSeller(ctx);
    const rows = await ctx.db.query("listings").withIndex("by_seller", (q) => q.eq("sellerId", seller._id)).order("desc").take(MAX_LISTINGS);
    return {
      notebooks: await sellable(ctx, profile),
      listings: rows.map((l) => ({
        _id: l._id,
        title: l.title,
        subject: l.subject,
        level: l.level,
        exam: l.exam,
        description: l.description,
        previewCount: l.previewCount,
        buyCents: l.buyCents ?? null,
        rentCents: l.rentCents ?? null,
        status: l.status,
        version: l.version,
        waiting: l.pendingAt !== undefined,
        publishing: l.publishingSince !== undefined,
        hidden: l.hiddenAt !== undefined,
        closed: l.closedAt !== undefined,
        adultsOnly: l.adultsOnly === true,
        note: l.sellerNote ?? null,
        sales: l.sales,
      })),
    };
  },
});

export const create = mutation({
  args: { notebookId: v.id("notebooks"), ...detailsValidator, ...pricesValidator },
  handler: async (ctx, args): Promise<Id<"listings">> => {
    const { profile, seller } = await requireSeller(ctx);
    if (!(await sellable(ctx, profile)).some((n) => n._id === args.notebookId)) throw new ConvexError("Pick one of your own notebooks.");
    const count = (await ctx.db.query("listings").withIndex("by_seller", (q) => q.eq("sellerId", seller._id)).take(MAX_LISTINGS + 1)).length;
    if (count >= MAX_LISTINGS) throw new ConvexError(`You can have up to ${MAX_LISTINGS} listings.`);
    const details = cleanDetails(args);
    const prices = cleanPrices(args);
    return await ctx.db.insert("listings", {
      sellerId: seller._id,
      profileId: profile._id,
      ...details,
      ...prices,
      masterNotebookId: args.notebookId,
      status: "draft",
      version: 0,
      sourceIds: [],
      outputIds: [],
      sales: 0,
      ratingSum: 0,
      ratingCount: 0,
      createdAt: Date.now(),
    });
  },
});

/** Prices and preview pages change at once. The words change at once on a draft; on a live listing they wait for the next approved version. */
export const edit = mutation({
  args: { listingId: v.id("listings"), ...detailsValidator, ...pricesValidator },
  handler: async (ctx, args) => {
    const { listing } = await ownListing(ctx, args.listingId);
    if (listing.status === "removed") throw new ConvexError("This listing was taken down.");
    const prices = cleanPrices(args);
    const details = cleanDetails(args);
    await ctx.db.patch(listing._id, { ...prices, buyCents: prices.buyCents, rentCents: prices.rentCents, ...(listing.status === "draft" ? details : {}) });
    return null;
  },
});

/**
 * The seller stops selling, or starts again. Stopping means no new buyers;
 * people who bought keep it and rentals run to their end. A listing that was
 * never approved is simply dropped.
 */
export const setOpen = mutation({
  args: { listingId: v.id("listings"), open: v.boolean() },
  handler: async (ctx, args) => {
    const { listing } = await ownListing(ctx, args.listingId);
    if (listing.status === "removed") throw new ConvexError("This listing was taken down.");
    if (listing.version === 0) {
      if (!args.open) await ctx.db.patch(listing._id, { status: "removed", pendingAt: undefined, pending: undefined });
      return null;
    }
    await ctx.db.patch(listing._id, { closedAt: args.open ? undefined : Date.now() });
    return null;
  },
});

// ---------- Finding and reading about listings ----------

/** Whether this viewer may find and buy the listing now. */
export function forSale(listing: Doc<"listings">, viewer: Doc<"profiles">): boolean {
  if (listing.status !== "live" || listing.version === 0 || listing.hiddenAt !== undefined || listing.sellerGoneAt !== undefined || listing.closedAt !== undefined) return false;
  return !(listing.adultsOnly === true && !isAdult(viewer));
}

const EXAM_WORDS: Record<NonNullable<Doc<"profiles">["studyingFor"]>, RegExp | null> = {
  olevel: /\bo\s*level\b/i,
  alevel: /\ba\s*level\b/i,
  university: /\b(university|degree|diploma)\b/i,
  professional: /\b(acca|cima|cipm|icaz|professional)\b/i,
  learning: null,
};

function card(l: Doc<"listings">, author: string) {
  return {
    _id: l._id,
    title: l.title,
    subject: l.subject,
    level: l.level,
    exam: l.exam,
    author,
    sales: l.sales,
    stars: l.ratingCount === 0 ? null : Math.round((l.ratingSum / l.ratingCount) * 10) / 10,
    reviews: l.ratingCount,
    from: lowestPrice(l),
    buy: l.buyCents !== undefined,
    rent: l.rentCents !== undefined,
    liveAt: l.liveAt ?? l.createdAt,
  };
}

async function authorOf(ctx: QueryCtx, sellerId: Id<"sellers">): Promise<string> {
  return (await ctx.db.get(sellerId))?.realName ?? "";
}

/**
 * The marketplace: search by words (title, subject, exam, level), with
 * filters. With nothing typed or picked it returns the three sections.
 */
export const browse = query({
  args: {
    text: v.optional(v.string()),
    maxCents: v.optional(v.number()),
    offer: v.optional(v.union(v.literal("buy"), v.literal("rent"))),
    minStars: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { profile } = await requireMarket(ctx);
    const live = (await ctx.db.query("listings").withIndex("by_status", (q) => q.eq("status", "live")).order("desc").take(MAX_LIVE)).filter((l) => forSale(l, profile));
    const authors = new Map<string, string>();
    for (const l of live) if (!authors.has(l.sellerId)) authors.set(l.sellerId, await authorOf(ctx, l.sellerId));
    const cards = live.map((l) => card(l, authors.get(l.sellerId) ?? ""));
    const words = (args.text ?? "").trim().toLowerCase().split(/\s+/).filter((w) => w.length > 0);
    const filtering = words.length > 0 || args.maxCents !== undefined || args.offer !== undefined || args.minStars !== undefined;
    if (filtering) {
      const results = cards.filter((c) => {
        const hay = `${c.title} ${c.subject} ${c.exam} ${c.level}`.toLowerCase();
        if (!words.every((w) => hay.includes(w))) return false;
        if (args.maxCents !== undefined && (c.from === null || c.from > args.maxCents)) return false;
        if (args.offer === "buy" && !c.buy) return false;
        if (args.offer === "rent" && !c.rent) return false;
        if (args.minStars !== undefined && (c.stars === null || c.stars < args.minStars)) return false;
        return true;
      });
      return { results, popular: [], fresh: [], forExam: [] };
    }
    const examWords = profile.studyingFor === undefined ? null : EXAM_WORDS[profile.studyingFor];
    return {
      results: null,
      popular: [...cards].filter((c) => c.sales > 0).sort((a, b) => b.sales - a.sales).slice(0, 8),
      fresh: [...cards].sort((a, b) => b.liveAt - a.liveAt).slice(0, 8),
      forExam: examWords === null ? [] : cards.filter((c) => examWords.test(`${c.level} ${c.exam}`)).slice(0, 8),
    };
  },
});

/** The first previewCount pages of the live version, in source order. */
async function previews(ctx: QueryCtx, listing: Doc<"listings">): Promise<{ title: string; page: number; text: string }[]> {
  const out = [];
  for (const id of listing.sourceIds) {
    if (out.length >= listing.previewCount) break;
    const s = await ctx.db.get(id);
    if (s === null || s.deletingAt !== undefined) continue;
    for (const p of await ctx.db.query("pages").withIndex("by_source_page", (q) => q.eq("sourceId", s._id)).take(listing.previewCount - out.length)) out.push({ title: s.title, page: p.page, text: p.text });
  }
  return out;
}

/** The listing page: previews, author, sales, ratings and reviews, prices, and what this viewer has. */
export const page = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const { user, profile } = await requireMarket(ctx);
    const listing = await ctx.db.get(args.listingId);
    if (listing === null) throw new ConvexError("Listing not found.");
    const purchase = await activePurchase(ctx, listing._id, profile._id);
    const everBought = (await ctx.db.query("purchases").withIndex("by_listing_buyer", (q) => q.eq("listingId", listing._id).eq("buyerProfileId", profile._id)).first()) !== null;
    const isSeller = listing.profileId === profile._id;
    const isOwner = isAdminUser(user);
    const entitled = forSale(listing, profile) || everBought || isSeller || isOwner;
    // Someone who reported it still sees the page, saying it is hidden, but no previews or prices.
    const reporter = !entitled && listing.hiddenAt !== undefined && (await ctx.db.query("reports").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(200)).some((r) => r.listingId === listing._id);
    if (!entitled && !reporter) throw new ConvexError("Listing not found.");
    const author = await authorOf(ctx, listing.sellerId);
    const reviews = await ctx.db.query("reviews").withIndex("by_listing", (q) => q.eq("listingId", listing._id)).order("desc").take(MAX_REVIEWS);
    const mineReviewed = (await ctx.db.query("reviews").withIndex("by_profile", (q) => q.eq("profileId", profile._id).eq("listingId", listing._id)).first()) !== null;
    const reviewers = new Map<string, string>();
    for (const r of reviews) if (!reviewers.has(r.profileId)) reviewers.set(r.profileId, ((await ctx.db.get(r.profileId))?.displayName ?? "").split(" ")[0]);
    const tools = [];
    for (const id of listing.outputIds) {
      const o = await ctx.db.get(id);
      if (o !== null) tools.push({ mode: o.mode, kind: o.kind, title: o.title });
    }
    const notebook = await listingNotebook(ctx, listing._id, profile._id);
    return {
      _id: listing._id,
      title: listing.title,
      subject: listing.subject,
      level: listing.level,
      exam: listing.exam,
      description: listing.description,
      author,
      paperLabel: tools.some((t) => t.kind === "quiz") ? authorLabel(author) : null,
      tools,
      sales: listing.sales,
      stars: listing.ratingCount === 0 ? null : Math.round((listing.ratingSum / listing.ratingCount) * 10) / 10,
      ratingCount: listing.ratingCount,
      reviews: reviews.map((r) => ({ _id: r._id, stars: r.stars, text: r.text, by: reviewers.get(r.profileId) ?? "", createdAt: r.createdAt })),
      previews: entitled ? await previews(ctx, listing) : [],
      buyCents: priceOf(listing, "buy"),
      rent: RENT_DAYS.map((days) => ({ days, cents: priceOf(listing, "rent", days) })).filter((r): r is { days: (typeof RENT_DAYS)[number]; cents: number } => r.cents !== null),
      forSale: forSale(listing, profile),
      hidden: listing.hiddenAt !== undefined,
      adultsOnly: listing.adultsOnly === true,
      access: purchase === null ? null : { kind: purchase.kind, endsAt: purchase.endsAt ?? null },
      notebookId: notebook?._id ?? null,
      canReview: everBought && !mineReviewed && !isSeller,
      isSeller,
    };
  },
});
