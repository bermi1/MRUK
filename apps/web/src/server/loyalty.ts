import 'server-only';
import { prisma } from '@bt/db';
import { loyaltyState, loyaltySummary, pointsForOrder, type LoyaltyTier } from '@bt/core';

/**
 * Loyalty points per customer and brand. Rules are DEFAULTS in packages/core/src/marketing.ts
 * (LOYALTY_DEFAULTS) awaiting client confirmation; see docs/marketing.md.
 *
 * Redemption at checkout is NOT implemented (it changes payment maths). Adapter point:
 * `redeemPoints()` below records a "redeem" entry; the checkout would call it and apply the
 * value as a discount. TODO(loyalty-redeem): agree the rules (min balance, max share of the
 * order, Salary Advance orders) before wiring it into server/orders.ts.
 */
type Brand = 'mruk' | 'skywood';

export async function getLoyalty(customerId: string, brand: 'mruk' | 'skywood'): Promise<{ points: number; tier: 'Member' | 'Silver' | 'Gold'; valueTzs: number; nextTier: string | null; pointsToNext: number }> {
  const rows = await prisma.loyaltyLedger.findMany({ where: { customerId, brandKey: brand }, select: { points: true, reason: true, at: true } });
  return loyaltySummary(rows);
}

/** Balances for both brands (admin customer page). */
export async function getLoyaltyAllBrands(customerId: string) {
  const rows = await prisma.loyaltyLedger.findMany({ where: { customerId }, select: { brandKey: true, points: true, reason: true, at: true } });
  const out: Record<Brand, ReturnType<typeof loyaltySummary>> = {
    mruk: loyaltySummary(rows.filter((r) => r.brandKey === 'mruk')),
    skywood: loyaltySummary(rows.filter((r) => r.brandKey === 'skywood')),
  };
  return out;
}

/** Current tier per customer for one brand (audience filters). */
export async function tiersFor(brand: Brand, customerIds: string[]): Promise<Map<string, LoyaltyTier>> {
  const out = new Map<string, LoyaltyTier>();
  if (!customerIds.length) return out;
  const rows = await prisma.loyaltyLedger.findMany({ where: { brandKey: brand, customerId: { in: customerIds } }, select: { customerId: true, points: true, reason: true, at: true } });
  const by = new Map<string, typeof rows>();
  for (const r of rows) (by.get(r.customerId) ?? by.set(r.customerId, []).get(r.customerId)!).push(r);
  for (const [id, list] of by) out.set(id, loyaltySummary(list).tier);
  return out;
}

async function orderCustomerId(o: { customerId: string | null; contactPhone: string }): Promise<string | null> {
  if (o.customerId) return o.customerId;
  const c = await prisma.customer.findUnique({ where: { phone: o.contactPhone }, select: { id: true, deletedAt: true } });
  return c && !c.deletedAt ? c.id : null;
}

function isUnique(e: unknown) {
  return !!e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2002';
}

/** Award points for a delivered order (idempotent: once per order). Guest orders match a customer by phone. */
export async function awardOrderPoints(orderId: string): Promise<number> {
  const o = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, number: true, brandKey: true, total: true, status: true, customerId: true, contactPhone: true } });
  if (!o || o.status !== 'delivered') return 0;
  const points = pointsForOrder(o.total);
  const customerId = await orderCustomerId(o);
  if (!points || !customerId) return 0;
  try {
    await prisma.loyaltyLedger.create({ data: { customerId, brandKey: o.brandKey, points, reason: 'order', orderId: o.id, key: `order:${o.id}:earn`, note: `Order ${o.number} delivered` } });
    return points;
  } catch (e) {
    if (isUnique(e)) return 0;
    throw e;
  }
}

/** Reverse an order's points (cancelled or refunded after they were awarded). Idempotent; no-op when nothing was earned. */
export async function reverseOrderPoints(orderId: string, why: string): Promise<number> {
  const earn = await prisma.loyaltyLedger.findUnique({ where: { key: `order:${orderId}:earn` } });
  if (!earn) return 0;
  try {
    await prisma.loyaltyLedger.create({ data: { customerId: earn.customerId, brandKey: earn.brandKey, points: -earn.points, reason: 'order', orderId, key: `order:${orderId}:reverse`, note: why.slice(0, 200) } });
    return earn.points;
  } catch (e) {
    if (isUnique(e)) return 0;
    throw e;
  }
}

/** Manual staff adjustment (+/-). The caller audits it. Cannot take the balance below zero. */
export async function adjustPoints(customerId: string, brand: Brand, points: number, note: string, actor: string) {
  if (points < 0) {
    const cur = await getLoyalty(customerId, brand);
    if (cur.points + points < 0) throw new Error(`The balance is ${cur.points} points; you can remove at most that`);
  }
  return prisma.loyaltyLedger.create({ data: { customerId, brandKey: brand, points, reason: 'adjust', note: `${note} (by ${actor})`.slice(0, 240) } });
}

/** Adapter point for checkout redemption (not wired in yet, see the TODO above). */
export async function redeemPoints(customerId: string, brand: Brand, points: number, orderId: string) {
  const cur = await getLoyalty(customerId, brand);
  if (points <= 0 || points > cur.points) throw new Error('Not enough points');
  return prisma.loyaltyLedger.create({ data: { customerId, brandKey: brand, points: -points, reason: 'redeem', orderId, key: `order:${orderId}:redeem`, note: 'Redeemed at checkout' } });
}

/** Nightly sweep: write "expire" entries for points older than the expiry period. Returns points expired. */
export async function expirePoints(now = new Date()): Promise<number> {
  const groups = await prisma.loyaltyLedger.groupBy({ by: ['customerId', 'brandKey'], where: { points: { gt: 0 }, at: { lt: new Date(now.getTime() - 300 * 86_400_000) } } });
  let total = 0;
  for (const g of groups) {
    const rows = await prisma.loyaltyLedger.findMany({ where: { customerId: g.customerId, brandKey: g.brandKey }, select: { points: true, reason: true, at: true } });
    const { dueToExpire } = loyaltyState(rows, now);
    if (dueToExpire > 0) {
      await prisma.loyaltyLedger.create({ data: { customerId: g.customerId, brandKey: g.brandKey, points: -dueToExpire, reason: 'expire', note: 'Points older than 12 months', at: now } });
      total += dueToExpire;
    }
  }
  return total;
}
