import { parse as parseYaml } from "yaml";
import { z } from "zod";

/**
 * Taku mode packages (SPEC.md 2.1): a folder per mode, modes/<slug>/ with
 * mode.md (frontmatter and instructions), listing.json and tests.json.
 * Ported in shape from Takubasa's agent packages (convex/agents/package.ts
 * at 33f0abc) and cut down to what a study mode needs, so a new mode is
 * added like an agent. Plain TypeScript; scripts/gen-data.mjs compiles the
 * packages into convex/data/generated.ts and tests/unit/modes.test.ts checks them.
 */

export const OUTPUT_KINDS = ["summary", "cards", "quiz", "mindmap", "scroll"] as const;
export type OutputKind = (typeof OUTPUT_KINDS)[number];

export const BODY_MAX_CHARS = 12_000;

export const frontmatterSchema = z
  .object({
    name: z.string().min(2).max(40),
    slug: z.string().regex(/^[a-z][a-z0-9-]{1,30}$/),
    output: z.enum(OUTPUT_KINDS),
    modelTier: z.enum(["fast", "main"]),
    guide: z.enum(["supported", "none"]),
    citations: z.enum(["required", "optional"]),
    description: z.string().min(10).max(300),
    options: z
      .object({
        count: z.object({ min: z.number().int().min(1), max: z.number().int().max(60), default: z.number().int() }).optional(),
        difficulty: z.boolean().default(false),
        minutes: z.boolean().default(false),
      })
      .default({ difficulty: false, minutes: false }),
    maxTokens: z.number().int().min(500).max(12000),
  })
  .strict();

export const listingSchema = z
  .object({
    title: z.string().min(2).max(40),
    tagline: z.string().min(5).max(80),
    description: z.string().min(10).max(600),
  })
  .strict();

export const testsSchema = z.object({
  cases: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        options: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
        expect: z.object({ minItems: z.number().int().min(0), rubric: z.string().min(10) }),
      }),
    )
    .min(1),
});

export type ModeFrontmatter = z.infer<typeof frontmatterSchema>;
export type ModePackage = { frontmatter: ModeFrontmatter; body: string; listing: z.infer<typeof listingSchema>; tests: z.infer<typeof testsSchema> };

const HIDDEN = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/;

export function parseModeMarkdown(text: string): { frontmatter: ModeFrontmatter; body: string } {
  const match = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (match === null) throw new Error("mode.md needs frontmatter between --- lines.");
  const frontmatter = frontmatterSchema.parse(parseYaml(match[1]));
  const body = match[2].trim();
  if (body.length < 50 || body.length > BODY_MAX_CHARS) throw new Error(`The instructions must be 50 to ${BODY_MAX_CHARS} characters.`);
  if (HIDDEN.test(body)) throw new Error("The instructions contain invisible control characters.");
  return { frontmatter, body };
}

/** Everything wrong with a package, beyond what the schemas catch. */
export function packageProblems(folder: string, pkg: ModePackage): string[] {
  const problems: string[] = [];
  if (pkg.frontmatter.slug !== folder) problems.push(`slug ${pkg.frontmatter.slug} must match the folder ${folder}.`);
  const count = pkg.frontmatter.options.count;
  if (count !== undefined && (count.default < count.min || count.default > count.max)) problems.push("options.count.default must sit between min and max.");
  const copy = [pkg.listing.title, pkg.listing.tagline, pkg.listing.description, pkg.frontmatter.name];
  if (copy.some((s) => /[-\u2010-\u2015]/.test(s))) problems.push("Listing copy and the mode name must not contain hyphens or dashes.");
  return problems;
}
