import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type QueryCtx } from "../_generated/server";
import { newConsentRequest } from "../accounts/consent";
import { requireProfile } from "../lib/access";
import { teacherModeOn } from "../lib/env";
import { tokenHash } from "../lib/tokens";
import { isAdult, requireGuardian, TEACHER_OFF } from "./access";
import { cryptoRandom, firstName, normaliseCode, randomCode, validCode, validFirstName } from "./codes";
import { pendingClassRequests } from "./requests";
import { enrolmentApproved } from "../organisations/members";
import { withRole } from "./roles";

/**
 * Guardians with their own account (Stage 2). A guardian adds a child: they
 * get a one time code, and the child types it in their own account. The
 * guardian then gives consent once, signed in, with the usual phone code
 * (convex/accounts/consent.ts); that consent lets this account answer the
 * child's class requests with one tap. A link alone gives no say: only an
 * account that gave the standing consent can decide.
 */

const CODE_DAYS = 7;
const OPEN_CODES = 5;
const CODE_TRIES_PER_HOUR = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export const CHILD_CODE_ERRORS = {
  code: "That code did not work. Check it with your guardian.",
  tries: "Too many tries. Wait an hour and try again.",
  adult: "Guardian links are for learners under 18.",
  self: "You cannot use your own code.",
} as const;

/** True when this guardian account gave the consent that stands for this child. */
export async function decidesFor(ctx: QueryCtx, guardian: Doc<"profiles">, childProfileId: Id<"profiles">): Promise<boolean> {
  const child = await ctx.db.get(childProfileId);
  if (child === null || child.consentState !== "given") return false;
  const consent = await ctx.db.query("consents").withIndex("by_profile", (q) => q.eq("profileId", childProfileId)).order("desc").first();
  return consent !== null && consent.withdrawnAt === undefined && consent.guardianProfileId === guardian._id;
}

export const createChildCode = mutation({
  args: { firstName: v.string() },
  handler: async (ctx, args): Promise<{ code: string }> => {
    const { profile } = await requireGuardian(ctx);
    const name = args.firstName.trim().replace(/\s+/g, " ");
    if (!validFirstName(name)) throw new ConvexError("Type the child's first name only.");
    const now = Date.now();
    const open = (await ctx.db.query("childCodes").withIndex("by_guardian", (q) => q.eq("guardianProfileId", profile._id)).take(50)).filter((c) => c.usedAt === undefined && c.expiresAt > now);
    if (open.length >= OPEN_CODES) throw new ConvexError("You have codes waiting to be used. Use one of those first.");
    const code = randomCode(cryptoRandom);
    await ctx.db.insert("childCodes", { guardianProfileId: profile._id, codeHash: await tokenHash(code), firstName: name, createdAt: now, expiresAt: now + CODE_DAYS * DAY_MS });
    await ctx.db.patch(profile._id, { roles: withRole(profile, "guardian", true) });
    return { code };
  },
});

/** The child types their guardian's code. Works before consent too, so the guardian can then give it. */
export const redeemChildCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args): Promise<{ ok: true } | { ok: false; message: string }> => {
    if (!teacherModeOn()) throw new ConvexError(TEACHER_OFF);
    const { profile } = await requireProfile(ctx);
    if (isAdult(profile)) return { ok: false, message: CHILD_CODE_ERRORS.adult };
    const now = Date.now();
    const tries = await ctx.db.query("aiStarts").withIndex("by_profile_kind", (q) => q.eq("profileId", profile._id).eq("kind", "code")).unique();
    if (tries !== null && now - tries.windowStart < HOUR_MS && tries.count >= CODE_TRIES_PER_HOUR) return { ok: false, message: CHILD_CODE_ERRORS.tries };
    if (tries === null) await ctx.db.insert("aiStarts", { profileId: profile._id, kind: "code", windowStart: now, count: 1 });
    else if (now - tries.windowStart >= HOUR_MS) await ctx.db.patch(tries._id, { windowStart: now, count: 1 });
    else await ctx.db.patch(tries._id, { count: tries.count + 1 });
    const code = normaliseCode(args.code);
    if (!validCode(code)) return { ok: false, message: CHILD_CODE_ERRORS.code };
    const hash = await tokenHash(code);
    const row = await ctx.db.query("childCodes").withIndex("by_code", (q) => q.eq("codeHash", hash)).first();
    if (row === null || row.usedAt !== undefined || row.expiresAt < now) return { ok: false, message: CHILD_CODE_ERRORS.code };
    if (row.guardianProfileId === profile._id) return { ok: false, message: CHILD_CODE_ERRORS.self };
    const links = await ctx.db.query("guardianLinks").withIndex("by_child", (q) => q.eq("childProfileId", profile._id)).take(20);
    if (!links.some((l) => l.guardianProfileId === row.guardianProfileId)) await ctx.db.insert("guardianLinks", { guardianProfileId: row.guardianProfileId, childProfileId: profile._id, createdAt: now });
    await ctx.db.patch(row._id, { usedAt: now });
    return { ok: true };
  },
});

/** The guardian's family page: linked children, their class requests, and codes not used yet. */
export const family = query({
  args: {},
  handler: async (ctx) => {
    const { profile } = await requireGuardian(ctx);
    const children = [];
    for (const link of await ctx.db.query("guardianLinks").withIndex("by_guardian", (q) => q.eq("guardianProfileId", profile._id)).take(20)) {
      const child = await ctx.db.get(link.childProfileId);
      if (child === null || child.deletingAt !== undefined) continue;
      const decides = await decidesFor(ctx, profile, child._id);
      children.push({
        childProfileId: child._id,
        firstName: firstName(child.displayName),
        consentState: child.consentState,
        decides,
        requests: decides ? await pendingClassRequests(ctx, child._id) : [],
      });
    }
    const now = Date.now();
    const codes = (await ctx.db.query("childCodes").withIndex("by_guardian", (q) => q.eq("guardianProfileId", profile._id)).take(50))
      .filter((c) => c.usedAt === undefined && c.expiresAt > now)
      .map((c) => ({ firstName: c.firstName, expiresAt: c.expiresAt }));
    return { children, codes };
  },
});

/** A consent link for a linked child whose consent is still needed. The guardian opens it signed in, so the consent counts for this account. */
export const consentLink = mutation({
  args: { childProfileId: v.id("profiles") },
  handler: async (ctx, args): Promise<{ token: string }> => {
    const { profile } = await requireGuardian(ctx);
    const links = await ctx.db.query("guardianLinks").withIndex("by_child", (q) => q.eq("childProfileId", args.childProfileId)).take(20);
    if (!links.some((l) => l.guardianProfileId === profile._id)) throw new ConvexError("Child not found.");
    const child = await ctx.db.get(args.childProfileId);
    if (child === null || child.deletingAt !== undefined) throw new ConvexError("Child not found.");
    return await newConsentRequest(ctx, child);
  },
});

export const decide = mutation({
  args: { enrolmentId: v.id("enrolments"), approve: v.boolean() },
  handler: async (ctx, args) => {
    const { profile } = await requireGuardian(ctx);
    const enrolment = await ctx.db.get(args.enrolmentId);
    if (enrolment === null || enrolment.status !== "pending" || !(await decidesFor(ctx, profile, enrolment.learnerProfileId))) throw new ConvexError("Request not found.");
    await ctx.db.patch(enrolment._id, { status: args.approve ? "approved" : "declined", decidedAt: Date.now(), decidedBy: "guardian" });
    if (args.approve) await enrolmentApproved(ctx, enrolment, profile._id);
    return null;
  },
});
