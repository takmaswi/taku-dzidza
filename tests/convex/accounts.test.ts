import { describe, expect, test } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { CONSENT_TEXT_VERSION } from "../../convex/accounts/consentText";
import { requireAdmin } from "../../convex/lib/access";
import { NO_CONSENT_DAYS } from "../../convex/privacy/retention";
import { CODE_MAX_ATTEMPTS, CODE_MAX_SENDS_PER_DAY } from "../../convex/accounts/consent";
import { addConsent, birthForAge, GUARDIAN_PHONE, lastCode, makeLearner, makeT, makeUser } from "./people";

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
  test("a guardian link and phone code give consent, and the same link withdraws it", async () => {
    const t = makeT();
    const p = await makeLearner(t, 14, "Nyasha");
    const { token } = await p.as.mutation(api.accounts.consent.createRequest, {});
    const info = await t.query(api.accounts.consent.requestInfo, { token });
    expect(info).toMatchObject({ learnerName: "Nyasha", state: "pending", version: CONSENT_TEXT_VERSION });
    expect(JSON.stringify(info)).not.toContain(p.email);

    await expect(
      t.mutation(api.accounts.consent.give, { token, guardianName: "Rudo Moyo", relationship: "mother", guardianContact: GUARDIAN_PHONE, code: "000000", confirmsGuardian: true, agrees: false }),
    ).rejects.toThrow(/Tick both boxes/);
    expect(await t.action(api.accounts.consent.sendCode, { token, phone: "077 123 4567" })).toEqual({ sent: true });
    const code = await lastCode(t, GUARDIAN_PHONE);
    expect(code).toMatch(/^\d{6}$/);
    await t.mutation(api.accounts.consent.give, { token, guardianName: "Rudo Moyo", relationship: "mother", guardianContact: "+263 77 123 4567", code, confirmsGuardian: true, agrees: true });
    expect((await p.as.query(api.accounts.profiles.me, {}))?.profile?.consentState).toBe("given");
    const consents = await t.run(async (ctx) => await ctx.db.query("consents").collect());
    expect(consents).toHaveLength(1);
    expect(consents[0]).toMatchObject({ consentTextVersion: CONSENT_TEXT_VERSION, guardianContact: GUARDIAN_PHONE });
    expect(consents[0].phoneVerifiedAt).toBeGreaterThan(0);
    const stored = await t.run(async (ctx) => await ctx.db.query("consentCodes").collect());
    expect(JSON.stringify(stored)).not.toContain(`"${code}"`);

    await t.mutation(api.accounts.consent.withdraw, { token });
    expect((await p.as.query(api.accounts.profiles.me, {}))?.profile?.consentState).toBe("withdrawn");
  });

  test("a guardian who gives, withdraws and gives again can still withdraw", async () => {
    const t = makeT();
    const p = await makeLearner(t, 14);
    const token = await addConsent(t, p);
    await t.mutation(api.accounts.consent.withdraw, { token });
    // Past the wait between codes.
    await t.run(async (ctx) => {
      for (const row of await ctx.db.query("consentCodes").collect()) await ctx.db.patch(row._id, { createdAt: Date.now() - 2 * 60 * 1000 });
    });
    await t.action(api.accounts.consent.sendCode, { token, phone: GUARDIAN_PHONE });
    await t.mutation(api.accounts.consent.give, { token, guardianName: "Rudo Moyo", relationship: "mother", guardianContact: GUARDIAN_PHONE, code: await lastCode(t, GUARDIAN_PHONE), confirmsGuardian: true, agrees: true });
    expect((await p.as.query(api.accounts.profiles.me, {}))?.profile?.consentState).toBe("given");
    await t.mutation(api.accounts.consent.withdraw, { token });
    expect((await p.as.query(api.accounts.profiles.me, {}))?.profile?.consentState).toBe("withdrawn");
  });

  test("a wrong token reveals nothing and cannot consent", async () => {
    const t = makeT();
    await makeLearner(t, 16);
    const fake = "x".repeat(43);
    expect(await t.query(api.accounts.consent.requestInfo, { token: fake })).toBeNull();
    await expect(
      t.mutation(api.accounts.consent.give, { token: fake, guardianName: "A B", relationship: "father", guardianContact: GUARDIAN_PHONE, code: "000000", confirmsGuardian: true, agrees: true }),
    ).rejects.toThrow(/expired/);
    await expect(t.action(api.accounts.consent.sendCode, { token: fake, phone: GUARDIAN_PHONE })).rejects.toThrow(/expired/);
  });

  const giveWith = (t: ReturnType<typeof makeT>, token: string, code: string, phone = GUARDIAN_PHONE) =>
    t.mutation(api.accounts.consent.give, { token, guardianName: "Rudo Moyo", relationship: "mother", guardianContact: phone, code, confirmsGuardian: true, agrees: true });

  test("consent does not complete without the code, and never with a wrong one", async () => {
    const t = makeT();
    const p = await makeLearner(t, 14);
    const { token } = await p.as.mutation(api.accounts.consent.createRequest, {});
    expect(await giveWith(t, token, "123456")).toMatchObject({ state: "wrong_code", error: expect.stringMatching(/Ask for a code first/) });
    await t.action(api.accounts.consent.sendCode, { token, phone: GUARDIAN_PHONE });
    const code = await lastCode(t, GUARDIAN_PHONE);
    const wrong = code === "000000" ? "000001" : "000000";
    expect(await giveWith(t, token, wrong)).toMatchObject({ state: "wrong_code", error: expect.stringMatching(/not right/) });
    // The right code for a different phone is no good: the code belongs to the phone it went to.
    expect(await giveWith(t, token, code, "+263779999999")).toMatchObject({ state: "wrong_code" });
    expect((await p.as.query(api.accounts.profiles.me, {}))?.profile?.consentState).toBe("pending");
    expect(await giveWith(t, token, code)).toEqual({ state: "given" });
  });

  test("a code stops working after too many tries, and after it expires", async () => {
    const t = makeT();
    const p = await makeLearner(t, 14);
    const { token } = await p.as.mutation(api.accounts.consent.createRequest, {});
    await t.action(api.accounts.consent.sendCode, { token, phone: GUARDIAN_PHONE });
    const code = await lastCode(t, GUARDIAN_PHONE);
    const wrong = code === "000000" ? "000001" : "000000";
    for (let i = 0; i < CODE_MAX_ATTEMPTS; i++) await giveWith(t, token, wrong);
    expect(await giveWith(t, token, code)).toMatchObject({ state: "wrong_code", error: expect.stringMatching(/expired/) });

    const q = await makeLearner(t, 15);
    const second = await q.as.mutation(api.accounts.consent.createRequest, {});
    await t.action(api.accounts.consent.sendCode, { token: second.token, phone: "+263771111111" });
    const fresh = await lastCode(t, "+263771111111");
    await t.run(async (ctx) => {
      for (const row of await ctx.db.query("consentCodes").collect()) await ctx.db.patch(row._id, { expiresAt: Date.now() - 1 });
    });
    expect(await giveWith(t, second.token, fresh, "+263771111111")).toMatchObject({ state: "wrong_code", error: expect.stringMatching(/expired/) });
  });

  test("sending codes is limited, and bad numbers are refused", async () => {
    const t = makeT();
    const p = await makeLearner(t, 14);
    const { token } = await p.as.mutation(api.accounts.consent.createRequest, {});
    await expect(t.action(api.accounts.consent.sendCode, { token, phone: "rudo@example.com" })).rejects.toThrow(/phone number/);
    await t.action(api.accounts.consent.sendCode, { token, phone: GUARDIAN_PHONE });
    await expect(t.action(api.accounts.consent.sendCode, { token, phone: GUARDIAN_PHONE })).rejects.toThrow(/Wait a minute/);
    await t.run(async (ctx) => {
      const profile = (await ctx.db.query("profiles").first())!;
      const request = (await ctx.db.query("consentRequests").first())!;
      for (let i = 0; i < CODE_MAX_SENDS_PER_DAY; i++) {
        await ctx.db.insert("consentCodes", { requestId: request._id, profileId: profile._id, phone: GUARDIAN_PHONE, codeHash: "x", attempts: 0, createdAt: Date.now() - 2 * 60 * 1000, expiresAt: Date.now() });
      }
    });
    await expect(t.action(api.accounts.consent.sendCode, { token, phone: GUARDIAN_PHONE })).rejects.toThrow(/Too many codes/);
  });

  test("with no text message provider the page says so and no code is made", async () => {
    const t = makeT();
    const p = await makeLearner(t, 14);
    const { token } = await p.as.mutation(api.accounts.consent.createRequest, {});
    const before = process.env.AI_MODE;
    process.env.AI_MODE = "live";
    try {
      expect(await t.query(api.accounts.consent.requestInfo, { token })).toMatchObject({ smsReady: false });
      expect(await t.action(api.accounts.consent.sendCode, { token, phone: GUARDIAN_PHONE })).toEqual({ sent: false });
    } finally {
      process.env.AI_MODE = before;
    }
    expect(await t.run(async (ctx) => await ctx.db.query("consentCodes").collect())).toEqual([]);
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
    await addConsent(t, p);
    const profile = (await p.as.query(api.accounts.profiles.me, {}))!.profile!;
    await t.mutation(internal.ai.usage.admit, { profileId: profile._id, kind: "ask" });
    await expect(p.as.mutation(api.accounts.deletion.deleteMyAccount, { confirmEmail: "someone@else.com" })).rejects.toThrow(/Type your account's email/);
    await p.as.mutation(api.accounts.deletion.deleteMyAccount, { confirmEmail: p.email.toUpperCase() });
    const left = await t.run(async (ctx) => ({
      users: await ctx.db.query("users").collect(),
      profiles: await ctx.db.query("profiles").collect(),
      consents: await ctx.db.query("consents").collect(),
      requests: await ctx.db.query("consentRequests").collect(),
      codes: await ctx.db.query("consentCodes").collect(),
      usage: await ctx.db.query("aiUsageDaily").collect(),
      starts: await ctx.db.query("aiStarts").collect(),
      deletions: await ctx.db.query("accountDeletions").collect(),
    }));
    expect(left).toMatchObject({ users: [], profiles: [], consents: [], requests: [], codes: [], usage: [], starts: [] });
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

  test("phone code records are deleted after a day", async () => {
    const t = makeT();
    const p = await makeLearner(t, 14);
    const { token } = await p.as.mutation(api.accounts.consent.createRequest, {});
    await t.action(api.accounts.consent.sendCode, { token, phone: GUARDIAN_PHONE });
    expect((await t.mutation(internal.privacy.retention.sweep, {})).codes).toBe(0);
    await t.run(async (ctx) => {
      for (const row of await ctx.db.query("consentCodes").collect()) await ctx.db.patch(row._id, { createdAt: Date.now() - 25 * 60 * 60 * 1000 });
    });
    expect((await t.mutation(internal.privacy.retention.sweep, {})).codes).toBe(1);
    expect(await t.run(async (ctx) => await ctx.db.query("consentCodes").collect())).toEqual([]);
  });
});

describe("admins and sign in options", () => {
  test("an admin needs an address on the list that has been verified", async () => {
    const t = makeT();
    const p = await makeLearner(t, 30);
    const before = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = p.email;
    try {
      await expect(p.as.run(async (ctx) => await requireAdmin(ctx))).rejects.toThrow(/Only the owner/);
      await t.run(async (ctx) => await ctx.db.patch(p.userId, { emailVerificationTime: Date.now() }));
      await expect(p.as.run(async (ctx) => await requireAdmin(ctx))).resolves.toMatchObject({ email: p.email });
      process.env.ADMIN_EMAILS = "someone.else@example.com";
      await expect(p.as.run(async (ctx) => await requireAdmin(ctx))).rejects.toThrow(/Only the owner/);
    } finally {
      if (before === undefined) delete process.env.ADMIN_EMAILS;
      else process.env.ADMIN_EMAILS = before;
    }
  });

  test("Google stays hidden until both of its settings exist", async () => {
    const t = makeT();
    const saved = { id: process.env.AUTH_GOOGLE_ID, secret: process.env.AUTH_GOOGLE_SECRET };
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GOOGLE_SECRET;
    try {
      expect((await t.query(api.accounts.authOptions.available, {})).google).toBe(false);
      process.env.AUTH_GOOGLE_ID = "id";
      expect((await t.query(api.accounts.authOptions.available, {})).google).toBe(false);
      process.env.AUTH_GOOGLE_SECRET = "secret";
      expect((await t.query(api.accounts.authOptions.available, {})).google).toBe(true);
    } finally {
      if (saved.id === undefined) delete process.env.AUTH_GOOGLE_ID;
      else process.env.AUTH_GOOGLE_ID = saved.id;
      if (saved.secret === undefined) delete process.env.AUTH_GOOGLE_SECRET;
      else process.env.AUTH_GOOGLE_SECRET = saved.secret;
    }
  });

  test("email codes are on in mock mode, and the test outbox refuses to record outside it", async () => {
    const t = makeT();
    expect((await t.query(api.accounts.authOptions.available, {})).emailCodes).toBe(true);
    await t.mutation(internal.accounts.outbox.record, { channel: "email", to: "a@example.com", code: "12345678" });
    expect(await t.query(internal.accounts.outbox.latest, { to: "a@example.com" })).toBe("12345678");
    const before = process.env.AI_MODE;
    process.env.AI_MODE = "live";
    try {
      await t.mutation(internal.accounts.outbox.record, { channel: "email", to: "b@example.com", code: "12345678" }).catch(() => undefined);
      expect(await t.query(internal.accounts.outbox.latest, { to: "b@example.com" })).toBeNull();
    } finally {
      process.env.AI_MODE = before;
    }
  });
});

describe("usage counts", () => {
  test("an under 18 can never switch them on, and nothing is counted", async () => {
    const t = makeT();
    const minor = await makeLearner(t, 16);
    await addConsent(t, minor);
    await minor.as.mutation(api.analytics.setConsent, { consent: true });
    expect((await minor.as.query(api.accounts.profiles.me, {}))?.profile?.analyticsConsent).toBe(false);
    // Even if the flag were somehow set, the count is refused by age.
    await t.run(async (ctx) => {
      const profile = (await ctx.db.query("profiles").first())!;
      await ctx.db.patch(profile._id, { analyticsConsent: true });
    });
    await minor.as.mutation(api.analytics.track, { event: "chat_sent" });
    expect(await t.run(async (ctx) => await ctx.db.query("analyticsDaily").collect())).toEqual([]);
  });

  test("an adult's count stays off until switched on, and holds no account", async () => {
    const t = makeT();
    const p = await makeLearner(t, 25);
    await p.as.mutation(api.analytics.track, { event: "chat_sent" });
    expect(await t.run(async (ctx) => await ctx.db.query("analyticsDaily").collect())).toEqual([]);
    await p.as.mutation(api.analytics.setConsent, { consent: true });
    await p.as.mutation(api.analytics.track, { event: "chat_sent" });
    await p.as.mutation(api.analytics.track, { event: "chat_sent" });
    const rows = await t.run(async (ctx) => await ctx.db.query("analyticsDaily").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ event: "chat_sent", count: 2 });
    expect(JSON.stringify(rows)).not.toContain(p.userId);
    expect(JSON.stringify(rows)).not.toContain(p.email);
    await p.as.mutation(api.analytics.setConsent, { consent: false });
    await p.as.mutation(api.analytics.track, { event: "chat_sent" });
    expect((await t.run(async (ctx) => await ctx.db.query("analyticsDaily").first()))?.count).toBe(2);
  });
});

describe("first run checklist", () => {
  test("follows what the learner has really done", async () => {
    const t = makeT();
    const p = await makeLearner(t, 20);
    expect(await p.as.query(api.accounts.progress.firstRun, {})).toEqual({ addedNotes: false, asked: false, madeCards: false });
    const notebookId = await p.as.mutation(api.notebooks.notebooks.create, { title: "Biology" });
    await p.as.mutation(api.notebooks.sources.addText, { notebookId, title: "Biology notes", text: "Photosynthesis\nChlorophyll in the chloroplasts absorbs the light." });
    expect(await p.as.query(api.accounts.progress.firstRun, {})).toEqual({ addedNotes: true, asked: false, madeCards: false });
    await p.as.mutation(api.chat.chats.start, { message: "Explain osmosis simply" });
    expect(await p.as.query(api.accounts.progress.firstRun, {})).toMatchObject({ asked: true, madeCards: false });
  });
});
