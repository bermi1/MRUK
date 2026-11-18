/**
 * Ambassadors: people who promote Mr UK / Skywood with a personal code.
 * The code is an ordinary discount code (one per order, cannot be combined with another code):
 * the customer gets the code's discount, the ambassador earns a commission on the net sale
 * (subtotal after the discount, delivery excluded) once the order is delivered.
 * DEFAULTS (not in the client brief, Marketing can change them per ambassador):
 * 5 % off for the customer, 3 % commission, no expiry, unlimited orders.
 */
export const AMBASSADOR_DEFAULTS = { discountPercent: 5, commissionPercent: 3 } as const;

/** Statuses that earn commission (the sale is done) and those still in progress (may yet be cancelled). */
export const COMMISSION_EARNED = ['delivered'] as const;
export const COMMISSION_PENDING = ['placed', 'confirmed', 'approved', 'packed', 'out_for_delivery'] as const;

/** First name in capitals + 2 digits, e.g. NEEMA10. Letters only from the name; at most 10 letters. */
export function suggestAmbassadorCode(name: string, n: number): string {
  const first = (name.trim().split(/\s+/)[0] ?? '').normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 10) || 'AMB';
  return `${first}${String(Math.abs(Math.trunc(n)) % 100).padStart(2, '0')}`;
}

/** Codes are 4–20 letters and digits, stored in capitals. */
export function normaliseCode(code: string): string | null {
  const c = code.trim().toUpperCase();
  return /^[A-Z0-9]{4,20}$/.test(c) ? c : null;
}

export function commissionFor(order: { subtotal: number; discount: number }, commissionPercent: number): number {
  const net = Math.max(0, order.subtotal - order.discount);
  return Math.round((net * commissionPercent) / 100);
}

export interface AmbassadorTotals {
  orders: number;
  sales: number;
  earned: number;
  pending: number;
  paid: number;
  owed: number;
}

/** Sales and commission from the ambassador's orders and the payouts already made. Cancelled orders earn nothing. */
export function ambassadorTotals(orders: { status: string; subtotal: number; discount: number }[], commissionPercent: number, paidOut: number): AmbassadorTotals {
  let sales = 0;
  let earned = 0;
  let pending = 0;
  let count = 0;
  for (const o of orders) {
    const c = commissionFor(o, commissionPercent);
    if ((COMMISSION_EARNED as readonly string[]).includes(o.status)) {
      earned += c;
      sales += Math.max(0, o.subtotal - o.discount);
      count++;
    } else if ((COMMISSION_PENDING as readonly string[]).includes(o.status)) {
      pending += c;
      count++;
    }
  }
  return { orders: count, sales, earned, pending, paid: paidOut, owed: Math.max(0, earned - paidOut) };
}
