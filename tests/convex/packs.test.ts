import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { PUBLISH_ERRORS } from "../../convex/packs/publish";
import { makeLearner, makeT, settle, type Person, type T } from "./people";

/** Stage 2: course packs, behind TEACHER_MODE (DECISIONS.md, Course packs). */

const NOTES = "Photosynthesis\nGreen plants make glucose from carbon dioxide and water using light energy.\nChlorophyll in the chloroplasts absorbs the light.\nOxygen is released as a by product.";
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

/** A teacher who set up a school (as its admin, so a teacher there), with a notebook of notes made into a draft pack. */
async function draftPack(t: T) {
  const teacher = await makeLearner(t, 40, "Chipo Dube");
  const organisationId = await teacher.as.mutation(api.organisations.organisations.setUp, { name: "Test Academy", type: "secondary_school", ...PLACE });
  const notebookId = await teacher.as.mutation(api.notebooks.notebooks.create, { title: "Biology master" });
  const sourceId = await teacher.as.mutation(api.notebooks.sources.addText, { notebookId, title: "Notes", text: NOTES });
  await settle(t);
  const packId = await teacher.as.mutation(api.packs.packs.create, { organisationId, notebookId, title: "Form 3 Biology", subject: "Biology", level: "Form 3" });
  return { teacher, organisationId, notebookId, sourceId, packId };
}

async function usage(t: T, p: Person): Promise<number> {
  return await t.run(async (ctx) => {
    const profile = (await ctx.db.query("profiles").collect()).find((x) => x.userId === p.userId)!;
    return (await ctx.db.query("aiUsageDaily").withIndex("by_scope", (q) => q.eq("scope", profile._id)).collect()).reduce((n, r) => n + r.calls, 0);
  });
}

describe("making and publishing a pack", () => {
  test("only a teacher or admin makes one, from their own notebook; publishing needs the rights box and no published book pages", async () => {
    const t = makeT();
    const { teacher, organisationId, notebookId, sourceId, packId } = await draftPack(t);
    const stranger = await makeLearner(t, 30);
    const own = await stranger.as.mutation(api.notebooks.notebooks.create, { title: "Mine" });
    await expect(stranger.as.mutation(api.packs.packs.create, { organisationId, notebookId: own, title: "X pack", subject: "Biology", level: "Form 3" })).rejects.toThrow(/not found/);
    await expect(teacher.as.mutation(api.packs.packs.create, { organisationId, notebookId, title: "Again", subject: "Biology", level: "Form 3" })).rejects.toThrow(/already a course pack/);
    expect(await teacher.as.query(api.packs.packs.forStaff, { organisationId })).toEqual([expect.objectContaining({ title: "Form 3 Biology", status: "draft", version: 0, learners: 0, mine: true })]);

    expect(await teacher.as.action(api.packs.publish.publish, { packId, confirmRights: false })).toEqual({ ok: false, message: PUBLISH_ERRORS.rights });
    await t.run(async (ctx) => await ctx.db.patch(sourceId, { thirdParty: true }));
    expect(await teacher.as.action(api.packs.publish.publish, { packId, confirmRights: true })).toEqual({ ok: false, message: PUBLISH_ERRORS.book });
    await t.run(async (ctx) => await ctx.db.patch(sourceId, { thirdParty: false }));

    const before = await usage(t, teacher);
    expect(await teacher.as.action(api.packs.publish.publish, { packId, confirmRights: true })).toEqual({ ok: true, version: 1 });
    // The cost of making the tools is the publisher's.
    expect(await usage(t, teacher)).toBeGreaterThan(before);
    const pack = await t.run(async (ctx) => await ctx.db.get(packId));
    expect(pack).toMatchObject({ status: "published", version: 1, sourceIds: [sourceId] });
    expect(pack!.outputIds).toHaveLength(3);
    expect(pack!.rightsConfirmedAt).toBeTypeOf("number");
    // The pack's notebook stays while the pack does.
    await expect(teacher.as.mutation(api.notebooks.notebooks.remove, { notebookId })).rejects.toThrow(/course pack/);
  });
});

describe("a learner adds a pack", () => {
  test("their own linked notebook reads the pack's sources and tools without copying them, and their work stays private", async () => {
    const t = makeT();
    const { teacher, organisationId, packId, sourceId } = await draftPack(t);
    await teacher.as.action(api.packs.publish.publish, { packId, confirmRights: true });
    const learner = await makeLearner(t, 19, "Kuda Banda");
    // The organisation is waiting to be checked, so only people in it see its packs.
    expect(await learner.as.query(api.packs.packs.published, { organisationId })).toEqual([]);
    await expect(learner.as.mutation(api.packs.packs.add, { packId })).rejects.toThrow(/not found/);
    await t.run(async (ctx) => await ctx.db.patch(organisationId, { status: "listed" }));
    expect(await learner.as.query(api.packs.packs.published, { organisationId })).toEqual([expect.objectContaining({ title: "Form 3 Biology", version: 1, notebookId: null })]);

    const notebookId = await learner.as.mutation(api.packs.packs.add, { packId });
    expect(await learner.as.mutation(api.packs.packs.add, { packId })).toBe(notebookId);
    const nb = await learner.as.query(api.notebooks.notebooks.get, { notebookId });
    expect(nb.pack).toMatchObject({ title: "Form 3 Biology", organisation: "Test Academy", version: 1, stale: false });
    expect(nb.sources).toEqual([expect.objectContaining({ _id: sourceId, fromPack: true })]);
    const tools = await learner.as.query(api.study.tools.list, { notebookId });
    expect(tools.filter((o) => o.fromPack).map((o) => o.kind).sort()).toEqual(["cards", "quiz", "summary"]);
    // Nothing was copied: the learner has no sources or tools of their own, only review cards with their own schedule.
    await t.run(async (ctx) => {
      expect(await ctx.db.query("sources").withIndex("by_notebook", (q) => q.eq("notebookId", notebookId)).collect()).toEqual([]);
      expect(await ctx.db.query("outputs").withIndex("by_notebook", (q) => q.eq("notebookId", notebookId)).collect()).toEqual([]);
      expect((await ctx.db.query("cards").withIndex("by_notebook_due", (q) => q.eq("notebookId", notebookId)).collect()).length).toBeGreaterThan(0);
    });

    // A pack tool opens; a page of a pack source opens; the paper can be done.
    const summary = tools.find((o) => o.kind === "summary")!;
    expect((await learner.as.query(api.study.tools.get, { outputId: summary._id })).fromPack).toBe(true);
    expect((await learner.as.query(api.notebooks.sources.page, { sourceId, page: 1 })).text).toContain("Chlorophyll");
    const quiz = tools.find((o) => o.kind === "quiz")!;
    await learner.as.mutation(api.study.quizzes.submit, { outputId: quiz._id, marks: [{ number: 1, got: 1 }] });
    expect(await learner.as.query(api.study.quizzes.attempts, { outputId: quiz._id })).toHaveLength(1);
    // Asking Taku in the linked notebook finds the pack's pages.
    await learner.as.action(api.notebooks.ask.ask, { notebookId, question: "What does chlorophyll do?" });
    const answer = (await learner.as.query(api.notebooks.notebooks.get, { notebookId })).messages.at(-1)!;
    expect(answer.parts?.some((p) => p.origin.kind === "source" && p.origin.sourceId === sourceId)).toBe(true);

    // Someone who did not add it reads nothing.
    const other = await makeLearner(t, 22);
    await expect(other.as.query(api.study.tools.get, { outputId: summary._id })).rejects.toThrow(/Not found/);
    await expect(other.as.query(api.notebooks.sources.page, { sourceId, page: 1 })).rejects.toThrow(/not found/);
    // The teacher sees a learner count, never the learner's notebook, questions or marks.
    const staff = await teacher.as.query(api.packs.packs.forStaff, { organisationId });
    expect(staff[0].learners).toBe(1);
    expect(JSON.stringify(staff)).not.toMatch(/Kuda|chlorophyll do/);
    await expect(teacher.as.query(api.notebooks.notebooks.get, { notebookId })).rejects.toThrow(/not found/);
  });

  test("a new version reaches every linked copy; review progress on unchanged cards is kept", async () => {
    const t = makeT();
    const { teacher, organisationId, packId } = await draftPack(t);
    await t.run(async (ctx) => await ctx.db.patch(organisationId, { status: "listed" }));
    await teacher.as.action(api.packs.publish.publish, { packId, confirmRights: true });
    const learner = await makeLearner(t, 19);
    const notebookId = await learner.as.mutation(api.packs.packs.add, { packId });
    const cards = async () => await t.run(async (ctx) => await ctx.db.query("cards").withIndex("by_notebook_due", (q) => q.eq("notebookId", notebookId)).collect());
    const first = await cards();
    await learner.as.mutation(api.study.cards.review, { cardId: first[0]._id, got: true });
    const reviewed = (await cards()).find((c) => c._id === first[0]._id)!;

    expect(await teacher.as.action(api.packs.publish.publish, { packId, confirmRights: true })).toEqual({ ok: true, version: 2 });
    const nb = await learner.as.query(api.notebooks.notebooks.get, { notebookId });
    expect(nb.pack).toMatchObject({ version: 2, stale: true });
    const v2 = (await t.run(async (ctx) => await ctx.db.get(packId)))!;
    const tools = await learner.as.query(api.study.tools.list, { notebookId });
    expect(tools.filter((o) => o.fromPack).map((o) => o._id).sort()).toEqual([...v2.outputIds].sort());

    await learner.as.mutation(api.packs.packs.sync, { notebookId });
    const after = await cards();
    expect(after).toHaveLength(first.length);
    expect(after.every((c) => v2.outputIds.includes(c.outputId))).toBe(true);
    expect(after.find((c) => c.front === reviewed.front)).toMatchObject({ reps: reviewed.reps, due: reviewed.due });
    expect((await learner.as.query(api.notebooks.notebooks.get, { notebookId })).pack).toMatchObject({ stale: false });
  });
});

describe("the owner's Takudzidza organisation", () => {
  test("only an owner opens it; it is checked, and the owner can publish packs there", async () => {
    const t = makeT();
    const owner = await makeLearner(t, 40, "Takunda Owner");
    await t.run(async (ctx) => await ctx.db.patch(owner.userId, { emailVerificationTime: Date.now() }));
    const someone = await makeLearner(t, 30);
    await withEnv("ADMIN_EMAILS", owner.email, async () => {
      await expect(someone.as.mutation(api.organisations.owner.takudzidza, {})).rejects.toThrow(/Only the owner/);
      const organisationId: Id<"organisations"> = await owner.as.mutation(api.organisations.owner.takudzidza, {});
      expect(await owner.as.mutation(api.organisations.owner.takudzidza, {})).toBe(organisationId);
      expect(await owner.as.query(api.organisations.organisations.publicPage, { organisationId })).toMatchObject({ name: "Takudzidza", status: "verified", role: "admin" });
      const notebookId = await owner.as.mutation(api.notebooks.notebooks.create, { title: "Takudzidza Biology" });
      await owner.as.mutation(api.notebooks.sources.addText, { notebookId, title: "Notes", text: NOTES });
      await settle(t);
      const packId = await owner.as.mutation(api.packs.packs.create, { organisationId, notebookId, title: "Biology basics", subject: "Biology", level: "Form 3" });
      expect(await owner.as.action(api.packs.publish.publish, { packId, confirmRights: true })).toMatchObject({ ok: true });
      expect(await someone.as.query(api.packs.packs.published, { organisationId })).toHaveLength(1);
    });
  });
});

describe("deleting accounts", () => {
  test("a learner's copy goes with their account and leaves the pack; a publisher's packs go with theirs", async () => {
    const t = makeT();
    const { teacher, organisationId, packId } = await draftPack(t);
    await t.run(async (ctx) => await ctx.db.patch(organisationId, { status: "listed" }));
    await teacher.as.action(api.packs.publish.publish, { packId, confirmRights: true });
    const learner = await makeLearner(t, 19);
    const notebookId = await learner.as.mutation(api.packs.packs.add, { packId });
    await learner.as.mutation(api.accounts.deletion.deleteMyAccount, { confirmEmail: learner.email });
    await settle(t);
    await t.run(async (ctx) => {
      expect(await ctx.db.get(notebookId)).toBeNull();
      expect(await ctx.db.query("cards").withIndex("by_notebook_due", (q) => q.eq("notebookId", notebookId)).collect()).toEqual([]);
      expect(await ctx.db.get(packId)).not.toBeNull();
    });
    await teacher.as.mutation(api.accounts.deletion.deleteMyAccount, { confirmEmail: teacher.email });
    await settle(t);
    expect(await t.run(async (ctx) => await ctx.db.get(packId))).toBeNull();
  });
});
