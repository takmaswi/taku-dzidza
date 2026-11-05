import { z } from "zod";

/**
 * Widget packages (SPEC.md 3.5b): a folder per widget, widgets/<slug>/ with
 * widget.md (frontmatter and instructions for Taku), listing.json and
 * tests.json, the same shape as modes/. scripts/gen-data.mjs compiles them into
 * convex/data/generated.ts and tests/unit/widgets.test.ts checks them.
 */

export const widgetFrontmatter = z
  .object({
    name: z.string().min(2).max(40),
    slug: z.string().regex(/^[a-z][a-z0-9-]{1,30}$/),
    modelTier: z.enum(["fast", "main"]),
    guide: z.boolean(),
    notes: z.enum(["required", "optional"]),
    description: z.string().min(10).max(300),
    maxTokens: z.number().int().min(200).max(6000),
  })
  .strict();

export const widgetListing = z.object({ title: z.string().min(2).max(40), tagline: z.string().min(5).max(80) }).strict();

/** Deterministic cases: Taku's data, then what each typed answer must be marked. */
export const widgetTests = z.object({
  cases: z.array(z.object({ id: z.string().regex(/^[a-z0-9-]+$/), data: z.unknown(), valid: z.boolean(), steps: z.array(z.object({ typed: z.string(), ok: z.boolean(), done: z.boolean().optional() })).default([]) })).min(1),
});

export type WidgetPackageData = { frontmatter: z.infer<typeof widgetFrontmatter>; body: string; listing: z.infer<typeof widgetListing> };
