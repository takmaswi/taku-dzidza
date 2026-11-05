/**
 * Finding maths in Taku's text. LaTeX goes between $ signs, and $$ for a line
 * of its own. A $ only opens maths when a non space follows it, and only closes
 * when a non space comes before it and no digit after it, so "USD 5 and $10"
 * stays plain text. Plain TypeScript, unit tested in tests/unit/math.test.ts.
 */

export type MathSegment = { kind: "text"; text: string } | { kind: "math"; tex: string; display: boolean };

function closingDollar(text: string, from: number): number {
  for (let i = from; i < text.length; i++) {
    if (text[i] === "\\") {
      i += 1;
      continue;
    }
    if (text[i] === "$" && !/\s/.test(text[i - 1] ?? " ") && !/\d/.test(text[i + 1] ?? "")) return i;
  }
  return -1;
}

export function splitMath(text: string): MathSegment[] {
  const out: MathSegment[] = [];
  let plain = "";
  const flush = () => {
    if (plain !== "") out.push({ kind: "text", text: plain });
    plain = "";
  };
  let i = 0;
  while (i < text.length) {
    if (text[i] === "\\" && text[i + 1] === "$") {
      plain += "$";
      i += 2;
    } else if (text.startsWith("$$", i)) {
      const end = text.indexOf("$$", i + 2);
      if (end <= i + 2) {
        plain += "$$";
        i += 2;
      } else {
        flush();
        out.push({ kind: "math", tex: text.slice(i + 2, end).trim(), display: true });
        i = end + 2;
      }
    } else if (text[i] === "$" && i + 1 < text.length && !/\s/.test(text[i + 1])) {
      const end = closingDollar(text, i + 1);
      if (end < 0) {
        plain += "$";
        i += 1;
      } else {
        flush();
        out.push({ kind: "math", tex: text.slice(i + 1, end), display: false });
        i = end + 1;
      }
    } else {
      plain += text[i];
      i += 1;
    }
  }
  flush();
  return out;
}

export function hasMath(text: string): boolean {
  return text.includes("$") && splitMath(text).some((s) => s.kind === "math");
}

/** Text for a voice or a label: the LaTeX commands come off, leaving something a phone can read out. */
export function speakable(text: string): string {
  return splitMath(text)
    .map((s) =>
      s.kind === "text"
        ? s.text
        : s.tex
            .replace(/\\ce\{([^}]*)\}/g, "$1")
            .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "$1 over $2")
            .replace(/\\times/g, " times ")
            .replace(/\\[a-zA-Z]+/g, " ")
            .replace(/[{}]/g, ""),
    )
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
