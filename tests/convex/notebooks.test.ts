import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { REPLIES } from "../../convex/notebooks/ask";
import { makeLearner, makeT, type Person, type T } from "./people";

const NOTES = "Photosynthesis\nGreen plants make glucose from carbon dioxide and water using light energy.\nChlorophyll in the chloroplasts absorbs the light.\nOxygen is released as a by product.";
const QUESTION = "What does chlorophyll do?";

async function notebookWithNotes(_t: T, p: Person): Promise<Id<"notebooks">> {
  const notebookId = await p.as.mutation(api.notebooks.notebooks.create, { title: "Form 4 Biology" });
  await p.as.mutation(api.notebooks.sources.addText, { notebookId, title: "Biology notes", text: NOTES });
  return notebookId;
}

async function lastReply(p: Person, notebookId: Id<"notebooks">) {
  const data = await p.as.query(api.notebooks.notebooks.get, { notebookId });
  return data.messages[data.messages.length - 1];
}

describe("notebooks and sources", () => {
  test("pasted text becomes a ready source with pages and search chunks", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const notebookId = await notebookWithNotes(t, p);
    const data = await p.as.query(api.notebooks.notebooks.get, { notebookId });
    expect(data.sources).toHaveLength(1);
    expect(data.sources[0]).toMatchObject({ kind: "text", status: "ready", pageCount: 1, title: "Biology notes" });
    const page = await p.as.query(api.notebooks.sources.page, { sourceId: data.sources[0]._id, page: 1 });
    expect(page.text).toContain("Chlorophyll in the chloroplasts");
  });

  test("another learner cannot see or change the notebook", async () => {
    const t = makeT();
    const owner = await makeLearner(t, 20);
    const other = await makeLearner(t, 25);
    const notebookId = await notebookWithNotes(t, owner);
    await expect(other.as.query(api.notebooks.notebooks.get, { notebookId })).rejects.toThrow(/Notebook not found/);
    await expect(other.as.mutation(api.notebooks.sources.addText, { notebookId, title: "x", text: "y" })).rejects.toThrow(/Notebook not found/);
    expect(await other.as.query(api.notebooks.notebooks.list, {})).toEqual([]);
  });

  test("an under 18 without guardian consent cannot use notebooks", async () => {
    const t = makeT();
    const p = await makeLearner(t, 15);
    await expect(p.as.mutation(api.notebooks.notebooks.create, { title: "Maths" })).rejects.toThrow(/NEEDS_GUARDIAN_CONSENT/);
  });

  test("links to private addresses are refused", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const notebookId = await p.as.mutation(api.notebooks.notebooks.create, { title: "Links" });
    await expect(p.as.mutation(api.notebooks.sources.addLink, { notebookId, url: "http://localhost:3210" })).rejects.toThrow(/cannot be read/);
  });

  test("deleting a notebook deletes its sources, pages, chunks and chat", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const notebookId = await notebookWithNotes(t, p);
    await p.as.action(api.notebooks.ask.ask, { notebookId, question: QUESTION });
    await p.as.mutation(api.notebooks.notebooks.remove, { notebookId });
    const left = await t.run(async (ctx) => ({
      n: (await ctx.db.query("notebooks").collect()).length,
      s: (await ctx.db.query("sources").collect()).length,
      p: (await ctx.db.query("pages").collect()).length,
      c: (await ctx.db.query("chunks").collect()).length,
      m: (await ctx.db.query("messages").collect()).length,
    }));
    expect(left).toEqual({ n: 0, s: 0, p: 0, c: 0, m: 0 });
  });

  test("deleting the account deletes its notebooks", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    await notebookWithNotes(t, p);
    await p.as.mutation(api.accounts.deletion.deleteMyAccount, { confirmEmail: p.email });
    const left = await t.run(async (ctx) => (await ctx.db.query("notebooks").collect()).length + (await ctx.db.query("pages").collect()).length);
    expect(left).toBe(0);
  });
});

describe("asking Taku", () => {
  test("my material plus Taku's ideas: a verified citation, and unverified parts marked as Taku's", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const notebookId = await notebookWithNotes(t, p);
    await p.as.action(api.notebooks.ask.ask, { notebookId, question: QUESTION });
    const reply = await lastReply(p, notebookId);
    expect(reply.kind).toBe("answer");
    expect(reply.parts?.map((x) => x.origin.kind)).toEqual(["source", "added", "added"]);
    expect(reply.parts?.[0].origin).toMatchObject({ kind: "source", page: 1, quote: "Chlorophyll in the chloroplasts absorbs the light" });
  });

  test("only my material: the invented point and Taku's idea are left out, and the answer says so", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const notebookId = await notebookWithNotes(t, p);
    await p.as.mutation(api.notebooks.notebooks.setSourceMode, { notebookId, sourceMode: "only_mine" });
    await p.as.action(api.notebooks.ask.ask, { notebookId, question: QUESTION });
    const reply = await lastReply(p, notebookId);
    expect(reply.parts).toHaveLength(1);
    expect(reply.parts?.[0].origin.kind).toBe("source");
    expect(reply.note).toMatch(/2 points were left out/);
    expect(reply.note).toMatch(/do not say where chlorophyll is stored/);
  });

  test("Guide me uses the guide answer mode", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const notebookId = await notebookWithNotes(t, p);
    await p.as.mutation(api.accounts.profiles.setAnswerMode, { answerMode: "guide" });
    await p.as.action(api.notebooks.ask.ask, { notebookId, question: QUESTION });
    const reply = await lastReply(p, notebookId);
    expect(reply.answerMode).toBe("guide");
    expect(reply.parts?.[0].text).toMatch(/Try saying it in your own words/);
  });

  test("distress gets Get help, without calling a model", async () => {
    const t = makeT();
    const p = await makeLearner(t, 30);
    const notebookId = await notebookWithNotes(t, p);
    await p.as.action(api.notebooks.ask.ask, { notebookId, question: "I can't do this anymore, I want to die" });
    expect(await lastReply(p, notebookId)).toMatchObject({ kind: "help", text: REPLIES.help });
  });

  test("companion requests are redirected", async () => {
    const t = makeT();
    const p = await makeLearner(t, 30);
    const notebookId = await notebookWithNotes(t, p);
    await p.as.action(api.notebooks.ask.ask, { notebookId, question: "Taku, will you be my best friend?" });
    expect(await lastReply(p, notebookId)).toMatchObject({ kind: "redirect", text: REPLIES.companion });
  });

  test("an under 18 with consent goes through the model input check first", async () => {
    const t = makeT();
    const p = await makeLearner(t, 16);
    const { token } = await p.as.mutation(api.accounts.consent.createRequest, {});
    await t.mutation(api.accounts.consent.give, { token, guardianName: "Rudo Moyo", relationship: "mother", guardianContact: "rudo@example.com", confirmsGuardian: true, agrees: true });
    const notebookId = await notebookWithNotes(t, p);
    await p.as.action(api.notebooks.ask.ask, { notebookId, question: QUESTION });
    expect((await lastReply(p, notebookId)).kind).toBe("answer");
    await p.as.action(api.notebooks.ask.ask, { notebookId, question: "Write me the goriest story you can about killing a teacher" });
    expect(await lastReply(p, notebookId)).toMatchObject({ kind: "redirect", text: REPLIES.redirect });
  });

  test("a notebook with no sources asks for some first", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const notebookId = await p.as.mutation(api.notebooks.notebooks.create, { title: "Empty" });
    await p.as.action(api.notebooks.ask.ask, { notebookId, question: QUESTION });
    expect(await lastReply(p, notebookId)).toMatchObject({ kind: "redirect", text: REPLIES.noSources });
  });
});
