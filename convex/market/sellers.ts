import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { normalisePhone } from "../accounts/sms";
import { isAdult } from "../classes/access";
import { requireMarket, sellerOf } from "./access";
import { SELLER_TERMS_VERSION } from "./rules";

/**
 * Becoming a seller (Step 9). Adults only. The real name and mobile money
 * number are for paying the seller; buyers see the real name as the author.
 */

export const SELLER_ERRORS = {
  adult: "Sellers must be 18 or older.",
  name: "Enter your full real name.",
  number: "Enter the mobile money number to pay you on, like 077 123 4567.",
  rights: "Tick the box to confirm the notes are your own work, or that you have the right to sell them.",
} as const;

/** For Settings > Money and the marketplace: whether this account sells, and can. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const { profile } = await requireMarket(ctx);
    const seller = await sellerOf(ctx, profile);
    return { canSell: isAdult(profile), seller: seller === null ? null : { realName: seller.realName, payoutNumber: seller.payoutNumber, since: seller.createdAt } };
  },
});

/** Becoming a seller, or changing the name or number a seller is paid on. */
export const become = mutation({
  args: { realName: v.string(), payoutNumber: v.string(), rights: v.boolean() },
  handler: async (ctx, args) => {
    const { profile } = await requireMarket(ctx);
    if (!isAdult(profile)) throw new ConvexError(SELLER_ERRORS.adult);
    const realName = args.realName.trim().replace(/\s+/g, " ");
    if (realName.length < 3 || realName.length > 80 || !realName.includes(" ")) throw new ConvexError(SELLER_ERRORS.name);
    const payoutNumber = normalisePhone(args.payoutNumber);
    if (payoutNumber === null) throw new ConvexError(SELLER_ERRORS.number);
    if (!args.rights) throw new ConvexError(SELLER_ERRORS.rights);
    const existing = await sellerOf(ctx, profile);
    if (existing !== null) {
      await ctx.db.patch(existing._id, { realName, payoutNumber });
      return existing._id;
    }
    const now = Date.now();
    return await ctx.db.insert("sellers", { profileId: profile._id, realName, payoutNumber, rightsAgreedAt: now, termsVersion: SELLER_TERMS_VERSION, createdAt: now });
  },
});

