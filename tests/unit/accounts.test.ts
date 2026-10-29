import { describe, expect, test } from "vitest";
import { ageOn, checkBirth } from "../../convex/accounts/age";
import { defaultStyle, scoreQuiz } from "../../convex/accounts/styles";

const NOW = new Date(Date.UTC(2026, 9, 29));

describe("age rules", () => {
  test("age counts whole years from the birth month", () => {
    expect(ageOn(2008, 10, NOW)).toBe(18);
    expect(ageOn(2008, 11, NOW)).toBe(17);
  });
  test("under 12 is too young, 12 to 17 are minors, 18 is an adult", () => {
    expect(checkBirth(2015, 1, NOW)).toEqual({ ok: false, reason: "too_young" });
    expect(checkBirth(2014, 10, NOW)).toEqual({ ok: true, minor: true, age: 12 });
    expect(checkBirth(2008, 10, NOW)).toEqual({ ok: true, minor: false, age: 18 });
  });
  test("nonsense dates are invalid", () => {
    expect(checkBirth(2010, 13, NOW)).toEqual({ ok: false, reason: "invalid" });
    expect(checkBirth(1800, 1, NOW)).toEqual({ ok: false, reason: "invalid" });
    expect(checkBirth(2030, 1, NOW)).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("study styles", () => {
  test("default by age", () => {
    expect(defaultStyle(15)).toBe("cook");
    expect(defaultStyle(30)).toBe("calm");
  });
  test("the quiz picks the most chosen style, quietest first on a tie", () => {
    expect(scoreQuiz(["cook", "cook", "calm"], "calm")).toBe("cook");
    expect(scoreQuiz(["cook", "calm", "locked_in"], "cook")).toBe("locked_in");
    expect(scoreQuiz([], "calm")).toBe("calm");
  });
});
