import { deliveryFee } from './delivery';

export interface PricedLine {
  price: number;
  qty: number;
}

export interface DiscountRule {
  code: string;
  percent: number;
  active: boolean;
  brand?: string | null;
  expiresAt?: Date | null;
  minSubtotal?: number | null;
  maxUses?: number | null;
  uses?: number;
}

export type DiscountCheck = { ok: true; amount: number } | { ok: false; reason: string };

export function checkDiscount(rule: DiscountRule | null | undefined, subtotal: number, brand: string, now: Date = new Date()): DiscountCheck {
  if (!rule) return { ok: false, reason: 'Code not found' };
  if (!rule.active) return { ok: false, reason: 'Code is not active' };
  if (rule.brand && rule.brand !== brand) return { ok: false, reason: 'Code is not valid for this brand' };
  if (rule.expiresAt && rule.expiresAt.getTime() < now.getTime()) return { ok: false, reason: 'Code has expired' };
  if (rule.minSubtotal && subtotal < rule.minSubtotal) return { ok: false, reason: `Spend at least TZS ${rule.minSubtotal.toLocaleString('en-US')} to use this code` };
  if (rule.maxUses != null && (rule.uses ?? 0) >= rule.maxUses) return { ok: false, reason: 'Code has been fully used' };
  const pct = Math.max(0, Math.min(90, rule.percent));
  return { ok: true, amount: Math.round((subtotal * pct) / 100) };
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
  count: number;
}

export function priceCart(lines: PricedLine[], region: string, discount = 0): CartTotals {
  const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const d = Math.min(discount, subtotal);
  const delivery = lines.length ? deliveryFee(region, subtotal - d) : 0;
  return { subtotal, discount: d, delivery, total: subtotal - d + delivery, count };
}

/** Bundle price: sum of item prices less the bundle saving percentage. */
export function bundlePrice(prices: number[], savePercent: number): { was: number; now: number; saving: number } {
  const was = prices.reduce((a, p) => a + p, 0);
  const now = Math.round(was * (1 - savePercent / 100));
  return { was, now, saving: was - now };
}

export function salePrice(price: number, offPercent: number): number {
  return Math.round(price * (1 - offPercent / 100));
}
