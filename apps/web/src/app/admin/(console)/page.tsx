import Link from 'next/link';
import { prisma } from '@bt/db';
import { fmtTZS, PAYMENT_METHOD_INFO, paymentLabel, type PaymentMethod } from '@bt/core';
import { Forbidden, Kpi, Meter, OrderPill } from '@/components/admin/ui';
import { adminFilters, durationLabel, isoDayEAT, monthName, orderWhere, REVENUE_STATUSES, startOfDayEAT, startOfMonthEAT } from '@/server/admin/context';
import { requireStaff } from '@/server/auth';
import { releaseExpiredReservations } from '@/server/orders';

export const metadata = { title: 'Dashboard' };

const CHANNEL: Record<string, string> = { web: 'Web', app: 'App', azania: 'Azania app' };
const MIX_COLOR: Record<string, string> = { salary_advance: '#0098DA', azania_account: '#12164A', card: '#A7A9AC', pay_on_delivery: '#D5D7E0' };
const millions = (n: number) => `${(n / 1e6).toFixed(1)}M`;

function delta(now: number, before: number, label: string) {
  if (!before) return { text: now ? `New vs ${label}` : `No change vs ${label}`, up: true };
  const pct = ((now - before) / before) * 100;
  return { text: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs ${label}`, up: pct >= 0 };
}

export default async function Dashboard() {
  const ctx = await requireStaff();
  if (!ctx.can('dashboard')) return <Forbidden what="the dashboard" />;
  await releaseExpiredReservations();
  const f = await adminFilters(ctx);
  const ow = orderWhere(f);
  const now = new Date();
  const today = startOfDayEAT(now);
  const yesterday = new Date(today.getTime() - 86_400_000);
  const month = startOfMonthEAT(now);
  const lastMonth = startOfMonthEAT(now, -1);
  const days14 = new Date(today.getTime() - 13 * 86_400_000);
  const rev = { ...ow, status: { in: REVENUE_STATUSES } };

  const [ordersToday, ordersYesterday, revMonth, revLast, awaiting, decided, lowStock, reorder, recent, bars, mix, regions] = await Promise.all([
    prisma.order.count({ where: { ...ow, createdAt: { gte: today } } }),
    prisma.order.count({ where: { ...ow, createdAt: { gte: yesterday, lt: today } } }),
    prisma.order.aggregate({ where: { ...rev, createdAt: { gte: month } }, _sum: { total: true } }),
    prisma.order.aggregate({ where: { ...rev, createdAt: { gte: lastMonth, lt: month } }, _sum: { total: true } }),
    prisma.salaryAdvanceApplication.findMany({ where: { status: 'submitted', order: ow }, select: { createdAt: true } }),
    prisma.salaryAdvanceApplication.findMany({ where: { decidedAt: { gte: new Date(now.getTime() - 30 * 86_400_000) }, order: ow }, select: { createdAt: true, decidedAt: true } }),
    prisma.product.count({ where: { brandKey: { in: f.brands }, hidden: false, stock: { lte: 5 } } }),
    prisma.product.count({ where: { brandKey: { in: f.brands }, hidden: false, stock: { lte: 3 } } }),
    ctx.can('orders') ? prisma.order.findMany({ where: ow, orderBy: { createdAt: 'desc' }, take: 6 }) : Promise.resolve([]),
    prisma.order.findMany({ where: { ...rev, createdAt: { gte: days14 } }, select: { total: true, paymentMethod: true, createdAt: true } }),
    prisma.order.groupBy({ by: ['paymentMethod'], where: { ...ow, createdAt: { gte: month }, status: { notIn: ['cancelled'] } }, _count: { _all: true } }),
    prisma.order.groupBy({ by: ['region'], where: { ...rev, createdAt: { gte: month } }, _sum: { total: true }, orderBy: { _sum: { total: 'desc' } }, take: 6 }),
  ]);

  const dToday = delta(ordersToday, ordersYesterday, 'yesterday');
  const revNow = revMonth._sum.total ?? 0;
  const dRev = delta(revNow, revLast._sum.total ?? 0, monthName(lastMonth));
  const avgDecision = decided.length ? decided.reduce((a, d) => a + (d.decidedAt!.getTime() - d.createdAt.getTime()), 0) / decided.length : 0;
  const oldest = awaiting.length ? Math.max(...awaiting.map((a) => now.getTime() - a.createdAt.getTime())) : 0;

  // 14-day stacked bars
  const dayKeys = Array.from({ length: 14 }, (_, i) => isoDayEAT(new Date(days14.getTime() + i * 86_400_000)));
  const buckets = new Map(dayKeys.map((k) => [k, { pf: 0, sa: 0 }]));
  for (const o of bars) {
    const b = buckets.get(isoDayEAT(o.createdAt));
    if (!b) continue;
    if (o.paymentMethod === 'salary_advance') b.sa += o.total;
    else b.pf += o.total;
  }
  const maxDay = Math.max(1, ...[...buckets.values()].map((b) => b.pf + b.sa));
  const mixTotal = mix.reduce((a, m) => a + m._count._all, 0) || 1;
  const mixRows = (Object.keys(PAYMENT_METHOD_INFO) as PaymentMethod[]).map((k) => ({ k, pct: Math.round(((mix.find((m) => m.paymentMethod === k)?._count._all ?? 0) / mixTotal) * 100) }));
  const regionMax = Math.max(1, ...regions.map((r) => r._sum.total ?? 0));

  return (
    <div className="ad-stack">
      <div className="ad-grid4">
        <Kpi label="Orders today" value={ordersToday.toLocaleString('en-US')} delta={dToday.text} color={dToday.up ? '#16825D' : '#B4462E'} />
        <Kpi label={`Revenue, ${monthName(now)}`} value={`TZS ${millions(revNow)}`} delta={dRev.text} color={dRev.up ? '#16825D' : '#B4462E'} />
        <Kpi label="Awaiting Azania Bank" value={awaiting.length} delta={avgDecision ? `Avg. approval ${durationLabel(avgDecision)}` : oldest ? `Oldest waiting ${durationLabel(oldest)}` : 'Queue is clear'} color="#0070A8" />
        <Kpi label="Low-stock SKUs" value={lowStock} delta={reorder ? `${reorder} need reorder today` : 'Stock healthy'} color={reorder ? '#B4462E' : '#16825D'} />
      </div>

      <div className="ad-split">
        <section className="ad-card">
          <div className="ad-between" style={{ alignItems: 'baseline' }}>
            <div>
              <h2 className="ad-h">Revenue, last 14 days</h2>
              <p className="ad-sub">TZS millions · confirmed orders, all channels</p>
            </div>
            <div className="ad-legend">
              <span>
                <i style={{ background: '#12164A' }} />
                Paid in full
              </span>
              <span>
                <i style={{ background: '#0098DA' }} />
                Salary Advance
              </span>
            </div>
          </div>
          <div className="ad-bars" role="img" aria-label="Daily revenue for the last 14 days, split by paid in full and Salary Advance">
            {dayKeys.map((k) => {
              const b = buckets.get(k)!;
              return (
                <div className="b" key={k} title={`${k}: paid in full ${fmtTZS(b.pf)}, Salary Advance ${fmtTZS(b.sa)}`}>
                  <div className="sa" style={{ height: `${(b.sa / maxDay) * 100}%` }} />
                  <div className="pf" style={{ height: `${(b.pf / maxDay) * 100}%` }} />
                </div>
              );
            })}
          </div>
          <div className="ad-barx" aria-hidden="true">
            {dayKeys.map((k) => (
              <span key={k}>{Number(k.slice(8))}</span>
            ))}
          </div>
        </section>
        <section className="ad-card ad-stack s12">
          <h2 className="ad-h">Payment mix</h2>
          <p className="ad-sub" style={{ marginTop: -8 }}>
            Share of orders, {monthName(now)}
          </p>
          {mixRows.map((m) => (
            <div key={m.k}>
              <div className="ad-between" style={{ fontSize: 13 }}>
                <span>{paymentLabel(m.k)}</span>
                <b>{m.pct}%</b>
              </div>
              <Meter pct={m.pct} color={MIX_COLOR[m.k]} />
            </div>
          ))}
        </section>
      </div>

      <div className="ad-split">
        <section className="ad-card">
          <div className="ad-between">
            <h2 className="ad-h">Recent orders</h2>
            {ctx.can('orders') && (
              <Link href="/admin/orders" style={{ fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                View all
              </Link>
            )}
          </div>
          <div className="ad-scroll">
            <table className="ad-table" style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Channel</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th className="r">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link className="num" href={`/admin/orders?o=${o.number}`} style={{ textDecoration: 'none' }}>
                        {o.number}
                      </Link>
                    </td>
                    <td>{o.contactName}</td>
                    <td className="ad-muted2">{CHANNEL[o.channel] ?? o.channel}</td>
                    <td className="ad-muted2">{paymentLabel(o.paymentMethod as PaymentMethod)}</td>
                    <td>
                      <OrderPill status={o.status} />
                    </td>
                    <td className="r" style={{ fontWeight: 500 }}>
                      {fmtTZS(o.total)}
                    </td>
                  </tr>
                ))}
                {!recent.length && (
                  <tr>
                    <td colSpan={6} className="ad-empty">
                      No orders yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="ad-card">
          <h2 className="ad-h">Sales by region</h2>
          <p className="ad-sub">{monthName(now)} · TZS</p>
          <div style={{ marginTop: 6 }}>
            {regions.map((r) => (
              <div className="ad-hbar" key={r.region}>
                <span>{r.region}</span>
                <Meter pct={((r._sum.total ?? 0) / regionMax) * 100} />
                <b>{millions(r._sum.total ?? 0)}</b>
              </div>
            ))}
            {!regions.length && <div className="ad-empty">No confirmed sales this month yet</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
