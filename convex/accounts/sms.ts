import { aiMode } from "../lib/env";

/**
 * Text messages to a guardian's phone. A real provider is not chosen yet: to
 * add one, implement SmsSender below and return it from smsSender when its key
 * is set. Until then only mock mode can send, and under 18s cannot finish
 * consent in production (the guardian's page says so).
 */

export type SmsResult = { ok: true } | { ok: false; reason: "not_configured" | "failed" };

export interface SmsSender {
  send(to: string, body: string): Promise<SmsResult>;
}

/** The mock has no phone to reach; consent.ts records the code in the mock outbox instead. */
const mockSender: SmsSender = { send: async () => ({ ok: true }) };
const unconfiguredSender: SmsSender = { send: async () => ({ ok: false, reason: "not_configured" }) };

export function smsSender(): SmsSender {
  return aiMode() === "mock" ? mockSender : unconfiguredSender;
}

export function smsReady(): boolean {
  return aiMode() === "mock";
}

/**
 * A phone number in international form, or null. Numbers starting with 0 are
 * read as Zimbabwean, the launch market. Spaces are ignored.
 */
export function normalisePhone(raw: string): string | null {
  const compact = raw.replace(/[\s()]/g, "");
  if (/^0\d{8,10}$/.test(compact)) return `+263${compact.slice(1)}`;
  if (/^\+\d{9,15}$/.test(compact)) return compact;
  return null;
}
