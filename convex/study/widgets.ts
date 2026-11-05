import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action, query } from "../_generated/server";
import { WIDGETS, PROMPTS } from "../data/generated";
import { requireLearner, requireLearnerInAction } from "../lib/access";
import type { SourceMode } from "../sources/modes";
import { jsonSchema as equationSchema } from "../widgets/equationSteps";
import { jsonSchema as blanksSchema } from "../widgets/fillBlanks";
import { prepareWidget, type WidgetSlug } from "../widgets/inline";
import { jsonSchema as divisionSchema } from "../widgets/longDivision";
import { capMessage, TOOL_MESSAGES } from "./tools";

/**
 * Interactive widgets on the Study tools tab. Taku returns structured data,
 * the widget's own check accepts it or not, and the app renders it. Marking is
 * done by a deterministic checker with no model (convex/widgets).
 */

const JSON_SCHEMAS: Record<WidgetSlug, unknown> = { "equation-steps": equationSchema, "fill-blanks": blanksSchema, "long-division": divisionSchema };

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireLearner(ctx);
    return Object.values(WIDGETS).map((w) => ({ slug: w.frontmatter.slug, title: w.listing.title, tagline: w.listing.tagline }));
  },
});

type Page = { ref: string; sourceId: Id<"sources">; title: string; page: number; text: string };

export const generate = action({
  args: { notebookId: v.id("notebooks"), slug: v.string() },
  handler: async (ctx, args): Promise<{ ok: true; outputId: Id<"outputs"> } | { ok: false; message: string }> => {
    await requireLearnerInAction(ctx);
    const widget = WIDGETS[args.slug];
    if (widget === undefined) throw new ConvexError("That study tool does not exist.");
    const c: { profileId: Id<"profiles">; studyStyle: Doc<"profiles">["studyStyle"]; sourceMode: SourceMode; pages: Page[] } = await ctx.runQuery(internal.study.tools.toolContext, { notebookId: args.notebookId });
    if (c.pages.length === 0) return { ok: false, message: TOOL_MESSAGES.noSources };
    const room = await ctx.runMutation(internal.ai.usage.admit, { profileId: c.profileId, kind: "ask" });
    if (!room.allowed) return { ok: false, message: capMessage(room.reason) };

    const sourceBlock = c.pages.map((p) => `<source ref="${p.ref}" title="${p.title.replace(/[<>"]/g, "'")}" page="${p.page}">\n${p.text.replace(/<\/?\s*source\b[^>]*>/gi, " ")}\n</source>`).join("\n");
    const result = await ctx.runAction(internal.ai.router.call, {
      tier: widget.frontmatter.modelTier,
      purpose: "taku_widget",
      messages: [
        { role: "system", content: PROMPTS["taku-widget"].replace("{{WIDGET_NAME}}", widget.frontmatter.name.toUpperCase()).replace("{{WIDGET_BODY}}", widget.body) },
        { role: "user", content: sourceBlock },
      ],
      jsonSchema: { name: `taku_${args.slug.replace(/-/g, "_")}`, strict: true, schema: JSON_SCHEMAS[args.slug as WidgetSlug] },
      maxTokens: widget.frontmatter.maxTokens,
      stablePrefixCount: 1,
      fixtureKey: { kind: "widget", slug: args.slug, sourceMode: c.sourceMode },
    });
    await ctx.runMutation(internal.ai.usage.record, { profileId: c.profileId, tool: `widget:${args.slug}`, costUsd: result.costUsd });
    if (!result.ok) return { ok: false, message: TOOL_MESSAGES.failed };

    const byRefPage = new Map(c.pages.map((p) => [`${p.ref}:${p.page}`, p]));
    let stored: ReturnType<typeof prepareWidget> = null;
    try {
      const t = result.content.trim();
      stored = prepareWidget(args.slug, JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)), (ref, page) => {
        const found = byRefPage.get(`${ref}:${page}`);
        return found === undefined ? null : { sourceId: found.sourceId, text: found.text };
      });
    } catch {
      stored = null;
    }
    if (stored === null) return { ok: false, message: TOOL_MESSAGES.empty };
    const outputId: Id<"outputs"> = await ctx.runMutation(internal.study.tools.saveOutput, {
      notebookId: args.notebookId,
      profileId: c.profileId,
      mode: args.slug,
      kind: "widget",
      title: (stored.data as { title: string }).title || widget.listing.title,
      content: stored,
      sourceMode: c.sourceMode,
    });
    return { ok: true, outputId };
  },
});
