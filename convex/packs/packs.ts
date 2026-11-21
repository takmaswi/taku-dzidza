import { ConvexError, v } from "convex/values";
import { createEmptyCard } from "ts-fsrs";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx } from "../_generated/server";
import { syllabusById } from "../curriculum/catalogue";
import { MAX_NOTEBOOKS, ownNotebook } from "../notebooks/notebooks";
import { membershipOf, requireOrgMember, requireOrgsProfile } from "../organisations/access";
import { isPublic } from "../organisations/organisations";
import { linkedNotebook, publishedPack } from "./scope";

/**
 * Course packs (DECISIONS.md, Course packs). A teacher or admin of an
 * organisation makes a draft from one of their own notebooks and publishes it
 * (convex/packs/publish.ts). Anyone who can see the organisation can add a
 * published pack: they get their own notebook linked to it. The pack's
 * sources and tools are read from the pack, never copied; what the learner
 * adds, asks and reviews stays theirs. Review cards are the one thing a
 * learner holds per card, because the schedule is theirs.
 */

const MAX_PACKS = 100;
const MAX_CARDS = 2000;

function clean(text: string, min: number, max: number, message: string): string {
  const out = text.trim().replace(/\s+/g, " ");
  if (out.length < min || out.length > max) throw new ConvexError(message);
  return out;
}

export const create = mutation({
  args: { organisationId: v.id("organisations"), notebookId: v.id("notebooks"), title: v.string(), subject: v.string(), level: v.string(), syllabusId: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Id<"coursePacks">> => {
    const { profile, org } = await requireOrgMember(ctx, args.organisationId, ["teacher", "admin"]);
    const notebook = await ctx.db.get(args.notebookId);
    if (notebook === null || notebook.profileId !== profile._id || notebook.deletingAt !== undefined || notebook.testReview === true || notebook.packId !== undefined) throw new ConvexError("Pick one of your own notebooks.");
    if ((await ctx.db.query("coursePacks").withIndex("by_master", (q) => q.eq("masterNotebookId", notebook._id)).first()) !== null) throw new ConvexError("That notebook is already a course pack.");
    if (args.syllabusId !== undefined && syllabusById(args.syllabusId) === undefined) throw new ConvexError("Pick a syllabus from the list.");
    const count = (await ctx.db.query("coursePacks").withIndex("by_org", (q) => q.eq("organisationId", org._id)).take(MAX_PACKS + 1)).length;
    if (count >= MAX_PACKS) throw new ConvexError(`An organisation can have up to ${MAX_PACKS} course packs.`);
    return await ctx.db.insert("coursePacks", {
      organisationId: org._id,
      title: clean(args.title, 2, 80, "Give the course pack a name."),
      subject: clean(args.subject, 2, 60, "Say which subject it covers."),
      level: clean(args.level, 1, 30, "Say which level it is for."),
      ...(args.syllabusId === undefined ? {} : { syllabusId: args.syllabusId }),
      masterNotebookId: notebook._id,
      createdBy: profile._id,
      version: 0,
      status: "draft",
      sourceIds: [],
      outputIds: [],
      createdAt: Date.now(),
    });
  },
});

async function learnerCount(ctx: MutationCtx | Parameters<typeof linkedNotebook>[0], packId: Id<"coursePacks">): Promise<number> {
  return (await ctx.db.query("notebooks").withIndex("by_pack", (q) => q.eq("packId", packId)).take(5000)).filter((n) => n.deletingAt === undefined).length;
}

/** For the organisation's teachers and admins: every pack, draft or published, with how many learners added it. Only the maker can publish theirs. */
export const forStaff = query({
  args: { organisationId: v.id("organisations") },
  handler: async (ctx, args) => {
    const { profile, org } = await requireOrgMember(ctx, args.organisationId, ["teacher", "admin"]);
    const out = [];
    for (const p of await ctx.db.query("coursePacks").withIndex("by_org", (q) => q.eq("organisationId", org._id)).order("desc").take(MAX_PACKS)) {
      out.push({ _id: p._id, title: p.title, subject: p.subject, level: p.level, status: p.status, version: p.version, publishedAt: p.publishedAt ?? null, learners: await learnerCount(ctx, p._id), mine: p.createdBy === profile._id, publishing: p.publishingSince !== undefined });
    }
    return out;
  },
});

/** The notebooks a teacher can make a pack from: their own, not linked to a pack, not already one. */
export const myNotebooks = query({
  args: { organisationId: v.id("organisations") },
  handler: async (ctx, args) => {
    const { profile } = await requireOrgMember(ctx, args.organisationId, ["teacher", "admin"]);
    const out = [];
    for (const n of await ctx.db.query("notebooks").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).order("desc").take(MAX_NOTEBOOKS)) {
      if (n.deletingAt !== undefined || n.testReview === true || n.packId !== undefined) continue;
      if ((await ctx.db.query("coursePacks").withIndex("by_master", (q) => q.eq("masterNotebookId", n._id)).first()) !== null) continue;
      out.push({ _id: n._id, title: n.title });
    }
    return out;
  },
});

async function visibleOrg(ctx: Parameters<typeof linkedNotebook>[0], organisationId: Id<"organisations">, profile: Doc<"profiles">): Promise<Doc<"organisations"> | null> {
  const org = await ctx.db.get(organisationId);
  if (org === null) return null;
  if (isPublic(org) || org.createdBy === profile._id || (await membershipOf(ctx, org._id, profile._id)) !== null) return org;
  return null;
}

/** On an organisation's public page: its published packs, and whether this learner already added each. */
export const published = query({
  args: { organisationId: v.id("organisations") },
  handler: async (ctx, args) => {
    const { profile } = await requireOrgsProfile(ctx);
    const org = await visibleOrg(ctx, args.organisationId, profile);
    if (org === null) return [];
    const out = [];
    for (const p of await ctx.db.query("coursePacks").withIndex("by_org", (q) => q.eq("organisationId", org._id)).order("desc").take(MAX_PACKS)) {
      if (p.status !== "published") continue;
      const mine = await linkedNotebook(ctx, p._id, profile._id);
      out.push({ _id: p._id, title: p.title, subject: p.subject, level: p.level, version: p.version, publishedAt: p.publishedAt ?? null, notebookId: mine?._id ?? null });
    }
    return out;
  },
});

/**
 * Brings a linked notebook's review cards up to the pack's version: a card
 * for each card in the pack's flashcards, with a fresh schedule, keeping the
 * schedule of a card whose front is unchanged; cards from older versions go.
 */
async function syncCards(ctx: MutationCtx, notebook: Doc<"notebooks">, pack: Doc<"coursePacks">): Promise<void> {
  const mine = await ctx.db.query("cards").withIndex("by_notebook_due", (q) => q.eq("notebookId", notebook._id)).take(MAX_CARDS);
  const current = new Set(pack.outputIds as string[]);
  const fromPack = [];
  for (const c of mine) {
    const output = await ctx.db.get(c.outputId);
    if (output === null || output.notebookId === pack.masterNotebookId) fromPack.push(c);
  }
  const have = new Set(fromPack.filter((c) => current.has(c.outputId)).map((c) => `${c.outputId}:${c.front}`));
  const old = new Map(fromPack.filter((c) => !current.has(c.outputId)).map((c) => [c.front, c]));
  const now = Date.now();
  for (const outputId of pack.outputIds) {
    const output = await ctx.db.get(outputId);
    if (output === null || output.kind !== "cards") continue;
    for (const card of await ctx.db.query("cards").withIndex("by_output", (q) => q.eq("outputId", outputId)).take(MAX_CARDS)) {
      if (card.profileId !== pack.createdBy || have.has(`${outputId}:${card.front}`)) continue;
      const kept = old.get(card.front);
      const empty = createEmptyCard(new Date(now));
      const schedule = kept
        ? { due: kept.due, stability: kept.stability, difficulty: kept.difficulty, elapsedDays: kept.elapsedDays, scheduledDays: kept.scheduledDays, learningSteps: kept.learningSteps, reps: kept.reps, lapses: kept.lapses, state: kept.state, ...(kept.lastReview === undefined ? {} : { lastReview: kept.lastReview }) }
        : { due: empty.due.getTime(), stability: empty.stability, difficulty: empty.difficulty, elapsedDays: empty.elapsed_days, scheduledDays: empty.scheduled_days, learningSteps: empty.learning_steps, reps: empty.reps, lapses: empty.lapses, state: empty.state };
      await ctx.db.insert("cards", { notebookId: notebook._id, outputId, profileId: notebook.profileId, front: card.front, back: card.back, origin: card.origin, ...schedule });
    }
  }
  for (const c of fromPack) if (!current.has(c.outputId)) await ctx.db.delete(c._id);
  await ctx.db.patch(notebook._id, { packVersion: pack.version });
}

/** Add a published pack: the learner's own notebook, linked to it. Adding it again opens the same one. */
export const add = mutation({
  args: { packId: v.id("coursePacks") },
  handler: async (ctx, args): Promise<Id<"notebooks">> => {
    const { profile } = await requireOrgsProfile(ctx);
    const pack = await publishedPack(ctx, args.packId);
    if (pack === null || (await visibleOrg(ctx, pack.organisationId, profile)) === null) throw new ConvexError("Course pack not found.");
    const existing = await linkedNotebook(ctx, pack._id, profile._id);
    if (existing !== null) return existing._id;
    const count = (await ctx.db.query("notebooks").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(MAX_NOTEBOOKS + 1)).length;
    if (count >= MAX_NOTEBOOKS) throw new ConvexError(`You can have up to ${MAX_NOTEBOOKS} notebooks.`);
    const now = Date.now();
    const notebookId = await ctx.db.insert("notebooks", { profileId: profile._id, title: pack.title, sourceMode: "mine_plus", createdAt: now, updatedAt: now, packId: pack._id });
    await syncCards(ctx, (await ctx.db.get(notebookId))!, pack);
    return notebookId;
  },
});

/** Called when a linked notebook opens and a newer version is out. */
export const sync = mutation({
  args: { notebookId: v.id("notebooks") },
  handler: async (ctx, args) => {
    const { notebook } = await ownNotebook(ctx, args.notebookId);
    const pack = await publishedPack(ctx, notebook.packId);
    if (pack !== null && notebook.packVersion !== pack.version) await syncCards(ctx, notebook, pack);
    return null;
  },
});
