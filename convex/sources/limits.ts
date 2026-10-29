/**
 * What a learner can add to a notebook. Ported from Amayi Learn
 * (convex/sources/limits.ts at ec3496e) and widened from teacher schemes of
 * work to any study material: PDFs, Word files, photos, pasted text and links.
 */

export const SOURCE_LIMITS = {
  maxFileBytes: 15 * 1024 * 1024,
  /** Pages kept from one source. */
  maxPages: 300,
  maxSourcesPerNotebook: 50,
  maxPasteChars: 100_000,
  /** Characters per page for text with no pages of its own (pasted text, links, Word files without breaks). */
  pageChars: 3000,
  maxLinkBytes: 2 * 1024 * 1024,
  /** Photos and scanned pages read by the model per source. */
  maxModelPages: 20,
} as const;

export type FileKind = "pdf" | "docx" | "image";
export type SourceKind = FileKind | "text" | "link";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PDF_TYPE = "application/pdf";
export const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** The kind of a file from its type, or its name when the browser gave no type. */
export function fileKind(contentType: string, fileName: string): FileKind | null {
  const type = contentType.toLowerCase().split(";")[0].trim();
  const name = fileName.toLowerCase();
  if (type === PDF_TYPE || (type === "" && name.endsWith(".pdf"))) return "pdf";
  if (type === DOCX_TYPE || ((type === "" || type === "application/octet-stream" || type === "application/zip") && name.endsWith(".docx"))) return "docx";
  if ((IMAGE_TYPES as readonly string[]).includes(type)) return "image";
  if (type === "" && /\.(jpe?g|png|webp)$/.test(name)) return "image";
  return null;
}
