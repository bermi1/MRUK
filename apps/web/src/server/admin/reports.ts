import 'server-only';
import { prisma } from '@bt/db';
import { orderWhere, REVENUE_STATUSES, type AdminFilters } from './context';

export interface ReportData {
  from: Date;
  to: Date; // exclusive
  revenue: number;
  orders: number;
  aov: number;
  saShare: number;
  prev: { revenue: number; orders: number; aov: number; saShare: number };
  byBrand: { key: string; revenue: number }[];
  byCategory: { name: string; revenue: number }[];
  byRegion: { name: string; revenue: number; orders: number }[];
  top: { name: string; brand: string; units: number; revenue: number }[];
}

async function totals(f: AdminFilters, from: Date, to: Date) {
  const rows = await prisma.order.groupBy({ by: ['paymentMethod'], where: { ...orderWhere(f), status: { in: REVENUE_STATUSES }, createdAt: { gte: from, lt: to } }, _sum: { total: true }, _count: { _all: true } });
  const revenue = rows.reduce((a, r) => a + (r._sum.total ?? 0), 0);
  const orders = rows.reduce((a, r) => a + r._count._all, 0);
  const sa = rows.find((r) => r.paymentMethod === 'salary_advance')?._sum.total ?? 0;
  return { revenue, orders, aov: orders ? Math.round(revenue / orders) : 0, saShare: revenue ? Math.round((sa / revenue) * 100) : 0 };
}

/** Confirmed sales (approved → delivered) in [from, to), scoped to the staff member's brands and header filters. */
export async function reportData(f: AdminFilters, from: Date, to: Date): Promise<ReportData> {
  const span = to.getTime() - from.getTime();
  const where = { ...orderWhere(f), status: { in: REVENUE_STATUSES }, createdAt: { gte: from, lt: to } };
  const [cur, prev, brands, regions, items] = await Promise.all([
    totals(f, from, to),
    totals(f, new Date(from.getTime() - span), from),
    prisma.order.groupBy({ by: ['brandKey'], where, _sum: { total: true } }),
    prisma.order.groupBy({ by: ['region'], where, _sum: { total: true }, _count: { _all: true }, orderBy: { _sum: { total: 'desc' } } }),
    prisma.orderItem.findMany({ where: { order: where }, select: { productId: true, name: true, price: true, qty: true, order: { select: { brandKey: true } }, product: { select: { category: { select: { name: true } } } } } }),
  ]);
  const cats = new Map<string, number>();
  const prods = new Map<string, { name: string; brand: string; units: number; revenue: number }>();
  for (const it of items) {
    const v = it.price * it.qty;
    const c = it.product.category.name;
    cats.set(c, (cats.get(c) ?? 0) + v);
    const p = prods.get(it.productId) ?? { name: it.name, brand: it.order.brandKey, units: 0, revenue: 0 };
    p.units += it.qty;
    p.revenue += v;
    prods.set(it.productId, p);
  }
  return {
    from,
    to,
    ...cur,
    prev,
    byBrand: brands.map((b) => ({ key: b.brandKey, revenue: b._sum.total ?? 0 })).sort((a, b) => b.revenue - a.revenue),
    byCategory: [...cats].map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue),
    byRegion: regions.map((r) => ({ name: r.region, revenue: r._sum.total ?? 0, orders: r._count._all })),
    top: [...prods.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
  };
}
