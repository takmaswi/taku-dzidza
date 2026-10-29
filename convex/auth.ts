import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

/**
 * Convex Auth, password provider. Ported from Amayi Learn (convex/auth.ts at
 * ec3496e) without the 18 or older declaration: learners from age 12 sign up
 * themselves, and under 18s need a guardian's consent before they can study
 * (convex/accounts/consent.ts).
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
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [password],
});
