import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalAction, internalMutation, internalQuery, type ActionCtx, type MutationCtx } from "../_generated/server";
import { PROMPTS } from "../data/generated";
import { SOURCE_LIMITS } from "../sources/limits";
import { chunkPage, htmlToText, linkProblem, splitPages } from "../sources/text";

/**
 * Reading a source into pages and search chunks. Text, Word files, PDFs with
 * a text layer and links are read without any AI call. Photos and scanned
 * PDFs are read by the model (purpose source_read), which costs money, so
 * they go through the router (mock fixtures in tests).
 */

export async function writePages(ctx: MutationCtx, sourceId: Id<"sources">, pages: readonly string[], title?: string): Promise<void> {
  const source = await ctx.db.get(sourceId);
  if (source === null) return;
  for (const row of await ctx.db.query("chunks").withIndex("by_source", (q) => q.eq("sourceId", sourceId)).collect()) await ctx.db.delete(row._id);
  for (const row of await ctx.db.query("pages").withIndex("by_source_page", (q) => q.eq("sourceId", sourceId)).collect()) await ctx.db.delete(row._id);
  const kept = pages.slice(0, SOURCE_LIMITS.maxPages);
  for (let i = 0; i < kept.length; i++) {
    const page = i + 1;
    await ctx.db.insert("pages", { sourceId, notebookId: source.notebookId, page, text: kept[i] });
    for (const text of chunkPage(kept[i])) await ctx.db.insert("chunks", { sourceId, notebookId: source.notebookId, page, text });
  }
  const readable = kept.some((p) => p.trim().length > 0);
  await ctx.db.patch(sourceId, {
    status: readable ? "ready" : "failed",
    pageCount: kept.length,
    ...(readable ? { error: undefined } : { error: "No text could be read from this source." }),
    ...(title !== undefined && title.length > 0 ? { title: title.slice(0, 120) } : {}),
  });
}

export const savePages = internalMutation({
  args: { sourceId: v.id("sources"), pages: v.array(v.string()), title: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await writePages(ctx, args.sourceId, args.pages, args.title);
  },
});

export const markFailed = internalMutation({
  args: { sourceId: v.id("sources"), error: v.string() },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (source !== null) await ctx.db.patch(args.sourceId, { status: "failed", error: args.error });
  },
});

export const sourceFor = internalQuery({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, args) => await ctx.db.get(args.sourceId),
});

/** What the model returns when it reads photos or scanned pages. */
const TRANSCRIBE_SCHEMA = {
  name: "page_text",
  strict: true,
  schema: {
    type: "object",
    properties: { pages: { type: "array", items: { type: "string" } } },
    required: ["pages"],
    additionalProperties: false,
  },
};

function base64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

/** Photos and scanned PDFs: the model writes out each page's text exactly. */
async function transcribe(ctx: ActionCtx, args: { profileId: string; name: string; kind: "image" | "pdf"; bytes: Uint8Array; contentType: string }): Promise<string[] | null> {
  const room = await ctx.runQuery(internal.ai.usage.check, { profileId: args.profileId, calls: 1 });
  if (!room.allowed) return null;
  const dataUrl = `data:${args.contentType};base64,${base64(args.bytes)}`;
  const part = args.kind === "image" ? { type: "image_url" as const, image_url: { url: dataUrl } } : { type: "file" as const, file: { filename: args.name, file_data: dataUrl } };
  const result = await ctx.runAction(internal.ai.router.call, {
    tier: "main",
    purpose: "source_read",
    messages: [
      { role: "system", content: PROMPTS["source-transcribe"] },
      { role: "user", content: [part] },
    ],
    jsonSchema: TRANSCRIBE_SCHEMA,
    maxTokens: 8000,
    reasoningEffort: "none",
    stablePrefixCount: 1,
    fixtureKey: { kind: "transcribe", name: args.name, bytes: args.bytes.length },
  });
  await ctx.runMutation(internal.ai.usage.record, { profileId: args.profileId, calls: 1, costUsd: result.costUsd });
  if (!result.ok) return null;
  try {
    const parsed = JSON.parse(result.content) as { pages?: unknown };
    if (!Array.isArray(parsed.pages)) return null;
    return parsed.pages.filter((p): p is string => typeof p === "string").slice(0, SOURCE_LIMITS.maxModelPages);
  } catch {
    return null;
  }
}

export const readFile = internalAction({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, args): Promise<void> => {
    const source: Doc<"sources"> | null = await ctx.runQuery(internal.notebooks.read.sourceFor, { sourceId: args.sourceId });
    if (source === null || source.storageId === undefined) return;
    const fail = async (error: string): Promise<void> => {
      await ctx.runMutation(internal.notebooks.read.markFailed, { sourceId: args.sourceId, error });
    };
    try {
      const blob = await ctx.storage.get(source.storageId);
      if (blob === null) return await fail("The file is missing. Add it again.");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let pages: string[] | null = null;
      if (source.kind === "docx") {
        const read: string[] = await ctx.runAction(internal.sources.fileText.docx, { storageId: source.storageId });
        pages = read.flatMap((p) => (p.length > SOURCE_LIMITS.pageChars * 2 ? splitPages(p) : [p]));
      } else if (source.kind === "pdf") {
        const layer: string[] = await ctx.runAction(internal.sources.fileText.pdf, { storageId: source.storageId });
        const empty = layer.filter((p: string) => p.trim().length < 30).length;
        // Mostly scans: the model reads the pages instead.
        pages = layer.length > 0 && empty <= layer.length / 2 ? layer : await transcribe(ctx, { profileId: source.profileId, name: source.title, kind: "pdf", bytes, contentType: "application/pdf" });
      } else if (source.kind === "image") {
        pages = await transcribe(ctx, { profileId: source.profileId, name: source.title, kind: "image", bytes, contentType: blob.type || "image/jpeg" });
      }
      if (pages === null) return await fail("Taku could not read this file just now. Try again later.");
      await ctx.runMutation(internal.notebooks.read.savePages, { sourceId: args.sourceId, pages });
    } catch (error) {
      console.warn(`reading source failed: ${error instanceof Error ? error.name : "error"}`);
      await fail("This file could not be read. Check it opens on your phone, then add it again.");
    }
  },
});

export const LINK_TIMEOUT_MS = 15_000;

export const readLink = internalAction({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, args): Promise<void> => {
    const source: Doc<"sources"> | null = await ctx.runQuery(internal.notebooks.read.sourceFor, { sourceId: args.sourceId });
    if (source === null || source.url === undefined) return;
    const fail = async (error: string): Promise<void> => {
      await ctx.runMutation(internal.notebooks.read.markFailed, { sourceId: args.sourceId, error });
    };
    if (linkProblem(source.url) !== null) return await fail("That address cannot be read.");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LINK_TIMEOUT_MS);
    try {
      const response: Response = await fetch(source.url, { signal: controller.signal, redirect: "follow", headers: { "User-Agent": "Takudzidza source reader" } });
      if (!response.ok) return await fail(`The page answered with an error (${response.status}).`);
      const type = response.headers.get("content-type") ?? "";
      if (!/text\/html|text\/plain/.test(type)) return await fail("Only web pages can be added as links. Download a PDF and add it as a file.");
      const raw = (await response.text()).slice(0, SOURCE_LIMITS.maxLinkBytes);
      const { title, text } = type.includes("html") ? htmlToText(raw) : { title: "", text: raw };
      const pages = splitPages(text);
      if (pages.length === 0) return await fail("No text could be read from this page.");
      await ctx.runMutation(internal.notebooks.read.savePages, { sourceId: args.sourceId, pages, title });
    } catch {
      await fail("The page could not be reached.");
    } finally {
      clearTimeout(timer);
    }
  },
});
