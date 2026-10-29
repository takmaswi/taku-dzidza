import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
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

export async function makeLearner(t: T, age: number, displayName = "Tari"): Promise<Person> {
  const p = await makeUser(t);
  await p.as.mutation(api.accounts.profiles.create, { displayName, ...birthForAge(age) });
  return p;
}
