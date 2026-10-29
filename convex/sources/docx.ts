/**
 * The text of a Word file (.docx), page by page, with no Word library. Part
 * of the reusable source modules, ported unchanged from Amayi Learn
 * (convex/sources/docx.ts at ec3496e).
 *
 * A .docx is a zip of XML parts. The body is word/document.xml: paragraphs
 * (w:p) of text runs (w:t), and tables (w:tbl) whose rows are written as
 * "cell | cell | cell" lines, because schemes of work are mostly tables.
 * Pages come from the breaks Word saves: hard page breaks and the
 * w:lastRenderedPageBreak marks Word writes where a page ended when the file
 * was last saved. A file with no breaks is split about every 3,000
 * characters, and its pages are marked estimated.
 *
 * Decompression uses the platform's DecompressionStream (every current
 * browser and Node 22), so this runs where the file is chosen.
 */

type ZipEntry = { name: string; method: number; compressedSize: number; offset: number };

function u16(b: Uint8Array, at: number): number {
  return b[at] | (b[at + 1] << 8);
}
function u32(b: Uint8Array, at: number): number {
  return (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0;
}

/** The entries in a zip's central directory. Throws on a file that is not a zip. */
export function zipEntries(bytes: Uint8Array): ZipEntry[] {
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (u32(bytes, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip file");
  const count = u16(bytes, eocd + 10);
  let at = u32(bytes, eocd + 16);
  const out: ZipEntry[] = [];
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (u32(bytes, at) !== 0x02014b50) throw new Error("broken zip directory");
    const nameLength = u16(bytes, at + 28);
    const extra = u16(bytes, at + 30);
    const comment = u16(bytes, at + 32);
    out.push({
      name: decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength)),
      method: u16(bytes, at + 10),
      compressedSize: u32(bytes, at + 20),
      offset: u32(bytes, at + 42),
    });
    at += 46 + nameLength + extra + comment;
  }
  return out;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** One entry's bytes: stored or deflated, the two methods Word uses. */
export async function readZipEntry(bytes: Uint8Array, entry: ZipEntry): Promise<Uint8Array> {
  const at = entry.offset;
  if (u32(bytes, at) !== 0x04034b50) throw new Error("broken zip entry");
  const start = at + 30 + u16(bytes, at + 26) + u16(bytes, at + 28);
  const data = bytes.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return data;
  if (entry.method === 8) return await inflateRaw(data);
  throw new Error(`zip method ${entry.method} is not supported`);
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function decodeXml(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
    return ENTITIES[e.toLowerCase()] ?? "";
  });
}

const PAGE_BREAK = "\f";

/**
 * Lines of text from word/document.xml, with a form feed where a page
 * breaks. Exported for tests.
 */
export function documentLines(xml: string): string[] {
  const lines: string[] = [];
  let paragraph = "";
  let cells: string[] | null = null;
  let cell = "";
  let depth = 0;
  const token = /<(\/?)w:(tbl|tr|tc|p|t|tab|br|lastRenderedPageBreak|cr)\b([^>]*?)(\/?)>|([^<]+)/g;
  let inText = false;
  for (const m of xml.matchAll(token)) {
    const [, close, tag, attrs, selfClose, text] = m;
    if (text !== undefined) {
      if (inText) {
        if (cells !== null) cell += decodeXml(text);
        else paragraph += decodeXml(text);
      }
      continue;
    }
    const opening = close === "";
    if (tag === "t") {
      inText = opening && selfClose === "";
      continue;
    }
    const add = (s: string) => {
      if (cells !== null) cell += s;
      else paragraph += s;
    };
    if (tag === "tab" && opening) add("\t");
    else if ((tag === "br" || tag === "cr") && opening) add(/w:type="page"/.test(attrs) ? PAGE_BREAK : " ");
    else if (tag === "lastRenderedPageBreak" && opening) add(PAGE_BREAK);
    else if (tag === "tbl") depth += opening ? 1 : -1;
    else if (tag === "tr" && depth === 1) {
      if (opening && selfClose === "") cells = [];
      else if (!opening && cells !== null) {
        const row = cells.map((c) => c.trim()).filter((c) => c.replace(/\f/g, "") !== "");
        if (row.length > 0) lines.push(row.join(" | "));
        cells = null;
      }
    } else if (tag === "tc" && depth === 1 && cells !== null) {
      if (opening && selfClose === "") cell = "";
      else if (!opening) cells.push(cell);
    } else if (tag === "p" && cells !== null && !opening) {
      cell += " ";
    } else if (tag === "p" && cells === null) {
      if (!opening || selfClose === "/") {
        lines.push(paragraph);
        paragraph = "";
      }
    }
  }
  if (paragraph !== "") lines.push(paragraph);
  // trim() would also remove the form feeds that mark pages.
  return lines.map((l) => l.replace(/[ \t]+/g, " ").replace(/ ?\f ?/g, PAGE_BREAK).replace(/^ +| +$/g, ""));
}

const SPLIT_CHARS = 3000;

export type DocxPages = { pages: string[]; estimated: boolean };

/** Lines grouped into pages at Word's page breaks, or about every 3,000 characters when there are none. */
export function linesToPages(lines: readonly string[]): DocxPages {
  const joined = lines.join("\n");
  if (joined.includes(PAGE_BREAK)) {
    const pages = joined.split(PAGE_BREAK).map((p) => p.trim());
    // A break at the very start or end makes an empty page: drop those, keep blank pages in the middle as they are.
    while (pages.length > 1 && pages[0] === "") pages.shift();
    while (pages.length > 1 && pages[pages.length - 1] === "") pages.pop();
    return { pages, estimated: false };
  }
  const pages: string[] = [];
  let page = "";
  for (const line of lines) {
    if (page.length > 0 && page.length + line.length > SPLIT_CHARS) {
      pages.push(page.trim());
      page = "";
    }
    page += `${line}\n`;
  }
  if (page.trim() !== "" || pages.length === 0) pages.push(page.trim());
  return { pages, estimated: true };
}

/** A Word file's text, page by page. Throws when the file is not a Word document. */
export async function docxPages(bytes: Uint8Array): Promise<DocxPages> {
  const entry = zipEntries(bytes).find((e) => e.name === "word/document.xml");
  if (entry === undefined) throw new Error("not a Word document");
  const xml = new TextDecoder().decode(await readZipEntry(bytes, entry));
  return linesToPages(documentLines(xml));
}
