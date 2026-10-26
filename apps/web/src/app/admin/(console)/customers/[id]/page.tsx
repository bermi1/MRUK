import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@bt/db';
import { fmtDate, fmtDateTime, fmtTZS, formatTzPhone } from '@bt/core';
import { adjustLoyaltyAction } from '@/app/actions/marketing-admin';
import { AForm } from '@/components/admin/AForm';
import { BrandMark, Forbidden, OrderPill, Pill } from '@/components/admin/ui';
import { adminFilters, BRAND_NAME } from '@/server/admin/context';
import { requireStaff } from '@/server/auth';
import { getLoyaltyAllBrands } from '@/server/loyalty';

export const metadata = { title: 'Customer' };

const REASON: Record<string, string> = { order: 'Order', redeem: 'Redeemed', adjust: 'Staff adjustment', expire: 'Expired' };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff();
  if (!ctx.can('customers')) return <Forbidden what="customer records" />;
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) notFound();
  const f = await adminFilters(ctx);
  const c = await prisma.customer.findUnique({ where: { id }, include: { orders: { where: { brandKey: { in: f.allowed } }, orderBy: { createdAt: 'desc' }, take: 20, select: { number: true, brandKey: true, total: true, status: true, createdAt: true } } } });
  if (!c || c.deletedAt) notFound();
  // Brand scope: staff only see customers who bought from (or subscribed to) a brand they manage.
  const subs = await prisma.subscriber.findMany({ where: { brandKey: { in: f.allowed }, OR: [{ customerId: c.id }, { phone: c.phone }, ...(c.email ? [{ email: c.email.toLowerCase() }] : [])] } });
  if (!c.orders.length && !subs.length) notFound();
  const showLoyalty = ctx.can('marketing');
  const [loyalty, ledger] = showLoyalty ? await Promise.all([getLoyaltyAllBrands(c.id), prisma.loyaltyLedger.findMany({ where: { customerId: c.id, brandKey: { in: f.allowed } }, orderBy: { at: 'desc' }, take: 50 })]) : [null, []];
  const brands = f.allowed.filter((b): b is 'mruk' | 'skywood' => b === 'mruk' || b === 'skywood');
  return (
    <div className="ad-stack">
      <section className="ad-card">
        <div className="ad-between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 className="ad-h">{c.name || 'Unnamed customer'}</h2>
            <p className="ad-sub">
              {formatTzPhone(c.phone)}
              {c.email ? ` · ${c.email}` : ''} · customer since {fmtDate(c.createdAt)} · privacy consent {c.consentAt ? fmtDate(c.consentAt) : 'not recorded'}
            </p>
          </div>
          <Link className="ad-btn line" href="/admin/customers">
            All customers
          </Link>
        </div>
      </section>
      {loyalty && (
        <div className="ad-grid2">
          {brands.map((b) => (
            <section key={b} className="ad-card" data-testid={`loyalty-${b}`}>
              <BrandMark brand={b}>Loyalty</BrandMark>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 12 }}>
                {loyalty[b].points.toLocaleString('en-US')} <span style={{ fontSize: 14, fontWeight: 500 }}>points</span>
              </div>
              <p className="ad-muted2" style={{ fontSize: 13 }}>
                <Pill cls={loyalty[b].tier === 'Gold' ? 'pill-amber' : loyalty[b].tier === 'Silver' ? 'pill-blue' : 'pill-grey'}>{loyalty[b].tier}</Pill> · worth {fmtTZS(loyalty[b].valueTzs)}
                {loyalty[b].nextTier ? ` · ${loyalty[b].pointsToNext.toLocaleString('en-US')} to ${loyalty[b].nextTier}` : ''}
              </p>
            </section>
          ))}
        </div>
      )}
      <div className="ad-grid2 wide-left">
        {showLoyalty && (
          <section className="ad-card">
            <h2 className="ad-h">Points ledger</h2>
            <div className="ad-scroll">
              <table className="ad-table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Brand</th>
                    <th>Reason</th>
                    <th className="r">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((l) => (
                    <tr key={l.id}>
                      <td className="ad-muted2">{fmtDateTime(l.at)}</td>
                      <td>{BRAND_NAME[l.brandKey]}</td>
                      <td>
                        {REASON[l.reason] ?? l.reason}
                        {l.note && (
                          <div className="ad-muted" style={{ fontSize: 11.5 }}>
                            {l.note}
                          </div>
                        )}
                      </td>
                      <td className="r" style={{ fontWeight: 600, color: l.points < 0 ? '#B4462E' : '#16825D' }}>
                        {l.points > 0 ? '+' : ''}
                        {l.points.toLocaleString('en-US')}
                      </td>
                    </tr>
                  ))}
                  {!ledger.length && (
                    <tr>
                      <td colSpan={4} className="ad-empty">
                        No points yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {ctx.can('marketing.write') && (
              <details className="ad-more" style={{ marginTop: 10 }}>
                <summary>Adjust points</summary>
                <AForm action={adjustLoyaltyAction.bind(null, c.id)} submit="Record adjustment" className="ad-form three" resetOnOk label="Adjust loyalty points">
                  <label className="ad-field">
                    Brand
                    <select name="brand" defaultValue={brands[0]}>
                      {brands.map((b) => (
                        <option key={b} value={b}>
                          {BRAND_NAME[b]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ad-field">
                    Points (+ or −)
                    <input name="points" required inputMode="numeric" placeholder="e.g. 250 or -100" />
                  </label>
                  <label className="ad-field full">
                    Reason (kept in the audit log)
                    <input name="reason" required maxLength={160} placeholder="e.g. Goodwill for late delivery" />
                  </label>
                </AForm>
              </details>
            )}
          </section>
        )}
        <section className="ad-stack">
          <section className="ad-card">
            <h2 className="ad-h">Orders</h2>
            <table className="ad-table" style={{ marginTop: 8 }}>
              <tbody>
                {c.orders.map((o) => (
                  <tr key={o.number}>
                    <td>
                      <Link className="num" href={`/admin/orders?q=${o.number}`}>
                        {o.number}
                      </Link>
                      <div className="ad-muted" style={{ fontSize: 11.5 }}>
                        {BRAND_NAME[o.brandKey]} · {fmtDate(o.createdAt)}
                      </div>
                    </td>
                    <td>
                      <OrderPill status={o.status} />
                    </td>
                    <td className="r">{fmtTZS(o.total)}</td>
                  </tr>
                ))}
                {!c.orders.length && (
                  <tr>
                    <td className="ad-empty">No orders</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
          <section className="ad-card">
            <h2 className="ad-h">Marketing preferences</h2>
            {subs.map((s) => (
              <p key={s.id} style={{ fontSize: 13, margin: '8px 0' }}>
                <b>{BRAND_NAME[s.brandKey]}</b>: {s.unsubscribedAt ? `unsubscribed ${fmtDate(s.unsubscribedAt)}` : [s.smsOptIn && 'SMS', s.whatsappOptIn && 'WhatsApp', s.emailOptIn && 'email'].filter(Boolean).join(', ') || 'no channels'}
                {s.consentAt && !s.unsubscribedAt ? ` · consent ${fmtDate(s.consentAt)}` : ''}
              </p>
            ))}
            {!subs.length && <p className="ad-muted2" style={{ fontSize: 13 }}>Not subscribed. As a customer they receive campaigns for brands they bought from unless they opt out (default rule).</p>}
          </section>
        </section>
      </div>
    </div>
  );
}
