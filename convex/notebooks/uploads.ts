import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { envNumber } from "../lib/env";

/**
 * Uploads (audit S3). A learner asks for an upload and gets a ticket (an
 * uploads row) with the upload address. Adding the file as a source needs
 * that ticket: it must be the caller's, unused and under an hour old, and the
 * file must not belong to anyone already. That binds every stored file to the
 * account that uploaded it. Limits:
 *   UPLOADS_PER_MINUTE   tickets one learner can ask for in a minute
 *   OPEN_TICKETS         tickets waiting for a file at one time
 *   STORAGE_QUOTA_MB     bytes of files one account can hold (default 500 MB)
 * Tickets nobody used and files nobody claimed are swept after an hour.
 */

export const UPLOADS_PER_MINUTE = 30;
export const OPEN_TICKETS = 60;
export const DEFAULT_STORAGE_QUOTA_MB = 500;
export const UNCLAIMED_MS = 60 * 60 * 1000;
const WINDOW_MS = 60 * 1000;
const SWEEP_BATCH = 200;

export const UPLOAD_ERRORS = {
  busy: "That is a lot of files at once. Wait a minute, then add the rest.",
  full: "Your storage is full. Delete a source or a notebook you no longer need, then try again.",
  ticket: "The upload did not arrive. Try again.",
} as const;

export function storageQuotaBytes(): number {
  return envNumber("STORAGE_QUOTA_MB", DEFAULT_STORAGE_QUOTA_MB) * 1024 * 1024;
}

/** A ticket for one upload, after the per minute limit and the quota pass. */
export async function issueUpload(ctx: MutationCtx, profile: Doc<"profiles">): Promise<Id<"uploads">> {
  const now = Date.now();
  if ((profile.storageBytes ?? 0) >= storageQuotaBytes()) throw new ConvexError(UPLOAD_ERRORS.full);
  const row = await ctx.db.query("aiStarts").withIndex("by_profile_kind", (q) => q.eq("profileId", profile._id).eq("kind", "upload")).unique();
  if (row === null) await ctx.db.insert("aiStarts", { profileId: profile._id, kind: "upload", windowStart: now, count: 1 });
  else if (now - row.windowStart >= WINDOW_MS) await ctx.db.patch(row._id, { windowStart: now, count: 1 });
  else if (row.count >= UPLOADS_PER_MINUTE) throw new ConvexError(UPLOAD_ERRORS.busy);
  else await ctx.db.patch(row._id, { count: row.count + 1 });
  const recent = await ctx.db.query("uploads").withIndex("by_profile", (q) => q.eq("profileId", profile._id).gt("createdAt", now - UNCLAIMED_MS)).collect();
  if (recent.filter((u) => u.claimedAt === undefined).length >= OPEN_TICKETS) throw new ConvexError(UPLOAD_ERRORS.busy);
  return await ctx.db.insert("uploads", { profileId: profile._id, createdAt: now });
}

/**
 * Binds a stored file to the caller's ticket and returns the file's size and
 * type. Throws when the ticket or the file is not the caller's to use; the
 * file is left alone then, because it may be someone else's.
 */
export async function claimUpload(ctx: MutationCtx, profile: Doc<"profiles">, uploadId: Id<"uploads">, storageId: Id<"_storage">): Promise<{ size: number; contentType: string }> {
  const now = Date.now();
  const ticket = await ctx.db.get(uploadId);
  if (ticket === null || ticket.profileId !== profile._id || ticket.claimedAt !== undefined || ticket.createdAt < now - UNCLAIMED_MS) throw new ConvexError(UPLOAD_ERRORS.ticket);
  const taken = (await ctx.db.query("uploads").withIndex("by_storage", (q) => q.eq("storageId", storageId)).first()) ?? (await ctx.db.query("sources").withIndex("by_storage", (q) => q.eq("storageId", storageId)).first());
  if (taken !== null) throw new ConvexError(UPLOAD_ERRORS.ticket);
  const meta = await ctx.db.system.get(storageId);
  // The file must have arrived after the ticket was made (a second of slack for clocks).
  if (meta === null || meta._creationTime < ticket.createdAt - 1000) throw new ConvexError(UPLOAD_ERRORS.ticket);
  await ctx.db.patch(ticket._id, { storageId, bytes: meta.size, claimedAt: now });
  await ctx.db.patch(profile._id, { storageBytes: (profile.storageBytes ?? 0) + meta.size });
  return { size: meta.size, contentType: meta.contentType ?? "" };
}

/** Gives back a claimed file that turned out unusable: the file, its ticket and its bytes. */
export async function dropUpload(ctx: MutationCtx, profile: Doc<"profiles">, uploadId: Id<"uploads">): Promise<void> {
  const ticket = await ctx.db.get(uploadId);
  if (ticket === null || ticket.profileId !== profile._id) return;
  if (ticket.storageId !== undefined && (await ctx.db.system.get(ticket.storageId)) !== null) await ctx.storage.delete(ticket.storageId);
  await ctx.db.delete(ticket._id);
  const fresh = await ctx.db.get(profile._id);
  if (fresh !== null) await ctx.db.patch(profile._id, { storageBytes: Math.max(0, (fresh.storageBytes ?? 0) - (ticket.bytes ?? 0)) });
}

export async function readCursor(ctx: MutationCtx, name: string): Promise<{ id: Id<"sweepCursors"> | null; value: number }> {
  const row = await ctx.db.query("sweepCursors").withIndex("by_name", (q) => q.eq("name", name)).unique();
  return { id: row?._id ?? null, value: row?.value ?? 0 };
}

export async function writeCursor(ctx: MutationCtx, name: string, id: Id<"sweepCursors"> | null, value: number): Promise<void> {
  if (id === null) await ctx.db.insert("sweepCursors", { name, value });
  else await ctx.db.patch(id, { value });
}

/**
 * Hourly (crons.ts). Unused tickets older than an hour go; then stored files
 * older than an hour that no ticket and no source holds go too. Files are
 * walked oldest first from where the last run stopped, a batch per step.
 */
export const sweep = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ tickets: number; files: number }> => {
    const cutoff = Date.now() - UNCLAIMED_MS;
    let tickets = 0;
    for (const row of await ctx.db.query("uploads").withIndex("by_created", (q) => q.lt("createdAt", cutoff)).take(SWEEP_BATCH)) {
      if (row.claimedAt !== undefined) continue;
      await ctx.db.delete(row._id);
      tickets++;
    }
    const at = await readCursor(ctx, "storage");
    const batch = await ctx.db.system.query("_storage").withIndex("by_creation_time", (q) => q.gt("_creationTime", at.value).lt("_creationTime", cutoff)).take(SWEEP_BATCH);
    let files = 0;
    for (const file of batch) {
      const held = (await ctx.db.query("uploads").withIndex("by_storage", (q) => q.eq("storageId", file._id)).first()) ?? (await ctx.db.query("sources").withIndex("by_storage", (q) => q.eq("storageId", file._id)).first());
      if (held !== null) continue;
      await ctx.storage.delete(file._id);
      files++;
    }
    if (batch.length > 0) await writeCursor(ctx, "storage", at.id, batch[batch.length - 1]._creationTime);
    if (batch.length === SWEEP_BATCH) await ctx.scheduler.runAfter(0, internal.notebooks.uploads.sweep, {});
    return { tickets, files };
  },
});

/**
 * One off, after the deploy that adds uploads: gives each account its byte
 * count from the files its sources already hold. Run with
 * `npx convex run notebooks/uploads:backfill`; it walks the sources a batch at a time.
 */
export const backfill = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ sources: number; done: boolean }> => {
    const at = await readCursor(ctx, "uploads_backfill");
    const batch = await ctx.db.query("sources").withIndex("by_creation_time", (q) => q.gt("_creationTime", at.value)).take(SWEEP_BATCH);
    let sources = 0;
    for (const source of batch) {
      if (source.storageId === undefined) continue;
      const storageId = source.storageId;
      if ((await ctx.db.query("uploads").withIndex("by_storage", (q) => q.eq("storageId", storageId)).first()) !== null) continue;
      const meta = await ctx.db.system.get(storageId);
      const profile = await ctx.db.get(source.profileId);
      if (meta === null || profile === null) continue;
      await ctx.db.insert("uploads", { profileId: profile._id, storageId, bytes: meta.size, createdAt: source.createdAt, claimedAt: source.createdAt });
      await ctx.db.patch(profile._id, { storageBytes: (profile.storageBytes ?? 0) + meta.size });
      sources++;
    }
    if (batch.length > 0) await writeCursor(ctx, "uploads_backfill", at.id, batch[batch.length - 1]._creationTime);
    const done = batch.length < SWEEP_BATCH;
    if (!done) await ctx.scheduler.runAfter(0, internal.notebooks.uploads.backfill, {});
    return { sources, done };
  },
});
