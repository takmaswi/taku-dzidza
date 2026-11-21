/**
 * Payment providers (Step 9). One provider for now, "demo": no real money
 * moves, and the buyer decides on the checkout page whether the payment
 * succeeds or fails. The first real provider will be Paynow (DECISIONS.md,
 * Notes marketplace); it will start a payment, then confirm it through
 * Paynow's result callback, so `settle` will become the callback's handler.
 */

export const PAY_METHODS = ["ecocash", "onemoney", "innbucks", "card"] as const;
export type PayMethod = (typeof PAY_METHODS)[number];

export type Settled = { ok: true; reference: string } | { ok: false; reason: string };

export interface PaymentProvider {
  readonly name: string;
  readonly methods: readonly PayMethod[];
  /** Whether the payment went through. The demo asks the buyer; a real provider asks the provider. */
  settle(args: { checkoutId: string; amountCents: number; method: PayMethod; succeed: boolean }): Settled;
}

export const demoProvider: PaymentProvider = {
  name: "demo",
  methods: PAY_METHODS,
  settle: ({ checkoutId, succeed }) => (succeed ? { ok: true, reference: `DEMO-${checkoutId.slice(-8).toUpperCase()}` } : { ok: false, reason: "The demo payment did not go through. No money was taken." }),
};

/** The provider checkouts use. Only the demo exists. */
export function paymentProvider(): PaymentProvider {
  return demoProvider;
}

export function isPayMethod(m: string): m is PayMethod {
  return (PAY_METHODS as readonly string[]).includes(m);
}
