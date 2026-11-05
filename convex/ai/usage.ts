import { v } from "convex/values";
import { internalMutation, internalQuery, type QueryCtx } from "../_generated/server";
import { envNumber } from "../lib/env";

/**
 * Spending limits (SPEC.md Phase 7, from Takubasa convex/ai/budget.ts).
 * Checked before every model call that a learner starts. Both are in US
 * dollars per UTC day, because a 20 page scan costs far more than a question:
 *   LEARNER_DAILY_USD_CAP   one learner
 *   AI_DAILY_USD_CAP        the whole deployment
 * record also keeps the cost per tool, so pricing can be set from real
 * numbers, and writes one spendAlerts row the first time each day the
 * deployment passes each threshold.
 *
 * Cost is only known after a model answers, so calls fired in parallel would
 * all read the same low total and all pass. admit closes that: it is a mutation,
 * so Convex runs each one in turn, and it lets a learner start only so many
 * things a minute. A learner can still overshoot the cap, by at most what those
 * starts cost, which is small and bounded.
 */

export const DEFAULT_DAILY_USD_CAP = 0.5;
export const DEFAULT_LEARNER_DAILY_USD_CAP = 0.05;
export const ALERT_PERCENTS = [50, 80] as const;
/** Most a learner can start in a minute. Reading is higher: a learner may add a stack of photos at once. */
export const STARTS_PER_MINUTE = { ask: 12, read: 20 } as const;
const WINDOW_MS = 60 * 1000;

export function today(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export type UsageVerdict = { allowed: true } | { allowed: false; reason: "deployment_cap" | "learner_cap" | "busy" };

async function underCaps(ctx: QueryCtx, profileId: string): Promise<UsageVerdict> {
  const day = today();
  const all = await ctx.db.query("aiUsageDaily").withIndex("by_day_scope", (q) => q.eq("day", day).eq("scope", "all")).unique();
  if ((all?.costUsd ?? 0) >= envNumber("AI_DAILY_USD_CAP", DEFAULT_DAILY_USD_CAP)) return { allowed: false, reason: "deployment_cap" };
  const mine = await ctx.db.query("aiUsageDaily").withIndex("by_day_scope", (q) => q.eq("day", day).eq("scope", profileId)).unique();
  if ((mine?.costUsd ?? 0) >= envNumber("LEARNER_DAILY_USD_CAP", DEFAULT_LEARNER_DAILY_USD_CAP)) return { allowed: false, reason: "learner_cap" };
  return { allowed: true };
}

/** For a further call inside work that admit already let in, like a second opinion. */
export const check = internalQuery({
  args: { profileId: v.string() },
  handler: async (ctx, args): Promise<UsageVerdict> => await underCaps(ctx, args.profileId),
});

/** Before anything a learner starts: the caps, then the limit on starts per minute. */
export const admit = internalMutation({
  args: { profileId: v.string(), kind: v.union(v.literal("ask"), v.literal("read")) },
  handler: async (ctx, args): Promise<UsageVerdict> => {
    const verdict = await underCaps(ctx, args.profileId);
    if (!verdict.allowed) return verdict;
    const now = Date.now();
    const row = await ctx.db.query("aiStarts").withIndex("by_profile_kind", (q) => q.eq("profileId", args.profileId).eq("kind", args.kind)).unique();
    if (row === null) await ctx.db.insert("aiStarts", { profileId: args.profileId, kind: args.kind, windowStart: now, count: 1 });
    else if (now - row.windowStart >= WINDOW_MS) await ctx.db.patch(row._id, { windowStart: now, count: 1 });
    else if (row.count >= STARTS_PER_MINUTE[args.kind]) return { allowed: false, reason: "busy" };
    else await ctx.db.patch(row._id, { count: row.count + 1 });
    return { allowed: true };
  },
});

export const record = internalMutation({
  args: { profileId: v.string(), tool: v.string(), costUsd: v.number() },
  handler: async (ctx, args) => {
    const day = today();
    const scopes = ["all", args.profileId, `tool:${args.tool}`];
    for (const scope of scopes) {
      const row = await ctx.db.query("aiUsageDaily").withIndex("by_day_scope", (q) => q.eq("day", day).eq("scope", scope)).unique();
      if (row === null) await ctx.db.insert("aiUsageDaily", { day, scope, calls: 1, costUsd: args.costUsd });
      else await ctx.db.patch(row._id, { calls: row.calls + 1, costUsd: row.costUsd + args.costUsd });
    }
    const all = await ctx.db.query("aiUsageDaily").withIndex("by_day_scope", (q) => q.eq("day", day).eq("scope", "all")).unique();
    const capUsd = envNumber("AI_DAILY_USD_CAP", DEFAULT_DAILY_USD_CAP);
    if (all === null || capUsd <= 0) return;
    for (const percent of ALERT_PERCENTS) {
      if (all.costUsd * 100 < capUsd * percent) continue;
      const seen = await ctx.db.query("spendAlerts").withIndex("by_day_percent", (q) => q.eq("day", day).eq("percent", percent)).unique();
      if (seen === null) await ctx.db.insert("spendAlerts", { day, percent, costUsd: all.costUsd, capUsd, createdAt: Date.now() });
    }
  },
});

/** For the owner: npx convex run ai/usage:alerts and ai/usage:costPerTool. */
export const alerts = internalQuery({
  args: {},
  handler: async (ctx) => await ctx.db.query("spendAlerts").order("desc").take(30),
});

export const costPerTool = internalQuery({
  args: { day: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const day = args.day ?? today();
    const rows = await ctx.db.query("aiUsageDaily").withIndex("by_day_scope", (q) => q.eq("day", day).gte("scope", "tool:").lt("scope", "tool;")).collect();
    return rows.map((r) => ({ tool: r.scope.slice("tool:".length), calls: r.calls, costUsd: r.costUsd }));
  },
});
