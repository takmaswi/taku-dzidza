import { BarChart3 } from "lucide-react";
import { Fragment, lazy, Suspense, type ReactNode } from "react";
import { copy } from "../copy/en";
import { parseChart } from "./chartSpec";
import { MathText } from "./MathText";

const Chart = lazy(() => import("./Chart").then((m) => ({ default: m.Chart })));

/**
 * Taku's replies: short paragraphs, headings, numbered and bulleted lists,
 * tables, **bold**, $maths$ and ```chart blocks. This renders just that,
 * never HTML.
 */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <b key={i}>
        <MathText text={part.slice(2, -2)} />
      </b>
    ) : (
      <Fragment key={i}>
        <MathText text={part} />
      </Fragment>
    ),
  );
}

const cells = (line: string) =>
  line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
const isRule = (line: string) => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line);

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length > 0) blocks.push(<p key={blocks.length}>{inline(para.join(" "))}</p>);
    para = [];
  };
  const flushList = () => {
    if (list === null) return;
    const items = list.items.map((it, i) => <li key={i}>{inline(it)}</li>);
    blocks.push(list.ordered ? <ol key={blocks.length}>{items}</ol> : <ul key={blocks.length}>{items}</ul>);
    list = null;
  };
  const flush = () => (flushPara(), flushList());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // A chart block. While it is still arriving, a quiet placeholder instead of raw JSON.
    if (line.startsWith("```")) {
      flush();
      const kind = line.slice(3).trim();
      const body: string[] = [];
      let closed = false;
      for (i += 1; i < lines.length; i++) {
        if (lines[i].trim().startsWith("```")) {
          closed = true;
          break;
        }
        body.push(lines[i]);
      }
      if (kind === "chart") {
        const spec = closed ? parseChart(body.join("\n")) : null;
        if (spec !== null)
          blocks.push(
            <Suspense key={blocks.length} fallback={<ChartWaiting />}>
              <Chart spec={spec} />
            </Suspense>,
          );
        else if (!closed) blocks.push(<ChartWaiting key={blocks.length} />);
      } else if (kind !== "widget" && body.length > 0) {
        blocks.push(
          <pre key={blocks.length} className="md-pre">
            {body.join("\n")}
          </pre>,
        );
      }
      continue;
    }

    // A table: a row of cells, a rule line, then rows.
    if (line.startsWith("|") && i + 1 < lines.length && isRule(lines[i + 1].trim())) {
      flush();
      const head = cells(line);
      const rows: string[][] = [];
      for (i += 2; i < lines.length && lines[i].trim().startsWith("|"); i++) rows.push(cells(lines[i].trim()));
      i -= 1;
      blocks.push(
        <div className="md-table-wrap" key={blocks.length}>
          <table className="md-table">
            <thead>
              <tr>
                {head.map((h, j) => (
                  <th scope="col" key={j}>
                    {inline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {head.map((_, j) =>
                    j === 0 ? (
                      <th scope="row" key={j}>
                        {inline(r[j] ?? "")}
                      </th>
                    ) : (
                      <td key={j}>{inline(r[j] ?? "")}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const heading = line.match(/^#{1,4}\s+(.*)$/);
    const ordered = line.match(/^\d+[.)]\s+(.*)$/);
    const bullet = line.match(/^[*•-]\s+(.*)$/);
    if (heading !== null) {
      flush();
      blocks.push(
        <h3 key={blocks.length} className="md-h">
          {inline(heading[1].replace(/\*\*/g, ""))}
        </h3>,
      );
    } else if (ordered !== null || bullet !== null) {
      flushPara();
      const isOrdered = ordered !== null;
      if (list === null || list.ordered !== isOrdered) {
        flushList();
        list = { ordered: isOrdered, items: [] };
      }
      list.items.push((ordered ?? bullet)![1]);
    } else if (line === "") {
      flush();
    } else {
      flushList();
      para.push(line);
    }
  }
  flush();
  return <div className="md">{blocks}</div>;
}

function ChartWaiting() {
  return (
    <div className="chart chart-waiting" aria-live="polite">
      <BarChart3 size={18} aria-hidden="true" /> {copy.chart.drawing}
    </div>
  );
}
