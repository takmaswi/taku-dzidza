import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { uniqueCode } from "../classes/roles";
import { requireOrgAdmin } from "./access";

/**
 * Join codes, for an organisation's admins only. The learner code lets an
 * adult learner in; a staff code makes the person a teacher or an admin.
 * Making a new learner code stops the old one working. A staff code can be
 * revoked on its own.
 */

const MAX_CODES = 20;

export const codes = query({
  args: { organisationId: v.id("organisations") },
  handler: async (ctx, args) => {
    const { org } = await requireOrgAdmin(ctx, args.organisationId);
    const rows = await ctx.db.query("orgCodes").withIndex("by_org", (q) => q.eq("organisationId", org._id)).take(200);
    return {
      joinCode: org.joinCode,
      staff: rows.filter((c) => c.revokedAt === undefined).map((c) => ({ _id: c._id, code: c.code, role: c.role, createdAt: c.createdAt })),
    };
  },
});

export const makeCode = mutation({
  args: { organisationId: v.id("organisations"), role: v.union(v.literal("teacher"), v.literal("admin")) },
  handler: async (ctx, args) => {
    const { org, profile } = await requireOrgAdmin(ctx, args.organisationId);
    const rows = await ctx.db.query("orgCodes").withIndex("by_org", (q) => q.eq("organisationId", org._id)).take(200);
    if (rows.filter((c) => c.revokedAt === undefined).length >= MAX_CODES) throw new ConvexError(`Up to ${MAX_CODES} staff codes at once. Revoke one first.`);
    const code = await uniqueCode(ctx);
    await ctx.db.insert("orgCodes", { organisationId: org._id, code, role: args.role, createdBy: profile._id, createdAt: Date.now() });
    return code;
  },
});

export const revokeCode = mutation({
  args: { codeId: v.id("orgCodes") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.codeId);
    if (row === null) throw new ConvexError("Code not found.");
    await requireOrgAdmin(ctx, row.organisationId);
    if (row.revokedAt === undefined) await ctx.db.patch(row._id, { revokedAt: Date.now() });
    return null;
  },
});

/** A new learner code. The old one stops working at once. */
export const newJoinCode = mutation({
  args: { organisationId: v.id("organisations") },
  handler: async (ctx, args) => {
    const { org } = await requireOrgAdmin(ctx, args.organisationId);
    const joinCode = await uniqueCode(ctx);
    await ctx.db.patch(org._id, { joinCode });
    return joinCode;
  },
});
