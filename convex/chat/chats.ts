import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query, type QueryCtx } from "../_generated/server";
import { ADULT_AGE, ageOn } from "../accounts/age";
import { PROMPTS } from "../data/generated";
import { requireLearner, requireLearnerInAction } from "../lib/access";
import { asData, capReply, cleanDashes, REPLIES } from "../notebooks/ask";
import { prefilter, type Audience } from "../safety/prefilter";
import { widgetValidator } from "../schema";
import { extractWidget, stripWidgetBlock, widgetFromText, type StoredWidget } from "../widgets/inline";

/**
 * A normal chat with Taku from general knowledge (no notebook, no
 * citations). Same safety order as notebook questions: prefilter, the model
 * input check for under 18s, spending caps, then Taku. The reply is saved to
 * its message as it arrives, and the app shows it growing.
 */

export const MAX_MESSAGE = 2000;
const HISTORY = 10;
const TITLE_CHARS = 60;

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

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { profile } = await requireLearner(ctx);
    return await ctx.db.query("chats").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).order("desc").take(50);
  },
});

export const get = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const { chat } = await ownChat(ctx, args.chatId);
    const messages = await ctx.db.query("chatMessages").withIndex("by_chat", (q) => q.eq("chatId", chat._id)).order("desc").take(200);
    return { chat, messages: messages.reverse() };
  },
});

export const remove = mutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const { chat } = await ownChat(ctx, args.chatId);
    for (const m of await ctx.db.query("chatMessages").withIndex("by_chat", (q) => q.eq("chatId", chat._id)).collect()) await ctx.db.delete(m._id);
    await ctx.db.delete(chat._id);
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

type ChatContext = { profileId: Id<"profiles">; audience: Audience; answerMode: Doc<"profiles">["answerMode"]; studyStyle: Doc<"profiles">["studyStyle"]; shortChunks: boolean; history: { role: "learner" | "taku"; text: string }[] };

export const context = internalQuery({
  args: { chatId: v.optional(v.id("chats")) },
  handler: async (ctx, args): Promise<ChatContext> => {
    const { profile } = await requireLearner(ctx);
    let history: ChatContext["history"] = [];
    if (args.chatId !== undefined) {
      const chat = await ctx.db.get(args.chatId);
      if (chat === null || chat.profileId !== profile._id) throw new ConvexError("Chat not found.");
      const rows = await ctx.db.query("chatMessages").withIndex("by_chat", (q) => q.eq("chatId", chat._id)).order("desc").take(HISTORY);
      history = rows.reverse().filter((m) => (m.kind === "question" || m.kind === "answer") && m.text !== "").map((m) => ({ role: m.role, text: m.text }));
    }
    return {
      profileId: profile._id,
      audience: ageOn(profile.birthYear, profile.birthMonth, new Date()) < ADULT_AGE ? "minor" : "adult",
      answerMode: profile.answerMode,
      studyStyle: profile.studyStyle,
      shortChunks: profile.accessibility.shortChunks,
      history,
    };
  },
});

/** The question, and an empty reply for Taku to fill in. */
export const begin = internalMutation({
  args: { chatId: v.optional(v.id("chats")), profileId: v.id("profiles"), question: v.string() },
  handler: async (ctx, args): Promise<{ chatId: Id<"chats">; messageId: Id<"chatMessages"> }> => {
    const now = Date.now();
    let chatId = args.chatId;
    if (chatId === undefined) chatId = await ctx.db.insert("chats", { profileId: args.profileId, title: titleFrom(args.question), createdAt: now, updatedAt: now });
    else await ctx.db.patch(chatId, { updatedAt: now });
    await ctx.db.insert("chatMessages", { chatId, role: "learner", kind: "question", text: args.question, createdAt: now });
    const messageId = await ctx.db.insert("chatMessages", { chatId, role: "taku", kind: "answer", text: "", streaming: true, createdAt: now + 1 });
    return { chatId, messageId };
  },
});

/** The reply so far, with the copy rule applied and any widget block still hidden. */
export const saveDraft = internalMutation({
  args: { messageId: v.id("chatMessages"), text: v.string() },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (message?.streaming === true) await ctx.db.patch(args.messageId, { text: cleanDashes(stripWidgetBlock(args.text)) });
  },
});

export const finish = internalMutation({
  args: { messageId: v.id("chatMessages"), kind: v.union(v.literal("answer"), v.literal("help"), v.literal("redirect"), v.literal("error")), text: v.string(), widget: v.optional(widgetValidator) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { kind: args.kind, text: args.text, streaming: undefined, widget: args.widget });
  },
});

const ANSWER_MODE_TEXT: Record<Doc<"profiles">["answerMode"], string> = {
  answer: "ANSWER MODE: SHOW ME THE ANSWER. Give the answer with full working, step by step.",
  guide: `ANSWER MODE: GUIDE ME. Do not give the final answer. Give one hint or guiding question at a time and ask the learner to try. If they are stuck after trying, show a worked example of a similar problem with different numbers. Never write a finished essay for them to hand in.

If the question is an equation in one unknown, or a long division, also let the learner work it through step by step: after your hint, add a block on its own lines that starts with \`\`\`widget and ends with \`\`\`, holding JSON. For an equation: {"slug": "equation-steps", "data": {"title": "...", "equation": "2x + 3 = 11", "variable": "x", "hints": ["..."]}}. For a long division: {"slug": "long-division", "data": {"title": "...", "dividend": 1234, "divisor": 7}}. Never put the answer in the block or the hints.`,
};
const STYLE_TEXT: Record<Doc<"profiles">["studyStyle"], string> = {
  locked_in: "STYLE: LOCKED IN. Formal and dense. No small talk, no slang.",
  cook: "STYLE: COOK MODE. Upbeat and punchy, short sentences, a little everyday lingo is fine (like \"lock in\"), always accurate and never rude.",
  calm: "STYLE: CALM. Patient and clear, gentle tone.",
};

export function chatPrompt(c: Pick<ChatContext, "answerMode" | "studyStyle" | "shortChunks">): string {
  return PROMPTS["taku-chat"].replace("{{ANSWER_MODE}}", ANSWER_MODE_TEXT[c.answerMode]).replace("{{STYLE}}", STYLE_TEXT[c.studyStyle] + (c.shortChunks ? " Keep answers short: at most about 120 words." : ""));
}

type ReplyKind = "answer" | "help" | "redirect" | "error";

export const send = action({
  args: { chatId: v.optional(v.id("chats")), message: v.string() },
  handler: async (ctx, args): Promise<{ chatId: Id<"chats">; kind: string }> => {
    await requireLearnerInAction(ctx);
    const c: ChatContext = await ctx.runQuery(internal.chat.chats.context, { chatId: args.chatId });
    const question = args.message.trim().slice(0, MAX_MESSAGE);
    if (question.length === 0) throw new ConvexError("Type a message first.");
    const { chatId, messageId }: { chatId: Id<"chats">; messageId: Id<"chatMessages"> } = await ctx.runMutation(internal.chat.chats.begin, { chatId: args.chatId, profileId: c.profileId, question });
    const reply = async (r: { kind: ReplyKind; text: string; widget?: StoredWidget }) => {
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

      if (c.audience === "minor") {
        const check = await ctx.runAction(internal.ai.router.call, {
          tier: "fast",
          purpose: "safety_check",
          messages: [
            { role: "system", content: PROMPTS["safety-input"] },
            { role: "user", content: `<text>${asData(question)}</text>` },
          ],
          jsonSchema: { name: "input_verdict", strict: true, schema: { type: "object", properties: { verdict: { type: "string", enum: ["allow", "redirect", "self_harm", "harmed"] }, reason: { type: "string" } }, required: ["verdict", "reason"], additionalProperties: false } },
          maxTokens: 120,
          reasoningEffort: "none",
          stablePrefixCount: 1,
          fixtureKey: { kind: "input_check", question },
        });
        await ctx.runMutation(internal.ai.usage.record, { profileId: c.profileId, tool: "safety_check", costUsd: check.costUsd });
        let verdict: string | null = null;
        try {
          verdict = check.ok ? ((JSON.parse(check.content) as { verdict?: string }).verdict ?? null) : null;
        } catch {
          verdict = null;
        }
        if (verdict === "self_harm" || verdict === "harmed") return await reply({ kind: "help", text: REPLIES.help });
        if (verdict === "redirect") return await reply({ kind: "redirect", text: REPLIES.redirect });
        if (verdict !== "allow") return await reply({ kind: "error", text: REPLIES.failed });
      }

      const result = await ctx.runAction(internal.ai.router.call, {
        tier: "main",
        purpose: "taku_chat",
        messages: [
          { role: "system", content: chatPrompt(c) },
          ...c.history.map((m) => ({ role: m.role === "learner" ? ("user" as const) : ("assistant" as const), content: m.role === "learner" ? `<question>${asData(m.text)}</question>` : m.text })),
          { role: "user", content: `<question>${asData(question)}</question>` },
        ],
        maxTokens: 1600,
        stablePrefixCount: 1,
        streamTo: messageId,
        fixtureKey: { kind: "chat", question, answerMode: c.answerMode },
      });
      await ctx.runMutation(internal.ai.usage.record, { profileId: c.profileId, tool: "chat", costUsd: result.costUsd });
      if (!result.ok || result.content.trim() === "") return await reply({ kind: "error", text: REPLIES.failed });
      const { text, raw } = extractWidget(result.content);
      const widget = c.answerMode === "guide" && raw !== null ? widgetFromText(raw, ["equation-steps", "long-division"]) : null;
      return await reply({ kind: "answer", text: cleanDashes(text.trim()), ...(widget === null ? {} : { widget }) });
    } catch (error) {
      // Never leave a reply stuck on the typing dots.
      await ctx.runMutation(internal.chat.chats.finish, { messageId, kind: "error", text: REPLIES.failed });
      throw error;
    }
  },
});
