import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type QueryCtx } from "../_generated/server";
import { requireLearner } from "../lib/access";
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
      notebooks.map(async (n) => ({ ...n, sourceCount: (await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", n._id)).take(60)).filter((s) => s.deletingAt === undefined).length })),
    );
  },
});

export const create = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const { profile } = await requireLearner(ctx);
    const now = Date.now();
    return await ctx.db.insert("notebooks", { profileId: profile._id, title: cleanTitle(args.title), sourceMode: "mine_plus", createdAt: now, updatedAt: now });
  },
});

/** The notebook with its sources and chat, for the notebook screen. */
export const get = query({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, args) => {
    const { notebook } = await ownNotebook(ctx, args.notebookId);
    const sources = (await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).collect()).filter((s) => s.deletingAt === undefined);
    const messages = await ctx.db.query("messages").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).order("desc").take(100);
    // A Test me answer stays on the server: the learner sees the question and the mark only.
    return { notebook, sources, messages: messages.reverse().map((m) => (m.test === undefined ? m : { ...m, test: { ...m.test, answer: "", origin: undefined } })) };
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
    await ctx.db.patch(notebook._id, { deletingAt: Date.now() });
    await startPurge(ctx, { kind: "notebook", id: notebook._id });
  },
});
