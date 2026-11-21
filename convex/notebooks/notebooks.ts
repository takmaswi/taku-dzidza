import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type QueryCtx } from "../_generated/server";
import { requireLearner } from "../lib/access";
import { boughtInfo } from "../market/reader";
import { activePurchase, notebookSources, packScope } from "../packs/scope";
import { startPurge } from "../privacy/purge";
import { sourceModeValidator } from "../schema";

/** A learner's notebooks (SPEC.md 3.2). Every function checks the notebook belongs to the signed in learner. */

export const MAX_NOTEBOOKS = 200;

export async function ownNotebook(ctx: QueryCtx, notebookId: Id<"notebooks">): Promise<{ profile: Doc<"profiles">; notebook: Doc<"notebooks"> }> {
  const { profile } = await requireLearner(ctx);
  const notebook = await ctx.db.get(notebookId);
  if (notebook === null || notebook.profileId !== profile._id || notebook.deletingAt !== undefined) throw new ConvexError("Notebook not found.");
  return { profile, notebook };
}

function cleanTitle(raw: string): string {
  const title = raw.trim().replace(/\s+/g, " ").slice(0, 80);
  if (title.length === 0) throw new ConvexError("Give the notebook a name.");
  return title;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { profile } = await requireLearner(ctx);
    const notebooks = (await ctx.db.query("notebooks").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).order("desc").take(MAX_NOTEBOOKS)).filter((n) => n.deletingAt === undefined);
    return await Promise.all(
      notebooks.map(async (n) => ({
        ...n,
        sourceCount: n.packId === undefined && n.listingId === undefined ? (await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", n._id)).take(60)).filter((s) => s.deletingAt === undefined).length : (await notebookSources(ctx, n)).length,
        // A bought or rented listing: "Bought", "Rented until <date>", or ended.
        bought: n.listingId === undefined ? null : await accessOf(ctx, n.listingId, profile._id),
      })),
    );
  },
});

async function accessOf(ctx: QueryCtx, listingId: Id<"listings">, profileId: Id<"profiles">): Promise<{ kind: "buy" | "rent" | "ended"; endsAt: number | null }> {
  const p = await activePurchase(ctx, listingId, profileId);
  return p === null ? { kind: "ended", endsAt: null } : { kind: p.kind, endsAt: p.endsAt ?? null };
}

export const create = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const { profile } = await requireLearner(ctx);
    const now = Date.now();
    return await ctx.db.insert("notebooks", { profileId: profile._id, title: cleanTitle(args.title), sourceMode: "mine_plus", createdAt: now, updatedAt: now });
  },
});

/** The notebook with its sources and chat, for the notebook screen. A course pack's sources come first, marked fromPack. */
export const get = query({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, args) => {
    const { notebook } = await ownNotebook(ctx, args.notebookId);
    const sources = await notebookSources(ctx, notebook);
    const scope = await packScope(ctx, notebook);
    const shared = scope?.pack ?? null;
    const org = shared?.kind === "pack" ? await ctx.db.get(shared.pack.organisationId) : null;
    const pack = shared?.kind === "pack" ? { title: shared.title, organisation: org?.name ?? "", version: shared.version, stale: notebook.packVersion !== shared.version } : null;
    // A bought or rented listing (convex/market/reader.ts): how long it lasts, and what the reader marks every page with.
    const bought = notebook.listingId === undefined ? null : await boughtInfo(ctx, notebook, shared?.kind === "listing" ? shared : null);
    const messages = await ctx.db.query("messages").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).order("desc").take(100);
    // A Test me answer stays on the server: the learner sees the question and the mark only.
    return { notebook, sources, pack, bought, messages: messages.reverse().map((m) => (m.test === undefined ? m : { ...m, test: { ...m.test, answer: "", origin: undefined } })) };
  },
});

export const rename = mutation({
  args: { notebookId: v.id("notebooks"), title: v.string() },
  handler: async (ctx, args) => {
    const { notebook } = await ownNotebook(ctx, args.notebookId);
    await ctx.db.patch(notebook._id, { title: cleanTitle(args.title), updatedAt: Date.now() });
  },
});

export const setSourceMode = mutation({
  args: { notebookId: v.id("notebooks"), sourceMode: sourceModeValidator },
  handler: async (ctx, args) => {
    const { notebook } = await ownNotebook(ctx, args.notebookId);
    await ctx.db.patch(notebook._id, { sourceMode: args.sourceMode });
  },
});

/** Messages cleared per call; the app calls again while more is true. */
const CLEAR_BATCH = 200;

export const clearChat = mutation({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, args): Promise<{ more: boolean }> => {
    const { notebook } = await ownNotebook(ctx, args.notebookId);
    const rows = await ctx.db.query("messages").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).take(CLEAR_BATCH);
    for (const m of rows) await ctx.db.delete(m._id);
    return { more: rows.length === CLEAR_BATCH };
  },
});

/** Hidden at once, then emptied in batches (convex/privacy/purge.ts). */
export const remove = mutation({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, args) => {
    const { notebook } = await ownNotebook(ctx, args.notebookId);
    // Learners read a course pack from its notebook, so that notebook stays while the pack does.
    if ((await ctx.db.query("coursePacks").withIndex("by_master", (q) => q.eq("masterNotebookId", notebook._id)).first()) !== null) throw new ConvexError("This notebook is a course pack. It stays while the pack does.");
    const listing = await ctx.db.query("listings").withIndex("by_master", (q) => q.eq("masterNotebookId", notebook._id)).first();
    if (listing !== null && listing.status !== "removed") throw new ConvexError("This notebook is in the marketplace. Take the listing down first.");
    await ctx.db.patch(notebook._id, { deletingAt: Date.now() });
    await startPurge(ctx, { kind: "notebook", id: notebook._id });
  },
});
