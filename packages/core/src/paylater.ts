/**
 * Per-brand "Pay Later by Azania Bank" switch (internal: Salary Advance).
 *
 * Stored in Setting `payLater.<brand>` as { enabled, updatedBy, at }. The commercial agreement with
 * Azania Bank is still being negotiated, so a brand with no stored value is OFF (PAY_LATER_DEFAULT).
 * The demo seed also writes OFF; e2e tests that exercise Pay Later switch it on first.
 */
import type { PaymentMethod } from './payments';
import { PAYMENT_METHODS } from './payments';

export const PAY_LATER_DEFAULT = false;
export const PAY_LATER_BRANDS = ['mruk', 'skywood'] as const;
export type PayLaterBrand = (typeof PAY_LATER_BRANDS)[number];

export interface PayLaterState {
  enabled: boolean;
  updatedBy: string;
  /** ISO time of the last change, empty when never set. */
  at: string;
}

export const payLaterKey = (brand: PayLaterBrand) => `payLater.${brand}`;

export const PAY_LATER_KEYS = PAY_LATER_BRANDS.map(payLaterKey);

/** Read a stored Setting value defensively: anything other than an explicit `enabled: true` is OFF. */
export function parsePayLater(value: unknown): PayLaterState {
  const o = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    enabled: typeof o.enabled === 'boolean' ? o.enabled : PAY_LATER_DEFAULT,
    updatedBy: typeof o.updatedBy === 'string' ? o.updatedBy.slice(0, 160) : '',
    at: typeof o.at === 'string' && !Number.isNaN(Date.parse(o.at)) ? o.at : '',
  };
}

/** Both brands' states from Setting rows (missing rows fall back to the default). */
export function payLaterStates(rows: { key: string; value: unknown }[]): Record<PayLaterBrand, PayLaterState> {
  const by = new Map(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(PAY_LATER_BRANDS.map((b) => [b, parsePayLater(by.get(payLaterKey(b)))])) as Record<PayLaterBrand, PayLaterState>;
}

export function payLaterValue(enabled: boolean, updatedBy: string, at = new Date()): PayLaterState {
  return { enabled, updatedBy: updatedBy.slice(0, 160), at: at.toISOString() };
}

/** Payment methods a customer may choose; Salary Advance only while Pay Later is on. */
export function checkoutMethods(payLater: boolean): PaymentMethod[] {
  return PAYMENT_METHODS.filter((m) => payLater || m !== 'salary_advance');
}

/** The Azania mini app sells only on Pay Later: it is open while either brand has it on. */
export function miniAppOpen(states: Record<PayLaterBrand, Pick<PayLaterState, 'enabled'>>): boolean {
  return PAY_LATER_BRANDS.some((b) => states[b].enabled);
}

export const PAY_LATER_OFF_MESSAGE = 'Pay Later is not available at the moment. You can still pay in full.';
