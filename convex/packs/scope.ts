import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { isAdult } from "../classes/access";

/**
 * What a learner's linked notebook reads from a course pack, or from a
 * marketplace listing they bought or rented (convex/market). Only the
 * published version counts: its sourceIds and outputIds, all in the pack's or
 * listing's own notebook, which no account owns. A source marked as pages
 * from a published book is never part of one, even if one slipped in.
 * Nothing is copied into the learner's notebook: it points at the pack or
 * listing. A listing reads only while the purchase or rental lasts.
 */

export type PublishedPack = Doc<"coursePacks"> & { notebookId: Id<"notebooks"> };
export type LiveListing = Doc<"listings"> & { notebookId: Id<"notebooks"> };

/** A pack or listing as a linked notebook reads it. */
type SharedBase = { notebookId: Id<"notebooks">; title: string; version: number; sourceIds: Id<"sources">[]; outputIds: Id<"outputs">[] };
export type Shared = SharedBase & ({ kind: "pack"; pack: PublishedPack } | { kind: "listing"; listing: LiveListing; purchase: Doc<"purchases"> });
export type PackSource = Doc<"sources"> & { fromPack: true };
export type PackScope = { pack: Shared; sources: PackSource[] } | null;

function isPublished(pack: Doc<"coursePacks"> | null): pack is PublishedPack {
  return pack !== null && pack.status === "published" && pack.notebookId !== undefined;
}

function isLive(listing: Doc<"listings"> | null): listing is LiveListing {
  return listing !== null && listing.status === "live" && listing.version > 0 && listing.notebookId !== undefined;
}

export async function publishedPack(ctx: QueryCtx, packId: Id<"coursePacks"> | undefined): Promise<PublishedPack | null> {
  if (packId === undefined) return null;
  const pack = await ctx.db.get(packId);
  return isPublished(pack) ? pack : null;
}

/** The purchase or rental that gives this account the listing now, if any. */
export async function activePurchase(ctx: QueryCtx, listingId: Id<"listings">, profileId: Id<"profiles">, now = Date.now()): Promise<Doc<"purchases"> | null> {
  const rows = await ctx.db.query("purchases").withIndex("by_listing_buyer", (q) => q.eq("listingId", listingId).eq("buyerProfileId", profileId)).order("desc").take(50);
  return rows.find((p) => p.status === "active" && (p.endsAt === undefined || p.endsAt > now)) ?? null;
}

/** A live listing this account may read now: bought, or rented and not yet ended, and not adults only for an under 18. */
export async function readableListing(ctx: QueryCtx, listingId: Id<"listings"> | undefined, profileId: Id<"profiles"> | undefined): Promise<{ listing: LiveListing; purchase: Doc<"purchases"> } | null> {
  if (listingId === undefined || profileId === undefined) return null;
  const listing = await ctx.db.get(listingId);
  if (!isLive(listing)) return null;
  const purchase = await activePurchase(ctx, listing._id, profileId);
  if (purchase === null) return null;
  if (listing.adultsOnly === true) {
    const profile = await ctx.db.get(profileId);
    if (profile === null || !isAdult(profile)) return null;
  }
  return { listing, purchase };
}

async function sharedFor(ctx: QueryCtx, notebook: Doc<"notebooks">): Promise<Shared | null> {
  const pack = await publishedPack(ctx, notebook.packId);
  if (pack !== null) return { kind: "pack", pack, notebookId: pack.notebookId, title: pack.title, version: pack.version, sourceIds: pack.sourceIds, outputIds: pack.outputIds };
  const found = await readableListing(ctx, notebook.listingId, notebook.profileId);
  if (found === null) return null;
  const { listing, purchase } = found;
  return { kind: "listing", listing, purchase, notebookId: listing.notebookId, title: listing.title, version: listing.version, sourceIds: listing.sourceIds, outputIds: listing.outputIds };
}

export async function packScope(ctx: QueryCtx, notebook: Doc<"notebooks">): Promise<PackScope> {
  const shared = await sharedFor(ctx, notebook);
  if (shared === null) return null;
  const sources: PackSource[] = [];
  for (const id of shared.sourceIds) {
    const s = await ctx.db.get(id);
    if (s === null || s.deletingAt !== undefined || s.thirdParty === true || s.notebookId !== shared.notebookId) continue;
    sources.push({ ...s, fromPack: true });
  }
  return { pack: shared, sources };
}

/** A learner's own sources plus, for a linked notebook, the pack's or listing's. */
export async function notebookSources(ctx: QueryCtx, notebook: Doc<"notebooks">): Promise<(Doc<"sources"> & { fromPack?: true })[]> {
  const own = (await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).collect()).filter((s) => s.deletingAt === undefined);
  const scope = await packScope(ctx, notebook);
  return scope === null ? own : [...scope.sources, ...own];
}

/** The learner's linked notebook for a pack, if they added it. */
export async function linkedNotebook(ctx: QueryCtx, packId: Id<"coursePacks">, profileId: Id<"profiles">): Promise<Doc<"notebooks"> | null> {
  const rows = await ctx.db.query("notebooks").withIndex("by_pack", (q) => q.eq("packId", packId).eq("profileId", profileId)).take(5);
  return rows.find((n) => n.deletingAt === undefined) ?? null;
}

/** The buyer's notebook for a listing, made at their first purchase. */
export async function listingNotebook(ctx: QueryCtx, listingId: Id<"listings">, profileId: Id<"profiles">): Promise<Doc<"notebooks"> | null> {
  const rows = await ctx.db.query("notebooks").withIndex("by_listing", (q) => q.eq("listingId", listingId).eq("profileId", profileId)).take(5);
  return rows.find((n) => n.deletingAt === undefined) ?? null;
}

/**
 * The learner's linked notebook that reads this pack or listing notebook's
 * item (a source or a tool), or null when they have no access to it.
 */
async function linkedFor(ctx: QueryCtx, sharedNotebookId: Id<"notebooks">, profileId: Id<"profiles">, holds: (s: { sourceIds: Id<"sources">[]; outputIds: Id<"outputs">[] }) => boolean): Promise<Doc<"notebooks"> | null> {
  for (const pack of await ctx.db.query("coursePacks").withIndex("by_notebook", (q) => q.eq("notebookId", sharedNotebookId)).take(20)) {
    if (!isPublished(pack) || !holds(pack)) continue;
    const linked = await linkedNotebook(ctx, pack._id, profileId);
    if (linked !== null) return linked;
  }
  for (const listing of await ctx.db.query("listings").withIndex("by_notebook", (q) => q.eq("notebookId", sharedNotebookId)).take(5)) {
    if (!isLive(listing) || !holds(listing)) continue;
    if ((await readableListing(ctx, listing._id, profileId)) === null) continue;
    const linked = await listingNotebook(ctx, listing._id, profileId);
    if (linked !== null) return linked;
  }
  return null;
}

export async function packSourceReadable(ctx: QueryCtx, source: Doc<"sources">, profileId: Id<"profiles">): Promise<boolean> {
  if (source.deletingAt !== undefined || source.thirdParty === true) return false;
  return (await linkedFor(ctx, source.notebookId, profileId, (p) => p.sourceIds.includes(source._id))) !== null;
}

/** The learner's linked notebook that reads this pack or listing tool, or null. */
export async function packOutputReadable(ctx: QueryCtx, output: Doc<"outputs">, profileId: Id<"profiles">): Promise<Doc<"notebooks"> | null> {
  return await linkedFor(ctx, output.notebookId, profileId, (p) => p.outputIds.includes(output._id));
}
