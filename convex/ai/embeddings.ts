import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { ConvexError } from "convex/values";
import { embeddingsOn } from "../lib/env";
import { EMBEDDING_DIMENSIONS } from "../schema";
import { EMBED_USD_PER_TOKEN } from "./models";

/**
 * Embeddings for notebook search (SPEC.md D8, audit U2). Each chunk gets a
 * vector when its source is read; questions are matched by meaning as well
 * as by words (convex/notebooks/ask.ts). The model call lives in the router,
 * on a zero data retention route (DECISIONS.md, Stage 1). In mock mode the
 * vectors are made here from the words alone, the same every time, so tests
 * need no fixtures and call no model.
 */

/** Chunks sent to the model in one call, and calls one action run makes before it hands over to the next run. */
const BATCH = 32;
const BATCHES_PER_RUN = 30;

function hash32(text: string): number {
  // FNV 1a.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Length 1, or all zeros when there is nothing to measure. */
export function unit(vector: readonly number[]): number[] {
  const length = Math.sqrt(vector.reduce((n, x) => n + x * x, 0));
  return length === 0 ? [...vector] : vector.map((x) => x / length);
}

/**
 * Mock mode only: a bag of words hashed into EMBEDDING_DIMENSIONS buckets.
 * Texts that share words land close together, which is all the tests need.
 * It says nothing about what a real model would rank first.
 */
export function fakeEmbedding(text: string): number[] {
  const out = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  for (const word of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (word.length < 3) continue;
    const h = hash32(word);
    out[h % EMBEDDING_DIMENSIONS] += (h & 0x80000000) === 0 ? 1 : -1;
  }
  return unit(out);
}

/**
 * The first EMBEDDING_DIMENSIONS numbers of a longer vector, rescaled to
 * length 1. The model in use is trained so that a prefix of its vector is
 * itself a usable embedding, which keeps a chunk's row small.
 */
export function shorten(vector: readonly number[]): number[] | null {
  if (vector.length < EMBEDDING_DIMENSIONS || vector.some((x) => typeof x !== "number" || !Number.isFinite(x))) return null;
  return unit(vector.slice(0, EMBEDDING_DIMENSIONS));
}

/** Reciprocal rank fusion of ranked id lists: an id high in either list ranks high. */
export function fuse(lists: readonly (readonly string[])[], k = 60): string[] {
  const score = new Map<string, number>();
  for (const list of lists) list.forEach((id, i) => score.set(id, (score.get(id) ?? 0) + 1 / (k + i + 1)));
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

type Pending = { profileId: Id<"profiles"> | null; chunks: { _id: Id<"chunks">; text: string }[]; more: boolean; last: number };

export const pending = internalQuery({
  args: { sourceId: v.id("sources"), after: v.number() },
  handler: async (ctx, args): Promise<Pending> => {
    const source = await ctx.db.get(args.sourceId);
    if (source === null || source.deletingAt !== undefined || source.status !== "ready") return { profileId: null, chunks: [], more: false, last: args.after };
    const rows = await ctx.db.query("chunks").withIndex("by_source", (q) => q.eq("sourceId", args.sourceId).gt("_creationTime", args.after)).take(BATCH);
    return {
      profileId: source.profileId,
      chunks: rows.filter((c) => c.embedding === undefined).map((c) => ({ _id: c._id, text: c.text })),
      more: rows.length === BATCH,
      // The walk is by creation time: the last row seen, embedded or not.
      last: rows.length === 0 ? args.after : rows[rows.length - 1]._creationTime,
    };
  },
});

export const save = internalMutation({
  args: { rows: v.array(v.object({ chunkId: v.id("chunks"), embedding: v.array(v.float64()) })) },
  handler: async (ctx, args) => {
    for (const row of args.rows) if ((await ctx.db.get(row.chunkId)) !== null) await ctx.db.patch(row.chunkId, { embedding: row.embedding });
  },
});

export const markEmbedded = internalMutation({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, args) => {
    if ((await ctx.db.get(args.sourceId)) !== null) await ctx.db.patch(args.sourceId, { embeddedAt: Date.now() });
  },
});

const CHECK_TEXTS = [
  "Chlorophyll in the chloroplasts absorbs the light that plants use to make glucose.",
  "Plants absorb light in their leaves to make glucose.",
  "The Second World War ended in 1945.",
];

/**
 * The capped live check of the embedding route (DECISIONS.md, Stage 1), run
 * once by the owner before EMBEDDINGS_MODE goes on:
 * `npx convex run ai/embeddings:liveCheck '{"capUsd": 0.10}'` on the
 * production deployment. Three short texts, one call. The worst case (every
 * character a token, at ten times the listed price) must fit in the cap.
 */
export const liveCheck = internalAction({
  args: { capUsd: v.number() },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    if (args.capUsd <= 0 || args.capUsd > 1) throw new ConvexError("capUsd must be above 0 and at most 1.");
    const worst = CHECK_TEXTS.join("").length * EMBED_USD_PER_TOKEN * 10;
    if (worst > args.capUsd) throw new ConvexError("The cap is too small for the check.");
    const result: { ok: boolean; vectors: number[][]; costUsd: number } = await ctx.runAction(internal.ai.router.embed, { inputs: CHECK_TEXTS });
    await ctx.runMutation(internal.ai.usage.record, { profileId: "owner", tool: "embed_check", costUsd: result.costUsd });
    if (!result.ok) return { ok: false, costUsd: result.costUsd, reason: "the route did not answer with usable vectors" };
    const dot = (a: number[], b: number[]) => a.reduce((n, x, i) => n + x * b[i], 0);
    const [plant, leaves, war] = result.vectors;
    const near = dot(plant, leaves);
    const far = dot(plant, war);
    return {
      ok: result.vectors.every((x) => x.length === EMBEDDING_DIMENSIONS) && near > far,
      dimensions: result.vectors.map((x) => x.length),
      similarRelated: Math.round(near * 1000) / 1000,
      similarUnrelated: Math.round(far * 1000) / 1000,
      costUsd: result.costUsd,
      capUsd: args.capUsd,
    };
  },
});

/** Gives every chunk of one source its vector. Stops quietly at the spending caps; the daily backfill tries again. */
export const embedSource = internalAction({
  args: { sourceId: v.id("sources"), after: v.optional(v.number()) },
  handler: async (ctx, args): Promise<void> => {
    let after = args.after ?? 0;
    for (let i = 0; i < BATCHES_PER_RUN; i++) {
      const page: Pending = await ctx.runQuery(internal.ai.embeddings.pending, { sourceId: args.sourceId, after });
      if (page.profileId === null) return;
      if (page.chunks.length > 0) {
        const room = await ctx.runQuery(internal.ai.usage.check, { profileId: page.profileId });
        if (!room.allowed) return;
        const result: { ok: boolean; vectors: number[][]; costUsd: number } = await ctx.runAction(internal.ai.router.embed, { inputs: page.chunks.map((c) => c.text) });
        await ctx.runMutation(internal.ai.usage.record, { profileId: page.profileId, tool: "embed", costUsd: result.costUsd });
        if (!result.ok || result.vectors.length !== page.chunks.length) return;
        await ctx.runMutation(internal.ai.embeddings.save, { rows: page.chunks.map((c, n) => ({ chunkId: c._id, embedding: result.vectors[n] })) });
      }
      if (!page.more) {
        await ctx.runMutation(internal.ai.embeddings.markEmbedded, { sourceId: args.sourceId });
        return;
      }
      after = page.last;
    }
    await ctx.scheduler.runAfter(0, internal.ai.embeddings.embedSource, { sourceId: args.sourceId, after });
  },
});

const SOURCES_PER_STEP = 100;
/** Sources one backfill step starts on, so a big backlog does not start a thousand model calls at once. */
const STARTS_PER_STEP = 10;

/**
 * Chunks from before embeddings existed, and sources whose embedding stopped
 * at a spending cap. Daily (crons.ts), and once by hand after the deploy:
 * `npx convex run ai/embeddings:backfill`. Walks the sources oldest first.
 */
export const backfill = internalMutation({
  args: { after: v.optional(v.number()) },
  handler: async (ctx, args): Promise<{ started: number; done: boolean }> => {
    if (!embeddingsOn()) return { started: 0, done: true };
    const batch = await ctx.db.query("sources").withIndex("by_creation_time", (q) => q.gt("_creationTime", args.after ?? 0)).take(SOURCES_PER_STEP);
    let started = 0;
    let last = args.after ?? 0;
    for (const source of batch) {
      if (started >= STARTS_PER_STEP) break;
      last = source._creationTime;
      if (source.status !== "ready" || source.embeddedAt !== undefined || source.deletingAt !== undefined) continue;
      await ctx.scheduler.runAfter(started * 2000, internal.ai.embeddings.embedSource, { sourceId: source._id });
      started++;
    }
    const done = batch.length < SOURCES_PER_STEP && started < STARTS_PER_STEP;
    if (!done) await ctx.scheduler.runAfter(60_000, internal.ai.embeddings.backfill, { after: last });
    return { started, done };
  },
});
