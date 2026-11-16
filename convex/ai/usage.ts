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
 * numbers. admit writes one spendAlerts row the first time each day the
 * deployment passes each threshold.
 *
 * Cost is only known after a model answers, so calls fired in parallel would
 * all read the same low total and all pass. admit closes that: it is a mutation,
 * so Convex runs each one in turn, and it lets a learner start only so many
 * things a minute. A learner can still overshoot the cap, by at most what those
 * starts cost, which is small and bounded.
 *
 * Counters are sharded (audit S9). Every call used to patch one row for the
 * deployment and one per tool, so busy minutes queued behind each other.
 * record now writes to one of SHARDS rows picked at random and reads none of
 * the others; readers add the shards up. A learner's own row is not sharded:
 * one learner does not race themselves.
 */

export const DEFAULT_DAILY_USD_CAP = 0.5;
export const DEFAULT_LEARNER_DAILY_USD_CAP = 0.05;
export const ALERT_PERCENTS = [50, 80] as const;
/** Most a learner can start in a minute. Reading is higher: a learner may add a stack of photos at once. */
export const STARTS_PER_MINUTE = { ask: 12, read: 20 } as const;
export const SHARDS = 16;
const WINDOW_MS = 60 * 1000;
/** Shard rows sort between "<scope>~" and "<scope>\u007f"; a tool name never holds either character. */
const SHARD_MARK = "~";

export function today(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function shardScope(scope: string, shard: number): string {
  return `${scope}${SHARD_MARK}${shard}`;
}

/** The scope a row counts for, with any shard number taken off. */
export function baseScope(scope: string): string {
  const at = scope.lastIndexOf(SHARD_MARK);
  return at === -1 ? scope : scope.slice(0, at);
}

/** Calls and cost of one scope today: its shards, plus the single row from before sharding. */
export async function scopeTotal(ctx: QueryCtx, day: string, scope: string): Promise<{ calls: number; costUsd: number }> {
  const legacy = await ctx.db.query("aiUsageDaily").withIndex("by_day_scope", (q) => q.eq("day", day).eq("scope", scope)).unique();
  const shards = await ctx.db.query("aiUsageDaily").withIndex("by_day_scope", (q) => q.eq("day", day).gte("scope", `${scope}${SHARD_MARK}`).lt("scope", `${scope}\u007f`)).collect();
  return [...(legacy === null ? [] : [legacy]), ...shards].reduce((sum, r) => ({ calls: sum.calls + r.calls, costUsd: sum.costUsd + r.costUsd }), { calls: 0, costUsd: 0 });
}

export type UsageVerdict = { allowed: true } | { allowed: false; reason: "deployment_cap" | "learner_cap" | "busy" };

async function underCaps(ctx: QueryCtx, profileId: string): Promise<{ verdict: UsageVerdict; allUsd: number }> {
  const day = today();
  const allUsd = (await scopeTotal(ctx, day, "all")).costUsd;
  if (allUsd >= envNumber("AI_DAILY_USD_CAP", DEFAULT_DAILY_USD_CAP)) return { verdict: { allowed: false, reason: "deployment_cap" }, allUsd };
  const mine = await ctx.db.query("aiUsageDaily").withIndex("by_day_scope", (q) => q.eq("day", day).eq("scope", profileId)).unique();
  if ((mine?.costUsd ?? 0) >= envNumber("LEARNER_DAILY_USD_CAP", DEFAULT_LEARNER_DAILY_USD_CAP)) return { verdict: { allowed: false, reason: "learner_cap" }, allUsd };
  return { verdict: { allowed: true }, allUsd };
}

/** For a further call inside work that admit already let in, like a second opinion. */
export const check = internalQuery({
  args: { profileId: v.string() },
  handler: async (ctx, args): Promise<UsageVerdict> => (await underCaps(ctx, args.profileId)).verdict,
});

/** Before anything a learner starts: the caps, then the limit on starts per minute. */
export const admit = internalMutation({
  args: { profileId: v.string(), kind: v.union(v.literal("ask"), v.literal("read")) },
  handler: async (ctx, args): Promise<UsageVerdict> => {
    const { verdict, allUsd } = await underCaps(ctx, args.profileId);
    // The owner's alerts, written here because this is where the total is read anyway.
    const capUsd = envNumber("AI_DAILY_USD_CAP", DEFAULT_DAILY_USD_CAP);
    const day = today();
    if (capUsd > 0) {
      for (const percent of ALERT_PERCENTS) {
        if (allUsd * 100 < capUsd * percent) continue;
        const seen = await ctx.db.query("spendAlerts").withIndex("by_day_percent", (q) => q.eq("day", day).eq("percent", percent)).unique();
        if (seen === null) await ctx.db.insert("spendAlerts", { day, percent, costUsd: allUsd, capUsd, createdAt: Date.now() });
      }
    }
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
    const shard = Math.floor(Math.random() * SHARDS);
    // Only the rows this call writes are read, so two calls on different shards never wait for each other.
    for (const scope of [shardScope("all", shard), args.profileId, shardScope(`tool:${args.tool}`, shard)]) {
      const row = await ctx.db.query("aiUsageDaily").withIndex("by_day_scope", (q) => q.eq("day", day).eq("scope", scope)).unique();
      if (row === null) await ctx.db.insert("aiUsageDaily", { day, scope, calls: 1, costUsd: args.costUsd });
      else await ctx.db.patch(row._id, { calls: row.calls + 1, costUsd: row.costUsd + args.costUsd });
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
    const byTool = new Map<string, { calls: number; costUsd: number }>();
    for (const r of rows) {
      const tool = baseScope(r.scope).slice("tool:".length);
      const sum = byTool.get(tool) ?? { calls: 0, costUsd: 0 };
      byTool.set(tool, { calls: sum.calls + r.calls, costUsd: sum.costUsd + r.costUsd });
    }
    return [...byTool.entries()].map(([tool, sum]) => ({ tool, ...sum }));
  },
});

/** The deployment's total for a day, for the owner and for tests. */
export const dayTotal = internalQuery({
  args: { day: v.optional(v.string()) },
  handler: async (ctx, args) => await scopeTotal(ctx, args.day ?? today(), "all"),
});
