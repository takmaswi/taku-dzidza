import { BarChart3, Table2 } from "lucide-react";
import { useId, useState, type CSSProperties } from "react";
import { copy } from "../copy/en";
import { niceScale, shortNumber, type ChartSpec } from "./chartSpec";

/**
 * A chart from Taku's reply (src/components/chartSpec.ts). Bars compare,
 * lines show change, a ring shows shares of a whole. Every chart can flip to
 * a plain table, which is also what screen readers get.
 */
export function Chart({ spec }: { spec: ChartSpec }) {
  const [asTable, setAsTable] = useState(false);
  const t = copy.chart;
  const legend = spec.type !== "pie" && spec.series.length > 1;
  return (
    <figure className="chart rise" data-testid="chart">
      <figcaption className="chart-head">
        <span className="chart-title">{spec.title || t.untitled}</span>
        {spec.unit !== "" && <span className="chart-unit">{spec.unit}</span>}
        <button type="button" className="chart-flip" aria-pressed={asTable} onClick={() => setAsTable(!asTable)}>
          {asTable ? <BarChart3 size={15} aria-hidden="true" /> : <Table2 size={15} aria-hidden="true" />}
          {asTable ? t.showChart : t.showTable}
        </button>
      </figcaption>
      {legend && !asTable && (
        <ul className="chart-legend" aria-hidden="true">
          {spec.series.map((s, i) => (
            <li key={s.name} style={swatch(i)}>
              {s.name}
            </li>
          ))}
        </ul>
      )}
      {asTable ? <ChartTable spec={spec} /> : spec.type === "bar" ? <Bars spec={spec} /> : spec.type === "line" ? <Lines spec={spec} /> : <Ring spec={spec} />}
      {!asTable && (
        <div className="sr-only">
          <ChartTable spec={spec} />
        </div>
      )}
      {spec.note !== "" && <p className="chart-note">{spec.note}</p>}
    </figure>
  );
}

const swatch = (i: number) => ({ ["--c" as string]: `var(--chart-${(i % 6) + 1})` }) as CSSProperties;

function ChartTable({ spec }: { spec: ChartSpec }) {
  const pie = spec.type === "pie";
  const total = pie ? spec.series[0].values.reduce((a, b) => a + b, 0) : 0;
  return (
    <div className="md-table-wrap">
      <table className="md-table">
        <thead>
          <tr>
            <td />
            {spec.series.map((s) => (
              <th scope="col" key={s.name}>
                {s.name}
              </th>
            ))}
            {pie && <th scope="col">%</th>}
          </tr>
        </thead>
        <tbody>
          {spec.labels.map((l, i) => (
            <tr key={l + i}>
              <th scope="row">{l}</th>
              {spec.series.map((s) => (
                <td key={s.name}>{s.values[i]}</td>
              ))}
              {pie && <td>{Math.round((spec.series[0].values[i] / total) * 1000) / 10}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Horizontal bars, one group per label. Long labels wrap on the left instead of being cut. */
function Bars({ spec }: { spec: ChartSpec }) {
  const all = spec.series.flatMap((s) => s.values);
  const { min, max, ticks } = niceScale(all, spec.max);
  const span = max - min || 1;
  const pos = (v: number) => ((v - min) / span) * 100;
  const zero = pos(0);
  return (
    <div className="bars" aria-hidden="true" style={{ ["--groups" as string]: spec.labels.length } as CSSProperties}>
      {spec.labels.map((label, li) => (
        <div className="bar-group" key={label + li} style={{ ["--i" as string]: li } as CSSProperties}>
          <span className="bar-label">{label}</span>
          <div className="bar-track">
            {ticks.map((tk) => (
              <span key={tk} className={`bar-grid${tk === 0 ? " zero" : ""}`} style={{ left: `${pos(tk)}%` }} />
            ))}
            {spec.series.map((s, si) => {
              const v = s.values[li];
              const left = Math.min(pos(v), zero);
              const width = Math.abs(pos(v) - zero);
              return (
                <div className="bar-row" key={s.name} title={`${s.name}: ${v}${spec.unit ? ` ${spec.unit}` : ""}`}>
                  <span className="bar" style={{ ...swatch(si), left: `${left}%`, width: `${Math.max(width, 0.6)}%` }} />
                  <span className="bar-value" style={{ left: `${Math.max(pos(v), zero)}%` }}>
                    {shortNumber(v)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="bar-axis">
        <span />
        <div className="bar-ticks">
          {ticks.map((tk) => (
            <span key={tk} style={{ left: `${pos(tk)}%` }}>
              {shortNumber(tk)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const W = 640;
const H = 280;
const PAD = { top: 16, right: 18, bottom: 44, left: 46 };

function Lines({ spec }: { spec: ChartSpec }) {
  const all = spec.series.flatMap((s) => s.values);
  const { min, max, ticks } = niceScale(all, spec.max);
  const n = spec.labels.length;
  const x = (i: number) => PAD.left + (n === 1 ? (W - PAD.left - PAD.right) / 2 : (i / (n - 1)) * (W - PAD.left - PAD.right));
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min || 1)) * (H - PAD.top - PAD.bottom);
  const every = Math.ceil(n / 8);
  return (
    <svg className="lines" viewBox={`0 0 ${W} ${H}`} role="presentation" aria-hidden="true">
      {ticks.map((tk) => (
        <g key={tk}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(tk)} y2={y(tk)} className={tk === 0 ? "grid zero" : "grid"} />
          <text x={PAD.left - 8} y={y(tk)} className="tick" textAnchor="end" dominantBaseline="middle">
            {shortNumber(tk)}
          </text>
        </g>
      ))}
      {spec.labels.map((l, i) =>
        i % every === 0 || i === n - 1 ? (
          <text key={l + i} x={x(i)} y={H - PAD.bottom + 20} className="tick" textAnchor="middle">
            {l.length > 12 ? `${l.slice(0, 11)}…` : l}
          </text>
        ) : null,
      )}
      {spec.series.map((s, si) => (
        <g key={s.name} style={swatch(si)} className="line-series">
          <polyline points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} pathLength={1} />
          {s.values.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r={4}>
              <title>{`${s.name}, ${spec.labels[i]}: ${v}${spec.unit ? ` ${spec.unit}` : ""}`}</title>
            </circle>
          ))}
        </g>
      ))}
    </svg>
  );
}

/** A ring with the shares listed beside it: easier to read than slices alone. */
function Ring({ spec }: { spec: ChartSpec }) {
  const values = spec.series[0].values;
  const total = values.reduce((a, b) => a + b, 0);
  // The middle names the biggest share.
  const top = values.indexOf(Math.max(...values));
  const id = useId();
  let start = 0;
  const R = 70;
  const C = 2 * Math.PI * R;
  return (
    <div className="ring">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle cx={100} cy={100} r={R} className="ring-bg" />
        {values.map((v, i) => {
          const share = v / total;
          const dash = `${Math.max(share * C - 2, 0)} ${C}`;
          const el = <circle key={id + i} cx={100} cy={100} r={R} className="ring-part" style={{ ...swatch(i), strokeDasharray: dash, strokeDashoffset: -start * C }} />;
          start += share;
          return el;
        })}
        <text x={100} y={98} textAnchor="middle" className="ring-total">
          {Math.round((values[top] / total) * 100)}%
        </text>
        <text x={100} y={120} textAnchor="middle" className="ring-sub">
          {spec.labels[top].length > 16 ? `${spec.labels[top].slice(0, 15)}…` : spec.labels[top]}
        </text>
      </svg>
      <ul className="ring-keys" aria-hidden="true">
        {spec.labels.map((l, i) => (
          <li key={l + i} style={swatch(i)}>
            <span>{l}</span>
            <b>{Math.round((values[i] / total) * 1000) / 10}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
