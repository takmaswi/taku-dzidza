import { query } from "../_generated/server";
import { googleConfigured } from "../lib/env";
import { mailMode } from "./mail";

/** What the sign in page may offer. Public, and says nothing but which options are on. */
export const available = query({
  args: {},
  handler: async () => ({ google: googleConfigured(), emailCodes: mailMode() !== "off" }),
});
