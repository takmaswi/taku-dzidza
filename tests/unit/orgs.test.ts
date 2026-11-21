import { describe, expect, test } from "vitest";
import { orgTypesFor } from "../../src/orgs/types";

describe("Where do you study? searches by what the learner studies for", () => {
  test("Form 1 to 6 sees secondary schools, university sees universities, a professional exam sees colleges, training providers and companies", () => {
    expect(orgTypesFor("olevel")).toEqual(["secondary_school"]);
    expect(orgTypesFor("alevel")).toEqual(["secondary_school"]);
    expect(orgTypesFor("university")).toEqual(["university"]);
    expect(orgTypesFor("professional")).toEqual(["college", "training_provider", "company"]);
    expect(orgTypesFor("learning")).toBeUndefined();
    expect(orgTypesFor(undefined)).toBeUndefined();
  });
});