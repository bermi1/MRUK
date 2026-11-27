import 'server-only';
import { notFound } from 'next/navigation';
import { prisma } from '@bt/db';
import { customerStatusLabel, deliveryEta, maskTzPhone, normaliseOrderNumber, orderStepper, paymentLabel, repaymentProgress, trackingStepKeys, trackingSteps, type OrderStatus, type PaymentMethod } from '@bt/core';
import { limit } from './ratelimit';
import { currentCustomer, verifySigned } from './session';

export async function loadOrder(number: string) {
  return prisma.order.findUnique({
    where: { number: normaliseOrderNumber(number) },
    include: { items: true, events: { orderBy: { at: 'asc' } }, advance: { include: { schedule: { orderBy: { n: 'asc' } }, contract: true } }, invoices: { where: { status: { not: 'void' } } } },
  });
}

export type FullOrder = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

/** Full order details: allowed with the signed confirmation token or as the signed-in owner. */
export async function orderForOwner(brand: string, number: string, token: string | null | undefined): Promise<FullOrder> {
  const o = await loadOrder(number);
  if (!o || o.brandKey !== brand) notFound();
  if (verifySigned(`order:${o.number}`, token)) return o;
  const c = await currentCustomer();
  if (c && (o.customerId === c.id || o.contactPhone === c.phone)) return o;
  notFound();
}

export interface TrackAccess {
  /** Last 4 digits of the order's contact phone, typed by the visitor. */
  phoneLast4?: string;
  /** Signed order token (confirmation links). */
  token?: string;
}

/**
 * Tracking view. Order numbers are sequential, so the number alone is not enough: the visitor also needs
 * the last 4 digits of the order's phone, the signed order token, or to be the signed-in owner.
 * Returns null both when the order does not exist and when the check fails (no hint which part was wrong).
 */
export async function trackView(number: string, access: TrackAccess) {
  const digits = (access.phoneLast4 ?? '').replace(/\D/g, '');
  // Guessing the 4 digits for one order: limited per order number (and per IP via the 3x IP bucket).
  if (digits) await limit('track-pin', 10, 600, normaliseOrderNumber(number));
  const o = await loadOrder(number);
  if (!o) return null;
  let by: 'token' | 'owner' | 'phone' | null = null;
  if (access.token && verifySigned(`order:${o.number}`, access.token)) by = 'token';
  else if (digits.length === 4 && o.contactPhone.replace(/\D/g, '').endsWith(digits)) by = 'phone';
  else {
    const c = await currentCustomer();
    if (c && (o.customerId === c.id || o.contactPhone === c.phone)) by = 'owner';
  }
  if (!by) return null;
  const method = o.paymentMethod as PaymentMethod;
  const status = o.status as OrderStatus;
  const keys = trackingStepKeys(method);
  const dated = orderStepper(status, method, o.events);
  const closed = status === 'cancelled' || status === 'rejected';
  return {
    number: o.number,
    brand: o.brandKey,
    by,
    status: customerStatusLabel(status, method),
    statusKey: status,
    method,
    pay: paymentLabel(method),
    total: o.total,
    region: o.region,
    phone: maskTzPhone(o.contactPhone),
    invoice: o.invoices[0]?.number ?? null,
    // The status line already says "Delivered"; an estimate is only shown once the order is on its way.
    closed,
    eta: status === 'out_for_delivery' ? deliveryEta(o.region) : null,
    items: o.items.map((i) => ({ name: i.name, qty: i.qty, line: i.price * i.qty })),
    steps: trackingSteps(status, method).map((s, i) => ({ ...s, key: keys[i]!, at: dated?.[i]?.at ?? null })),
  };
}

export function advanceSummary(o: FullOrder) {
  if (!o.advance) return null;
  const prog = repaymentProgress(o.advance.schedule.map((s) => ({ n: s.n, dueDate: s.dueDate, amount: s.amount, paid: !!s.paidAt })));
  return { ...prog, status: o.advance.status, months: o.advance.termMonths, monthly: o.advance.monthly, contract: o.advance.contract?.number ?? null, accountLast4: o.advance.accountLast4, firstDue: o.advance.schedule[0]?.dueDate ?? null };
}
