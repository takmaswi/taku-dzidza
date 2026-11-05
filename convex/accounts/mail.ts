import Resend from "@auth/core/providers/resend";
import { makeFunctionReference } from "convex/server";
import { aiMode, envString } from "../lib/env";
import { randomDigits } from "../lib/tokens";

/**
 * Sign in email codes (Convex Auth's email providers). Three modes:
 *   resend  RESEND_API_KEY is set: real email.
 *   mock    the deployment is in mock AI mode (tests and e2e): the code goes to
 *           the mockOutbox table and no email leaves.
 *   off     neither: no verification and no password reset. The app says so
 *           and sign up still works, so a deploy before the key is added does
 *           not lock anyone out.
 * Only the Resend API is called here, with fetch, so no extra package is needed.
 */

export const EMAIL_CODE_DIGITS = 8;
export const EMAIL_CODE_MINUTES = 20;
const DEFAULT_FROM = "Takudzidza <onboarding@resend.dev>";

export type MailMode = "resend" | "mock" | "off";

export function mailMode(): MailMode {
  if (aiMode() === "mock") return "mock";
  return envString("RESEND_API_KEY") !== undefined ? "resend" : "off";
}

const MESSAGES = {
  verify: { subject: "Your Takudzidza code", line: "Use this code to confirm your email address" },
  reset: { subject: "Reset your Takudzidza password", line: "Use this code to set a new password" },
} as const;

export function emailBody(kind: keyof typeof MESSAGES, code: string): string {
  return `${MESSAGES[kind].line}: ${code}\n\nIt works for ${EMAIL_CODE_MINUTES} minutes. If you did not ask for this, you can ignore this email.`;
}

const recordMock = makeFunctionReference<"mutation", { channel: "email" | "sms"; to: string; code: string }>("accounts/outbox:record");

/** One Convex Auth email provider. `id` is what Password's reset or verify option points at. */
export function emailCodeProvider(kind: keyof typeof MESSAGES) {
  return Resend({
    id: `email-code-${kind}`,
    apiKey: envString("RESEND_API_KEY") ?? "not used in mock mode",
    from: envString("EMAIL_FROM") ?? DEFAULT_FROM,
    maxAge: EMAIL_CODE_MINUTES * 60,
    async generateVerificationToken() {
      return randomDigits(EMAIL_CODE_DIGITS);
    },
    // Convex Auth passes its action context as a second argument, which the Auth.js type leaves out.
    sendVerificationRequest: (async (params: { identifier: string; token: string; provider: { apiKey?: string; from?: string } }, ctx: { runMutation: (ref: typeof recordMock, args: { channel: "email"; to: string; code: string }) => Promise<unknown> }) => {
      if (mailMode() === "mock") {
        await ctx.runMutation(recordMock, { channel: "email", to: params.identifier, code: params.token });
        return;
      }
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${params.provider.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: params.provider.from, to: [params.identifier], subject: MESSAGES[kind].subject, text: emailBody(kind, params.token) }),
      });
      if (!response.ok) {
        // The status only: the address and the code are never logged.
        console.warn(`email failed: ${response.status}`);
        throw new Error("Could not send the email.");
      }
    }) as never,
  });
}
