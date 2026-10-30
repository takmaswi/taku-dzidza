import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query, type QueryCtx } from "../_generated/server";
import { ADULT_AGE, ageOn } from "../accounts/age";
import { PROMPTS } from "../data/generated";
import { requireLearner, requireLearnerInAction } from "../lib/access";
import { asData, cleanDashes, REPLIES } from "../notebooks/ask";
import { prefilter, type Audience } from "../safety/prefilter";

/**
 * A normal chat with Taku from general knowledge (no notebook, no
 * citations). Same safety order as notebook questions: prefilter, the model
 * input check for under 18s, spending caps, then Taku.
 */

export const MAX_MESSAGE = 2000;
const HISTORY = 10;

async function ownChat(ctx: QueryCtx, chatId: Id<"chats">): Promise<{ profile: Doc<"profiles">; chat: Doc<"chats"> }> {
  const { profile } = await requireLearner(ctx);
  const chat = await ctx.db.get(chatId);
  if (chat === null || chat.profileId !== profile._id) throw new ConvexError("Chat not found.");
  return { profile, chat };
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
      history = rows.reverse().filter((m) => m.kind === "question" || m.kind === "answer").map((m) => ({ role: m.role, text: m.text }));
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

export const save = internalMutation({
  args: {
    chatId: v.optional(v.id("chats")),
    profileId: v.id("profiles"),
    question: v.string(),
    reply: v.object({ kind: v.union(v.literal("answer"), v.literal("help"), v.literal("redirect"), v.literal("error")), text: v.string() }),
  },
  handler: async (ctx, args): Promise<Id<"chats">> => {
    const now = Date.now();
    let chatId = args.chatId;
    if (chatId === undefined) {
      const title = args.question.replace(/\s+/g, " ").trim().slice(0, 60);
      chatId = await ctx.db.insert("chats", { profileId: args.profileId, title: title.length > 0 ? title : "New chat", createdAt: now, updatedAt: now });
    } else {
      await ctx.db.patch(chatId, { updatedAt: now });
    }
    await ctx.db.insert("chatMessages", { chatId, role: "learner", kind: "question", text: args.question, createdAt: now });
    await ctx.db.insert("chatMessages", { chatId, role: "taku", kind: args.reply.kind, text: args.reply.text, createdAt: now + 1 });
    return chatId;
  },
});

const ANSWER_MODE_TEXT: Record<Doc<"profiles">["answerMode"], string> = {
  answer: "ANSWER MODE: SHOW ME THE ANSWER. Give the answer with full working, step by step.",
  guide: "ANSWER MODE: GUIDE ME. Do not give the final answer. Give one hint or guiding question at a time and ask the learner to try. If they are stuck after trying, show a worked example of a similar problem with different numbers. Never write a finished essay for them to hand in.",
};
const STYLE_TEXT: Record<Doc<"profiles">["studyStyle"], string> = {
  locked_in: "STYLE: LOCKED IN. Formal and dense. No small talk, no slang.",
  cook: "STYLE: COOK MODE. Upbeat and punchy, short sentences, a little everyday lingo is fine (like \"lock in\"), always accurate and never rude.",
  calm: "STYLE: CALM. Patient and clear, gentle tone.",
};

export function chatPrompt(c: Pick<ChatContext, "answerMode" | "studyStyle" | "shortChunks">): string {
  return PROMPTS["taku-chat"].replace("{{ANSWER_MODE}}", ANSWER_MODE_TEXT[c.answerMode]).replace("{{STYLE}}", STYLE_TEXT[c.studyStyle] + (c.shortChunks ? " Keep answers short: at most about 120 words." : ""));
}

export const send = action({
  args: { chatId: v.optional(v.id("chats")), message: v.string() },
  handler: async (ctx, args): Promise<{ chatId: Id<"chats">; kind: string }> => {
    await requireLearnerInAction(ctx);
    const c: ChatContext = await ctx.runQuery(internal.chat.chats.context, { chatId: args.chatId });
    const question = args.message.trim().slice(0, MAX_MESSAGE);
    if (question.length === 0) throw new ConvexError("Type a message first.");
    const reply = async (r: { kind: "answer" | "help" | "redirect" | "error"; text: string }) => {
      const chatId: Id<"chats"> = await ctx.runMutation(internal.chat.chats.save, { chatId: args.chatId, profileId: c.profileId, question, reply: r });
      return { chatId, kind: r.kind };
    };

    const pre = prefilter(question, c.audience);
    if (pre.kind === "distress") return await reply({ kind: "help", text: REPLIES.help });
    if (pre.kind === "redirect") return await reply({ kind: "redirect", text: pre.category === "companion" || pre.category === "romance" ? REPLIES.companion : REPLIES.redirect });
    if (pre.kind === "personal_info") return await reply({ kind: "redirect", text: "Please leave out phone numbers, addresses, ID numbers and full names. Ask again without them." });

    const room = await ctx.runQuery(internal.ai.usage.check, { profileId: c.profileId, calls: c.audience === "minor" ? 2 : 1 });
    if (!room.allowed) return await reply({ kind: "error", text: room.reason === "learner_cap" ? REPLIES.learnerCap : REPLIES.deploymentCap });

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
      await ctx.runMutation(internal.ai.usage.record, { profileId: c.profileId, calls: 1, costUsd: check.costUsd });
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
      fixtureKey: { kind: "chat", question, answerMode: c.answerMode },
    });
    await ctx.runMutation(internal.ai.usage.record, { profileId: c.profileId, calls: 1, costUsd: result.costUsd });
    if (!result.ok || result.content.trim() === "") return await reply({ kind: "error", text: REPLIES.failed });
    return await reply({ kind: "answer", text: cleanDashes(result.content.trim()) });
  },
});
