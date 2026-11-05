import type { StudyStyle } from "../../convex/accounts/styles";
import type { CutoutSlug } from "../art.generated";

/** The person who stands on each study style card (art/assets/cutouts). */
export const STYLE_ART: Record<StudyStyle, { slug: CutoutSlug; alt: string; cls: string }> = {
  locked_in: { slug: "style-locked-in", alt: "A learner reading her notes in quiet focus", cls: "locked" },
  cook: { slug: "style-cook-mode", alt: "A teenager revising with energy", cls: "cook" },
  calm: { slug: "style-calm", alt: "A learner working calmly through notes on a tablet", cls: "calm" },
};
