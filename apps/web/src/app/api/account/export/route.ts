import { NextResponse } from 'next/server';
import { prisma } from '@bt/db';
import { currentCustomer } from '@/server/session';

/** PDPA 2022 data export: everything we hold about the signed-in customer (sensitive bank fields stay masked). */
export async function GET() {
  const c = await currentCustomer();
  if (!c) return new NextResponse('Sign in first', { status: 401 });
  const orders = await prisma.order.findMany({
    where: { OR: [{ customerId: c.id }, { contactPhone: c.phone }] },
    include: { items: true, events: true, payments: { select: { method: true, amount: true, status: true, createdAt: true } }, advance: { select: { termMonths: true, monthly: true, total: true, status: true, employer: true, nidaLast4: true, accountLast4: true, createdAt: true } } },
  });
  const tickets = await prisma.ticket.findMany({ where: { phone: c.phone }, include: { messages: { where: { internal: false } } } });
  const body = { exportedAt: new Date().toISOString(), customer: { phone: c.phone, name: c.name, email: c.email, locale: c.locale, consentAt: c.consentAt, createdAt: c.createdAt }, orders, tickets };
  return new NextResponse(JSON.stringify(body, null, 2), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="my-data.json"', 'Cache-Control': 'no-store' } });
}
