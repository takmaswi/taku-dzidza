import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action, internalMutation, internalQuery, mutation } from "../_generated/server";
import type { RouterResult } from "../ai/router";
import { secondOpinion } from "../ai/secondOpinion";
import { PROMPTS } from "../data/generated";
import { claimUpload, dropUpload, issueUpload } from "../notebooks/uploads";
import type { QuizContent } from "../study/shapes";
import { ownClass, requireTeacherInAction } from "./access";
import { clampMarks, markTarget, saveMarks } from "./assignments";

/**
 * Photographed scripts (the one phone classroom). The teacher photographs a
 * learner's answers; Taku reads each answer and marks it against the paper's
 * scheme; a second model checks each mark. Every mark stays a draft until the
 * teacher confirms it, and the questions the check did not agree with (or
 * could not judge) are shown first. The photos are deleted as soon as the
 * marking ends, whether it worked or not.
 */

export const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

/** The image type from the file's first bytes; the upload's own content type is not trusted. */
export function sniffImage(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length > 12 && String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export const MARKING_ERRORS = {
  photo: "Send photos of the script: JPG, PNG or WEBP, up to 8 MB each.",
  failed: "Taku could not mark this script just now. Try again, or type the marks.",
  limit: "Taku has done all the marking allowed today. Type the marks, or try again tomorrow.",
} as const;

const SCHEMA = {
  name: "script_marks",
  strict: true,
  schema: {
    type: "object",
    properties: {
      marks: {
        type: "array",
        items: {
          type: "object",
          properties: { number: { type: "number" }, answer: { type: "string" }, got: { type: "number" }, reason: { type: "string" } },
          required: ["number", "answer", "got", "reason"],
          additionalProperties: false,
        },
      },
    },
    required: ["marks"],
    additionalProperties: false,
  },
};

export const uploadUrl = mutation({
  args: { classId: v.id("classes") },
  handler: async (ctx, args): Promise<{ url: string; uploadId: Id<"uploads"> }> => {
    const { profile } = await ownClass(ctx, args.classId);
    return { url: await ctx.storage.generateUploadUrl(), uploadId: await issueUpload(ctx, profile) };
  },
});

const whoArgs = { enrolmentId: v.optional(v.id("enrolments")), rosterId: v.optional(v.id("rosterNames")) };
const photosArg = v.array(v.object({ uploadId: v.id("uploads"), storageId: v.id("_storage") }));

/** Binds the photos to the teacher and checks them. Returns the scheme to mark against. */
export const prepare = internalMutation({
  args: { assignmentId: v.id("assignments"), ...whoArgs, photos: photosArg },
  handler: async (ctx, args): Promise<{ content: QuizContent } | { error: string }> => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (assignment === null) throw new ConvexError("Not found.");
    const { profile, cls } = await ownClass(ctx, assignment.classId);
    await markTarget(ctx, cls, args);
    if (args.photos.length < 1 || args.photos.length > MAX_PHOTOS) return { error: MARKING_ERRORS.photo };
    for (const p of args.photos) {
      const meta = await claimUpload(ctx, profile, p.uploadId, p.storageId);
      if (meta.size > MAX_PHOTO_BYTES) return { error: MARKING_ERRORS.photo };
    }
    return { content: assignment.content as QuizContent };
  },
});

/** Deletes the photos. Runs after every marking, worked or not. */
export const release = internalMutation({
  args: { classId: v.id("classes"), uploadIds: v.array(v.id("uploads")) },
  handler: async (ctx, args) => {
    const { profile } = await ownClass(ctx, args.classId);
    for (const id of args.uploadIds) await dropUpload(ctx, profile, id);
    return null;
  },
});

export const saveDraft = internalMutation({
  args: { assignmentId: v.id("assignments"), ...whoArgs, marks: v.array(v.object({ number: v.number(), got: v.number() })), check: v.array(v.number()), notes: v.array(v.object({ number: v.number(), answer: v.string(), reason: v.string() })) },
  handler: async (ctx, args): Promise<{ score: number; total: number }> => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (assignment === null) throw new ConvexError("Not found.");
    const { cls } = await ownClass(ctx, assignment.classId);
    const target = await markTarget(ctx, cls, args);
    const perQuestion = clampMarks(assignment.content as QuizContent, args.marks);
    await saveMarks(ctx, assignment, target, { via: "photo", perQuestion, confirmed: false, check: args.check, notes: args.notes });
    return { score: perQuestion.reduce((n, q) => n + q.got, 0), total: perQuestion.reduce((n, q) => n + q.marks, 0) };
  },
});

export const assignmentClass = internalQuery({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args): Promise<Id<"classes"> | null> => (await ctx.db.get(args.assignmentId))?.classId ?? null,
});

function base64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

export function schemeText(content: QuizContent): string {
  return content.questions
    .map((q) => `Question ${q.number} (${q.marks} marks): ${q.prompt}\nAnswer: ${q.answer}\nMarking points: ${q.markingPoints.join("; ") || q.answer}`)
    .join("\n\n");
}

export type Read = { number: number; answer: string; got: number; reason: string };

export function readMarks(content: QuizContent, raw: string): Read[] | null {
  try {
    const parsed = JSON.parse(raw) as { marks?: { number?: unknown; answer?: unknown; got?: unknown; reason?: unknown }[] };
    if (!Array.isArray(parsed.marks)) return null;
    const byNumber = new Map(parsed.marks.map((m) => [Number(m.number), m]));
    return content.questions.map((q) => {
      const m = byNumber.get(q.number);
      const got = Math.max(0, Math.min(q.marks, Math.round(Number(m?.got ?? 0)) || 0));
      return { number: q.number, answer: String(m?.answer ?? "").slice(0, 2000), got, reason: String(m?.reason ?? "").slice(0, 300) };
    });
  } catch {
    return null;
  }
}

/** What the second opinion reads for each question: the question, the scheme, the answer read, and the marks given. */
export function opinionItems(content: QuizContent, read: readonly Read[]): { id: string; text: string }[] {
  return read.map((r) => {
    const q = content.questions.find((x) => x.number === r.number)!;
    return { id: String(r.number), text: `Question ${q.number} (${q.marks} marks): ${q.prompt}\nMarking scheme: ${q.answer}; ${q.markingPoints.join("; ")}\nAnswer read from the script: ${r.answer || "(no answer)"}\nMarks given: ${r.got}` };
  });
}

export type MarkScriptResult = { ok: true; score: number; total: number; check: number[] } | { ok: false; message: string };

export const markScript = action({
  args: { assignmentId: v.id("assignments"), ...whoArgs, photos: photosArg },
  handler: async (ctx, args): Promise<MarkScriptResult> => {
    const classId: Id<"classes"> | null = await ctx.runQuery(internal.classes.marking.assignmentClass, { assignmentId: args.assignmentId });
    if (classId === null) throw new ConvexError("Not found.");
    const teacherId = await requireTeacherInAction(ctx, classId);
    const who = { enrolmentId: args.enrolmentId, rosterId: args.rosterId };
    try {
      const ready: { content: QuizContent } | { error: string } = await ctx.runMutation(internal.classes.marking.prepare, { assignmentId: args.assignmentId, ...who, photos: args.photos });
      if ("error" in ready) return { ok: false, message: ready.error };
      const room = await ctx.runQuery(internal.ai.usage.check, { profileId: teacherId });
      if (!room.allowed) return { ok: false, message: MARKING_ERRORS.limit };
      const parts = [];
      let bytes = 0;
      for (const p of args.photos) {
        const blob = await ctx.storage.get(p.storageId);
        if (blob === null) return { ok: false, message: MARKING_ERRORS.photo };
        const data = new Uint8Array(await blob.arrayBuffer());
        const type = sniffImage(data);
        if (type === null) return { ok: false, message: MARKING_ERRORS.photo };
        bytes += data.length;
        parts.push({ type: "image_url" as const, image_url: { url: `data:${type};base64,${base64(data)}` } });
      }
      const result: RouterResult = await ctx.runAction(internal.ai.router.call, {
        tier: "main",
        purpose: "script_mark",
        messages: [
          { role: "system", content: PROMPTS["script-mark"].replace("{{SCHEME}}", schemeText(ready.content)) },
          { role: "user", content: parts },
        ],
        jsonSchema: SCHEMA,
        maxTokens: 4000,
        reasoningEffort: "none",
        fixtureKey: { kind: "script_mark", paper: ready.content.title, photos: args.photos.length, bytes },
      });
      await ctx.runMutation(internal.ai.usage.record, { profileId: teacherId, tool: "script_mark", costUsd: result.costUsd });
      const read = result.ok ? readMarks(ready.content, result.content) : null;
      if (read === null) return { ok: false, message: MARKING_ERRORS.failed };
      const opinion = await secondOpinion(ctx, { profileId: teacherId, check: "script", items: opinionItems(ready.content, read) });
      const check = read.filter((r) => opinion.rejected.has(String(r.number)) || opinion.unchecked.has(String(r.number)) || r.answer.includes("[unreadable]")).map((r) => r.number);
      const saved: { score: number; total: number } = await ctx.runMutation(internal.classes.marking.saveDraft, {
        assignmentId: args.assignmentId,
        ...who,
        marks: read.map((r) => ({ number: r.number, got: r.got })),
        check,
        notes: read.map((r) => ({ number: r.number, answer: r.answer, reason: r.reason })),
      });
      return { ok: true, ...saved, check };
    } finally {
      await ctx.runMutation(internal.classes.marking.release, { classId, uploadIds: args.photos.map((p) => p.uploadId) });
    }
  },
});

/** The teacher checks a draft, changes any marks, and confirms it. Only then does it count in results. */
export const confirm = mutation({
  args: { markId: v.id("classMarks"), marks: v.array(v.object({ number: v.number(), got: v.number() })) },
  handler: async (ctx, args) => {
    const mark = await ctx.db.get(args.markId);
    if (mark === null) throw new ConvexError("Not found.");
    await ownClass(ctx, mark.classId);
    const assignment = await ctx.db.get(mark.assignmentId);
    if (assignment === null) throw new ConvexError("Not found.");
    const perQuestion = clampMarks(assignment.content as QuizContent, args.marks);
    const fields: Partial<Doc<"classMarks">> = { perQuestion, score: perQuestion.reduce((n, q) => n + q.got, 0), total: perQuestion.reduce((n, q) => n + q.marks, 0), confirmed: true };
    await ctx.db.patch(mark._id, fields);
    return null;
  },
});
