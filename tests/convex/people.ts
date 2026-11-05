import { convexTest } from "convex-test";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { modules } from "./setup";

/** Test learners, created the way the app creates them. */

export function makeT() {
  return convexTest(schema, modules);
}
export type T = ReturnType<typeof makeT>;
export type Person = { userId: Id<"users">; email: string; as: ReturnType<T["withIdentity"]> };

let seq = 0;

export async function makeUser(t: T): Promise<Person> {
  seq += 1;
  const email = `learner${seq}@example.com`;
  const userId = await t.run(async (ctx) => await ctx.db.insert("users", { email }));
  return { userId, email, as: t.withIdentity({ subject: `${userId}|session${seq}`, email }) };
}

export function birthForAge(age: number, now = new Date()): { birthYear: number; birthMonth: number } {
  // Born in January, so the age is already reached this year.
  return { birthYear: now.getUTCFullYear() - age, birthMonth: 1 };
}

export const GUARDIAN_PHONE = "+263771234567";

/** The code the mock text message carried, read from the test outbox. */
export async function lastCode(t: T, to: string): Promise<string> {
  const code = await t.query(internal.accounts.outbox.latest, { to });
  if (code === null) throw new Error(`no code was sent to ${to}`);
  return code;
}

/** A guardian gives permission the way the page does: asks for a code, then types it. */
export async function addConsent(t: T, p: Person, phone = GUARDIAN_PHONE): Promise<string> {
  const { token } = await p.as.mutation(api.accounts.consent.createRequest, {});
  await t.action(api.accounts.consent.sendCode, { token, phone });
  const code = await lastCode(t, phone);
  await t.mutation(api.accounts.consent.give, { token, guardianName: "Rudo Moyo", relationship: "mother", guardianContact: phone, code, confirmsGuardian: true, agrees: true });
  return token;
}

export async function makeLearner(t: T, age: number, displayName = "Tari"): Promise<Person> {
  const p = await makeUser(t);
  await p.as.mutation(api.accounts.profiles.create, { displayName, ...birthForAge(age) });
  return p;
}
