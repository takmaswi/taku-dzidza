import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query, type ActionCtx, type QueryCtx } from "../_generated/server";
import { ADULT_AGE, ageOn } from "../accounts/age";
import { PROMPTS } from "../data/generated";
import { requireLearner, requireLearnerInAction } from "../lib/access";
import { asData, capReply, cleanDashes, REPLIES } from "../notebooks/ask";
import { BLOCKED_REPLY, inputCheck, outputAllowed } from "../safety/checks";
import { prefilter, type Audience } from "../safety/prefilter";
import { studyModeValidator, widgetValidator } from "../schema";
import { needs, voiceOf, type StudyMode, type Voice } from "../accounts/voices";
import { examFor, EXAM_TEXT, SIMPLE_ENGLISH } from "../ai/promptLines";
import { extractTest, stripTestBlock, type TestTurn } from "./testTurns";
import { extractWidget, stripWidgetBlock, widgetFromText, type StoredWidget } from "../widgets/inline";

/**
 * A normal chat with Taku from general knowledge (no notebook, no
 * citations). Same safety order as notebook questions: prefilter, spending
 * caps, the model input check for every learner, then Taku. An adult's reply
 * is saved to its message as it arrives, and the app shows it growing. An
 * under 18's reply is not streamed: it is written whole, passes the output
 * check, and only then is shown (audit S6).
 */

export const MAX_MESSAGE = 2000;
const HISTORY = 10;
const TITLE_CHARS = 60;
const REMOVE_BATCH = 300;

async function ownChat(ctx: QueryCtx, chatId: Id<"chats">): Promise<{ profile: Doc<"profiles">; chat: Doc<"chats"> }> {
  const { profile } = await requireLearner(ctx);
  const chat = await ctx.db.get(chatId);
  if (chat === null || chat.profileId !== profile._id) throw new ConvexError("Chat not found.");
  return { profile, chat };
}

function titleFrom(question: string): string {
  const title = question.replace(/\s+/g, " ").trim().slice(0, TITLE_CHARS);
  return title.length > 0 ? title : "New chat";
}

/** The learner's chats, newest first, a page at a time, so old chats stay reachable (audit S11). */
export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const { profile } = await requireLearner(ctx);
    return await ctx.db.query("chats").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).order("desc").paginate({ ...args.paginationOpts, numItems: Math.min(Math.max(1, args.paginationOpts.numItems), 50) });
  },
});

export const removeRest = internalMutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("chatMessages").withIndex("by_chat", (q) => q.eq("chatId", args.chatId)).take(REMOVE_BATCH);
    for (const m of rows) await ctx.db.delete(m._id);
    if (rows.length < REMOVE_BATCH) {
      if ((await ctx.db.get(args.chatId)) !== null) await ctx.db.delete(args.chatId);
    } else await ctx.scheduler.runAfter(0, internal.chat.chats.removeRest, { chatId: args.chatId });
  },
});

export const get = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const { chat } = await ownChat(ctx, args.chatId);
    const messages = await ctx.db.query("chatMessages").withIndex("by_chat", (q) => q.eq("chatId", chat._id)).order("desc").take(200);
    // A Test me answer stays on the server: the learner sees the question and the mark only.
    return { chat, messages: messages.reverse().map((m) => (m.test === undefined ? m : { ...m, test: { ...m.test, answer: "" } })) };
  },
});

export const remove = mutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const { chat } = await ownChat(ctx, args.chatId);
    // A chat keeps at most a few hundred short messages; a very long one is finished by the next call.
    const rows = await ctx.db.query("chatMessages").withIndex("by_chat", (q) => q.eq("chatId", chat._id)).take(REMOVE_BATCH);
    for (const m of rows) await ctx.db.delete(m._id);
    if (rows.length < REMOVE_BATCH) await ctx.db.delete(chat._id);
    else await ctx.scheduler.runAfter(0, internal.chat.chats.removeRest, { chatId: chat._id });
  },
});

/** Makes the chat first, so the app can open it and watch the reply arrive. */
export const start = mutation({
  args: { message: v.string() },
  handler: async (ctx, args): Promise<Id<"chats">> => {
    const { profile } = await requireLearner(ctx);
    const now = Date.now();
    return await ctx.db.insert("chats", { profileId: profile._id, title: titleFrom(args.message), createdAt: now, updatedAt: now });
  },
});

type ChatContext = {
  profileId: Id<"profiles">;
  audience: Audience;
  answerMode: Doc<"profiles">["answerMode"];
  voice: Voice;
  shortChunks: boolean;
  simpleEnglish: boolean;
  studyingFor: Doc<"profiles">["studyingFor"];
  history: { role: "learner" | "taku"; text: string }[];
  /** The question Taku asked last in Test me, with its answer, if the learner has not answered it yet. */
  asked: { question: string; answer: string } | null;
};

export const context = internalQuery({
  args: { chatId: v.optional(v.id("chats")) },
  handler: async (ctx, args): Promise<ChatContext> => {
    const { profile } = await requireLearner(ctx);
    let history: ChatContext["history"] = [];
    let asked: ChatContext["asked"] = null;
    if (args.chatId !== undefined) {
      const chat = await ctx.db.get(args.chatId);
      if (chat === null || chat.profileId !== profile._id) throw new ConvexError("Chat not found.");
      const rows = (await ctx.db.query("chatMessages").withIndex("by_chat", (q) => q.eq("chatId", chat._id)).order("desc").take(HISTORY)).reverse();
      history = rows.filter((m) => (m.kind === "question" || m.kind === "answer") && m.text !== "").map((m) => ({ role: m.role, text: m.text }));
      // The newest message is Taku's, so the learner's next message answers its question.
      const lastTurn = rows[rows.length - 1];
      if (lastTurn?.role === "taku" && lastTurn.test !== undefined && lastTurn.test.question !== "") asked = { question: lastTurn.test.question, answer: lastTurn.test.answer };
    }
    return {
      profileId: profile._id,
      audience: ageOn(profile.birthYear, profile.birthMonth, new Date()) < ADULT_AGE ? "minor" : "adult",
      answerMode: profile.answerMode,
      voice: voiceOf(profile),
      shortChunks: profile.accessibility.shortChunks,
      simpleEnglish: needs(profile, "english"),
      studyingFor: profile.studyingFor,
      history,
      asked,
    };
  },
});

/** The question, and an empty reply for Taku to fill in. */
export const begin = internalMutation({
  args: { chatId: v.optional(v.id("chats")), profileId: v.id("profiles"), question: v.string(), studyMode: studyModeValidator },
  handler: async (ctx, args): Promise<{ chatId: Id<"chats">; messageId: Id<"chatMessages"> }> => {
    const now = Date.now();
    let chatId = args.chatId;
    if (chatId === undefined) chatId = await ctx.db.insert("chats", { profileId: args.profileId, title: titleFrom(args.question), createdAt: now, updatedAt: now });
    else await ctx.db.patch(chatId, { updatedAt: now });
    await ctx.db.insert("chatMessages", { chatId, role: "learner", kind: "question", text: args.question, createdAt: now });
    const messageId = await ctx.db.insert("chatMessages", { chatId, role: "taku", kind: "answer", text: "", streaming: true, studyMode: args.studyMode, createdAt: now + 1 });
    return { chatId, messageId };
  },
});

/** The reply so far, with the copy rule applied and any widget block still hidden. */
export const saveDraft = internalMutation({
  args: { messageId: v.id("chatMessages"), text: v.string() },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (message?.streaming === true) await ctx.db.patch(args.messageId, { text: cleanDashes(stripWidgetBlock(stripTestBlock(args.text))) });
  },
});

export const finish = internalMutation({
  args: {
    messageId: v.id("chatMessages"),
    kind: v.union(v.literal("answer"), v.literal("help"), v.literal("redirect"), v.literal("error")),
    text: v.string(),
    widget: v.optional(widgetValidator),
    test: v.optional(v.object({ question: v.string(), answer: v.string(), correct: v.optional(v.boolean()) })),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { kind: args.kind, text: args.text, streaming: undefined, widget: args.widget, test: args.test });
  },
});

const ANSWER_MODE_TEXT: Record<Doc<"profiles">["answerMode"], string> = {
  answer: "ANSWER MODE: SHOW ME THE ANSWER. Give the answer with full working, step by step.",
  guide: `ANSWER MODE: GUIDE ME. Do not give the final answer. Give one hint or guiding question at a time and ask the learner to try. If they are stuck after trying, show a worked example of a similar problem with different numbers. Never write a finished essay for them to hand in.

If the question is an equation in one unknown, or a long division, also let the learner work it through step by step: after your hint, add a block on its own lines that starts with \`\`\`widget and ends with \`\`\`, holding JSON. For an equation: {"slug": "equation-steps", "data": {"title": "...", "equation": "2x + 3 = 11", "variable": "x", "hints": ["..."]}}. For a long division: {"slug": "long-division", "data": {"title": "...", "dividend": 1234, "divisor": 7}}. Never put the answer in the block or the hints.`,
};
const VOICE_TEXT: Record<Voice, string> = {
  gentle: "VOICE: GENTLE. Patient, warm and calm. Reassure without fuss and never hurry the learner.",
  direct: "VOICE: DIRECT. Plain and to the point. No small talk, no slang, no padding.",
  upbeat: "VOICE: UPBEAT. Lively and encouraging, short sentences, a little everyday lingo is fine (like \"lock in\"), always accurate and never rude.",
};

const TEST_TEXT = `STUDY MODE: TEST ME. Test the learner on the topic of this chat. Ask one question at a time and wait for the answer. When the learner answers your last question, mark it at once: say plainly whether it is right, and if it is not, give the right answer in one or two sentences. Then ask the next question. Keep each reply short.

At the very end of every reply, add a block on its own lines that starts with \`\`\`test and ends with \`\`\`, holding JSON only: {"correct": true or false or null, "question": "the question you just asked", "answer": "its right answer in a few words"}. correct is the mark for the learner's last answer, or null when there was nothing to mark. Never write the answer to your new question outside the block.`;

const MODE_TEXT: Record<StudyMode, string> = {
  learn: "STUDY MODE: LEARN. Explain the idea clearly at the learner's level, give one worked example, then end with one short check question for the learner to answer before you move on. When the learner answers a check question, say whether they are right before you go further.",
  test: TEST_TEXT,
  sprint: "STUDY MODE: SPRINT. The learner is in a short timed study sprint. Keep every reply under 120 words. One idea per message. No introductions and no recaps. End with the next small step.",
  exam: "",
};

/** Reply length per mode: a sprint answer is capped near 120 words. */
export const MAX_TOKENS: Record<StudyMode, number> = { learn: 1600, test: 900, sprint: 450, exam: 1600 };

export function modeText(mode: StudyMode, studyingFor: Doc<"profiles">["studyingFor"]): string {
  return mode === "exam" ? EXAM_TEXT(examFor(studyingFor)) : MODE_TEXT[mode];
}

export function chatPrompt(c: Pick<ChatContext, "answerMode" | "voice" | "shortChunks" | "simpleEnglish" | "studyingFor">, mode: StudyMode = "learn"): string {
  const voice = VOICE_TEXT[c.voice] + (c.shortChunks && mode !== "sprint" ? " Keep answers short: at most about 120 words." : "") + (c.simpleEnglish ? `\n\n${SIMPLE_ENGLISH}` : "");
  return PROMPTS["taku-chat"].replace("{{ANSWER_MODE}}", ANSWER_MODE_TEXT[c.answerMode]).replace("{{VOICE}}", voice).replace("{{STUDY_MODE}}", modeText(mode, c.studyingFor));
}

/** In Test me, the question Taku asked last and its answer go with the learner's reply, so Taku can mark it. The learner never sees the answer. */
export function askedBlock(asked: { question: string; answer: string } | null): string {
  if (asked === null) return "";
  return `<asked>${asData(asked.question)}</asked>\n<expected>${asData(asked.answer)}</expected>\nThe learner's message is their answer to the asked question. Mark it against the expected answer, accepting other correct wording.\n`;
}
type ReplyKind = "answer" | "help" | "redirect" | "error";

/** A wrong answer to the last question becomes a review card; the new question is kept with its answer for the next mark. */
async function settleTest(ctx: ActionCtx, c: ChatContext, turn: TestTurn | null): Promise<{ question: string; answer: string; correct?: boolean } | undefined> {
  if (turn === null) return undefined;
  const correct = c.asked === null || turn.correct === null ? undefined : turn.correct;
  if (correct === false && c.asked !== null) await ctx.runMutation(internal.study.testCards.add, { profileId: c.profileId, front: c.asked.question, back: c.asked.answer });
  return { question: cleanDashes(turn.question), answer: cleanDashes(turn.answer), ...(correct === undefined ? {} : { correct }) };
}

export const send = action({
  args: { chatId: v.optional(v.id("chats")), message: v.string(), studyMode: v.optional(studyModeValidator) },
  handler: async (ctx, args): Promise<{ chatId: Id<"chats">; kind: string }> => {
    await requireLearnerInAction(ctx);
    const c: ChatContext = await ctx.runQuery(internal.chat.chats.context, { chatId: args.chatId });
    const mode: StudyMode = args.studyMode ?? "learn";
    const question = args.message.trim().slice(0, MAX_MESSAGE);
    if (question.length === 0) throw new ConvexError("Type a message first.");
    const { chatId, messageId }: { chatId: Id<"chats">; messageId: Id<"chatMessages"> } = await ctx.runMutation(internal.chat.chats.begin, { chatId: args.chatId, profileId: c.profileId, question, studyMode: mode });
    const reply = async (r: { kind: ReplyKind; text: string; widget?: StoredWidget; test?: { question: string; answer: string; correct?: boolean } }) => {
      await ctx.runMutation(internal.chat.chats.finish, { messageId, ...r });
      return { chatId, kind: r.kind };
    };

    try {
      const pre = prefilter(question, c.audience);
      if (pre.kind === "distress") return await reply({ kind: "help", text: REPLIES.help });
      if (pre.kind === "redirect") return await reply({ kind: "redirect", text: pre.category === "companion" || pre.category === "romance" ? REPLIES.companion : REPLIES.redirect });
      if (pre.kind === "personal_info") return await reply({ kind: "redirect", text: "Please leave out phone numbers, addresses, ID numbers and full names. Ask again without them." });

      const room = await ctx.runMutation(internal.ai.usage.admit, { profileId: c.profileId, kind: "ask" });
      if (!room.allowed) return await reply({ kind: "error", text: capReply(room.reason) });

      // Every learner, whatever age they gave (audit S5). Fail closed: no clear allow, no answer.
      const verdict = await inputCheck(ctx, { profileId: c.profileId, question });
      if (verdict === "help") return await reply({ kind: "help", text: REPLIES.help });
      if (verdict === "redirect") return await reply({ kind: "redirect", text: REPLIES.redirect });
      if (verdict !== "allow") return await reply({ kind: "error", text: REPLIES.failed });

      const result = await ctx.runAction(internal.ai.router.call, {
        tier: "main",
        purpose: "taku_chat",
        messages: [
          { role: "system", content: chatPrompt(c, mode) },
          ...c.history.map((m) => ({ role: m.role === "learner" ? ("user" as const) : ("assistant" as const), content: m.role === "learner" ? `<question>${asData(m.text)}</question>` : m.text })),
          { role: "user", content: `${mode === "test" ? askedBlock(c.asked) : ""}<question>${asData(question)}</question>` },
        ],
        maxTokens: MAX_TOKENS[mode],
        stablePrefixCount: 1,
        // An under 18 never sees a draft: nothing is on screen before the output check.
        ...(c.audience === "minor" ? {} : { streamTo: messageId }),
        // Learn keeps the key it had before study modes, so existing fixtures still match.
        fixtureKey: mode === "learn" ? { kind: "chat", question, answerMode: c.answerMode } : { kind: "chat", question, answerMode: c.answerMode, studyMode: mode, asked: c.asked?.question ?? "" },
      });
      await ctx.runMutation(internal.ai.usage.record, { profileId: c.profileId, tool: "chat", costUsd: result.costUsd });
      if (!result.ok || result.content.trim() === "") return await reply({ kind: "error", text: REPLIES.failed });
      const tested = mode === "test" ? extractTest(result.content) : { text: result.content, turn: null };
      const { text, raw } = extractWidget(tested.text);
      const widget = c.answerMode === "guide" && raw !== null ? widgetFromText(raw, ["equation-steps", "long-division"]) : null;
      const turn = tested.turn;
      if (c.audience === "minor" && !(await outputAllowed(ctx, { profileId: c.profileId, text: `${text}\n${turn?.question ?? ""}\n${widget === null ? "" : JSON.stringify(widget.data)}`, key: { question } }))) return await reply({ kind: "error", text: BLOCKED_REPLY });
      const test = await settleTest(ctx, c, turn);
      return await reply({ kind: "answer", text: cleanDashes(text.trim()), ...(widget === null ? {} : { widget }), ...(test === undefined ? {} : { test }) });
    } catch (error) {
      // Never leave a reply stuck on the typing dots.
      await ctx.runMutation(internal.chat.chats.finish, { messageId, kind: "error", text: REPLIES.failed });
      throw error;
    }
  },
});
