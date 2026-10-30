import { mutation } from "../_generated/server";
import { requireLearner } from "../lib/access";
import { writePages } from "./read";

/**
 * A ready made notebook so a new learner can try Taku before adding notes
 * (the empty start problem NotebookLM solved with featured notebooks).
 * Original text written for Takudzidza, standard secondary biology.
 */

export const SAMPLE_TITLE = "Sample: Form 3 Biology";

export const SAMPLE_PAGES: readonly string[] = [
  `Photosynthesis
Green plants make their own food by photosynthesis. They take in carbon dioxide from the air through tiny pores in the leaves called stomata, and water from the soil through their roots.
Chlorophyll, the green pigment in the chloroplasts, absorbs light energy. The plant uses this energy to turn carbon dioxide and water into glucose.
Oxygen is released as a by product.
Word equation: carbon dioxide + water, with light energy and chlorophyll, gives glucose + oxygen.
Glucose can be used for respiration, turned into starch for storage, or used to make cellulose for cell walls.`,
  `Factors that affect the rate of photosynthesis
Light intensity: more light gives a faster rate, until another factor becomes limiting.
Carbon dioxide concentration: more carbon dioxide gives a faster rate, up to a point.
Temperature: photosynthesis is controlled by enzymes, so the rate rises with temperature up to an optimum and then falls as the enzymes are denatured.
The factor in shortest supply is called the limiting factor.
Testing a leaf for starch: boil the leaf in water, then in ethanol to remove the chlorophyll, rinse it, and add iodine solution. A blue black colour shows starch is present.`,
  `Respiration
Respiration releases energy from glucose in every living cell. It happens all the time, day and night.
Aerobic respiration uses oxygen and takes place mainly in the mitochondria.
Word equation: glucose + oxygen gives carbon dioxide + water, and energy is released.
Anaerobic respiration happens without oxygen and releases much less energy.
In muscles during hard exercise: glucose gives lactic acid, which causes fatigue.
In yeast: glucose gives ethanol + carbon dioxide. This is called fermentation and is used in baking and brewing.`,
];

export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const { profile } = await requireLearner(ctx);
    const existing = (await ctx.db.query("notebooks").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).collect()).find((n) => n.title === SAMPLE_TITLE);
    if (existing !== undefined) return existing._id;
    const now = Date.now();
    const notebookId = await ctx.db.insert("notebooks", { profileId: profile._id, title: SAMPLE_TITLE, sourceMode: "mine_plus", createdAt: now, updatedAt: now });
    const sourceId = await ctx.db.insert("sources", { notebookId, profileId: profile._id, kind: "text", title: "Biology notes", status: "reading", pageCount: 0, createdAt: now });
    await writePages(ctx, sourceId, SAMPLE_PAGES);
    return notebookId;
  },
});
