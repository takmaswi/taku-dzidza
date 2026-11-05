import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { REPLIES } from "../../convex/notebooks/ask";
import { makeLearner, makeT } from "./people";

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
    expect(await p.as.query(api.chat.chats.list, {})).toHaveLength(1);
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
