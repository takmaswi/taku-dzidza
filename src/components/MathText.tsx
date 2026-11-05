import { Fragment, useEffect, useState } from "react";
import { hasMath, splitMath } from "./math";

type Katex = { renderToString: (tex: string, options: Record<string, unknown>) => string };

let loaded: Katex | null = null;
let loading: Promise<Katex> | null = null;

/** KaTeX, mhchem and their CSS load only when a page first has maths, so everyone else never downloads them. */
function loadKatex(): Promise<Katex> {
  loading ??= (async () => {
    const [{ default: katex }] = await Promise.all([import("katex"), import("katex/dist/katex.min.css")]);
    await import("katex/contrib/mhchem");
    loaded = katex;
    return katex;
  })();
  return loading;
}

function useKatex(needed: boolean): Katex | null {
  const [katex, setKatex] = useState<Katex | null>(loaded);
  useEffect(() => {
    if (needed && katex === null) void loadKatex().then(setKatex);
  }, [needed, katex]);
  return katex;
}

/** Text with $...$ drawn as maths and chemistry. Until KaTeX arrives the source shows, so nothing is ever missing. */
export function MathText({ text }: { text: string }) {
  const needed = hasMath(text);
  const katex = useKatex(needed);
  if (!needed) return <>{text}</>;
  return (
    <>
      {splitMath(text).map((segment, i) => {
        if (segment.kind === "text") return <Fragment key={i}>{segment.text}</Fragment>;
        if (katex === null) return <Fragment key={i}>{segment.tex}</Fragment>;
        // trust is off, so KaTeX refuses links and raw HTML in the source: its output is safe to place here.
        const html = katex.renderToString(segment.tex, { displayMode: segment.display, throwOnError: false, trust: false, strict: "ignore", maxExpand: 200 });
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </>
  );
}
