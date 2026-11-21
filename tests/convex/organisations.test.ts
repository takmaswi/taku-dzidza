import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { JOIN_ORG_ERRORS } from "../../convex/organisations/organisations";
import { addConsent, GUARDIAN_PHONE, lastCode, makeLearner, makeT, settle, type Person, type T } from "./people";

/** Stage 2: organisations (schools, universities, colleges, training providers, companies), behind TEACHER_MODE. */

const PLACE = { town: "Harare", country: "Zimbabwe" };

async function withEnv<R>(name: string, value: string | undefined, run: () => Promise<R>): Promise<R> {
  const before = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  try {
    return await run();
  } finally {
    if (before === undefined) delete process.env[name];
    else process.env[name] = before;
  }
}

async function makeOwner(t: T): Promise<Person> {
  const owner = await makeLearner(t, 40, "Takunda Owner");
  await t.run(async (ctx) => await ctx.db.patch(owner.userId, { emailVerificationTime: Date.now() }));
  return owner;
}

/** An adult sets up an organisation as its admin, and the owner lists it. */
async function listedOrg(t: T, owner: Person, name = "Test Academy One", type: "secondary_school" | "university" | "college" = "secondary_school") {
  const admin = await makeLearner(t, 45, "Rumbi Admin");
  const organisationId = await admin.as.mutation(api.organisations.organisations.setUp, { name, type, ...PLACE });
  await owner.as.mutation(api.organisations.owner.setStatus, { organisationId, status: "listed" });
  return { admin, organisationId };
}

const roleOf = async (p: Person, organisationId: Id<"organisations">) => (await p.as.query(api.organisations.organisations.publicPage, { organisationId }))?.role ?? null;

describe("TEACHER_MODE off", () => {
  test("every organisation function refuses", async () => {
    const t = makeT();
    const p = await makeLearner(t, 30);
    await withEnv("TEACHER_MODE", undefined, async () => {
      await expect(p.as.query(api.organisations.organisations.search, { text: "Test" })).rejects.toThrow(/not on yet/);
      await expect(p.as.mutation(api.organisations.organisations.addPending, { name: "Test Academy", type: "college", ...PLACE })).rejects.toThrow(/not on yet/);
      await expect(p.as.mutation(api.organisations.organisations.joinWithCode, { code: "ABC23X" })).rejects.toThrow(/not on yet/);
      expect(await p.as.query(api.organisations.owner.isOwner, {})).toBe(false);
    });
  });
});

describe("search and adding a missing one", () => {
  test("the list starts empty; an added entry is pending, followed by the person, and never in search until the owner lists it", async () => {
    const t = makeT();
    const owner = await makeOwner(t);
    await withEnv("ADMIN_EMAILS", owner.email, async () => {
      const p = await makeLearner(t, 20, "Kuda Banda");
      expect(await p.as.query(api.organisations.organisations.search, { text: "Test" })).toEqual([]);
      const organisationId = await p.as.mutation(api.organisations.organisations.addPending, { name: "  Test   Polytechnic ", type: "college", ...PLACE });
      expect((await p.as.query(api.organisations.organisations.mine, {})).follows).toEqual([expect.objectContaining({ name: "Test Polytechnic", status: "pending" })]);
      const other = await makeLearner(t, 22);
      expect(await other.as.query(api.organisations.organisations.search, { text: "Test" })).toEqual([]);
      expect(await other.as.query(api.organisations.organisations.publicPage, { organisationId })).toBeNull();
      await expect(other.as.mutation(api.organisations.organisations.follow, { organisationId })).rejects.toThrow(/not found/);

      // Only the owner reviews.
      await expect(other.as.query(api.organisations.owner.pending, {})).rejects.toThrow(/Only the owner/);
      await expect(other.as.mutation(api.organisations.owner.setStatus, { organisationId, status: "listed" })).rejects.toThrow(/Only the owner/);
      expect(await owner.as.query(api.organisations.owner.pending, {})).toEqual([expect.objectContaining({ name: "Test Polytechnic", members: 0, follows: 1 })]);
      await owner.as.mutation(api.organisations.owner.setStatus, { organisationId, status: "listed" });

      expect(await other.as.query(api.organisations.organisations.search, { text: "T" })).toEqual([]);
      expect(await other.as.query(api.organisations.organisations.search, { text: "Polytechnic" })).toEqual([expect.objectContaining({ name: "Test Polytechnic", type: "college", verified: false })]);
      // Filtered by type.
      expect(await other.as.query(api.organisations.organisations.search, { text: "Polytechnic", types: ["secondary_school"] })).toEqual([]);
      expect(await other.as.query(api.organisations.organisations.search, { text: "Polytechnic", types: ["college", "company"] })).toHaveLength(1);
      await other.as.mutation(api.organisations.organisations.follow, { organisationId });
      expect((await other.as.query(api.organisations.organisations.publicPage, { organisationId }))).toMatchObject({ following: true, role: null });
      // The public page says nothing about the people in it.
      expect(JSON.stringify(await other.as.query(api.organisations.organisations.publicPage, { organisationId }))).not.toMatch(/Kuda|Banda|example\.com/);
    });
  });

  test("at most 8 results", async () => {
    const t = makeT();
    const owner = await makeOwner(t);
    await withEnv("ADMIN_EMAILS", owner.email, async () => {
      for (let i = 0; i < 10; i++) await listedOrg(t, owner, `Test Academy ${i}`);
      const p = await makeLearner(t, 20);
      expect(await p.as.query(api.organisations.organisations.search, { text: "Academy" })).toHaveLength(8);
    });
  });
});

describe("joining with a code", () => {
  test("a staff code makes an adult a teacher and their classes move in; a revoked code stops working", async () => {
    const t = makeT();
    const owner = await makeOwner(t);
    await withEnv("ADMIN_EMAILS", owner.email, async () => {
      const { admin, organisationId } = await listedOrg(t, owner);
      expect(await roleOf(admin, organisationId)).toBe("admin");
      const teacherCode = await admin.as.mutation(api.organisations.codes.makeCode, { organisationId, role: "teacher" });
      const teacher = await makeLearner(t, 30, "Farai Teacher");
      await teacher.as.mutation(api.classes.roles.setTeaching, { on: true });
      const classId = await teacher.as.mutation(api.classes.classes.createClass, { name: "Form 2 Green", subject: "Mathematics", level: "Form 2" });
      expect(await teacher.as.mutation(api.organisations.organisations.joinWithCode, { code: teacherCode.toLowerCase() })).toEqual({ ok: true, kind: "organisation", name: "Test Academy One", role: "teacher" });
      expect(await roleOf(teacher, organisationId)).toBe("teacher");
      expect((await t.run(async (ctx) => await ctx.db.get(classId)))?.organisationId).toBe(organisationId);
      // A new class goes there too.
      const second = await teacher.as.mutation(api.classes.classes.createClass, { name: "Form 3 Green", subject: "Mathematics", level: "Form 3" });
      expect((await t.run(async (ctx) => await ctx.db.get(second)))?.organisationId).toBe(organisationId);
      // Only admins see codes.
      await expect(teacher.as.query(api.organisations.codes.codes, { organisationId })).rejects.toThrow(/not found/);

      const codes = await admin.as.query(api.organisations.codes.codes, { organisationId });
      await admin.as.mutation(api.organisations.codes.revokeCode, { codeId: codes.staff[0]._id });
      const late = await makeLearner(t, 31);
      expect(await late.as.mutation(api.organisations.organisations.joinWithCode, { code: teacherCode })).toEqual({ ok: false, kind: "none", message: JOIN_ORG_ERRORS.unknown });
    });
  });

  test("the learner code is for adults; under 18s are sent to their class code; a new learner code stops the old one", async () => {
    const t = makeT();
    const owner = await makeOwner(t);
    await withEnv("ADMIN_EMAILS", owner.email, async () => {
      const { admin, organisationId } = await listedOrg(t, owner, "Test University", "university");
      const { joinCode } = await admin.as.query(api.organisations.codes.codes, { organisationId });
      const adult = await makeLearner(t, 21, "Nyasha Student");
      await adult.as.mutation(api.organisations.organisations.follow, { organisationId });
      expect(await adult.as.mutation(api.organisations.organisations.joinWithCode, { code: joinCode, programme: "BSc Computer Science", year: "2" })).toMatchObject({ ok: true, role: "learner" });
      const mine = await adult.as.query(api.organisations.organisations.mine, {});
      expect(mine.members).toEqual([expect.objectContaining({ role: "learner", programme: "BSc Computer Science", year: "2" })]);
      // Joining replaces following.
      expect(mine.follows).toEqual([]);

      const minor = await makeLearner(t, 15);
      await addConsent(t, minor);
      expect(await minor.as.mutation(api.organisations.organisations.joinWithCode, { code: joinCode })).toEqual({ ok: false, kind: "none", message: JOIN_ORG_ERRORS.minor });
      const staffCode = await admin.as.mutation(api.organisations.codes.makeCode, { organisationId, role: "teacher" });
      expect(await minor.as.mutation(api.organisations.organisations.joinWithCode, { code: staffCode })).toEqual({ ok: false, kind: "none", message: JOIN_ORG_ERRORS.staff });
      await expect(minor.as.mutation(api.organisations.organisations.setUp, { name: "My Own School", type: "secondary_school", ...PLACE })).rejects.toThrow(/adult/);

      await admin.as.mutation(api.organisations.codes.newJoinCode, { organisationId });
      const another = await makeLearner(t, 25);
      expect(await another.as.mutation(api.organisations.organisations.joinWithCode, { code: joinCode })).toMatchObject({ ok: false, message: JOIN_ORG_ERRORS.unknown });
      // The only admin cannot leave.
      await expect(admin.as.mutation(api.organisations.organisations.leave, { organisationId })).rejects.toThrow(/only admin/);
      await adult.as.mutation(api.organisations.organisations.leave, { organisationId });
      expect(await roleOf(adult, organisationId)).toBeNull();
    });
  });

  test("a class in an organisation: an adult is a member at once; an under 18 only once a guardian says yes", async () => {
    const t = makeT();
    const owner = await makeOwner(t);
    await withEnv("ADMIN_EMAILS", owner.email, async () => {
      const { admin, organisationId } = await listedOrg(t, owner);
      const staffCode = await admin.as.mutation(api.organisations.codes.makeCode, { organisationId, role: "teacher" });
      const teacher = await makeLearner(t, 30, "Chipo Dube");
      await teacher.as.mutation(api.organisations.organisations.joinWithCode, { code: staffCode });
      const classId = await teacher.as.mutation(api.classes.classes.createClass, { name: "Form 4 Blue", subject: "Biology", level: "Form 4" });
      const { class: cls } = await teacher.as.query(api.classes.classes.detail, { classId });

      const adult = await makeLearner(t, 19);
      expect(await adult.as.mutation(api.organisations.organisations.joinWithCode, { code: cls.code })).toEqual({ kind: "class", ok: true, className: "Form 4 Blue", status: "approved" });
      expect(await roleOf(adult, organisationId)).toBe("learner");

      const minor = await makeLearner(t, 15, "Tari Moyo");
      const token = await addConsent(t, minor);
      expect(await minor.as.mutation(api.organisations.organisations.joinWithCode, { code: cls.code })).toMatchObject({ kind: "class", status: "pending" });
      expect(await roleOf(minor, organisationId)).toBeNull();
      // The guardian's request shows the organisation's name.
      const info = (await t.query(api.accounts.consent.requestInfo, { token }))!;
      expect(info.classRequests).toEqual([expect.objectContaining({ className: "Form 4 Blue", school: "Test Academy One" })]);
      await t.run(async (ctx) => {
        for (const row of await ctx.db.query("consentCodes").collect()) await ctx.db.patch(row._id, { createdAt: row.createdAt - 120_000 });
      });
      await t.action(api.accounts.consent.sendApprovalCode, { token });
      await t.mutation(api.accounts.consent.decideClass, { token, enrolmentId: info.classRequests[0].enrolmentId, approve: true, code: await lastCode(t, GUARDIAN_PHONE) });
      expect(await roleOf(minor, organisationId)).toBe("learner");
    });
  });

  test("a guardian who answers from their own account becomes the organisation's guardian member", async () => {
    const t = makeT();
    const owner = await makeOwner(t);
    await withEnv("ADMIN_EMAILS", owner.email, async () => {
      const { admin, organisationId } = await listedOrg(t, owner);
      const staffCode = await admin.as.mutation(api.organisations.codes.makeCode, { organisationId, role: "teacher" });
      const teacher = await makeLearner(t, 30, "Chipo Dube");
      await teacher.as.mutation(api.organisations.organisations.joinWithCode, { code: staffCode });
      const classId = await teacher.as.mutation(api.classes.classes.createClass, { name: "Form 1 Red", subject: "Biology", level: "Form 1" });
      const { class: cls } = await teacher.as.query(api.classes.classes.detail, { classId });

      const guardian = await makeLearner(t, 40, "Rudo Moyo");
      const { code } = await guardian.as.mutation(api.classes.guardians.createChildCode, { firstName: "Tari" });
      const child = await makeLearner(t, 14, "Tari Moyo");
      await child.as.mutation(api.classes.guardians.redeemChildCode, { code });
      const childProfileId = (await guardian.as.query(api.classes.guardians.family, {})).children[0].childProfileId;
      const { token } = await guardian.as.mutation(api.classes.guardians.consentLink, { childProfileId });
      await guardian.as.action(api.accounts.consent.sendCode, { token, phone: GUARDIAN_PHONE });
      await guardian.as.mutation(api.accounts.consent.give, { token, guardianName: "Rudo Moyo", relationship: "mother", guardianContact: GUARDIAN_PHONE, code: await lastCode(t, GUARDIAN_PHONE), confirmsGuardian: true, agrees: true });
      await child.as.mutation(api.classes.joining.requestJoin, { code: cls.code });
      const request = (await guardian.as.query(api.classes.guardians.family, {})).children[0].requests[0];
      await guardian.as.mutation(api.classes.guardians.decide, { enrolmentId: request.enrolmentId, approve: true });
      expect(await roleOf(child, organisationId)).toBe("learner");
      expect(await roleOf(guardian, organisationId)).toBe("guardian");
    });
  });
});

describe("the owner merges a duplicate", () => {
  test("members, followers, codes and classes move into the existing one, and the duplicate goes", async () => {
    const t = makeT();
    const owner = await makeOwner(t);
    await withEnv("ADMIN_EMAILS", owner.email, async () => {
      const { organisationId: intoId } = await listedOrg(t, owner, "Test High School");
      const head = await makeLearner(t, 50, "Tendai Head");
      const fromId = await head.as.mutation(api.organisations.organisations.setUp, { name: "Test High", type: "secondary_school", ...PLACE });
      await head.as.mutation(api.classes.roles.setTeaching, { on: true });
      const classId = await head.as.mutation(api.classes.classes.createClass, { name: "Form 5 Arts", subject: "History", level: "Form 5" });
      const fan = await makeLearner(t, 20);
      await fan.as.mutation(api.organisations.organisations.addPending, { name: "Another Test", type: "college", ...PLACE });
      await t.run(async (ctx) => await ctx.db.insert("follows", { organisationId: fromId, profileId: (await ctx.db.query("profiles").collect()).at(-1)!._id, createdAt: Date.now() }));

      await expect(owner.as.mutation(api.organisations.owner.merge, { fromId: intoId, intoId: fromId })).rejects.toThrow(/pending/);
      expect(await owner.as.mutation(api.organisations.owner.merge, { fromId, intoId })).toBe(intoId);
      expect(await roleOf(head, intoId)).toBe("admin");
      expect((await t.run(async (ctx) => await ctx.db.get(classId)))?.organisationId).toBe(intoId);
      expect(await t.run(async (ctx) => await ctx.db.get(fromId))).toBeNull();
      expect((await fan.as.query(api.organisations.organisations.mine, {})).follows.map((o) => o.name).sort()).toEqual(["Another Test", "Test High School"]);
    });
  });
});

describe("deleting an account", () => {
  test("takes its memberships and follows, and an unchecked entry nobody else belongs to; listed ones stay", async () => {
    const t = makeT();
    const owner = await makeOwner(t);
    await withEnv("ADMIN_EMAILS", owner.email, async () => {
      const { organisationId: listed } = await listedOrg(t, owner);
      const p = await makeLearner(t, 30);
      await p.as.mutation(api.organisations.organisations.follow, { organisationId: listed });
      const pending = await p.as.mutation(api.organisations.organisations.setUp, { name: "Test Training Centre", type: "college", ...PLACE });
      await p.as.mutation(api.accounts.deletion.deleteMyAccount, { confirmEmail: p.email });
      await settle(t);
      await t.run(async (ctx) => {
        expect(await ctx.db.get(pending)).toBeNull();
        expect(await ctx.db.get(listed)).not.toBeNull();
        expect(await ctx.db.query("follows").withIndex("by_org", (q) => q.eq("organisationId", listed)).collect()).toEqual([]);
        expect((await ctx.db.query("memberships").collect()).every((m) => m.organisationId === listed)).toBe(true);
      });
    });
  });
});
