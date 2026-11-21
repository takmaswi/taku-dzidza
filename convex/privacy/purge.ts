import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id, TableNames } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";

/**
 * Deleting in batches (audit S1). A notebook with several 300 page PDFs holds
 * tens of thousands of rows, more than one Convex mutation may read or write.
 * So a delete has two parts:
 *   1. hide and revoke, at once: the row is marked deleting (every query
 *      skips it) and, for an account, its sign in rows go, so nobody can
 *      reach the data from that moment;
 *   2. empty it, STEP_ROWS rows per mutation, each step scheduling the next
 *      until nothing is left.
 * The first step runs inside the caller's mutation, so small deletes finish
 * there and then.
 */

/** Rows one step may delete. A chunk with its embedding is about 6 KB, so a step stays far inside the limits. */
export const STEP_ROWS = 200;

type Budget = { left: number };

/** Deletes rows from one query until it is empty or the budget is spent. True when the query is empty. */
async function drain<T extends { _id: Id<TableNames> }>(ctx: MutationCtx, budget: Budget, next: (n: number) => Promise<T[]>, each?: (row: T) => Promise<void>): Promise<boolean> {
  while (budget.left > 0) {
    const rows = await next(Math.min(budget.left, STEP_ROWS));
    if (rows.length === 0) return true;
    for (const row of rows) {
      if (each !== undefined) await each(row);
      await ctx.db.delete(row._id);
      budget.left -= 1;
    }
  }
  return false;
}

async function releaseFile(ctx: MutationCtx, source: Doc<"sources">): Promise<void> {
  if (source.storageId === undefined) return;
  const storageId = source.storageId;
  const upload = await ctx.db.query("uploads").withIndex("by_storage", (q) => q.eq("storageId", storageId)).first();
  const meta = await ctx.db.system.get(storageId);
  const bytes = upload?.bytes ?? meta?.size ?? 0;
  if (upload !== null) await ctx.db.delete(upload._id);
  if (meta !== null) await ctx.storage.delete(storageId);
  const profile = await ctx.db.get(source.profileId);
  if (profile !== null && bytes > 0) await ctx.db.patch(profile._id, { storageBytes: Math.max(0, (profile.storageBytes ?? 0) - bytes) });
}

async function purgeSource(ctx: MutationCtx, source: Doc<"sources">, budget: Budget): Promise<boolean> {
  if (!(await drain(ctx, budget, (n) => ctx.db.query("chunks").withIndex("by_source", (q) => q.eq("sourceId", source._id)).take(n)))) return false;
  if (!(await drain(ctx, budget, (n) => ctx.db.query("pages").withIndex("by_source_page", (q) => q.eq("sourceId", source._id)).take(n)))) return false;
  if (budget.left <= 0) return false;
  await releaseFile(ctx, source);
  await ctx.db.delete(source._id);
  budget.left -= 1;
  return true;
}

async function purgeNotebook(ctx: MutationCtx, notebook: Doc<"notebooks">, budget: Budget): Promise<boolean> {
  for (;;) {
    const source = await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).first();
    if (source === null) break;
    if (!(await purgeSource(ctx, source, budget))) return false;
  }
  if (!(await drain(ctx, budget, (n) => ctx.db.query("messages").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).take(n)))) return false;
  if (!(await drain(ctx, budget, (n) => ctx.db.query("classShares").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).take(n)))) return false;
  // A course pack copy: the learner's own review cards and paper attempts on the pack's tools.
  if (!(await drain(ctx, budget, (n) => ctx.db.query("cards").withIndex("by_notebook_due", (q) => q.eq("notebookId", notebook._id)).take(n)))) return false;
  if (!(await drain(ctx, budget, (n) => ctx.db.query("quizAttempts").withIndex("by_profile", (q) => q.eq("profileId", notebook.profileId)).filter((q) => q.eq(q.field("notebookId"), notebook._id)).take(n)))) return false;
  for (;;) {
    const output = await ctx.db.query("outputs").withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id)).first();
    if (output === null) break;
    if (!(await drain(ctx, budget, (n) => ctx.db.query("cards").withIndex("by_output", (q) => q.eq("outputId", output._id)).take(n)))) return false;
    if (!(await drain(ctx, budget, (n) => ctx.db.query("quizAttempts").withIndex("by_output", (q) => q.eq("outputId", output._id)).take(n)))) return false;
    if (budget.left <= 0) return false;
    await ctx.db.delete(output._id);
    budget.left -= 1;
  }
  if (budget.left <= 0) return false;
  await ctx.db.delete(notebook._id);
  budget.left -= 1;
  return true;
}

/** A class and everything in it: requests, listed names, shares, papers and marks (Stage 2). */
async function purgeClass(ctx: MutationCtx, cls: Doc<"classes">, budget: Budget): Promise<boolean> {
  if (!(await drain(ctx, budget, (n) => ctx.db.query("classMarks").withIndex("by_class", (q) => q.eq("classId", cls._id)).take(n)))) return false;
  if (!(await drain(ctx, budget, (n) => ctx.db.query("assignments").withIndex("by_class", (q) => q.eq("classId", cls._id)).take(n)))) return false;
  if (!(await drain(ctx, budget, (n) => ctx.db.query("enrolments").withIndex("by_class", (q) => q.eq("classId", cls._id)).take(n)))) return false;
  if (!(await drain(ctx, budget, (n) => ctx.db.query("rosterNames").withIndex("by_class", (q) => q.eq("classId", cls._id)).take(n)))) return false;
  if (!(await drain(ctx, budget, (n) => ctx.db.query("classShares").withIndex("by_class", (q) => q.eq("classId", cls._id)).take(n)))) return false;
  if (budget.left <= 0) return false;
  await ctx.db.delete(cls._id);
  budget.left -= 1;
  return true;
}

/** Classes taught, classes joined, guardian links and codes, and organisation places (Stage 2). */
async function purgeClassData(ctx: MutationCtx, profile: Doc<"profiles">, budget: Budget): Promise<boolean> {
  for (;;) {
    const cls = await ctx.db.query("classes").withIndex("by_teacher", (q) => q.eq("teacherProfileId", profile._id)).first();
    if (cls === null) break;
    if (!(await purgeClass(ctx, cls, budget))) return false;
  }
  if (!(await drain(ctx, budget, (n) => ctx.db.query("classMarks").withIndex("by_learner", (q) => q.eq("learnerProfileId", profile._id)).take(n)))) return false;
  if (!(await drain(ctx, budget, (n) => ctx.db.query("enrolments").withIndex("by_learner", (q) => q.eq("learnerProfileId", profile._id)).take(n)))) return false;
  if (!(await drain(ctx, budget, (n) => ctx.db.query("guardianLinks").withIndex("by_guardian", (q) => q.eq("guardianProfileId", profile._id)).take(n)))) return false;
  if (!(await drain(ctx, budget, (n) => ctx.db.query("guardianLinks").withIndex("by_child", (q) => q.eq("childProfileId", profile._id)).take(n)))) return false;
  if (!(await drain(ctx, budget, (n) => ctx.db.query("childCodes").withIndex("by_guardian", (q) => q.eq("guardianProfileId", profile._id)).take(n)))) return false;
  if (!(await drain(ctx, budget, (n) => ctx.db.query("memberships").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(n)))) return false;
  if (!(await drain(ctx, budget, (n) => ctx.db.query("follows").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(n)))) return false;
  // An organisation the account added that was never checked, and that nobody else belongs to, goes too.
  // Listed and verified ones stay: other people use them.
  for (const org of await ctx.db.query("organisations").withIndex("by_created_by", (q) => q.eq("createdBy", profile._id)).take(20)) {
    if (org.status !== "pending") continue;
    if ((await ctx.db.query("memberships").withIndex("by_org_role", (q) => q.eq("organisationId", org._id)).first()) !== null) continue;
    if (!(await drain(ctx, budget, (n) => ctx.db.query("follows").withIndex("by_org", (q) => q.eq("organisationId", org._id)).take(n)))) return false;
    if (!(await drain(ctx, budget, (n) => ctx.db.query("orgCodes").withIndex("by_org", (q) => q.eq("organisationId", org._id)).take(n)))) return false;
    for (const c of await ctx.db.query("classes").withIndex("by_organisation", (q) => q.eq("organisationId", org._id)).take(Math.max(0, budget.left))) {
      await ctx.db.patch(c._id, { organisationId: undefined });
      budget.left -= 1;
    }
    if (budget.left <= 0) return false;
    await ctx.db.delete(org._id);
    budget.left -= 1;
  }
  return true;
}

async function purgeProfile(ctx: MutationCtx, profile: Doc<"profiles">, budget: Budget): Promise<boolean> {
  if (!(await purgeClassData(ctx, profile, budget))) return false;
  for (;;) {
    const chat = await ctx.db.query("chats").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).first();
    if (chat === null) break;
    if (!(await drain(ctx, budget, (n) => ctx.db.query("chatMessages").withIndex("by_chat", (q) => q.eq("chatId", chat._id)).take(n)))) return false;
    if (budget.left <= 0) return false;
    await ctx.db.delete(chat._id);
    budget.left -= 1;
  }
  // Course packs made from this account's notebooks go with them; linked copies then show the learner's own work only.
  if (!(await drain(ctx, budget, (n) => ctx.db.query("coursePacks").withIndex("by_created_by", (q) => q.eq("createdBy", profile._id)).take(n)))) return false;
  for (;;) {
    const notebook = await ctx.db.query("notebooks").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).first();
    if (notebook === null) break;
    if (!(await purgeNotebook(ctx, notebook, budget))) return false;
  }
  // Uploads that never became a source, with their files.
  const uploadsDone = await drain(
    ctx,
    budget,
    (n) => ctx.db.query("uploads").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(n),
    async (row) => {
      if (row.storageId !== undefined && (await ctx.db.system.get(row.storageId)) !== null) await ctx.storage.delete(row.storageId);
    },
  );
  if (!uploadsDone) return false;
  if (!(await drain(ctx, budget, (n) => ctx.db.query("aiUsageDaily").withIndex("by_scope", (q) => q.eq("scope", profile._id)).take(n)))) return false;
  if (!(await drain(ctx, budget, (n) => ctx.db.query("aiStarts").withIndex("by_profile_kind", (q) => q.eq("profileId", profile._id)).take(n)))) return false;
  if (!(await drain(ctx, budget, (n) => ctx.db.query("consentCodes").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(n)))) return false;
  if (!(await drain(ctx, budget, (n) => ctx.db.query("consents").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(n)))) return false;
  if (!(await drain(ctx, budget, (n) => ctx.db.query("consentRequests").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(n)))) return false;
  if (budget.left <= 0) return false;
  const user = await ctx.db.get(profile.userId);
  if (user !== null) await ctx.db.delete(user._id);
  await ctx.db.delete(profile._id);
  await ctx.db.insert("accountDeletions", { deletedAt: Date.now(), reason: profile.deletionReason ?? "owner" });
  return true;
}

const targetValidator = v.union(v.object({ kind: v.literal("source"), id: v.id("sources") }), v.object({ kind: v.literal("notebook"), id: v.id("notebooks") }), v.object({ kind: v.literal("profile"), id: v.id("profiles") }));
export type PurgeTarget = { kind: "source"; id: Id<"sources"> } | { kind: "notebook"; id: Id<"notebooks"> } | { kind: "profile"; id: Id<"profiles"> };

/** One step. True when the target is gone. */
async function runStep(ctx: MutationCtx, target: PurgeTarget): Promise<boolean> {
  const budget: Budget = { left: STEP_ROWS };
  if (target.kind === "source") {
    const source = await ctx.db.get(target.id);
    return source === null ? true : await purgeSource(ctx, source, budget);
  }
  if (target.kind === "notebook") {
    const notebook = await ctx.db.get(target.id);
    return notebook === null ? true : await purgeNotebook(ctx, notebook, budget);
  }
  const profile = await ctx.db.get(target.id);
  return profile === null ? true : await purgeProfile(ctx, profile, budget);
}

/** Runs the first step now and schedules the rest when one step was not enough. */
export async function startPurge(ctx: MutationCtx, target: PurgeTarget): Promise<void> {
  if (!(await runStep(ctx, target))) await ctx.scheduler.runAfter(0, internal.privacy.purge.step, { target });
}

export const step = internalMutation({
  args: { target: targetValidator },
  handler: async (ctx, args): Promise<{ done: boolean }> => {
    const done = await runStep(ctx, args.target);
    if (!done) await ctx.scheduler.runAfter(0, internal.privacy.purge.step, { target: args.target });
    return { done };
  },
});

/** Sign in rows of one user: sessions, refresh tokens, accounts, codes, rate limits. Small, so they go at once. */
async function revokeSignIn(ctx: MutationCtx, user: Doc<"users">): Promise<void> {
  for (const session of await ctx.db.query("authSessions").withIndex("userId", (q) => q.eq("userId", user._id)).collect()) {
    for (const token of await ctx.db.query("authRefreshTokens").withIndex("sessionId", (q) => q.eq("sessionId", session._id)).collect()) await ctx.db.delete(token._id);
    await ctx.db.delete(session._id);
  }
  for (const account of await ctx.db.query("authAccounts").withIndex("userIdAndProvider", (q) => q.eq("userId", user._id)).collect()) {
    for (const code of await ctx.db.query("authVerificationCodes").withIndex("accountId", (q) => q.eq("accountId", account._id)).collect()) await ctx.db.delete(code._id);
    await ctx.db.delete(account._id);
  }
  const email = (user.email ?? "").toLowerCase();
  if (email !== "") for (const limit of await ctx.db.query("authRateLimits").withIndex("identifier", (q) => q.eq("identifier", email)).collect()) await ctx.db.delete(limit._id);
}

/**
 * Deletes an account. Hide and revoke first: the sign in rows go and the
 * profile is marked deleting in this mutation, so the data is out of reach
 * before the batches start. The user row keeps no email meanwhile, so the
 * address is free for a new account.
 */
export async function beginAccountDeletion(ctx: MutationCtx, user: Doc<"users">, reason: Doc<"accountDeletions">["reason"]): Promise<void> {
  await revokeSignIn(ctx, user);
  const profile = await ctx.db.query("profiles").withIndex("by_user", (q) => q.eq("userId", user._id)).unique();
  if (profile === null) {
    await ctx.db.delete(user._id);
    await ctx.db.insert("accountDeletions", { deletedAt: Date.now(), reason });
    return;
  }
  await ctx.db.patch(user._id, { email: undefined, emailVerificationTime: undefined, name: undefined, phone: undefined, image: undefined });
  if (profile.deletingAt === undefined) await ctx.db.patch(profile._id, { deletingAt: Date.now(), deletionReason: reason });
  await startPurge(ctx, { kind: "profile", id: profile._id });
}

/** A step that stopped (a deploy, a crash) is picked up again by the daily sweep. */
export const resume = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ resumed: number }> => {
    const stuck = await ctx.db.query("profiles").withIndex("by_deleting", (q) => q.gt("deletingAt", 0).lt("deletingAt", Date.now() - 60 * 60 * 1000)).take(20);
    for (const profile of stuck) await ctx.scheduler.runAfter(0, internal.privacy.purge.step, { target: { kind: "profile", id: profile._id } });
    return { resumed: stuck.length };
  },
});
