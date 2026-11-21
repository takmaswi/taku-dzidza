import { query } from "./_generated/server";
import { booksModeOn, teacherModeOn } from "./lib/env";

/**
 * Which new surfaces are on (Convex env, default off). Public and without
 * data: the app only uses it to show or hide pages; every function behind a
 * flag checks it again on the server.
 */
export const get = query({
  args: {},
  handler: async () => ({ teacher: teacherModeOn(), books: booksModeOn() }),
});
