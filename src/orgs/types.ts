import type { Doc } from "../../convex/_generated/dataModel";

export type OrgType = Doc<"organisations">["type"];
export const ORG_TYPES: OrgType[] = ["secondary_school", "university", "college", "training_provider", "company", "other"];
