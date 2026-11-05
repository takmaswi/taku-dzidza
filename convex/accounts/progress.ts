import { query } from "../_generated/server";
import { requireLearner } from "../lib/access";

/** How far a new learner has come, for the first run checklist on home. Read from what they have actually done. */
export const firstRun = query({
  args: {},
  handler: async (ctx) => {
    const { profile } = await requireLearner(ctx);
    const notebooks = await ctx.db.query("notebooks").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(20);
    let addedNotes = false;
    let asked = (await ctx.db.query("chats").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).first()) !== null;
    for (const notebook of notebooks) {
      addedNotes ||= (await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).first()) !== null;
      asked ||= (await ctx.db.query("messages").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).first()) !== null;
    }
    const madeCards = (await ctx.db.query("cards").withIndex("by_profile_due", (q) => q.eq("profileId", profile._id)).first()) !== null;
    return { addedNotes, asked, madeCards };
  },
});
