import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { PACK_TOOLS, PUBLISH_ERRORS, copySources } from "../packs/publish";
import { startPurge } from "../privacy/purge";
import { checkForMinors } from "../safety/minorCheck";
import { makeTool, planFor, type GenerateResult, type Plan } from "../study/tools";
import { requireMarketInAction, requireMarketOwner, requireMarketOwnerInAction } from "./access";
import { cleanDetails, detailsValidator, ownListing, type Details } from "./listings";
import { examPaperFlag } from "./rules";

/**
 * Sending a listing for approval, and the owner's decision (Step 9). Like a
 * course pack (convex/packs/publish.ts): the seller's sources are copied
 * once into the listing's own notebook, which no account owns, and the
 * summary, flashcards and practice paper are made once, charged to the
 * seller. The new version then waits in the owner's queue; nobody sees it
 * until it is approved. At approval the under 18 source screen and output
 * check run; a version that fails is shown to adults only, and the seller is
 * told. Notes that name an exam board with "mark scheme", "question paper",
 * "past paper" or an exam session are flagged for a closer look.
 */

const LOCK_MS = 10 * 60 * 1000;
/** Characters of the new version read for the exam paper flag. */
const FLAG_CHARS = 200_000;
const QUEUE = 50;

type SubmitPlan = { payerId: Id<"profiles">; masterSources: Id<"sources">[] | null; copySourceIds: Id<"sources">[]; sourceMode: Doc<"notebooks">["sourceMode"] };

async function liveSources(ctx: QueryCtx, notebookId: Id<"notebooks">): Promise<Doc<"sources">[]> {
  return (await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", notebookId)).collect()).filter((s) => s.deletingAt === undefined);
}

/** The seller's notebook, while it exists and is still theirs. */
async function liveMaster(ctx: QueryCtx, listing: Doc<"listings">): Promise<Doc<"notebooks"> | null> {
  if (listing.masterNotebookId === undefined || listing.profileId === undefined) return null;
  const n = await ctx.db.get(listing.masterNotebookId);
  return n === null || n.deletingAt !== undefined || n.profileId !== listing.profileId ? null : n;
}

export const plan = internalQuery({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args): Promise<SubmitPlan | { error: string }> => {
    const { profile, listing } = await ownListing(ctx, args.listingId);
    if (listing.status === "removed") return { error: "This listing was taken down." };
    const master = await liveMaster(ctx, listing);
    const copy = listing.notebookId === undefined ? null : await ctx.db.get(listing.notebookId);
    const sources = master !== null ? await liveSources(ctx, master._id) : copy !== null ? (await liveSources(ctx, copy._id)).filter((s) => listing.sourceIds.includes(s._id)) : [];
    if (sources.length === 0) return { error: PUBLISH_ERRORS.empty };
    if (sources.some((s) => s.thirdParty === true)) return { error: "Pages from a published book cannot be sold. Remove them first." };
    if (sources.some((s) => s.status === "reading")) return { error: PUBLISH_ERRORS.reading };
    if (sources.some((s) => s.status === "failed")) return { error: PUBLISH_ERRORS.failed };
    if (listing.publishingSince !== undefined && Date.now() - listing.publishingSince < LOCK_MS) return { error: "This listing is being sent already." };
    return { payerId: profile._id, masterSources: master === null ? null : sources.map((s) => s._id), copySourceIds: master === null ? sources.map((s) => s._id) : [], sourceMode: master?.sourceMode ?? copy?.sourceMode ?? "mine_plus" };
  },
});

export const lock = internalMutation({
  args: { listingId: v.id("listings"), on: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.listingId, { publishingSince: args.on ? Date.now() : undefined });
    return null;
  },
});

/** The listing's own notebook, made at the first submit: no account owns it. */
export const ensureCopy = internalMutation({
  args: { listingId: v.id("listings"), sourceMode: v.union(v.literal("only_mine"), v.literal("mine_plus")) },
  handler: async (ctx, args): Promise<Id<"notebooks">> => {
    const listing = await ctx.db.get(args.listingId);
    if (listing === null) throw new ConvexError("Listing not found.");
    if (listing.notebookId !== undefined && (await ctx.db.get(listing.notebookId)) !== null) return listing.notebookId;
    const now = Date.now();
    const notebookId = await ctx.db.insert("notebooks", { title: listing.title, sourceMode: args.sourceMode, createdAt: now, updatedAt: now });
    await ctx.db.patch(listing._id, { notebookId });
    return notebookId;
  },
});

export const toolPlan = internalQuery({
  args: { listingId: v.id("listings"), sourceIds: v.array(v.id("sources")) },
  handler: async (ctx, args): Promise<Plan> => {
    const { profile, listing } = await ownListing(ctx, args.listingId);
    const copy = listing.notebookId === undefined ? null : await ctx.db.get(listing.notebookId);
    if (copy === null) throw new ConvexError("Listing not found.");
    return await planFor(ctx, profile, copy, args.sourceIds.map((sourceId) => ({ sourceId })));
  },
});

/** The text of the new version, for the exam paper flag. */
export const flagText = internalQuery({
  args: { sourceIds: v.array(v.id("sources")) },
  handler: async (ctx, args): Promise<string> => {
    let text = "";
    for (const id of args.sourceIds) {
      const s = await ctx.db.get(id);
      if (s === null) continue;
      text += `${s.title}\n`;
      for (const p of await ctx.db.query("pages").withIndex("by_source_page", (q) => q.eq("sourceId", id)).take(400)) {
        text += `${p.text}\n`;
        if (text.length > FLAG_CHARS) return text;
      }
    }
    return text;
  },
});

async function removeOutputs(ctx: MutationCtx, outputIds: readonly Id<"outputs">[]): Promise<void> {
  for (const id of outputIds) {
    for (const c of await ctx.db.query("cards").withIndex("by_output", (q) => q.eq("outputId", id)).take(500)) await ctx.db.delete(c._id);
    if ((await ctx.db.get(id)) !== null) await ctx.db.delete(id);
  }
}

/** Copies in the listing's notebook that neither the live version nor `keep` uses go. */
async function dropUnused(ctx: MutationCtx, listing: Doc<"listings">, keep: readonly Id<"sources">[]): Promise<void> {
  if (listing.notebookId === undefined) return;
  const used = new Set([...listing.sourceIds, ...keep] as string[]);
  const copyId = listing.notebookId;
  for (const s of await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", copyId)).collect()) {
    if (used.has(s._id) || s.deletingAt !== undefined) continue;
    await ctx.db.patch(s._id, { deletingAt: Date.now() });
    await startPurge(ctx, { kind: "source", id: s._id });
  }
}

/** A pending version replaced or turned down: its tools go, and copies only it used. */
async function dropPending(ctx: MutationCtx, listing: Doc<"listings">, keep: readonly Id<"sources">[]): Promise<void> {
  if (listing.pending === undefined) return;
  const live = new Set(listing.outputIds as string[]);
  await removeOutputs(ctx, listing.pending.outputIds.filter((id) => !live.has(id)));
  await dropUnused(ctx, listing, keep);
}

export const abandon = internalMutation({
  args: { listingId: v.id("listings"), outputIds: v.array(v.id("outputs")) },
  handler: async (ctx, args) => {
    await removeOutputs(ctx, args.outputIds);
    await ctx.db.patch(args.listingId, { publishingSince: undefined });
    return null;
  },
});

export const finishSubmit = internalMutation({
  args: { listingId: v.id("listings"), sourceIds: v.array(v.id("sources")), outputIds: v.array(v.id("outputs")), flag: v.union(v.string(), v.null()), details: v.union(v.object(detailsValidator), v.null()) },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (listing === null) throw new ConvexError("Listing not found.");
    await dropPending(ctx, listing, args.sourceIds);
    await ctx.db.patch(listing._id, {
      pending: { sourceIds: args.sourceIds, outputIds: args.outputIds, ...(args.flag === null ? {} : { flag: args.flag }), ...(args.details === null ? {} : { details: args.details }) },
      pendingAt: Date.now(),
      publishingSince: undefined,
      sellerNote: undefined,
    });
    return null;
  },
});

export type SubmitResult = { ok: true } | { ok: false; message: string };

/**
 * The seller sends the listing, or a new version of it, for approval. For a
 * live listing, `details` are the new words, shown once approved.
 */
export const submit = action({
  args: { listingId: v.id("listings"), rights: v.boolean(), details: v.optional(v.object(detailsValidator)) },
  handler: async (ctx, args): Promise<SubmitResult> => {
    await requireMarketInAction(ctx);
    if (!args.rights) return { ok: false, message: "Tick the box to confirm the notes are your own work, or that you have the right to sell them." };
    const details: Details | null = args.details === undefined ? null : cleanDetails(args.details);
    const p = await ctx.runQuery(internal.market.publish.plan, { listingId: args.listingId });
    if ("error" in p) return { ok: false, message: p.error };
    await ctx.runMutation(internal.market.publish.lock, { listingId: args.listingId, on: true });
    const made: Id<"outputs">[] = [];
    try {
      const copyId: Id<"notebooks"> = await ctx.runMutation(internal.market.publish.ensureCopy, { listingId: args.listingId, sourceMode: p.sourceMode });
      const sourceIds = p.masterSources === null ? p.copySourceIds : await copySources(ctx, copyId, p.masterSources);
      const c: Plan = await ctx.runQuery(internal.market.publish.toolPlan, { listingId: args.listingId, sourceIds });
      for (const tool of PACK_TOOLS) {
        const result: GenerateResult = await makeTool(ctx, c, { notebookId: copyId, mode: tool.mode, options: { ...tool.options } });
        if (!result.ok) {
          await ctx.runMutation(internal.market.publish.abandon, { listingId: args.listingId, outputIds: made });
          return { ok: false, message: result.message };
        }
        made.push(result.outputId);
      }
      const text: string = await ctx.runQuery(internal.market.publish.flagText, { sourceIds });
      const flag = examPaperFlag(`${details?.title ?? ""}\n${details?.description ?? ""}\n${text}`);
      await ctx.runMutation(internal.market.publish.finishSubmit, { listingId: args.listingId, sourceIds, outputIds: made, flag, details });
      return { ok: true };
    } catch (err) {
      await ctx.runMutation(internal.market.publish.abandon, { listingId: args.listingId, outputIds: made });
      throw err;
    }
  },
});

// ---------- The owner's queue ----------

export const queue = query({
  args: {},
  handler: async (ctx) => {
    await requireMarketOwner(ctx);
    const rows = await ctx.db.query("listings").withIndex("by_pending", (q) => q.gt("pendingAt", 0)).take(QUEUE);
    const out = [];
    for (const l of rows) {
      if (l.pending === undefined) continue;
      const seller = await ctx.db.get(l.sellerId);
      const sources = [];
      for (const id of l.pending.sourceIds) {
        const s = await ctx.db.get(id);
        if (s === null) continue;
        const first = await ctx.db.query("pages").withIndex("by_source_page", (q) => q.eq("sourceId", id)).first();
        sources.push({ title: s.title, pages: s.pageCount, firstPage: first?.text.slice(0, 600) ?? "" });
      }
      const d = l.pending.details ?? l;
      out.push({ _id: l._id, title: d.title, subject: d.subject, level: d.level, exam: d.exam, description: d.description, seller: seller?.realName ?? "", newVersion: l.version > 0, flag: l.pending.flag ?? null, sources, pendingAt: l.pendingAt ?? 0 });
    }
    return out;
  },
});

type ApprovalPlan = { payerId: Id<"profiles">; title: string; sourceIds: Id<"sources">[]; outputIds: Id<"outputs">[] };

export const approvalPlan = internalQuery({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args): Promise<ApprovalPlan | { error: string }> => {
    const { profile } = await requireMarketOwner(ctx);
    const listing = await ctx.db.get(args.listingId);
    if (listing === null || listing.pending === undefined) return { error: "Nothing is waiting on this listing." };
    // The seller pays for the checks, as for the tools; the owner once the seller's account is gone.
    return { payerId: listing.profileId ?? profile._id, title: listing.pending.details?.title ?? listing.title, sourceIds: listing.pending.sourceIds, outputIds: listing.pending.outputIds };
  },
});

export const finishApprove = internalMutation({
  args: { listingId: v.id("listings"), adultsOnly: v.boolean(), note: v.union(v.string(), v.null()) },
  handler: async (ctx, args): Promise<number> => {
    const listing = await ctx.db.get(args.listingId);
    if (listing === null || listing.pending === undefined) throw new ConvexError("Nothing is waiting on this listing.");
    const now = Date.now();
    const p = listing.pending;
    const version = listing.version + 1;
    await ctx.db.patch(listing._id, {
      ...(p.details ?? {}),
      status: "live",
      version,
      sourceIds: p.sourceIds,
      outputIds: p.outputIds,
      pending: undefined,
      pendingAt: undefined,
      adultsOnly: args.adultsOnly,
      sellerNote: args.note ?? undefined,
      liveAt: listing.liveAt ?? now,
    });
    if (listing.notebookId !== undefined) await ctx.db.patch(listing.notebookId, { title: p.details?.title ?? listing.title, updatedAt: now });
    await dropUnused(ctx, { ...listing, sourceIds: p.sourceIds }, []);
    return version;
  },
});

export type ApproveResult = { ok: true; adultsOnly: boolean } | { ok: false; message: string };

/** The owner approves the waiting version. The under 18 checks decide whether under 18s may see it. */
export const approve = action({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args): Promise<ApproveResult> => {
    await requireMarketOwnerInAction(ctx);
    const p = await ctx.runQuery(internal.market.publish.approvalPlan, { listingId: args.listingId });
    if ("error" in p) return { ok: false, message: p.error };
    const found = await checkForMinors(ctx, { payerId: p.payerId, sourceIds: p.sourceIds, outputIds: p.outputIds, key: { listing: p.title } });
    if (found.unchecked) return { ok: false, message: "Taku could not check it for learners under 18 just now. Try again in a moment." };
    const adultsOnly = found.blocked.length > 0;
    const note = adultsOnly ? `Shown to adults only, because ${found.blocked.length === 1 ? "this did" : "these did"} not pass the check for learners under 18: ${found.blocked.join(", ")}.` : null;
    await ctx.runMutation(internal.market.publish.finishApprove, { listingId: args.listingId, adultsOnly, note });
    return { ok: true, adultsOnly };
  },
});

/** The owner turns the waiting version down, saying why. A live version stays as it was. */
export const reject = mutation({
  args: { listingId: v.id("listings"), reason: v.string() },
  handler: async (ctx, args) => {
    await requireMarketOwner(ctx);
    const listing = await ctx.db.get(args.listingId);
    if (listing === null || listing.pending === undefined) throw new ConvexError("Nothing is waiting on this listing.");
    const reason = args.reason.trim().replace(/\s+/g, " ").slice(0, 400);
    if (reason.length < 5) throw new ConvexError("Say why, so the seller can fix it.");
    await dropPending(ctx, listing, []);
    await ctx.db.patch(listing._id, { pending: undefined, pendingAt: undefined, sellerNote: `Not approved: ${reason}` });
    return null;
  },
});
