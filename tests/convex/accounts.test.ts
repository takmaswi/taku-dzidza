import { describe, expect, test } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { CONSENT_TEXT_VERSION } from "../../convex/accounts/consentText";
import { NO_CONSENT_DAYS } from "../../convex/privacy/retention";
import { birthForAge, makeLearner, makeT, makeUser } from "./people";

describe("sign up and profiles", () => {
  test("an adult needs no consent and starts in Calm", async () => {
    const t = makeT();
    const p = await makeLearner(t, 25);
    const me = await p.as.query(api.accounts.profiles.me, {});
    expect(me?.profile?.consentState).toBe("not_needed");
    expect(me?.profile?.studyStyle).toBe("calm");
    expect(me?.profile?.answerMode).toBe("answer");
  });

  test("a 15 year old needs consent and starts in Cook Mode", async () => {
    const t = makeT();
    const p = await makeLearner(t, 15);
    const me = await p.as.query(api.accounts.profiles.me, {});
    expect(me?.profile?.consentState).toBe("pending");
    expect(me?.profile?.studyStyle).toBe("cook");
  });

  test("under 12 is refused with TOO_YOUNG and no profile is made", async () => {
    const t = makeT();
    const p = await makeUser(t);
    await expect(p.as.mutation(api.accounts.profiles.create, { displayName: "Kudzi", ...birthForAge(10) })).rejects.toThrow(/TOO_YOUNG/);
    expect((await p.as.query(api.accounts.profiles.me, {}))?.profile).toBeNull();
  });

  test("settings change only the learner's own profile", async () => {
    const t = makeT();
    const a = await makeLearner(t, 20);
    const b = await makeLearner(t, 30);
    await a.as.mutation(api.accounts.profiles.setStyle, { studyStyle: "locked_in" });
    await a.as.mutation(api.accounts.profiles.setAnswerMode, { answerMode: "guide" });
    const access = { dyslexia: true, largeText: false, readAloud: true, shortChunks: false, highContrast: false, reducedMotion: true };
    await a.as.mutation(api.accounts.profiles.setAccessibility, { accessibility: access });
    const pa = (await a.as.query(api.accounts.profiles.me, {}))?.profile;
    const pb = (await b.as.query(api.accounts.profiles.me, {}))?.profile;
    expect(pa).toMatchObject({ studyStyle: "locked_in", styleChosen: true, answerMode: "guide", accessibility: access });
    expect(pb).toMatchObject({ studyStyle: "calm", styleChosen: false, answerMode: "answer" });
  });

  test("signed out callers get null from me and are refused elsewhere", async () => {
    const t = makeT();
    expect(await t.query(api.accounts.profiles.me, {})).toBeNull();
    await expect(t.mutation(api.accounts.profiles.setAnswerMode, { answerMode: "guide" })).rejects.toThrow(/Sign in first/);
  });
});

describe("guardian consent", () => {
  test("a guardian link gives consent, and the same link withdraws it", async () => {
    const t = makeT();
    const p = await makeLearner(t, 14, "Nyasha");
    const { token } = await p.as.mutation(api.accounts.consent.createRequest, {});
    const info = await t.query(api.accounts.consent.requestInfo, { token });
    expect(info).toMatchObject({ learnerName: "Nyasha", state: "pending", version: CONSENT_TEXT_VERSION });
    expect(JSON.stringify(info)).not.toContain(p.email);

    await expect(
      t.mutation(api.accounts.consent.give, { token, guardianName: "Rudo Moyo", relationship: "mother", guardianContact: "rudo@example.com", confirmsGuardian: true, agrees: false }),
    ).rejects.toThrow(/Tick both boxes/);
    await t.mutation(api.accounts.consent.give, { token, guardianName: "Rudo Moyo", relationship: "mother", guardianContact: "+263 77 123 4567", confirmsGuardian: true, agrees: true });
    expect((await p.as.query(api.accounts.profiles.me, {}))?.profile?.consentState).toBe("given");
    const consents = await t.run(async (ctx) => await ctx.db.query("consents").collect());
    expect(consents).toHaveLength(1);
    expect(consents[0].consentTextVersion).toBe(CONSENT_TEXT_VERSION);

    await t.mutation(api.accounts.consent.withdraw, { token });
    expect((await p.as.query(api.accounts.profiles.me, {}))?.profile?.consentState).toBe("withdrawn");
  });

  test("a wrong token reveals nothing and cannot consent", async () => {
    const t = makeT();
    await makeLearner(t, 16);
    const fake = "x".repeat(43);
    expect(await t.query(api.accounts.consent.requestInfo, { token: fake })).toBeNull();
    await expect(
      t.mutation(api.accounts.consent.give, { token: fake, guardianName: "A B", relationship: "father", guardianContact: "a@example.com", confirmsGuardian: true, agrees: true }),
    ).rejects.toThrow(/expired/);
  });

  test("a new link replaces an unused old one", async () => {
    const t = makeT();
    const p = await makeLearner(t, 13);
    const first = await p.as.mutation(api.accounts.consent.createRequest, {});
    await p.as.mutation(api.accounts.consent.createRequest, {});
    expect(await t.query(api.accounts.consent.requestInfo, { token: first.token })).toBeNull();
  });

  test("adults cannot make consent links", async () => {
    const t = makeT();
    const p = await makeLearner(t, 22);
    await expect(p.as.mutation(api.accounts.consent.createRequest, {})).rejects.toThrow(/No guardian consent is needed/);
  });
});

describe("deleting an account", () => {
  test("deletes the profile, consent rows and sign in rows, after the email is typed", async () => {
    const t = makeT();
    const p = await makeLearner(t, 15);
    const { token } = await p.as.mutation(api.accounts.consent.createRequest, {});
    await t.mutation(api.accounts.consent.give, { token, guardianName: "Rudo Moyo", relationship: "mother", guardianContact: "rudo@example.com", confirmsGuardian: true, agrees: true });
    await expect(p.as.mutation(api.accounts.deletion.deleteMyAccount, { confirmEmail: "someone@else.com" })).rejects.toThrow(/Type your account's email/);
    await p.as.mutation(api.accounts.deletion.deleteMyAccount, { confirmEmail: p.email.toUpperCase() });
    const left = await t.run(async (ctx) => ({
      users: await ctx.db.query("users").collect(),
      profiles: await ctx.db.query("profiles").collect(),
      consents: await ctx.db.query("consents").collect(),
      requests: await ctx.db.query("consentRequests").collect(),
      deletions: await ctx.db.query("accountDeletions").collect(),
    }));
    expect(left).toMatchObject({ users: [], profiles: [], consents: [], requests: [] });
    expect(left.deletions.map((d) => d.reason)).toEqual(["self"]);
  });
});

describe("retention", () => {
  test("an under 18 account with no consent after the limit is deleted; others stay", async () => {
    const t = makeT();
    const waiting = await makeLearner(t, 14);
    const adult = await makeLearner(t, 30);
    const old = Date.now() - (NO_CONSENT_DAYS + 1) * 24 * 60 * 60 * 1000;
    await t.run(async (ctx) => {
      for (const profile of await ctx.db.query("profiles").collect()) await ctx.db.patch(profile._id, { createdAt: old });
    });
    const result = await t.mutation(internal.privacy.retention.sweep, {});
    expect(result.accounts).toBe(1);
    const users = await t.run(async (ctx) => await ctx.db.query("users").collect());
    expect(users.map((u) => u._id)).toEqual([adult.userId]);
    expect(users.map((u) => u._id)).not.toContain(waiting.userId);
  });
});
