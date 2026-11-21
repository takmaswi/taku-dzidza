import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { firstName } from "./codes";

/** Class requests waiting for a learner's guardian: what the guardian needs to decide, and nothing about other learners. */
export async function pendingClassRequests(ctx: QueryCtx, learnerProfileId: Id<"profiles">): Promise<{ enrolmentId: Id<"enrolments">; className: string; subject: string; level: string; teacher: string; school: string | null }[]> {
  const out = [];
  for (const e of await ctx.db.query("enrolments").withIndex("by_learner", (q) => q.eq("learnerProfileId", learnerProfileId)).take(100)) {
    if (e.status !== "pending") continue;
    const cls = await ctx.db.get(e.classId);
    if (cls === null) continue;
    const teacher = await ctx.db.get(cls.teacherProfileId);
    const school = cls.organisationId === undefined ? null : await ctx.db.get(cls.organisationId);
    out.push({ enrolmentId: e._id, className: cls.name, subject: cls.subject, level: cls.level, teacher: teacher === null ? "" : firstName(teacher.displayName), school: school?.name ?? null });
  }
  return out;
}
