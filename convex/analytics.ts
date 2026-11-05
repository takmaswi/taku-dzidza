import { v } from "convex/values";
import { ADULT_AGE, ageOn } from "./accounts/age";
import { internalQuery, mutation } from "./_generated/server";
import { requireProfile } from "./lib/access";

/**
 * Content free product analytics (SPEC.md 3.10). A daily count of which
 * features are used, kept in this deployment, with no user, no content and no
 * third party. Off until an adult says yes in Settings; under 18s can never
 * turn it on and are never counted, whatever the browser sends.
 */

export const ANALYTICS_EVENTS = ["question_asked", "chat_sent", "notebook_created", "source_added", "tool_made", "widget_made", "cards_reviewed"] as const;

const eventValidator = v.union(...ANALYTICS_EVENTS.map((e) => v.literal(e)));

function isAdult(profile: { birthYear: number; birthMonth: number }): boolean {
  return ageOn(profile.birthYear, profile.birthMonth, new Date()) >= ADULT_AGE;
}

export const setConsent = mutation({
  args: { consent: v.boolean() },
  handler: async (ctx, args) => {
    const { profile } = await requireProfile(ctx);
    await ctx.db.patch(profile._id, { analyticsConsent: args.consent && isAdult(profile) });
  },
});

export const track = mutation({
  args: { event: eventValidator },
  handler: async (ctx, args) => {
    const { profile } = await requireProfile(ctx);
    if (profile.analyticsConsent !== true || !isAdult(profile)) return;
    const day = new Date().toISOString().slice(0, 10);
    const row = await ctx.db.query("analyticsDaily").withIndex("by_day_event", (q) => q.eq("day", day).eq("event", args.event)).unique();
    if (row === null) await ctx.db.insert("analyticsDaily", { day, event: args.event, count: 1 });
    else await ctx.db.patch(row._id, { count: row.count + 1 });
  },
});

/** For the owner: npx convex run analytics:summary. */
export const summary = internalQuery({
  args: { day: v.string() },
  handler: async (ctx, args) => await ctx.db.query("analyticsDaily").withIndex("by_day_event", (q) => q.eq("day", args.day)).collect(),
});
