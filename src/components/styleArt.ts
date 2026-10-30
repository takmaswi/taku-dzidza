import type { StudyStyle } from "../../convex/accounts/styles";

/** Photos for the study style cards. Batch 1 photos stand in until Codex makes the style photos (art/ASSETS.md). */
export const STYLE_ART: Record<StudyStyle, { slug: string; fallback: string; alt: string; cls: string }> = {
  locked_in: { slug: "style-locked-in", fallback: "onboarding-3-professional", alt: "A learner studying in quiet focus", cls: "locked" },
  cook: { slug: "style-cook-mode", fallback: "onboarding-2-senior-student", alt: "A teenager revising with energy", cls: "cook" },
  calm: { slug: "style-calm", fallback: "dashboard-hero-university", alt: "Two students revising calmly together", cls: "calm" },
};

