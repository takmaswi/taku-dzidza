import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { CHILD_CODE_ERRORS } from "../../convex/classes/guardians";
import { JOIN_ERRORS } from "../../convex/classes/joining";
import { stripQuotes } from "../../convex/classes/sharing";
import { firstName, normaliseCode, shareText, validCode, whatsAppLink } from "../../convex/classes/codes";
import { opinionItems, readMarks } from "../../convex/classes/marking";
import type { QuizContent } from "../../convex/study/shapes";
import { addConsent, GUARDIAN_PHONE, lastCode, makeLearner, makeT, settle, type Person, type T } from "./people";

/** Stage 2: teachers, classes, guardians, sharing, assignments and marking (TEACHER_MODE). */

const NOTES = "Photosynthesis\nGreen plants make glucose from carbon dioxide and water using light energy.\nChlorophyll in the chloroplasts absorbs the light.\nOxygen is released as a by product.";
const QUIZ = { count: 4, difficulty: "medium", minutes: 15 };

async function makeTeacher(t: T, name = "Chipo Dube"): Promise<Person> {
  const p = await makeLearner(t, 34, name);
  await p.as.mutation(api.classes.schools.setTeaching, { on: true });
  return p;
}

async function teacherWithQuiz(t: T) {
  const teacher = await makeTeacher(t);
  const notebookId = await teacher.as.mutation(api.notebooks.notebooks.create, { title: "Biology" });
  await teacher.as.mutation(api.notebooks.sources.addText, { notebookId, title: "Notes", text: NOTES });
  await settle(t);
  const made = await teacher.as.action(api.study.tools.generate, { notebookId, mode: "quiz", options: QUIZ });
  if (!made.ok) throw new Error(made.message);
  const classId = await teacher.as.mutation(api.classes.classes.createClass, { name: "Form 3 Blue", subject: "Combined Science", level: "Form 3", syllabusId: "zimsec-olevel-combined-science" });
  const { class: cls } = await teacher.as.query(api.classes.classes.detail, { classId });
  return { teacher, notebookId, outputId: made.outputId, classId, code: cls.code };
}

async function withMode<R>(value: string | undefined, run: () => Promise<R>): Promise<R> {
  const before = process.env.TEACHER_MODE;
  if (value === undefined) delete process.env.TEACHER_MODE;
  else process.env.TEACHER_MODE = value;
  try {
    return await run();
  } finally {
    if (before === undefined) delete process.env.TEACHER_MODE;
    else process.env.TEACHER_MODE = before;
  }
}

describe("codes and share text", () => {
  test("codes are six letters and numbers that cannot be confused", () => {
    expect(normaliseCode(" ab-c 12x ")).toBe("ABC12X");
    expect(validCode("ABC23X")).toBe(true);
    expect(validCode("ABC10X")).toBe(false);
    expect(firstName("  Tariro   Moyo ")).toBe("Tariro");
  });

  test("the WhatsApp text carries the link and the code, with no dashes", () => {
    const text = shareText("Form 3 Blue", "https://takudzidza.vercel.app", "ABC23X");
    expect(text).toContain("https://takudzidza.vercel.app/join/ABC23X");
    expect(text).toContain("ABC23X");
    expect(text).not.toMatch(/[–—-]/);
    expect(whatsAppLink(text)).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });
});

describe("TEACHER_MODE", () => {
  test("off: every teacher, class and guardian function refuses, and the flag says so", async () => {
    const t = makeT();
    const p = await makeLearner(t, 34);
    await withMode(undefined, async () => {
      expect(await t.query(api.flags.get, {})).toEqual({ teacher: false, books: false });
      await expect(p.as.mutation(api.classes.schools.setTeaching, { on: true })).rejects.toThrow(/not on yet/);
      await expect(p.as.query(api.classes.classes.myClasses, {})).rejects.toThrow(/not on yet/);
      await expect(p.as.mutation(api.classes.joining.requestJoin, { code: "ABC23X" })).rejects.toThrow(/not on yet/);
      await expect(p.as.mutation(api.classes.guardians.createChildCode, { firstName: "Tari" })).rejects.toThrow(/not on yet/);
    });
    expect(await t.query(api.flags.get, {})).toEqual({ teacher: true, books: false });
  });

  test("teaching is for adults who switched it on", async () => {
    const t = makeT();
    const adult = await makeLearner(t, 34);
    await expect(adult.as.query(api.classes.classes.myClasses, {})).rejects.toThrow(/Switch on teaching/);
    const minor = await makeLearner(t, 15);
    await expect(minor.as.mutation(api.classes.schools.setTeaching, { on: true })).rejects.toThrow(/adults/);
    await adult.as.mutation(api.classes.schools.setTeaching, { on: true });
    expect(await adult.as.query(api.classes.classes.myClasses, {})).toEqual([]);
  });
});

describe("schools", () => {
  test("an admin makes a school, a teacher joins with the staff code, and only the admin sees the code and the classes", async () => {
    const t = makeT();
    const head = await makeTeacher(t, "Nyasha Head");
    await head.as.mutation(api.classes.classes.createClass, { name: "Form 1 Red", subject: "Mathematics", level: "Form 1" });
    await head.as.mutation(api.classes.schools.createSchool, { name: "Mabvuku High" });
    const school = (await head.as.query(api.classes.schools.mySchool, {}))!;
    expect(school.isAdmin).toBe(true);
    expect(school.classes).toEqual([expect.objectContaining({ name: "Form 1 Red", learners: 0 })]);
    const teacher = await makeTeacher(t, "Farai Teacher");
    await expect(teacher.as.mutation(api.classes.schools.joinSchool, { staffCode: "ZZZZZZ" })).rejects.toThrow(/No school/);
    await teacher.as.mutation(api.classes.schools.joinSchool, { staffCode: school.staffCode! });
    const seen = (await teacher.as.query(api.classes.schools.mySchool, {}))!;
    expect(seen).toMatchObject({ name: "Mabvuku High", isAdmin: false, staffCode: null, classes: [] });
    expect(seen.staff.map((s) => s.name).sort()).toEqual(["Farai", "Nyasha"]);
  });
});

describe("joining a class", () => {
  test("an adult learner is in at once; the teacher sees a first name only", async () => {
    const t = makeT();
    const { teacher, classId, code } = await teacherWithQuiz(t);
    const learner = await makeLearner(t, 19, "Kuda Banda");
    expect(await learner.as.mutation(api.classes.joining.requestJoin, { code: code.toLowerCase() })).toEqual({ ok: true, className: "Form 3 Blue", status: "approved" });
    const detail = await teacher.as.query(api.classes.classes.detail, { classId });
    expect(detail.learners).toEqual([expect.objectContaining({ firstName: "Kuda", status: "approved" })]);
    expect(JSON.stringify(detail)).not.toMatch(/Banda|example\.com/);
    expect(await learner.as.mutation(api.classes.joining.requestJoin, { code: "QQQQQQ" })).toEqual({ ok: false, message: JOIN_ERRORS.unknown });
    expect(await teacher.as.mutation(api.classes.joining.requestJoin, { code })).toEqual({ ok: false, message: JOIN_ERRORS.own });
  });

  test("an under 18 waits for a guardian; the link alone cannot approve, the code to the guardian's phone can", async () => {
    const t = makeT();
    const { teacher, classId, code } = await teacherWithQuiz(t);
    const minor = await makeLearner(t, 15, "Tari Moyo");
    await expect(minor.as.mutation(api.classes.joining.requestJoin, { code })).rejects.toThrow(/NEEDS_GUARDIAN_CONSENT/);
    const token = await addConsent(t, minor);
    expect(await minor.as.mutation(api.classes.joining.requestJoin, { code })).toMatchObject({ ok: true, status: "pending" });
    expect((await teacher.as.query(api.classes.classes.detail, { classId })).learners).toEqual([expect.objectContaining({ firstName: "Tari", status: "pending" })]);
    await expect(minor.as.query(api.classes.sharing.material, { classId })).rejects.toThrow(/Class not found/);

    const info = (await t.query(api.accounts.consent.requestInfo, { token }))!;
    expect(info.classRequests).toEqual([expect.objectContaining({ className: "Form 3 Blue", teacher: "Chipo" })]);
    const enrolmentId = info.classRequests[0].enrolmentId;
    // The learner holds the link too: without the code sent to the guardian's phone nothing happens.
    expect(await t.mutation(api.accounts.consent.decideClass, { token, enrolmentId, approve: true, code: "000000" })).toMatchObject({ state: "wrong_code" });
    // The consent code was just sent; the resend wait has passed by the time a class asks.
    await t.run(async (ctx) => {
      for (const row of await ctx.db.query("consentCodes").collect()) await ctx.db.patch(row._id, { createdAt: row.createdAt - 120_000 });
    });
    expect(await t.action(api.accounts.consent.sendApprovalCode, { token })).toEqual({ sent: true });
    const sms = await lastCode(t, GUARDIAN_PHONE);
    expect(await t.mutation(api.accounts.consent.decideClass, { token, enrolmentId, approve: true, code: sms })).toEqual({ state: "decided" });
    expect(await minor.as.query(api.classes.joining.mine, {})).toEqual([expect.objectContaining({ name: "Form 3 Blue", status: "approved", teacher: "Chipo" })]);
    expect((await minor.as.query(api.classes.sharing.material, { classId })).class.name).toBe("Form 3 Blue");
  });
});

describe("guardians with an account", () => {
  test("a guardian adds a child with a code, gives consent once signed in, then answers class requests with one tap", async () => {
    const t = makeT();
    const { code: classCode } = await teacherWithQuiz(t);
    const guardian = await makeLearner(t, 40, "Rudo Moyo");
    const { code } = await guardian.as.mutation(api.classes.guardians.createChildCode, { firstName: "Tari" });
    const child = await makeLearner(t, 14, "Tari Moyo");
    expect(await child.as.mutation(api.classes.guardians.redeemChildCode, { code: "ZZZZZZ" })).toEqual({ ok: false, message: CHILD_CODE_ERRORS.code });
    expect(await child.as.mutation(api.classes.guardians.redeemChildCode, { code })).toEqual({ ok: true });
    expect(await child.as.mutation(api.classes.guardians.redeemChildCode, { code })).toEqual({ ok: false, message: CHILD_CODE_ERRORS.code });

    let fam = await guardian.as.query(api.classes.guardians.family, {});
    expect(fam.children).toEqual([expect.objectContaining({ firstName: "Tari", consentState: "pending", decides: false })]);
    const childProfileId = fam.children[0].childProfileId;
    const { token } = await guardian.as.mutation(api.classes.guardians.consentLink, { childProfileId });
    await guardian.as.action(api.accounts.consent.sendCode, { token, phone: GUARDIAN_PHONE });
    await guardian.as.mutation(api.accounts.consent.give, { token, guardianName: "Rudo Moyo", relationship: "mother", guardianContact: GUARDIAN_PHONE, code: await lastCode(t, GUARDIAN_PHONE), confirmsGuardian: true, agrees: true });
    fam = await guardian.as.query(api.classes.guardians.family, {});
    expect(fam.children[0]).toMatchObject({ consentState: "given", decides: true, requests: [] });

    await child.as.mutation(api.classes.joining.requestJoin, { code: classCode });
    fam = await guardian.as.query(api.classes.guardians.family, {});
    expect(fam.children[0].requests).toEqual([expect.objectContaining({ className: "Form 3 Blue" })]);
    // Another adult cannot answer for this child.
    const stranger = await makeLearner(t, 30, "Some One");
    await expect(stranger.as.mutation(api.classes.guardians.decide, { enrolmentId: fam.children[0].requests[0].enrolmentId, approve: true })).rejects.toThrow(/not found/);
    await guardian.as.mutation(api.classes.guardians.decide, { enrolmentId: fam.children[0].requests[0].enrolmentId, approve: true });
    expect(await child.as.query(api.classes.joining.mine, {})).toEqual([expect.objectContaining({ status: "approved" })]);
  });

  test("a child who made a second adult account cannot approve themselves through a link", async () => {
    const t = makeT();
    const { code: classCode } = await teacherWithQuiz(t);
    const child = await makeLearner(t, 14, "Tari Moyo");
    await addConsent(t, child);
    const fake = await makeLearner(t, 30, "Fake Parent");
    const { code } = await fake.as.mutation(api.classes.guardians.createChildCode, { firstName: "Tari" });
    await child.as.mutation(api.classes.guardians.redeemChildCode, { code });
    await child.as.mutation(api.classes.joining.requestJoin, { code: classCode });
    const fam = await fake.as.query(api.classes.guardians.family, {});
    // Linked, but the consent standing for the child was not given by this account.
    expect(fam.children[0]).toMatchObject({ decides: false, requests: [] });
    const enrolment = await t.run(async (ctx) => (await ctx.db.query("enrolments").collect())[0]);
    await expect(fake.as.mutation(api.classes.guardians.decide, { enrolmentId: enrolment._id, approve: true })).rejects.toThrow(/not found/);
  });

  test("an adult cannot redeem a child code, and tries are limited", async () => {
    const t = makeT();
    const guardian = await makeLearner(t, 40);
    const { code } = await guardian.as.mutation(api.classes.guardians.createChildCode, { firstName: "Tari" });
    const adult = await makeLearner(t, 25);
    expect(await adult.as.mutation(api.classes.guardians.redeemChildCode, { code })).toEqual({ ok: false, message: CHILD_CODE_ERRORS.adult });
    const child = await makeLearner(t, 14);
    for (let i = 0; i < 10; i++) await child.as.mutation(api.classes.guardians.redeemChildCode, { code: "ZZZZZZ" });
    expect(await child.as.mutation(api.classes.guardians.redeemChildCode, { code })).toEqual({ ok: false, message: CHILD_CODE_ERRORS.tries });
  });
});

describe("sharing", () => {
  test("view only: learners see the teacher's tools; a published book source and its quotes never reach the class", async () => {
    const t = makeT();
    const { teacher, notebookId, outputId: quizId, classId, code } = await teacherWithQuiz(t);
    const summary = await teacher.as.action(api.study.tools.generate, { notebookId, mode: "summarise", options: {} });
    if (!summary.ok) throw new Error(summary.message);
    const outputId = summary.outputId;
    const learner = await makeLearner(t, 20, "Kuda");
    await learner.as.mutation(api.classes.joining.requestJoin, { code });
    await teacher.as.mutation(api.classes.sharing.share, { classId, notebookId, on: true });
    let material = await learner.as.query(api.classes.sharing.material, { classId });
    expect(material.notebooks).toEqual([expect.objectContaining({ title: "Biology", sources: [{ title: "Notes", pages: 1 }] })]);
    // The quiz is not shown with its scheme: papers reach a class only as set work.
    expect(material.notebooks[0].outputs.map((o) => o.kind)).toEqual(["summary"]);
    await expect(learner.as.query(api.classes.sharing.sharedOutput, { classId, outputId: quizId })).rejects.toThrow(/Not found/);
    const shared = await learner.as.query(api.classes.sharing.sharedOutput, { classId, outputId });
    expect(JSON.stringify(shared.output.content)).toContain("Oxygen is released");

    const sourceId = (await teacher.as.query(api.classes.sharing.picker, { classId }))[0].sources[0].sourceId;
    await teacher.as.mutation(api.classes.sharing.setThirdParty, { sourceId, on: true });
    material = await learner.as.query(api.classes.sharing.material, { classId });
    expect(material.notebooks[0].sources).toEqual([]);
    const hidden = await learner.as.query(api.classes.sharing.sharedOutput, { classId, outputId });
    expect(JSON.stringify(hidden.output.content)).not.toContain("Oxygen is released as a by product\"");
    expect(hidden.titles).toEqual({});

    // A learner cannot reach the teacher's notebook or another class's material.
    await expect(learner.as.query(api.notebooks.notebooks.get, { notebookId })).rejects.toThrow();
    await teacher.as.mutation(api.classes.sharing.share, { classId, notebookId, on: false });
    await expect(learner.as.query(api.classes.sharing.sharedOutput, { classId, outputId })).rejects.toThrow(/Not found/);
  });

  test("stripQuotes empties only citations into hidden sources", () => {
    const value = { a: [{ origin: { kind: "source", sourceId: "s1", page: 2, quote: "secret" } }, { origin: { kind: "source", sourceId: "s2", page: 1, quote: "keep" } }] };
    expect(stripQuotes(value, new Set(["s1"]))).toEqual({ a: [{ origin: { kind: "source", sourceId: "s1", page: 2, quote: "" } }, { origin: { kind: "source", sourceId: "s2", page: 1, quote: "keep" } }] });
  });
});

describe("assignments and results", () => {
  test("a learner never gets the scheme before handing in; multiple choice is marked on the server; results are by topic, numbers only", async () => {
    const t = makeT();
    const { teacher, outputId, classId, code } = await teacherWithQuiz(t);
    const learner = await makeLearner(t, 20, "Kuda Banda");
    await learner.as.mutation(api.classes.joining.requestJoin, { code });
    const assignmentId = await teacher.as.mutation(api.classes.assignments.assign, { classId, outputId });
    const paper = await learner.as.query(api.classes.assignments.forLearner, { assignmentId });
    expect(paper.scheme).toBeNull();
    expect(JSON.stringify(paper.questions)).not.toMatch(/markingPoints|"answer"/);
    const mcq = paper.questions.find((q) => q.kind === "mcq")!;

    expect(await learner.as.mutation(api.classes.assignments.handIn, { assignmentId, answers: [{ number: mcq.number, text: "Oxygen" }, { number: 2, text: "carbon dioxide and water" }] })).toEqual({ written: true });
    await expect(learner.as.mutation(api.classes.assignments.handIn, { assignmentId, answers: [] })).rejects.toThrow(/already/);
    const after = await learner.as.query(api.classes.assignments.forLearner, { assignmentId });
    expect(after.scheme).not.toBeNull();
    expect(after.mark).toMatchObject({ score: 1, confirmed: false });
    // Not counted while unmarked.
    expect((await teacher.as.query(api.classes.assignments.results, { classId })).papers[0]).toMatchObject({ scripts: 0, percent: null });
    // The learner cannot raise the multiple choice mark.
    await learner.as.mutation(api.classes.assignments.markWritten, { assignmentId, marks: [{ number: mcq.number, got: 0 }, { number: 2, got: 2 }, { number: 3, got: 9 }, { number: 4, got: 0 }] });
    const marked = await learner.as.query(api.classes.assignments.forLearner, { assignmentId });
    expect(marked.mark).toMatchObject({ score: 5, total: 7, confirmed: true });

    const results = await teacher.as.query(api.classes.assignments.results, { classId });
    expect(results.papers).toEqual([expect.objectContaining({ title: "Photosynthesis practice test", scripts: 1, percent: 71 })]);
    // Question 4 cites nothing in the notes, so it counts under the paper's own title. Weakest first.
    expect(results.topics).toEqual([
      { topic: "Photosynthesis practice test", answers: 1, percent: 0 },
      { topic: "Notes", answers: 3, percent: 100 },
    ]);
    expect(JSON.stringify(results)).not.toMatch(/Kuda|Banda/);
  });

  test("hand marks for a listed name and for a learner from a printed paper", async () => {
    const t = makeT();
    const { teacher, outputId, classId } = await teacherWithQuiz(t);
    const rosterId = await teacher.as.mutation(api.classes.classes.addName, { classId, firstName: "Tendai" });
    await expect(teacher.as.mutation(api.classes.classes.addName, { classId, firstName: "Tendai Moyo Banda" })).rejects.toThrow(/first name/);
    const assignmentId = await teacher.as.mutation(api.classes.assignments.assign, { classId, outputId });
    expect(await teacher.as.mutation(api.classes.assignments.enterMarks, { assignmentId, rosterId, marks: [{ number: 1, got: 1 }, { number: 2, got: 5 }] })).toEqual({ score: 3, total: 7 });
    const sheet = await teacher.as.query(api.classes.assignments.sheet, { assignmentId });
    expect(sheet.rows).toEqual([expect.objectContaining({ firstName: "Tendai", mark: expect.objectContaining({ via: "hand", score: 3, confirmed: true }) })]);
    const other = await makeTeacher(t, "Other Teacher");
    await expect(other.as.query(api.classes.assignments.sheet, { assignmentId })).rejects.toThrow(/Class not found/);
    await expect(other.as.mutation(api.classes.assignments.assign, { classId, outputId })).rejects.toThrow(/Class not found/);
  });

  test("a photographed script is marked against the scheme, checked by a second model, kept as a draft, and its photo deleted", async () => {
    const t = makeT();
    const { teacher, outputId, classId } = await teacherWithQuiz(t);
    const rosterId = await teacher.as.mutation(api.classes.classes.addName, { classId, firstName: "Tendai" });
    const assignmentId = await teacher.as.mutation(api.classes.assignments.assign, { classId, outputId });
    const { uploadId } = await teacher.as.mutation(api.classes.marking.uploadUrl, { classId });
    const bytes = readFileSync(join(process.cwd(), "tests", "fixtures", "scripts", "script-photo.png"));
    const storageId = await t.run(async (ctx) => await ctx.storage.store(new Blob([bytes], { type: "image/png" })));
    const result = await teacher.as.action(api.classes.marking.markScript, { assignmentId, rosterId, photos: [{ uploadId, storageId }] });
    expect(result).toEqual({ ok: true, score: 6, total: 7, check: [4] });
    expect(await t.run(async (ctx) => (await ctx.db.system.query("_storage").collect()).length)).toBe(0);
    expect(await t.run(async (ctx) => (await ctx.db.query("uploads").collect()).length)).toBe(0);

    const sheet = await teacher.as.query(api.classes.assignments.sheet, { assignmentId });
    const draft = sheet.rows[0].mark!;
    expect(draft).toMatchObject({ via: "photo", confirmed: false, check: [4] });
    expect(draft.notes.find((n) => n.number === 4)?.answer).toBe("it keeps energy from the sun");
    expect((await teacher.as.query(api.classes.assignments.results, { classId })).papers[0].scripts).toBe(0);
    await teacher.as.mutation(api.classes.marking.confirm, { markId: draft.markId, marks: [{ number: 1, got: 1 }, { number: 2, got: 2 }, { number: 3, got: 2 }, { number: 4, got: 0 }] });
    expect((await teacher.as.query(api.classes.assignments.results, { classId })).papers[0]).toMatchObject({ scripts: 1, percent: 71 });
  });

  test("the marker's reply is clamped to the scheme, and the second opinion reads every question", () => {
    const content = { title: "P", minutes: 5, totalMarks: 3, questions: [{ number: 1, kind: "short", prompt: "Name it.", options: [], marks: 2, answer: "A", markingPoints: ["A"], origin: { kind: "added" } }, { number: 2, kind: "short", prompt: "Why?", options: [], marks: 1, answer: "B", markingPoints: [], origin: { kind: "added" } }] } as unknown as QuizContent;
    const read = readMarks(content, JSON.stringify({ marks: [{ number: 1, answer: "A", got: 9, reason: "ok" }] }))!;
    expect(read).toEqual([{ number: 1, answer: "A", got: 2, reason: "ok" }, { number: 2, answer: "", got: 0, reason: "" }]);
    expect(readMarks(content, "not json")).toBeNull();
    expect(opinionItems(content, read).map((i) => i.id)).toEqual(["1", "2"]);
    expect(opinionItems(content, read)[1].text).toContain("(no answer)");
  });
});

describe("deletion", () => {
  test("a teacher's account takes their classes, names, shares, papers and marks; a learner's takes their places and marks", async () => {
    const t = makeT();
    const { teacher, notebookId, outputId, classId, code } = await teacherWithQuiz(t);
    const learner = await makeLearner(t, 20);
    await learner.as.mutation(api.classes.joining.requestJoin, { code });
    await teacher.as.mutation(api.classes.sharing.share, { classId, notebookId, on: true });
    await teacher.as.mutation(api.classes.classes.addName, { classId, firstName: "Tendai" });
    const assignmentId = await teacher.as.mutation(api.classes.assignments.assign, { classId, outputId });
    await learner.as.mutation(api.classes.assignments.handIn, { assignmentId, answers: [] });
    await learner.as.mutation(api.accounts.deletion.deleteMyAccount, { confirmEmail: learner.email });
    await settle(t);
    const left = await t.run(async (ctx) => ({ enrolments: (await ctx.db.query("enrolments").collect()).length, marks: (await ctx.db.query("classMarks").collect()).length }));
    expect(left).toEqual({ enrolments: 0, marks: 0 });
    await teacher.as.mutation(api.accounts.deletion.deleteMyAccount, { confirmEmail: teacher.email });
    await settle(t);
    const gone = await t.run(async (ctx) => Object.fromEntries(await Promise.all((["classes", "rosterNames", "classShares", "assignments", "classMarks", "enrolments"] as const).map(async (name) => [name, (await ctx.db.query(name).collect()).length]))));
    expect(gone).toEqual({ classes: 0, rosterNames: 0, classShares: 0, assignments: 0, classMarks: 0, enrolments: 0 });
  });
});
