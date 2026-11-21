import type { Doc } from "../../convex/_generated/dataModel";

export type OrgType = Doc<"organisations">["type"];
export const ORG_TYPES: OrgType[] = ["secondary_school", "university", "college", "training_provider", "company", "other"];

type StudyingFor = NonNullable<Doc<"profiles">["studyingFor"]>;

/** Which organisations "Where do you study?" searches: Form 1 to 6 sees secondary schools, university sees universities, a professional exam sees colleges, training providers and companies. Just learning sees all. */
export function orgTypesFor(studyingFor: StudyingFor | undefined): OrgType[] | undefined {
  switch (studyingFor) {
    case "olevel":
    case "alevel":
      return ["secondary_school"];
    case "university":
      return ["university"];
    case "professional":
      return ["college", "training_provider", "company"];
    default:
      return undefined;
  }
}
