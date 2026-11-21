import { ConvexError, v } from "convex/values";
import { createEmptyCard } from "ts-fsrs";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { syllabusById } from "../curriculum/catalogue";
import { MAX_NOTEBOOKS, ownNotebook } from "../notebooks/notebooks";
import { membershipOf, requireOrgMember, requireOrgsProfile } from "../organisations/access";
import { isPublic } from "../organisations/organisations";
import { linkedNotebook, publishedPack, readableListing } from "./scope";

/**
 * Course packs (DECISIONS.md, Course packs). A teacher or admin of an
 * organisation makes a draft from one of their own notebooks and publishes it
 * (convex/packs/publish.ts), which copies the sources into a notebook the
 * organisation owns. The pack is the organisation's: any of its admins, or
 * the teacher who made it while still a member, can publish, unpublish or
 * edit it. Anyone who can see the organisation can add a published pack:
 * they get their own notebook linked to it. The pack's sources and tools are
 * read from the pack, never copied; what the learner adds, asks and reviews
 * stays theirs. Review cards are the one thing a learner holds per card,
 * because the schedule is theirs.
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

/** True when this teacher or admin may publish, unpublish or edit the pack: any admin, or its maker while still on the staff. */
function canManage(pack: Doc<"coursePacks">, profile: Doc<"profiles">, role: Doc<"memberships">["role"]): boolean {
  return role === "admin" || (pack.createdBy !== undefined && pack.createdBy === profile._id);
}

export const MANAGE_ERROR = "Only an admin, or the teacher who made this course pack, can change it.";

/** The pack, for someone who may manage it. */
export async function managedPack(ctx: QueryCtx, packId: Id<"coursePacks">): Promise<{ profile: Doc<"profiles">; pack: Doc<"coursePacks"> }> {
  const pack = await ctx.db.get(packId);
  if (pack === null) throw new ConvexError("Course pack not found.");
  const { profile, membership } = await requireOrgMember(ctx, pack.organisationId, ["teacher", "admin"]);
  if (!canManage(pack, profile, membership.role)) throw new ConvexError(MANAGE_ERROR);
  return { profile, pack };
}

/** The teacher's notebook a new version copies from, while it exists and its teacher is still on the organisation's staff. */
export async function liveMaster(ctx: QueryCtx, pack: Doc<"coursePacks">): Promise<Doc<"notebooks"> | null> {
  if (pack.masterNotebookId === undefined || pack.createdBy === undefined) return null;
  const notebook = await ctx.db.get(pack.masterNotebookId);
  if (notebook === null || notebook.deletingAt !== undefined || notebook.profileId !== pack.createdBy) return null;
  const membership = await membershipOf(ctx, pack.organisationId, pack.createdBy);
  return membership !== null && (membership.role === "teacher" || membership.role === "admin") ? notebook : null;
}

/**
 * A teacher left the organisation: their packs stay with it, unlinked from
 * their notebook, which is theirs again. Later versions are made from the
 * organisation's copy.
 */
export async function releasePacks(ctx: MutationCtx, organisationId: Id<"organisations">, profileId: Id<"profiles">): Promise<void> {
  for (const p of await ctx.db.query("coursePacks").withIndex("by_created_by", (q) => q.eq("createdBy", profileId)).take(500)) {
    if (p.organisationId === organisationId && p.masterNotebookId !== undefined) await ctx.db.patch(p._id, { masterNotebookId: undefined });
  }
}

async function learnerCount(ctx: MutationCtx | Parameters<typeof linkedNotebook>[0], packId: Id<"coursePacks">): Promise<number> {
  return (await ctx.db.query("notebooks").withIndex("by_pack", (q) => q.eq("packId", packId)).take(5000)).filter((n) => n.deletingAt === undefined).length;
}

/** For the organisation's teachers and admins: every pack, draft or published, with how many learners added it, and whether this person may change it. */
export const forStaff = query({
  args: { organisationId: v.id("organisations") },
  handler: async (ctx, args) => {
    const { profile, org, membership } = await requireOrgMember(ctx, args.organisationId, ["teacher", "admin"]);
    const out = [];
    for (const p of await ctx.db.query("coursePacks").withIndex("by_org", (q) => q.eq("organisationId", org._id)).order("desc").take(MAX_PACKS)) {
      out.push({ _id: p._id, title: p.title, subject: p.subject, level: p.level, status: p.status, version: p.version, publishedAt: p.publishedAt ?? null, learners: await learnerCount(ctx, p._id), canManage: canManage(p, profile, membership.role), publishing: p.publishingSince !== undefined });
    }
    return out;
  },
});

/** Takes a pack off the organisation's page. Linked notebooks then show only what each learner added; publishing again brings it back. */
export const unpublish = mutation({
  args: { packId: v.id("coursePacks") },
  handler: async (ctx, args) => {
    const { pack } = await managedPack(ctx, args.packId);
    if (pack.status === "published") await ctx.db.patch(pack._id, { status: "draft" });
    return null;
  },
});

/** The pack's name, subject, level and syllabus. Learners see the new details at once. */
export const edit = mutation({
  args: { packId: v.id("coursePacks"), title: v.string(), subject: v.string(), level: v.string(), syllabusId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { pack } = await managedPack(ctx, args.packId);
    if (args.syllabusId !== undefined && syllabusById(args.syllabusId) === undefined) throw new ConvexError("Pick a syllabus from the list.");
    const title = clean(args.title, 2, 80, "Give the course pack a name.");
    await ctx.db.patch(pack._id, {
      title,
      subject: clean(args.subject, 2, 60, "Say which subject it covers."),
      level: clean(args.level, 1, 30, "Say which level it is for."),
      syllabusId: args.syllabusId,
    });
    if (pack.notebookId !== undefined && (await ctx.db.get(pack.notebookId)) !== null) await ctx.db.patch(pack.notebookId, { title });
    return null;
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

/** What a linked notebook's review cards are made from: a published pack or a live listing. */
export type CardSource = { notebookId: Id<"notebooks">; outputIds: Id<"outputs">[]; version: number };

/**
 * Brings a linked notebook's review cards up to the pack's (or listing's)
 * version: a card for each card in its flashcards, with a fresh schedule,
 * keeping the schedule of a card whose front is unchanged; cards from older
 * versions go.
 */
export async function syncCards(ctx: MutationCtx, notebook: Doc<"notebooks">, pack: CardSource): Promise<void> {
  const mine = await ctx.db.query("cards").withIndex("by_notebook_due", (q) => q.eq("notebookId", notebook._id)).take(MAX_CARDS);
  const current = new Set(pack.outputIds as string[]);
  const fromPack = [];
  for (const c of mine) {
    const output = await ctx.db.get(c.outputId);
    if (output === null || output.notebookId === pack.notebookId) fromPack.push(c);
  }
  const have = new Set(fromPack.filter((c) => current.has(c.outputId)).map((c) => `${c.outputId}:${c.front}`));
  const old = new Map(fromPack.filter((c) => !current.has(c.outputId)).map((c) => [c.front, c]));
  const now = Date.now();
  for (const outputId of pack.outputIds) {
    const output = await ctx.db.get(outputId);
    if (output === null || output.kind !== "cards") continue;
    for (const card of await ctx.db.query("cards").withIndex("by_output", (q) => q.eq("outputId", outputId)).take(MAX_CARDS)) {
      // The pack's own cards seed each learner's; other learners' cards on the same tool are theirs.
      if (card.notebookId !== pack.notebookId || have.has(`${outputId}:${card.front}`)) continue;
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
    // A bought or rented listing (convex/market) keeps its cards in step the same way.
    const bought = pack === null ? await readableListing(ctx, notebook.listingId, notebook.profileId) : null;
    if (bought !== null && notebook.packVersion !== bought.listing.version) await syncCards(ctx, notebook, bought.listing);
    return null;
  },
});
