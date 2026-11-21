import { query } from "./_generated/server";
import { booksModeOn } from "./lib/env";
import { featureOn } from "./lib/features";

/**
 * Which new surfaces are on for this account (Convex env, default off;
 * convex/lib/features.ts). Public and without data: the app only uses it to show or hide pages; every function behind a
 * flag checks it again on the server.
 */
export const get = query({
  args: {},
  handler: async (ctx) => ({ teacher: await featureOn(ctx, "TEACHER_MODE"), market: await featureOn(ctx, "MARKETPLACE_MODE"), books: booksModeOn() }),
});
