import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { pdfPages } from "../../convex/sources/fileText";
import { settleParts } from "../../convex/sources/modes";
import { chunkPage, CHUNK_CHARS, htmlToText, linkProblem, quoteOnPage, splitPages } from "../../convex/sources/text";

const PAGE = "Photosynthesis\nGreen plants make glucose from carbon dioxide and water using light energy.\nChlorophyll in the chloroplasts absorbs the light.";

describe("quote check", () => {
  test("an exact quote is found, ignoring case and punctuation", () => {
    expect(quoteOnPage("chlorophyll in the chloroplasts absorbs the light", PAGE)).toBe(true);
    expect(quoteOnPage("Green plants make glucose, from carbon dioxide", PAGE)).toBe(true);
  });
  test("one misread word in a long quote still matches (photos and scans)", () => {
    expect(quoteOnPage("Green plants make glucose from carbon dioxide and wafer using light energy", PAGE)).toBe(true);
  });
  test("words that are not on the page do not match", () => {
    expect(quoteOnPage("Chlorophyll is found in the mitochondria of animal cells", PAGE)).toBe(false);
    expect(quoteOnPage("light energy", PAGE)).toBe(false);
    expect(quoteOnPage("", PAGE)).toBe(false);
  });
});

describe("settling an answer by source mode", () => {
  const lookup = (ref: string, page: number) => (ref === "S1" && page === 1 ? { sourceId: "src1", text: PAGE } : null);
  const parts = [
    { text: "Chlorophyll absorbs light.", ref: "S1", page: 1, quote: "Chlorophyll in the chloroplasts absorbs the light" },
    { text: "Invented point.", ref: "S1", page: 1, quote: "chlorophyll is blue and absorbs sound" },
    { text: "An example of my own.", ref: "", page: 0, quote: "" },
    { text: "Wrong page.", ref: "S1", page: 4, quote: "Chlorophyll in the chloroplasts absorbs the light" },
  ];
  test("only my material keeps verified parts and drops the rest", () => {
    const { kept, dropped } = settleParts(parts, "only_mine", lookup);
    expect(kept).toEqual([{ text: "Chlorophyll absorbs light.", origin: { kind: "source", sourceId: "src1", page: 1, quote: "Chlorophyll in the chloroplasts absorbs the light" } }]);
    expect(dropped).toBe(3);
  });
  test("my material plus Taku's ideas marks unverified parts as added", () => {
    const { kept, dropped } = settleParts(parts, "mine_plus", lookup);
    expect(kept.map((k) => k.origin.kind)).toEqual(["source", "added", "added", "added"]);
    expect(dropped).toBe(0);
  });
});

describe("pages and chunks", () => {
  test("long text splits into pages at paragraph ends", () => {
    const text = Array.from({ length: 10 }, (_, i) => `Paragraph ${i} ${"word ".repeat(120)}`).join("\n\n");
    const pages = splitPages(text, 2000);
    expect(pages.length).toBeGreaterThan(3);
    expect(pages.every((p) => p.length <= 2000)).toBe(true);
    expect(pages.join(" ").replace(/\s+/g, " ")).toBe(text.replace(/\s+/g, " ").trim());
  });
  test("chunks overlap and stay under the size", () => {
    const chunks = chunkPage("word ".repeat(600));
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((c) => c.length <= CHUNK_CHARS)).toBe(true);
  });
  test("empty text gives no pages", () => expect(splitPages("   \n ")).toEqual([]));
});

describe("links", () => {
  test("public web pages are allowed; local and private addresses are not", () => {
    expect(linkProblem("https://en.wikipedia.org/wiki/Photosynthesis")).toBeNull();
    expect(linkProblem("http://localhost:3000")).not.toBeNull();
    expect(linkProblem("http://192.168.1.1/admin")).not.toBeNull();
    expect(linkProblem("file:///etc/passwd")).not.toBeNull();
    expect(linkProblem("not a url")).not.toBeNull();
  });
  test("HTML becomes readable text without scripts", () => {
    const { title, text } = htmlToText("<html><head><title>Cells</title><script>alert(1)</script></head><body><h1>Cells</h1><p>A cell has a nucleus &amp; cytoplasm.</p></body></html>");
    expect(title).toBe("Cells");
    expect(text).toContain("A cell has a nucleus & cytoplasm.");
    expect(text).not.toContain("alert");
  });
});

describe("web pages to text", () => {
  test("hidden parts go, lines stay, and the title is found", () => {
    const { title, text } = htmlToText("<HTML><head><title> Cell\n parts </title><STYLE>b{}</STYLE></head><body><nav>Menu</nav><h1>Cells</h1><!-- note --><p>One &amp; two</p>three<br/>four<form><input></form><footer>Foot</footer></body></html>");
    expect(title).toBe("Cell parts");
    expect(text).toBe("Cells\n One & two\nthree\nfour");
  });

  test("an unclosed tag or block drops the rest, and a stray comment does not throw", () => {
    expect(htmlToText("<p>kept</p><script>never closes").text).toBe("kept");
    expect(htmlToText("<p>kept</p><!-- never closes").text).toBe("kept");
    expect(htmlToText("<p>kept</p><a href=").text).toBe("kept");
  });

  test("a bad character number does not throw", () => {
    expect(htmlToText("a&#9999999;b &#65; &#99999999;").text).toBe("a b A &#99999999;");
  });

  test("2 MB of hostile markup is read quickly", () => {
    for (const unit of ["<", "<script>", "<!--", "<script", "<title>", "</p", "&#"]) {
      const started = Date.now();
      htmlToText(unit.repeat(Math.floor((2 * 1024 * 1024) / unit.length)));
      expect(Date.now() - started, unit).toBeLessThan(2000);
    }
  });
});

describe("PDF text layer", () => {
  test("reads each page of a text PDF with no AI call", async () => {
    const pages = await pdfPages(new Uint8Array(readFileSync(join(process.cwd(), "tests", "fixtures", "sources", "biology-notes.pdf"))));
    expect(pages).toHaveLength(2);
    expect(quoteOnPage("Chlorophyll in the chloroplasts absorbs the light", pages[0])).toBe(true);
    expect(pages[1]).toContain("Respiration releases energy from glucose");
  });
});
