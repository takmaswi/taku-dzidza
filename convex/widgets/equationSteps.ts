import { parse, type MathNode } from "mathjs/number";
import { z } from "zod";

/**
 * Equation steps: the learner solves an equation one line at a time and each
 * line is checked with mathjs, with no model involved. Taku supplies only the
 * equation and hints, so the answer is never in the data. Plain TypeScript,
 * used by Convex to check Taku's data and by the browser to mark each line.
 *
 * A line is right when it has the same solutions as the first equation. Two
 * tests, in order: the difference of its two sides is a constant multiple of
 * the original's (moving terms, multiplying through, factorising), or both
 * have the same real solutions found by a numeric scan (x = 4, x = 2 or x = 3).
 */

export const dataSchema = z.object({
  title: z.string().min(1).max(120),
  equation: z.string().min(3).max(120),
  variable: z.string().regex(/^[a-z]$/),
  hints: z.array(z.string().max(300)).max(6),
});
export type EquationData = z.infer<typeof dataSchema>;

export const jsonSchema = {
  type: "object",
  properties: { title: { type: "string" }, equation: { type: "string" }, variable: { type: "string" }, hints: { type: "array", items: { type: "string" } } },
  required: ["title", "equation", "variable", "hints"],
  additionalProperties: false,
};

const FUNCTIONS = new Set(["sqrt", "abs", "sin", "cos", "tan", "log", "exp"]);
const CONSTANTS = new Set(["pi", "e"]);

type Fn = (x: number) => number;

/** What a learner can type on a phone, turned into what mathjs reads. */
export function normalise(line: string): string {
  return line
    .replace(/[\u2212\u2013\u2014]/g, "-")
    .replace(/[×⋅]/g, "*")
    .replace(/÷/g, "/")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/\$/g, "")
    .trim();
}

/** Only numbers, the unknown, ordinary operators and a short list of functions: nothing else is ever evaluated. */
function safeNode(root: MathNode, variable: string): boolean {
  let safe = true;
  root.traverse((node, _path, parent) => {
    const type = node.type;
    if (type === "OperatorNode" || type === "ConstantNode" || type === "ParenthesisNode") return;
    if (type === "FunctionNode") {
      const name = (node as unknown as { fn: { name?: string } }).fn.name ?? "";
      if (!FUNCTIONS.has(name)) safe = false;
      return;
    }
    if (type === "SymbolNode") {
      const name = (node as unknown as { name: string }).name;
      // A function's own name also appears as a symbol below its FunctionNode.
      const isFunctionName = parent?.type === "FunctionNode" && FUNCTIONS.has(name);
      if (name !== variable && !CONSTANTS.has(name) && !isFunctionName) safe = false;
      return;
    }
    safe = false;
  });
  return safe;
}

function compileSide(text: string, variable: string): { fn: Fn; node: MathNode } | null {
  if (text.trim() === "" || text.length > 120) return null;
  try {
    const node = parse(text);
    if (!safeNode(node, variable)) return null;
    const code = node.compile();
    return {
      node,
      fn: (x) => {
        const value = code.evaluate({ [variable]: x }) as unknown;
        return typeof value === "number" ? value : NaN;
      },
    };
  } catch {
    return null;
  }
}

/** One "left = right" as left minus right, or null when it cannot be read. */
function compileEquation(text: string, variable: string): { f: Fn; right: { node: MathNode; fn: Fn }; left: { node: MathNode; fn: Fn } } | null {
  const sides = text.split("=");
  if (sides.length !== 2) return null;
  const left = compileSide(sides[0], variable);
  const right = compileSide(sides[1], variable);
  if (left === null || right === null) return null;
  return { left, right, f: (x) => left.fn(x) - right.fn(x) };
}

/** Finer near zero, where school answers are, then wider steps out to a million. */
function scanPoints(): number[] {
  const near = Array.from({ length: 801 }, (_, i) => -50 + i * 0.125);
  const far: number[] = [];
  for (let x = 50 * 1.05; x < 1e6; x *= 1.05) far.push(x);
  return [...far.map((x) => -x).reverse(), ...near, ...far];
}
const POINTS = scanPoints();
const SAME = 1e-6;

/** The real solutions of f(x) = 0 in the scanned range. A pole is not a solution, even though the sign changes across it. */
export function realRoots(f: Fn): number[] {
  const roots: number[] = [];
  const add = (x: number) => {
    if (Math.abs(f(x)) < 1e-6 && !roots.some((r) => Math.abs(r - x) < SAME * (1 + Math.abs(x)))) roots.push(x);
  };
  for (let i = 0; i + 1 < POINTS.length; i++) {
    let lo = POINTS[i];
    let hi = POINTS[i + 1];
    const a = f(lo);
    const b = f(hi);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (a === 0) add(lo);
    if (a * b < 0) {
      let flo = a;
      for (let step = 0; step < 80; step++) {
        const mid = (lo + hi) / 2;
        const fm = f(mid);
        if (flo * fm <= 0) hi = mid;
        else {
          lo = mid;
          flo = fm;
        }
      }
      add((lo + hi) / 2);
    } else if (i + 2 < POINTS.length) {
      // A root that touches zero without crossing, like (x - 2)^2.
      const c = f(POINTS[i + 2]);
      if (Number.isFinite(c) && Math.abs(b) < Math.abs(a) && Math.abs(b) < Math.abs(c) && Math.sign(a) === Math.sign(b) && Math.sign(b) === Math.sign(c)) {
        let l = lo;
        let r = POINTS[i + 2];
        for (let step = 0; step < 100; step++) {
          const m1 = l + (r - l) / 3;
          const m2 = r - (r - l) / 3;
          if (Math.abs(f(m1)) < Math.abs(f(m2))) r = m2;
          else l = m1;
        }
        add((l + r) / 2);
      }
    }
  }
  return roots.sort((x, y) => x - y);
}

function sameRoots(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 1e-5 * (1 + Math.abs(x)));
}

const SAMPLES = [-7.3, -3.1, -1.7, -0.6, 0.45, 1.3, 2.9, 5.7, 11.2];

/** True when g is f times a constant at every point where both can be read. */
function constantMultiple(f: Fn, g: Fn): boolean {
  let ratio: number | null = null;
  let seen = 0;
  for (const x of SAMPLES) {
    const a = f(x);
    const b = g(x);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (Math.abs(a) < 1e-9 || Math.abs(b) < 1e-9) {
      if (Math.abs(a) < 1e-9 !== Math.abs(b) < 1e-9) return false;
      continue;
    }
    const r = b / a;
    if (ratio === null) ratio = r;
    else if (Math.abs(r - ratio) > 1e-7 * (1 + Math.abs(ratio))) return false;
    seen++;
  }
  return ratio !== null && seen >= 3 && Math.abs(ratio) > 1e-9;
}

/** "x = 2 or x = -3", also with a comma. */
function branches(line: string): string[] {
  return line.split(/\s+or\s+|,/i).map((b) => b.trim()).filter((b) => b.length > 0);
}

export type LineVerdict = { ok: boolean; done: boolean; problem: "unreadable" | "wrong" | null };

/**
 * Marks one line against the first equation. done means the learner has
 * reached the solved form: the unknown alone on one side of each branch, equal
 * to a number on the other, for every solution.
 */
export function checkLine(equation: string, variable: string, typed: string): LineVerdict {
  const start = compileEquation(normalise(equation), variable);
  if (start === null) return { ok: false, done: false, problem: "unreadable" };
  const parts = branches(normalise(typed));
  const compiled = parts.map((p) => compileEquation(p, variable));
  if (parts.length === 0 || compiled.some((c) => c === null)) return { ok: false, done: false, problem: "unreadable" };
  const lines = compiled as NonNullable<(typeof compiled)[number]>[];

  const single = lines.length === 1;
  const startRoots = realRoots(start.f);
  const lineRoots = [...new Set(lines.flatMap((l) => realRoots(l.f)))].sort((x, y) => x - y);
  const equivalent = (single && constantMultiple(start.f, lines[0].f)) || (startRoots.length > 0 && sameRoots(startRoots, lineRoots));
  if (!equivalent) return { ok: false, done: false, problem: "wrong" };

  const isUnknown = (node: MathNode) => node.type === "SymbolNode" && (node as unknown as { name: string }).name === variable;
  const mentionsUnknown = (node: MathNode) => {
    let found = false;
    node.traverse((n) => {
      if (isUnknown(n)) found = true;
    });
    return found;
  };
  const solved = lines.every((l) => (isUnknown(l.left.node) && !mentionsUnknown(l.right.node)) || (isUnknown(l.right.node) && !mentionsUnknown(l.left.node)));
  return { ok: true, done: solved && lines.length === startRoots.length, problem: null };
}

/** The solved value is never stored; hints that give it away are removed. */
function hintGivesAnswer(hint: string, variable: string, roots: readonly number[]): boolean {
  const compact = normalise(hint).replace(/\s+/g, "").toLowerCase();
  return roots.some((r) => compact.includes(`${variable}=${Number(r.toFixed(6))}`));
}

/** Taku's data, or null when the equation cannot be read or has no real solution to find. */
export function prepare(raw: unknown): EquationData | null {
  const parsed = dataSchema.safeParse(raw);
  if (!parsed.success) return null;
  const data = parsed.data;
  const start = compileEquation(normalise(data.equation), data.variable);
  if (start === null) return null;
  const roots = realRoots(start.f);
  if (roots.length === 0) return null;
  return { ...data, equation: normalise(data.equation), hints: data.hints.filter((h) => !hintGivesAnswer(h, data.variable, roots)) };
}
