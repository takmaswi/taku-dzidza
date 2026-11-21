import { describe, expect, test } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { TEST_ME_MODE, TEST_REVIEW_NOTEBOOK } from "../../convex/study/testCards";
import { makeLearner, makeT, settle, type Person, type T } from "./people";

const NOTES = "Photosynthesis\nGreen plants make glucose from carbon dioxide and water using light energy.\nChlorophyll in the chloroplasts absorbs the light.\nOxygen is released as a by product.";

async function notebookWithNotes(t: T, p: Person): Promise<Id<"notebooks">> {
  const notebookId = await p.as.mutation(api.notebooks.notebooks.create, { title: "Form 4 Biology" });
  await p.as.mutation(api.notebooks.sources.addText, { notebookId, title: "Biology notes", text: NOTES });
  await settle(t);
  return notebookId;
}

describe("Taku's voice and support preferences", () => {
  test("new adults start gentle and new teens upbeat, with no old study style", async () => {
    const t = makeT();
    const adult = (await (await makeLearner(t, 30)).as.query(api.accounts.profiles.me, {}))?.profile;
    const teen = (await (await makeLearner(t, 15)).as.query(api.accounts.profiles.me, {}))?.profile;
    expect(adult).toMatchObject({ voice: "gentle" });
    expect(teen).toMatchObject({ voice: "upbeat" });
    expect(adult?.studyStyle).toBeUndefined();
  });

  test("onboarding stores the needs and switches on what they map to, once", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    await p.as.mutation(api.accounts.profiles.setVoice, { voice: "upbeat" });
    await p.as.mutation(api.accounts.profiles.finishOnboarding, { support: ["reading", "anxious", "clearer"] });
    const profile = (await p.as.query(api.accounts.profiles.me, {}))?.profile;
    expect(profile).toMatchObject({ support: ["reading", "anxious", "clearer"], voice: "gentle", styleChosen: true });
    expect(profile?.accessibility).toMatchObject({ dyslexia: true, largeText: true, readAloud: true, highContrast: true, shortChunks: false });
  });

  test("Settings: a newly ticked need switches on its settings, unticking switches nothing off", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    await p.as.mutation(api.accounts.profiles.finishOnboarding, { support: [] });
    await p.as.mutation(api.accounts.profiles.setSupport, { support: ["focus"] });
    expect((await p.as.query(api.accounts.profiles.me, {}))?.profile?.accessibility.shortChunks).toBe(true);
    await p.as.mutation(api.accounts.profiles.setSupport, { support: [] });
    const profile = (await p.as.query(api.accounts.profiles.me, {}))?.profile;
    expect(profile?.support).toEqual([]);
    expect(profile?.accessibility.shortChunks).toBe(true);
  });

  test("support preferences never reach the analytics table", async () => {
    const t = makeT();
    const p = await makeLearner(t, 25);
    await p.as.mutation(api.analytics.setConsent, { consent: true });
    await p.as.mutation(api.accounts.profiles.finishOnboarding, { support: ["english", "anxious"] });
    const rows = await t.run(async (ctx) => await ctx.db.query("analyticsDaily").collect());
    expect(JSON.stringify(rows)).not.toMatch(/english|anxious|support/);
  });

  test("the migration gives old profiles a voice from their study style and leaves the old field alone", async () => {
    const t = makeT();
    const people = [await makeLearner(t, 20), await makeLearner(t, 21), await makeLearner(t, 16), await makeLearner(t, 40)];
    const styles = ["calm", "locked_in", "cook"] as const;
    const ids = await t.run(async (ctx) => {
      const all = await ctx.db.query("profiles").collect();
      for (const [i, row] of all.slice(0, 3).entries()) await ctx.db.patch(row._id, { voice: undefined, studyStyle: styles[i] });
      return all.map((r) => r._id);
    });
    expect(await t.query(internal.accounts.migrations.voicesLeft, {})).toEqual({ profiles: people.length, withoutVoice: 3 });
    await t.mutation(internal.accounts.migrations.voices, {});
    await settle(t);
    const after = await t.run(async (ctx) => await Promise.all(ids.map((id) => ctx.db.get(id))));
    expect(after.map((r) => [r?.studyStyle, r?.voice])).toEqual([
      ["calm", "gentle"],
      ["locked_in", "direct"],
      ["cook", "upbeat"],
      [undefined, "gentle"],
    ]);
    expect(await t.query(internal.accounts.migrations.voicesLeft, {})).toEqual({ profiles: people.length, withoutVoice: 0 });
  });
});

describe("study modes in Ask Taku", () => {
  test("Test me asks one question at a time, marks each answer, and a wrong one becomes a review card", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const { chatId } = await p.as.action(api.chat.chats.send, { message: "Test me on photosynthesis", studyMode: "test" });
    await p.as.action(api.chat.chats.send, { chatId, message: "Oxygen", studyMode: "test" });
    await p.as.action(api.chat.chats.send, { chatId, message: "Light energy", studyMode: "test" });
    const { messages } = await p.as.query(api.chat.chats.get, { chatId });
    const taku = messages.filter((m) => m.role === "taku");
    expect(taku.map((m) => m.test?.correct)).toEqual([undefined, false, true]);
    expect(taku.map((m) => m.test?.question)).toEqual(["What gas do plants take in for photosynthesis?", "What does chlorophyll absorb?", "What sugar do plants make?"]);
    // The block never shows, and the expected answer never reaches the browser.
    for (const m of taku) {
      expect(m.text).not.toContain("```test");
      expect(m.test?.answer).toBe("");
    }
    const stored = await t.run(async (ctx) => await ctx.db.query("chatMessages").collect());
    expect(stored.filter((m) => m.role === "taku").map((m) => m.studyMode)).toEqual(["test", "test", "test"]);
    const cards = await t.run(async (ctx) => await ctx.db.query("cards").collect());
    expect(cards.map((c) => [c.front, c.back])).toEqual([["What gas do plants take in for photosynthesis?", "Carbon dioxide"]]);
    const notebook = await t.run(async (ctx) => await ctx.db.get(cards[0].notebookId));
    expect(notebook).toMatchObject({ title: TEST_REVIEW_NOTEBOOK, testReview: true });
    const output = await t.run(async (ctx) => await ctx.db.get(cards[0].outputId));
    expect(output).toMatchObject({ mode: TEST_ME_MODE, kind: "cards", content: { count: 1 } });
  });

  test("Sprint and Exam prep change what Taku is asked to do", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const sprint = await p.as.action(api.chat.chats.send, { message: "Explain osmosis simply", studyMode: "sprint" });
    const exam = await p.as.action(api.chat.chats.send, { message: "Give me an exam question on osmosis", studyMode: "exam" });
    const sprintReply = (await p.as.query(api.chat.chats.get, { chatId: sprint.chatId })).messages[1];
    const examReply = (await p.as.query(api.chat.chats.get, { chatId: exam.chatId })).messages[1];
    expect(sprintReply.text.split(/\s+/).length).toBeLessThan(120);
    expect(examReply.text).toMatch(/\[3 marks\]/);
  });

  test("the prompts carry the mode, the voice and simpler English for those who asked", async () => {
    const { chatPrompt } = await import("../../convex/chat/chats");
    const { systemPrompt } = await import("../../convex/notebooks/ask");
    const base = { answerMode: "answer" as const, voice: "direct" as const, shortChunks: false, simpleEnglish: false, studyingFor: "olevel" as const };
    expect(chatPrompt(base, "learn")).toMatch(/STUDY MODE: LEARN[\s\S]*one worked example[\s\S]*check question/);
    expect(chatPrompt(base, "test")).toMatch(/```test/);
    expect(chatPrompt(base, "sprint")).toMatch(/under 120 words/);
    expect(chatPrompt(base, "exam")).toMatch(/ZIMSEC or Cambridge IGCSE[\s\S]*command words[\s\S]*mark scheme/);
    expect(chatPrompt(base)).toMatch(/VOICE: DIRECT/);
    expect(chatPrompt(base)).not.toMatch(/Key words/);
    expect(chatPrompt({ ...base, simpleEnglish: true })).toMatch(/Key words/);
    expect(systemPrompt({ ...base, sourceMode: "only_mine", voice: "upbeat" }, "test")).toMatch(/VOICE: UPBEAT[\s\S]*STUDY MODE: TEST ME/);
    expect(systemPrompt({ ...base, sourceMode: "only_mine" })).not.toMatch(/\{\{/);
  });
});

describe("Test me in a notebook", () => {
  test("Taku asks from the notes, marks the answer, and a wrong one becomes a card cited to the page", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const notebookId = await notebookWithNotes(t, p);
    await p.as.action(api.notebooks.ask.ask, { notebookId, question: "Test me", studyMode: "test" });
    await p.as.action(api.notebooks.ask.ask, { notebookId, question: "Carbon dioxide", studyMode: "test" });
    const { messages } = await p.as.query(api.notebooks.notebooks.get, { notebookId });
    const taku = messages.filter((m) => m.role === "taku");
    expect(taku.map((m) => m.test?.correct)).toEqual([undefined, false]);
    expect(taku.map((m) => m.test?.question)).toEqual(["What is released as a by product of photosynthesis?", "What absorbs the light in a leaf?"]);
    expect(taku.every((m) => m.test?.answer === "" && m.test?.origin === undefined)).toBe(true);
    const cards = await t.run(async (ctx) => await ctx.db.query("cards").collect());
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ notebookId, front: "What is released as a by product of photosynthesis?", back: "Oxygen", origin: { kind: "source", page: 1, quote: "Oxygen is released as a by product" } });
    // The cards show up for review in the same notebook.
    const due = await p.as.query(api.study.cards.due, { notebookId, now: Date.now() + 1000 });
    expect(due.cards).toHaveLength(1);
  });
});
