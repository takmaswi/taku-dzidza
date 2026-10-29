import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { requireLearner } from "../lib/access";
import { sourceModeValidator } from "../schema";

/** A learner's notebooks (SPEC.md 3.2). Every function checks the notebook belongs to the signed in learner. */

export const MAX_NOTEBOOKS = 200;

export async function ownNotebook(ctx: QueryCtx, notebookId: Id<"notebooks">): Promise<{ profile: Doc<"profiles">; notebook: Doc<"notebooks"> }> {
  const { profile } = await requireLearner(ctx);
  const notebook = await ctx.db.get(notebookId);
  if (notebook === null || notebook.profileId !== profile._id) throw new ConvexError("Notebook not found.");
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
    const notebooks = await ctx.db.query("notebooks").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).order("desc").take(MAX_NOTEBOOKS);
    return await Promise.all(
      notebooks.map(async (n) => ({ ...n, sourceCount: (await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", n._id)).take(60)).length })),
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
    const sources = await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).collect();
    const messages = await ctx.db.query("messages").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).order("desc").take(100);
    return { notebook, sources, messages: messages.reverse() };
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

export const clearChat = mutation({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, args) => {
    const { notebook } = await ownNotebook(ctx, args.notebookId);
    for (const m of await ctx.db.query("messages").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).collect()) await ctx.db.delete(m._id);
  },
});

/** Deletes a source with its pages, chunks and file. */
export async function deleteSourceData(ctx: MutationCtx, source: Doc<"sources">): Promise<void> {
  for (const row of await ctx.db.query("chunks").withIndex("by_source", (q) => q.eq("sourceId", source._id)).collect()) await ctx.db.delete(row._id);
  for (const row of await ctx.db.query("pages").withIndex("by_source_page", (q) => q.eq("sourceId", source._id)).collect()) await ctx.db.delete(row._id);
  if (source.storageId !== undefined) await ctx.storage.delete(source.storageId).catch(() => undefined);
  await ctx.db.delete(source._id);
}

/** Deletes a notebook with its sources and chat. Used by remove and by account deletion. */
export async function deleteNotebookData(ctx: MutationCtx, notebook: Doc<"notebooks">): Promise<void> {
  for (const s of await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).collect()) await deleteSourceData(ctx, s);
  for (const m of await ctx.db.query("messages").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).collect()) await ctx.db.delete(m._id);
  await ctx.db.delete(notebook._id);
}

export const remove = mutation({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, args) => {
    const { notebook } = await ownNotebook(ctx, args.notebookId);
    await deleteNotebookData(ctx, notebook);
  },
});
