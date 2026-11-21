import { describe, expect, test } from "vitest";
import { ageOn, checkBirth } from "../../convex/accounts/age";
import { cleanNeeds, defaultStudyMode, defaultVoice, supportSettings, voiceOf } from "../../convex/accounts/voices";
import { extractTest, stripTestBlock, testScore } from "../../convex/chat/testTurns";

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

describe("Taku's voice", () => {
  test("default by age: teens upbeat, adults gentle", () => {
    expect(defaultVoice(15)).toBe("upbeat");
    expect(defaultVoice(30)).toBe("gentle");
  });
  test("old study styles map to voices: calm gentle, locked in direct, cook upbeat", () => {
    expect(voiceOf({ studyStyle: "calm" })).toBe("gentle");
    expect(voiceOf({ studyStyle: "locked_in" })).toBe("direct");
    expect(voiceOf({ studyStyle: "cook" })).toBe("upbeat");
    expect(voiceOf({})).toBe("gentle");
    // A voice the learner chose wins over the old style.
    expect(voiceOf({ voice: "direct", studyStyle: "cook" })).toBe("direct");
  });
});

describe("support preferences", () => {
  const off = { dyslexia: false, largeText: false, readAloud: false, shortChunks: false, highContrast: false, reducedMotion: false };
  test("each need switches on what it maps to and nothing else", () => {
    expect(supportSettings(["focus"], { accessibility: off, voice: "upbeat" })).toEqual({ accessibility: { ...off, shortChunks: true }, voice: "upbeat" });
    expect(supportSettings(["reading"], { accessibility: off, voice: "upbeat" }).accessibility).toEqual({ ...off, dyslexia: true, largeText: true, readAloud: true });
    expect(supportSettings(["anxious"], { accessibility: off, voice: "upbeat" })).toEqual({ accessibility: off, voice: "gentle" });
    expect(supportSettings(["english"], { accessibility: off, voice: "direct" })).toEqual({ accessibility: off, voice: "direct" });
    expect(supportSettings(["clearer"], { accessibility: off, voice: "gentle" }).accessibility).toEqual({ ...off, largeText: true, highContrast: true });
  });
  test("nothing ticked changes nothing, and nothing already on is switched off", () => {
    const on = { ...off, reducedMotion: true, readAloud: true };
    expect(supportSettings([], { accessibility: on, voice: "direct" })).toEqual({ accessibility: on, voice: "direct" });
    expect(supportSettings(["focus"], { accessibility: on, voice: "direct" }).accessibility.readAloud).toBe(true);
  });
  test("Sprint is the first mode for someone who loses focus easily, else Learn", () => {
    expect(defaultStudyMode({ support: ["focus"] })).toBe("sprint");
    expect(defaultStudyMode({ support: ["reading"] })).toBe("learn");
    expect(defaultStudyMode({})).toBe("learn");
  });
  test("only known needs are kept, once each", () => {
    expect(cleanNeeds(["english", "diagnosis", "focus", "english"])).toEqual(["focus", "english"]);
  });
});

describe("Test me blocks", () => {
  test("the block is taken off the reply and read", () => {
    const reply = 'Right, chlorophyll absorbs light.\n\nNext one.\n```test\n{"correct": true, "question": "Where is chlorophyll found?", "answer": "In the chloroplasts"}\n```';
    expect(extractTest(reply)).toEqual({ text: "Right, chlorophyll absorbs light.\n\nNext one.", turn: { correct: true, question: "Where is chlorophyll found?", answer: "In the chloroplasts" } });
  });
  test("no block, or a broken one, gives no turn but keeps the words", () => {
    expect(extractTest("Just words").turn).toBeNull();
    expect(extractTest("Words\n```test\n{not json\n```")).toEqual({ text: "Words", turn: null });
    expect(extractTest('Q\n```test\n{"correct": null, "question": "Q1", "answer": "A1"}\n```').turn?.correct).toBeNull();
  });
  test("nothing of the block shows while a reply streams", () => {
    expect(stripTestBlock("Next question\n```te")).toBe("Next question\n");
    expect(stripTestBlock('Next question\n```test\n{"answer": "the secret"')).toBe("Next question\n");
    expect(stripTestBlock("Plain")).toBe("Plain");
  });
  test("the score counts the run of Test me marks at the end only", () => {
    const turns = [
      { studyMode: "test", test: { correct: false } },
      { studyMode: "learn" },
      { studyMode: "test", test: {} },
      {},
      { studyMode: "test", test: { correct: true } },
      {},
      { studyMode: "test", test: { correct: false } },
    ];
    expect(testScore(turns)).toEqual({ right: 1, marked: 2 });
  });
});