import { internalQuery } from "../_generated/server";
import { requireMarket, requireMarketOwner } from "./access";

/** The marketplace access helpers for actions (convex/market/access.ts). */

export const market = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireMarket(ctx);
    return null;
  },
});

export const owner = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireMarketOwner(ctx);
    return null;
  },
});
