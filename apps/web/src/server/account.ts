import 'server-only';
import { prisma } from '@bt/db';
import { isActiveOrder, orderStepper, repaymentProgress, type OrderStatus, type PaymentMethod } from '@bt/core';
import type { BrandKey } from '@/lib/types';
import { getProducts } from './catalog';
import { getLoyalty } from './loyalty';
import { customerPrefs } from './marketing';

/**
 * Customer dashboard data. Everything is scoped to the signed-in customer: orders by customer id
 * or the phone they signed in with (guest checkouts), tickets by phone, addresses and points by id.
 * Orders and tickets are this brand's only; the sister brand is reduced to a count.
 */
type Customer = { id: string; phone: string; email: string; name: string; consentAt: Date | null };

const ownOrders = (c: Customer) => ({ OR: [{ customerId: c.id }, { contactPhone: c.phone }] });

export const OPEN_TICKET = ['new', 'open', 'waiting'];

export async function accountData(c: Customer, brand: BrandKey) {
  const other: BrandKey = brand === 'mruk' ? 'skywood' : 'mruk';
  const [orders, sisterOrders, tickets, addresses, loyalty, ledger, products] = await Promise.all([
    prisma.order.findMany({
      where: { brandKey: brand, ...ownOrders(c) },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        items: { select: { productId: true, name: true, model: true, price: true, qty: true } },
        events: { select: { status: true, at: true }, orderBy: { at: 'asc' } },
        advance: { select: { status: true, termMonths: true, monthly: true, total: true, accountLast4: true, createdAt: true, schedule: { orderBy: { n: 'asc' }, select: { n: true, dueDate: true, amount: true, paidAt: true } }, contract: { select: { number: true, signedAt: true } } } },
        invoices: { where: { status: { not: 'void' } }, select: { number: true }, take: 1 },
      },
    }),
    prisma.order.count({ where: { brandKey: other, ...ownOrders(c) } }),
    prisma.ticket.findMany({
      where: { brandKey: brand, phone: c.phone },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { number: true, issue: true, status: true, orderNumber: true, description: true, createdAt: true, updatedAt: true, messages: { where: { internal: false }, orderBy: { at: 'asc' }, select: { author: true, body: true, at: true } } },
    }),
    prisma.address.findMany({ where: { customerId: c.id }, orderBy: [{ isDefault: 'desc' }, { id: 'asc' }] }),
    getLoyalty(c.id, brand),
    prisma.loyaltyLedger.findMany({ where: { customerId: c.id, brandKey: brand }, orderBy: { at: 'desc' }, take: 10, select: { id: true, points: true, reason: true, note: true, at: true } }),
    getProducts(brand),
  ]);
  const prefs = await customerPrefs(brand, c, orders.length > 0);
  const byId = new Map(products.map((p) => [p.id, p]));

  const views = orders.map((o) => {
    const status = o.status as OrderStatus;
    const method = o.paymentMethod as PaymentMethod;
    const adv = o.advance;
    const prog = adv ? repaymentProgress(adv.schedule.map((s) => ({ n: s.n, dueDate: s.dueDate, amount: s.amount, paid: !!s.paidAt }))) : null;
    return {
      number: o.number,
      status,
      method,
      createdAt: o.createdAt,
      total: o.total,
      region: o.region,
      active: isActiveOrder(status),
      steps: orderStepper(status, method, o.events),
      items: o.items.map((i) => {
        const p = byId.get(i.productId);
        return { ...i, img: p?.img ?? '', sub: p?.sub ?? '', available: !!p && p.stock > 0 };
      }),
      invoice: o.invoices[0]?.number ?? null,
      advance: adv && prog
        ? {
            status: adv.status,
            months: adv.termMonths,
            monthly: adv.monthly,
            total: adv.total,
            accountLast4: adv.accountLast4,
            contract: adv.contract?.number ?? null,
            schedule: adv.schedule.map((s) => ({ n: s.n, dueDate: s.dueDate, amount: s.amount, paidAt: s.paidAt })),
            paid: prog.paid,
            remaining: prog.remaining,
            percent: prog.percent,
            nextDue: prog.nextDue ? { dueDate: prog.nextDue.dueDate, amount: prog.nextDue.amount, n: prog.nextDue.n } : null,
          }
        : null,
    };
  });

  return {
    orders: views,
    sisterOrders,
    other,
    tickets: tickets.map((t) => ({ ...t, open: OPEN_TICKET.includes(t.status) })),
    addresses,
    loyalty,
    ledger,
    prefs,
  };
}

export type AccountData = Awaited<ReturnType<typeof accountData>>;
export type OrderCard = AccountData['orders'][number];
