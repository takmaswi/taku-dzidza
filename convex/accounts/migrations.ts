import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, internalQuery } from "../_generated/server";
import { VOICE_FROM_STYLE } from "./voices";

/**
 * Study styles to Taku's voice (21 November 2026): calm to gentle, locked_in
 * to direct, cook to upbeat. The migration only adds `voice` to profiles that
 * have none. It does not touch `studyStyle`, so it rewrites nothing and can run
 * again safely; clearing the old field and dropping it from the schema is a
 * later step. Run with `npx convex run accounts/migrations:voices`.
 */

const BATCH = 200;

export const voices = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args): Promise<{ updated: number; done: boolean }> => {
    const page = await ctx.db.query("profiles").paginate({ cursor: args.cursor ?? null, numItems: BATCH });
    let updated = 0;
    for (const p of page.page) {
      if (p.voice !== undefined) continue;
      await ctx.db.patch(p._id, { voice: VOICE_FROM_STYLE[p.studyStyle ?? "calm"] });
      updated += 1;
    }
    if (!page.isDone) await ctx.scheduler.runAfter(0, internal.accounts.migrations.voices, { cursor: page.continueCursor });
    return { updated, done: page.isDone };
  },
});

/** How many profiles still have no voice. Zero means the migration is finished. */
export const voicesLeft = internalQuery({
  args: {},
  handler: async (ctx): Promise<{ profiles: number; withoutVoice: number }> => {
    let profiles = 0;
    let withoutVoice = 0;
    for await (const p of ctx.db.query("profiles")) {
      profiles += 1;
      if (p.voice === undefined) withoutVoice += 1;
    }
    return { profiles, withoutVoice };
  },
});
