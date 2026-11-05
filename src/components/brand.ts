/**
 * The Taku three pill T, Education family, exactly as in
 * art/brand/takudzidza/kit/ (tests/unit/brand.test.ts compares them). Geometry
 * and colours never change: on cream and honey surfaces the on cream variant,
 * on charcoal the inverse.
 */
export const MARK_RECTS = [
  { x: 12, y: 16, width: 40, height: 24 },
  { x: 48, y: 16, width: 40, height: 24 },
  { x: 38, y: 28, width: 24, height: 60 },
] as const;

export const MARK_FILLS = {
  "on-cream": ["#D6B879", "#B0822F", "#8A5A1F"],
  inverse: ["#D6B879", "#F4E8D3", "#FAF3E6"],
} as const;

export type MarkVariant = keyof typeof MARK_FILLS;
