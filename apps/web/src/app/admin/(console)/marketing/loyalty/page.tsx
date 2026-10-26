import Link from 'next/link';
import { prisma } from '@bt/db';
import { fmtTZS, formatTzPhone, LOYALTY_DEFAULTS, loyaltySummary } from '@bt/core';
import { MarketingTabs } from '@/components/admin/MarketingTabs';
import { BrandChip, Forbidden, Pill } from '@/components/admin/ui';
import { adminFilters } from '@/server/admin/context';
import { requireStaff } from '@/server/auth';

export const metadata = { title: 'Loyalty' };

const TIER_PILL: Record<string, string> = { Member: 'pill-grey', Silver: 'pill-blue', Gold: 'pill-amber' };

export default async function LoyaltyPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const ctx = await requireStaff();
  if (!ctx.can('marketing')) return <Forbidden what="marketing" />;
  const f = await adminFilters(ctx);
  const q = ((await searchParams).q ?? '').trim().slice(0, 60);
  const digits = q.replace(/\D/g, '').replace(/^0/, '');
  const top = await prisma.loyaltyLedger.groupBy({
    by: ['customerId', 'brandKey'],
    where: { brandKey: { in: f.brands }, ...(q ? { customer: { OR: [{ name: { contains: q, mode: 'insensitive' } }, ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : [])] } } : {}) },
    _sum: { points: true },
    orderBy: { _sum: { points: 'desc' } },
    take: 50,
  });
  const [entries, customers] = await Promise.all([
    prisma.loyaltyLedger.findMany({ where: { customerId: { in: top.map((t) => t.customerId) }, brandKey: { in: f.brands } }, select: { customerId: true, brandKey: true, points: true, reason: true, at: true } }),
    prisma.customer.findMany({ where: { id: { in: top.map((t) => t.customerId) } }, select: { id: true, name: true, phone: true, deletedAt: true } }),
  ]);
  const byId = new Map(customers.map((c) => [c.id, c]));
  const rows = top
    .map((t) => ({ t, c: byId.get(t.customerId), s: loyaltySummary(entries.filter((e) => e.customerId === t.customerId && e.brandKey === t.brandKey)) }))
    .filter((r) => r.c && !r.c.deletedAt)
    .sort((a, b) => b.s.points - a.s.points);
  return (
    <div className="ad-stack">
      <MarketingTabs current="loyalty" canWrite={ctx.can('marketing.write')} />
      <div className="ad-alert warn" role="note" style={{ fontSize: 13 }}>
        Default rules awaiting client confirmation: {LOYALTY_DEFAULTS.tzsPerPoint.toLocaleString('en-US')} TZS = 1 point on delivered orders · 1 point = TZS {LOYALTY_DEFAULTS.pointValueTzs} · Silver from {LOYALTY_DEFAULTS.tiers[1].min.toLocaleString('en-US')}, Gold from {LOYALTY_DEFAULTS.tiers[2].min.toLocaleString('en-US')} points · points expire after {LOYALTY_DEFAULTS.expiryMonths} months. Redemption at checkout is not switched on yet.
      </div>
      <section className="ad-card">
        <div className="ad-between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 className="ad-h">Loyalty members</h2>
            <p className="ad-sub">Top balances per brand · open a customer to see the ledger or adjust points</p>
          </div>
          <form action="/admin/marketing/loyalty" role="search" className="ad-row">
            <input className="ad-input" name="q" defaultValue={q} placeholder="Name or phone" aria-label="Search loyalty members" style={{ width: 220 }} />
            <button className="ad-btn line" type="submit">
              Search
            </button>
          </form>
        </div>
        <div className="ad-scroll">
          <table className="ad-table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Tier</th>
                <th className="r">Points</th>
                <th className="r">Value</th>
                <th>Next tier</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ t, c, s }) => (
                <tr key={`${t.customerId}-${t.brandKey}`}>
                  <td>
                    <Link href={`/admin/customers/${c!.id}`} style={{ fontWeight: 500, color: '#12152B', textDecoration: 'none' }}>
                      {c!.name || 'Unnamed'}
                    </Link>{' '}
                    <BrandChip brand={t.brandKey} />
                  </td>
                  <td className="ad-muted2">{formatTzPhone(c!.phone)}</td>
                  <td>
                    <Pill cls={TIER_PILL[s.tier] ?? 'pill-grey'}>{s.tier}</Pill>
                  </td>
                  <td className="r" style={{ fontWeight: 600 }}>
                    {s.points.toLocaleString('en-US')}
                  </td>
                  <td className="r">{fmtTZS(s.valueTzs)}</td>
                  <td className="ad-muted2">{s.nextTier ? `${s.pointsToNext.toLocaleString('en-US')} to ${s.nextTier}` : 'Top tier'}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="ad-empty">
                    No loyalty points yet. Points are earned when orders are delivered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
