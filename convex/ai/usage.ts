import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { envNumber } from "../lib/env";

/**
 * Spending limits until full budgets arrive (SPEC.md Phase 7, from Takubasa
 * convex/ai/budget.ts). Checked before every model call that a learner
 * starts; both default low because the OpenRouter budget is small.
 *   AI_DAILY_USD_CAP          the whole deployment, per UTC day (default 0.50)
 *   LEARNER_DAILY_AI_CALLS    one learner's model calls per UTC day (default 60)
 */

export const DEFAULT_DAILY_USD_CAP = 0.5;
export const DEFAULT_LEARNER_DAILY_CALLS = 60;

export function today(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export type UsageVerdict = { allowed: true } | { allowed: false; reason: "deployment_cap" | "learner_cap" };

export const check = internalQuery({
  args: { profileId: v.string(), calls: v.number() },
  handler: async (ctx, args): Promise<UsageVerdict> => {
    const day = today();
    const all = await ctx.db.query("aiUsageDaily").withIndex("by_day_scope", (q) => q.eq("day", day).eq("scope", "all")).unique();
    if ((all?.costUsd ?? 0) >= envNumber("AI_DAILY_USD_CAP", DEFAULT_DAILY_USD_CAP)) return { allowed: false, reason: "deployment_cap" };
    const mine = await ctx.db.query("aiUsageDaily").withIndex("by_day_scope", (q) => q.eq("day", day).eq("scope", args.profileId)).unique();
    if ((mine?.calls ?? 0) + args.calls > envNumber("LEARNER_DAILY_AI_CALLS", DEFAULT_LEARNER_DAILY_CALLS)) return { allowed: false, reason: "learner_cap" };
    return { allowed: true };
  },
});

export const record = internalMutation({
  args: { profileId: v.string(), calls: v.number(), costUsd: v.number() },
  handler: async (ctx, args) => {
    if (args.calls === 0) return;
    const day = today();
    for (const scope of ["all", args.profileId]) {
      const row = await ctx.db.query("aiUsageDaily").withIndex("by_day_scope", (q) => q.eq("day", day).eq("scope", scope)).unique();
      if (row === null) await ctx.db.insert("aiUsageDaily", { day, scope, calls: args.calls, costUsd: args.costUsd });
      else await ctx.db.patch(row._id, { calls: row.calls + args.calls, costUsd: row.costUsd + args.costUsd });
    }
  },
});
