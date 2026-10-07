import Link from 'next/link';
import { prisma, type Prisma } from '@bt/db';
import { ADVANCE_STATUS_LABEL, fmtTZS, formatTzPhone, type AdvanceStatus } from '@bt/core';
import { Forbidden } from '@/components/admin/ui';
import { initials } from '@/lib/format';
import { adminFilters, orderWhere, REVENUE_STATUSES } from '@/server/admin/context';
import { requireStaff } from '@/server/auth';

export const metadata = { title: 'Customers' };

const CHANNEL: Record<string, string> = { web: 'Web', app: 'App', azania: 'Azania app' };
const ACTIVE_ADV = ['submitted', 'approved', 'disbursed', 'repaying'];

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff();
  if (!ctx.can('customers')) return <Forbidden what="customer records" />;
  const sp = await searchParams;
  const f = await adminFilters(ctx);
  const ow = orderWhere(f);
  const q = (sp.q ?? '').trim().slice(0, 60);
  const digits = q.replace(/\D/g, '');
  const where: Prisma.CustomerWhereInput = {
    deletedAt: null,
    orders: { some: ow },
    ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, ...(digits.length >= 3 ? [{ phone: { contains: digits.replace(/^0/, '') } }] : []), { email: { contains: q, mode: 'insensitive' } }] } : {}),
  };
  const customers = await prisma.customer.findMany({
    where,
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: {
      addresses: { where: { isDefault: true }, take: 1 },
      orders: { where: ow, orderBy: { createdAt: 'desc' }, select: { total: true, status: true, channel: true, region: true, advance: { select: { status: true, termMonths: true } } } },
    },
  });
  const rows = customers
    .map((c) => {
      const ltv = c.orders.filter((o) => REVENUE_STATUSES.includes(o.status)).reduce((a, o) => a + o.total, 0);
      const advs = c.orders.map((o) => o.advance).filter((a): a is NonNullable<typeof a> => !!a);
      const active = advs.find((a) => ACTIVE_ADV.includes(a.status));
      const adv = active
        ? { text: `${ADVANCE_STATUS_LABEL[active.status as AdvanceStatus]} · ${active.termMonths} mo`, color: active.status === 'submitted' ? '#8A5A00' : '#0070A8' }
        : advs.some((a) => a.status === 'closed')
          ? { text: 'Completed', color: '#16825D' }
          : { text: 'None', color: '#8A8EA3' };
      return { c, ltv, adv, region: c.addresses[0]?.region ?? c.orders[0]?.region ?? '—', channel: CHANNEL[c.orders[0]?.channel ?? ''] ?? '—' };
    })
    .sort((a, b) => b.ltv - a.ltv);

  return (
    <section className="ad-card">
      <div className="ad-between">
        <div>
          <h2 className="ad-h">Customers</h2>
          <p className="ad-sub">Records linked to orders, payments and warranties{f.brand !== 'all' ? ` · ${f.brand === 'mruk' ? 'Mr UK' : 'Skywood'} buyers` : ''}</p>
        </div>
        <form action="/admin/customers" role="search" className="ad-row">
          <input className="ad-input" name="q" defaultValue={q} placeholder="Name, phone or email" aria-label="Search customers" style={{ width: 240 }} />
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
              <th>Region</th>
              <th>Channel</th>
              <th className="c">Orders</th>
              <th>Salary Advance</th>
              <th className="r">Lifetime value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, ltv, adv, region, channel }) => (
              <tr key={c.id}>
                <td>
                  <div className="ad-row">
                    <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#E8EAF4', color: '#12164A', fontSize: 11.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{initials(c.name || '?')}</span>
                    <Link href={`/admin/orders?q=${encodeURIComponent(c.phone.slice(4))}`} style={{ fontWeight: 500, color: '#12152B', textDecoration: 'none' }}>
                      {c.name || 'Unnamed'}
                    </Link>
                  </div>
                </td>
                <td className="ad-muted2">{formatTzPhone(c.phone)}</td>
                <td>{region}</td>
                <td className="ad-muted2">{channel}</td>
                <td className="c">{c.orders.length}</td>
                <td style={{ color: adv.color, fontWeight: 500 }}>{adv.text}</td>
                <td className="r" style={{ fontWeight: 600 }}>
                  {fmtTZS(ltv)}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={7} className="ad-empty">
                  No customers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
