import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { REPLIES } from "../../convex/notebooks/ask";
import { addConsent, makeLearner, makeT, settle, type Person, type T } from "./people";

describe("general chat with Taku", () => {
  test("a first message starts a chat titled from the question, and Taku answers", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const { chatId, kind } = await p.as.action(api.chat.chats.send, { message: "Explain osmosis simply" });
    expect(kind).toBe("answer");
    const data = await p.as.query(api.chat.chats.get, { chatId });
    expect(data.chat.title).toBe("Explain osmosis simply");
    expect(data.messages.map((m) => m.role)).toEqual(["learner", "taku"]);
    expect(data.messages[1].text).toMatch(/partially permeable membrane/);
    expect((await p.as.query(api.chat.chats.list, { paginationOpts: { numItems: 10, cursor: null } })).page).toHaveLength(1);
  });

  test("Guide me changes how Taku answers", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    await p.as.mutation(api.accounts.profiles.setAnswerMode, { answerMode: "guide" });
    const { chatId } = await p.as.action(api.chat.chats.send, { message: "Explain osmosis simply" });
    const data = await p.as.query(api.chat.chats.get, { chatId });
    expect(data.messages[1].text).toMatch(/work it out together/);
  });

  test("distress gets help, and companion requests are redirected", async () => {
    const t = makeT();
    const p = await makeLearner(t, 30);
    const a = await p.as.action(api.chat.chats.send, { message: "I want to die" });
    const b = await p.as.action(api.chat.chats.send, { chatId: a.chatId, message: "Will you be my girlfriend?" });
    const data = await p.as.query(api.chat.chats.get, { chatId: b.chatId });
    expect(data.messages.filter((m) => m.role === "taku").map((m) => m.text)).toEqual([REPLIES.help, REPLIES.companion]);
  });

  test("chats are private, consent gated, and deleted with the account", async () => {
    const t = makeT();
    const owner = await makeLearner(t, 20);
    const other = await makeLearner(t, 22);
    const { chatId } = await owner.as.action(api.chat.chats.send, { message: "Explain osmosis simply" });
    await expect(other.as.query(api.chat.chats.get, { chatId })).rejects.toThrow(/Chat not found/);
    const minor = await makeLearner(t, 15);
    await expect(minor.as.action(api.chat.chats.send, { message: "hi" })).rejects.toThrow(/NEEDS_GUARDIAN_CONSENT/);
    await owner.as.mutation(api.accounts.deletion.deleteMyAccount, { confirmEmail: owner.email });
    const left = await t.run(async (ctx) => (await ctx.db.query("chats").collect()).length + (await ctx.db.query("chatMessages").collect()).length);
    expect(left).toBe(0);
  });

  test("a started chat is open before Taku replies, and the streaming mark clears at the end", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const chatId = await p.as.mutation(api.chat.chats.start, { message: "Explain osmosis simply" });
    const started = await p.as.query(api.chat.chats.get, { chatId });
    expect(started.chat.title).toBe("Explain osmosis simply");
    expect(started.messages).toEqual([]);
    await p.as.action(api.chat.chats.send, { chatId, message: "Explain osmosis simply" });
    const data = await p.as.query(api.chat.chats.get, { chatId });
    expect(data.messages.map((m) => m.role)).toEqual(["learner", "taku"]);
    expect(data.messages[1].streaming).toBeUndefined();
    expect(data.messages[1].text).toMatch(/partially permeable membrane/);
  });

  test("Guide me can return a widget, and a broken one falls back to plain text", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    await p.as.mutation(api.accounts.profiles.setAnswerMode, { answerMode: "guide" });
    const solved = await p.as.action(api.chat.chats.send, { message: "Solve 2x + 3 = 11" });
    const data = await p.as.query(api.chat.chats.get, { chatId: solved.chatId });
    expect(data.messages[1].widget?.slug).toBe("equation-steps");
    expect(data.messages[1].text).not.toContain("```");
    expect(data.messages[1].text).not.toMatch(/x\s*=\s*4/);

    const broken = await p.as.action(api.chat.chats.send, { message: "Solve this for me please" });
    const reply = (await p.as.query(api.chat.chats.get, { chatId: broken.chatId })).messages[1];
    expect(reply.widget).toBeUndefined();
    expect(reply.text).toMatch(/Which equation/);
    expect(reply.text).not.toContain("```");
  });
});

describe("Ask Taku from my notebooks", () => {
  const NOTES = "Photosynthesis\nGreen plants make glucose from carbon dioxide and water using light energy.\nChlorophyll in the chloroplasts absorbs the light.\nOxygen is released as a by product.";
  const CHEMISTRY = "Acids and bases\nAn acid turns blue litmus paper red.\nA base turns red litmus paper blue.";

  async function twoNotebooks(t: T, p: Person) {
    const biology = await p.as.mutation(api.notebooks.notebooks.create, { title: "Biology" });
    await p.as.mutation(api.notebooks.sources.addText, { notebookId: biology, title: "Plant notes", text: NOTES });
    const chemistry = await p.as.mutation(api.notebooks.notebooks.create, { title: "Chemistry" });
    await p.as.mutation(api.notebooks.sources.addText, { notebookId: chemistry, title: "Acid notes", text: CHEMISTRY });
    await settle(t);
    return { biology, chemistry };
  }

  test("with notebooks picked Taku answers from them with citations to each, and the choice stays with the chat", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const { biology, chemistry } = await twoNotebooks(t, p);
    expect((await p.as.query(api.chat.fromNotebooks.pickable, {})).map((n) => n.title).sort()).toEqual(["Biology", "Chemistry"]);
    const chatId = await p.as.mutation(api.chat.chats.start, { message: "What does chlorophyll do?", notebookIds: [biology, chemistry] });
    const { kind } = await p.as.action(api.chat.chats.send, { chatId, message: "What does chlorophyll do?" });
    expect(kind).toBe("answer");
    const data = await p.as.query(api.chat.chats.get, { chatId });
    expect(data.picked.map((n) => n.title)).toEqual(["Biology", "Chemistry"]);
    const answer = data.messages[1];
    expect(answer.parts).toHaveLength(2);
    const cited = answer.parts!.map((part) => (part.origin.kind === "source" ? data.titles[part.origin.sourceId] : null));
    expect(cited).toEqual(["Plant notes", "Acid notes"]);
    // Removing every notebook goes back to general knowledge.
    await p.as.mutation(api.chat.chats.setNotebooks, { chatId, notebookIds: [] });
    expect((await p.as.query(api.chat.chats.get, { chatId })).picked).toEqual([]);
    await p.as.action(api.chat.chats.send, { chatId, message: "Explain osmosis simply" });
    expect((await p.as.query(api.chat.chats.get, { chatId })).messages[3].parts).toBeUndefined();
  });

  test("only the learner's own notebooks, up to 5, and empty ones say so", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    const other = await makeLearner(t, 22);
    const theirs = await other.as.mutation(api.notebooks.notebooks.create, { title: "Private" });
    const empty = await p.as.mutation(api.notebooks.notebooks.create, { title: "Empty" });
    // Someone else's notebook is never picked, even by id.
    const chatId = await p.as.mutation(api.chat.chats.start, { message: "What does chlorophyll do?", notebookIds: [theirs, empty] });
    expect((await p.as.query(api.chat.chats.get, { chatId })).picked.map((n) => n.title)).toEqual(["Empty"]);
    await p.as.action(api.chat.chats.send, { chatId, message: "What does chlorophyll do?" });
    expect((await p.as.query(api.chat.chats.get, { chatId })).messages[1]).toMatchObject({ kind: "redirect", text: expect.stringContaining("no notes ready") });
    const six = [];
    for (let i = 0; i < 6; i++) six.push(await p.as.mutation(api.notebooks.notebooks.create, { title: `N${i}` }));
    await expect(p.as.mutation(api.chat.chats.setNotebooks, { chatId, notebookIds: six })).rejects.toThrow(/up to 5/);
    await expect(other.as.mutation(api.chat.chats.setNotebooks, { chatId, notebookIds: [theirs] })).rejects.toThrow(/Chat not found/);
  });

  test("an under 18's answer from notebooks passes the output check before it is shown", async () => {
    const t = makeT();
    const p = await makeLearner(t, 15);
    await addConsent(t, p);
    const { biology, chemistry } = await twoNotebooks(t, p);
    const chatId = await p.as.mutation(api.chat.chats.start, { message: "What does chlorophyll do?", notebookIds: [biology, chemistry] });
    await p.as.action(api.chat.chats.send, { chatId, message: "What does chlorophyll do?" });
    const answer = (await p.as.query(api.chat.chats.get, { chatId })).messages[1];
    expect(answer.kind).toBe("answer");
    expect(answer.parts).toHaveLength(2);
    expect(answer.streaming).toBeUndefined();
  });
});
