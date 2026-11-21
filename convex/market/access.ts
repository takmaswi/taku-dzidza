import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { ActionCtx, QueryCtx } from "../_generated/server";
import { isAdult } from "../classes/access";
import { requireAdmin, requireLearner } from "../lib/access";
import { featureOn } from "../lib/features";

/**
 * Access helpers for the notes marketplace (Step 9). Every public function in
 * convex/market calls one of these (tests/convex/access-scan.test.ts). All of
 * them refuse while MARKETPLACE_MODE is off for this account.
 *
 *   requireMarket        anyone allowed to study (under 18s have guardian consent)
 *   requireSeller        an adult who became a seller
 *   requireMarketOwner   the owner (ADMIN_EMAILS, verified)
 *   requireMarketInAction / requireMarketOwnerInAction  the same from an action
 */

export const MARKET_OFF = "The marketplace is not on yet.";

export async function requireMarket(ctx: QueryCtx): Promise<{ user: Doc<"users">; profile: Doc<"profiles"> }> {
  if (!(await featureOn(ctx, "MARKETPLACE_MODE"))) throw new ConvexError(MARKET_OFF);
  return await requireLearner(ctx);
}

/** The signed in account's seller row, if they became one. */
export async function sellerOf(ctx: QueryCtx, profile: Doc<"profiles">): Promise<Doc<"sellers"> | null> {
  const row = await ctx.db.query("sellers").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).first();
  return row === null || row.deletedAt !== undefined ? null : row;
}

export async function requireSeller(ctx: QueryCtx): Promise<{ user: Doc<"users">; profile: Doc<"profiles">; seller: Doc<"sellers"> }> {
  const found = await requireMarket(ctx);
  if (!isAdult(found.profile)) throw new ConvexError("Sellers must be 18 or older.");
  const seller = await sellerOf(ctx, found.profile);
  if (seller === null) throw new ConvexError("Become a seller first.");
  return { ...found, seller };
}

export async function requireMarketOwner(ctx: QueryCtx): Promise<{ user: Doc<"users">; profile: Doc<"profiles"> }> {
  const found = await requireMarket(ctx);
  await requireAdmin(ctx);
  return found;
}

export async function requireMarketInAction(ctx: ActionCtx): Promise<void> {
  await ctx.runQuery(internal.market.checks.market, {});
}

export async function requireMarketOwnerInAction(ctx: ActionCtx): Promise<void> {
  await ctx.runQuery(internal.market.checks.owner, {});
}
