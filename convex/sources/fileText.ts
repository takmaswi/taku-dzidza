"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { docxPages } from "./docx";

/**
 * Text from uploaded files with no AI call, in the Node runtime (pdf.js, and
 * DecompressionStream for Word files). Pages of a PDF that are scans come
 * back nearly empty; convex/notebooks/read.ts then asks the model to read them.
 */

export async function pdfPages(data: Uint8Array, maxPages = 300): Promise<string[]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data, isEvalSupported: false, useSystemFonts: false, verbosity: 0 }).promise;
  const pages: string[] = [];
  const count = Math.min(doc.numPages, maxPages);
  for (let i = 1; i <= count; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let text = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      text += item.str + (item.hasEOL ? "\n" : " ");
    }
    pages.push(text.replace(/[ \t]+/g, " ").replace(/ \n/g, "\n").replace(/\n{3,}/g, "\n\n").trim());
  }
  await doc.destroy();
  return pages;
}

export const pdf = internalAction({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args): Promise<string[]> => {
    const blob = await ctx.storage.get(args.storageId);
    if (blob === null) return [];
    return await pdfPages(new Uint8Array(await blob.arrayBuffer()));
  },
});

export const docx = internalAction({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args): Promise<string[]> => {
    const blob = await ctx.storage.get(args.storageId);
    if (blob === null) return [];
    return (await docxPages(new Uint8Array(await blob.arrayBuffer()))).pages;
  },
});
