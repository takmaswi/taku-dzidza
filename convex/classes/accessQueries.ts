import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { ownClass } from "./access";

/** ownClass for actions (convex/classes/access.ts requireTeacherInAction). */
export const classCheck = internalQuery({
  args: { classId: v.id("classes") },
  handler: async (ctx, args) => {
    const { profile } = await ownClass(ctx, args.classId);
    return { profileId: profile._id };
  },
});
