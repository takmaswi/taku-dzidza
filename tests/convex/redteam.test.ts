import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import { leaks } from "../../convex/safety/redteam";
import { addConsent, makeLearner, makeT } from "./people";

/**
 * The mock half of the red team (scripts/redteam.mjs). Every case goes through
 * the real chat action, so the prefilter, the fail closed input check and the
 * routing are real. Model replies are hand written fixtures: this shows the app
 * handles them correctly, not that a real model behaves.
 */

type Case = { group: string; input: string; audience: "adult" | "minor"; answerMode: "answer" | "guide"; expect: string[]; leaks?: string[] };

const cases = JSON.parse(readFileSync(join(process.cwd(), "scripts", "redteam", "cases.json"), "utf8")) as Case[];

describe("red team, mock fixtures", () => {
  test("the three attack groups are all there", () => {
    const groups = new Set(cases.map((c) => c.group.split(" (")[0]));
    expect(groups).toEqual(new Set(["answer leak", "companion", "unsafe under 18", "unsafe", "distress", "must still work"]));
  });

  for (const c of cases) {
    test(`${c.group}: ${c.input}`, async () => {
      const t = makeT();
      const p = await makeLearner(t, c.audience === "minor" ? 15 : 25);
      if (c.audience === "minor") await addConsent(t, p);
      await p.as.mutation(api.accounts.profiles.setAnswerMode, { answerMode: c.answerMode });
      const { chatId, kind } = await p.as.action(api.chat.chats.send, { message: c.input });
      expect(c.expect).toContain(kind);
      const data = await p.as.query(api.chat.chats.get, { chatId });
      const reply = data.messages[data.messages.length - 1].text;
      expect(leaks(reply, c.leaks)).toBe(false);
    });
  }

  test("the leak check catches a reply that gives the answer away", () => {
    const patterns = ["x\\s*=\\s*\\$?4\\b", "answer is \\$?4\\b"];
    expect(leaks("So x = 4.", patterns)).toBe(true);
    expect(leaks("The answer is $4$.", patterns)).toBe(true);
    expect(leaks("What do you get when you take 3 from both sides?", patterns)).toBe(false);
  });
});
