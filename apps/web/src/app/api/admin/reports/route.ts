import { prisma } from '@bt/db';
import { paymentLabel, type PaymentMethod } from '@bt/core';
import { adminFilters, isoDayEAT, orderWhere, parseDayEAT, REVENUE_STATUSES, startOfMonthEAT, staffForRoute } from '@/server/admin/context';
import { audit } from '@/server/audit';

export const dynamic = 'force-dynamic';

function cell(v: string | number): string {
  const s = String(v);
  // Neutralise spreadsheet formulas (CSV injection) and quote when needed.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Excel-compatible CSV (UTF-8 BOM) of confirmed orders in the range. No customer names or phones (PII minimisation). */
export async function GET(req: Request) {
  const ctx = await staffForRoute();
  if (!ctx) return new Response('Sign in required', { status: 401 });
  if (!ctx.can('reports')) return new Response('Forbidden', { status: 403 });
  const url = new URL(req.url);
  if ((url.searchParams.get('format') ?? 'csv') !== 'csv') return new Response('Unsupported format', { status: 400 });
  const from = parseDayEAT(url.searchParams.get('from')) ?? startOfMonthEAT();
  const toIncl = parseDayEAT(url.searchParams.get('to'));
  let to = toIncl ? new Date(toIncl.getTime() + 86_400_000) : new Date();
  if (to <= from) to = new Date(from.getTime() + 86_400_000);
  if (to.getTime() - from.getTime() > 400 * 86_400_000) return new Response('Range too long (max 400 days)', { status: 400 });
  const f = await adminFilters(ctx);
  const orders = await prisma.order.findMany({
    where: { ...orderWhere(f), status: { in: REVENUE_STATUSES }, createdAt: { gte: from, lt: to } },
    orderBy: { createdAt: 'asc' },
    include: { items: { select: { qty: true } } },
    take: 50_000,
  });
  const head = ['Order', 'Date', 'Brand', 'Region', 'Branch', 'Channel', 'Payment', 'Months', 'Status', 'Items', 'Subtotal (TZS)', 'Discount (TZS)', 'Delivery (TZS)', 'Total (TZS)', 'Net of VAT (TZS)', 'VAT 18% (TZS)'];
  const lines = [head.join(',')];
  for (const o of orders) {
    const net = Math.round(o.total / 1.18);
    lines.push(
      [o.number, isoDayEAT(o.createdAt), o.brandKey === 'mruk' ? 'Mr UK' : 'Skywood', o.region, o.branch, o.channel, paymentLabel(o.paymentMethod as PaymentMethod), o.months ?? '', o.status, o.items.reduce((a, i) => a + i.qty, 0), o.subtotal, o.discount, o.deliveryFee, o.total, net, o.total - net]
        .map(cell)
        .join(','),
    );
  }
  await audit(ctx.email, 'report.export', 'Report', `${isoDayEAT(from)}..${isoDayEAT(new Date(to.getTime() - 1))}`, { rows: orders.length, brands: f.brands });
  const name = `sales-${isoDayEAT(from)}-to-${isoDayEAT(new Date(to.getTime() - 1))}.csv`;
  return new Response(`﻿${lines.join('\r\n')}\r\n`, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' },
  });
}
