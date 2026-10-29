import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { seedPrice } from "./models";

/**
 * Model prices, read by the router to cost each call. Ported from Amayi Learn
 * (convex/ai/prices.ts at ec3496e). Budgets come with the first live calls.
 */

export const priceFor = internalQuery({
  args: { model: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("modelPrices")
      .withIndex("by_model", (q) => q.eq("model", args.model))
      .unique();
    if (row === null) return seedPrice(args.model);
    return {
      promptUsdPerToken: row.promptUsdPerToken,
      completionUsdPerToken: row.completionUsdPerToken,
      cachedPromptUsdPerToken: row.cachedPromptUsdPerToken,
    };
  },
});

export const upsertPrice = internalMutation({
  args: {
    model: v.string(),
    promptUsdPerToken: v.number(),
    completionUsdPerToken: v.number(),
    cachedPromptUsdPerToken: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("modelPrices")
      .withIndex("by_model", (q) => q.eq("model", args.model))
      .unique();
    const patch = { ...args, refreshedAt: Date.now() };
    if (existing === null) await ctx.db.insert("modelPrices", patch);
    else await ctx.db.patch(existing._id, patch);
  },
});
