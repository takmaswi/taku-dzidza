/** Shapes of the modules written by scripts/gen-data.mjs. */

export type AiFixture = {
  content?: string;
  usage?: { promptTokens?: number; cachedTokens?: number; completionTokens?: number };
  source: string;
};

/** A compiled Taku mode package (modes/<slug>/, checked by tests/unit/modes.test.ts). */
export type ModePackageData = {
  frontmatter: {
    name: string;
    slug: string;
    output: "summary" | "cards" | "quiz" | "mindmap" | "scroll";
    modelTier: "fast" | "main";
    guide: "supported" | "none";
    citations: "required" | "optional";
    description: string;
    options?: { count?: { min: number; max: number; default: number }; difficulty?: boolean; minutes?: boolean };
    maxTokens: number;
  };
  body: string;
  listing: { title: string; tagline: string; description: string };
};

/** A compiled widget package (widgets/<slug>/, checked by tests/unit/widgets.test.ts). */
export type WidgetPackageData = {
  frontmatter: { name: string; slug: string; modelTier: "fast" | "main"; guide: boolean; notes: "required" | "optional"; description: string; maxTokens: number };
  body: string;
  listing: { title: string; tagline: string };
};
