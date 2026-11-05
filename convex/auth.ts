import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { emailCodeProvider, mailMode } from "./accounts/mail";
import { googleConfigured } from "./lib/env";

/**
 * Convex Auth. Ported from Amayi Learn (convex/auth.ts at ec3496e) without the
 * 18 or older declaration: learners from age 12 sign up themselves, and under
 * 18s need a guardian's consent before they can study (convex/accounts/consent.ts).
 *
 * Password with email codes for verification and reset when email is set up
 * (convex/accounts/mail.ts), and Google when AUTH_GOOGLE_ID and
 * AUTH_GOOGLE_SECRET are set. Providers are chosen from the environment when
 * this module loads, and Convex reloads modules when the environment changes.
 */
export const MIN_PASSWORD_LENGTH = 10;

export function validatePassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH || !/\d/.test(password) || !/[A-Za-z]/.test(password)) {
    throw new ConvexError(`Use at least ${MIN_PASSWORD_LENGTH} characters with at least one letter and one number.`);
  }
}

const password = Password({
  profile(params) {
    const email = String(params.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ConvexError("Enter a valid email address.");
    return { email };
  },
  validatePasswordRequirements: validatePassword,
  ...(mailMode() === "off" ? {} : { verify: emailCodeProvider("verify"), reset: emailCodeProvider("reset") }),
});

/** Only the email and whether Google verified it: no name or photo is kept for learners. */
const google = Google({
  profile(raw) {
    return { id: raw.sub, email: String(raw.email ?? "").toLowerCase(), emailVerified: raw.email_verified === true } as never;
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [password, ...(googleConfigured() ? [google] : [])],
});
