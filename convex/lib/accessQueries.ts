import { internalQuery } from "../_generated/server";
import { requireLearner } from "./access";

/** requireLearner for actions (convex/lib/access.ts requireLearnerInAction). */
export const learnerCheck = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireLearner(ctx);
    return null;
  },
});
