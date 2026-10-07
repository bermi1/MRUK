import 'server-only';
import { notFound } from 'next/navigation';
import { prisma } from '@bt/db';
import { ORDER_STATUS_LABEL, deliveryEta, maskTzPhone, normaliseOrderNumber, paymentLabel, repaymentProgress, trackingSteps, type OrderStatus, type PaymentMethod } from '@bt/core';
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

/** Public tracking view (order number only): status, items and masked contact, nothing sensitive. */
export async function trackView(number: string) {
  const o = await loadOrder(number);
  if (!o) return null;
  const method = o.paymentMethod as PaymentMethod;
  const status = o.status as OrderStatus;
  return {
    number: o.number,
    brand: o.brandKey,
    status: ORDER_STATUS_LABEL[status],
    statusKey: status,
    pay: paymentLabel(method),
    total: o.total,
    region: o.region,
    phone: maskTzPhone(o.contactPhone),
    eta: status === 'delivered' ? 'Delivered' : status === 'cancelled' || status === 'rejected' ? 'This order was closed' : `Estimated delivery: ${deliveryEta(o.region)}`,
    items: o.items.map((i) => ({ name: i.name, qty: i.qty, line: i.price * i.qty })),
    steps: trackingSteps(status, method),
  };
}

export function advanceSummary(o: FullOrder) {
  if (!o.advance) return null;
  const prog = repaymentProgress(o.advance.schedule.map((s) => ({ n: s.n, dueDate: s.dueDate, amount: s.amount, paid: !!s.paidAt })));
  return { ...prog, status: o.advance.status, months: o.advance.termMonths, monthly: o.advance.monthly, contract: o.advance.contract?.number ?? null, accountLast4: o.advance.accountLast4, firstDue: o.advance.schedule[0]?.dueDate ?? null };
}
