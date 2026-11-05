import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { aiMode } from "../lib/env";

/**
 * Where the mock email and SMS senders put their codes, so tests can read
 * them. It refuses to write outside mock mode, and nothing public reads it.
 */

export const record = internalMutation({
  args: { channel: v.union(v.literal("email"), v.literal("sms")), to: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    if (aiMode() !== "mock") throw new ConvexError("The mock outbox only works in mock mode.");
    await ctx.db.insert("mockOutbox", { ...args, createdAt: Date.now() });
  },
});

export const latest = internalQuery({
  args: { to: v.string() },
  handler: async (ctx, args): Promise<string | null> => {
    const row = await ctx.db.query("mockOutbox").withIndex("by_to", (q) => q.eq("to", args.to)).order("desc").first();
    return row?.code ?? null;
  },
});
