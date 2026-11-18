import { prisma } from '@bt/db';
import { AMBASSADOR_DEFAULTS, ambassadorTotals, fmtTZS, formatTzPhone } from '@bt/core';
import { ambassadorPayoutAction, createAmbassadorAction, toggleAmbassadorAction } from '@/app/actions/admin';
import { ActBtn } from '@/components/admin/ActBtn';
import { AForm } from '@/components/admin/AForm';
import { MarketingTabs } from '@/components/admin/MarketingTabs';
import { BrandChip, Forbidden, Kpi, Pill } from '@/components/admin/ui';
import { adminFilters } from '@/server/admin/context';
import { requireStaff } from '@/server/auth';

export const metadata = { title: 'Ambassadors' };

/**
 * Marketing › Ambassadors: each ambassador has a personal code (a discount code for their customers) and earns a
 * commission on the net sale of every delivered order placed with it. Payouts are recorded here.
 */
export default async function AmbassadorsPage() {
  const ctx = await requireStaff();
  if (!ctx.can('marketing')) return <Forbidden what="marketing" />;
  const f = await adminFilters(ctx);
  const write = ctx.can('marketing.write');
  const list = await prisma.ambassador.findMany({ where: { OR: [{ brandKey: null }, { brandKey: { in: f.brands } }] }, orderBy: [{ active: 'desc' }, { createdAt: 'desc' }], include: { payouts: { orderBy: { paidAt: 'desc' } } } });
  const codes = await prisma.discountCode.findMany({ where: { code: { in: list.map((a) => a.code) } }, select: { code: true, percent: true } });
  const orders = await prisma.order.findMany({ where: { discountCode: { in: list.map((a) => a.code) }, brandKey: { in: f.brands } }, select: { discountCode: true, status: true, subtotal: true, discount: true } });
  const rows = list.map((a) => ({
    a,
    discount: codes.find((c) => c.code === a.code)?.percent ?? 0,
    t: ambassadorTotals(
      orders.filter((o) => o.discountCode === a.code),
      a.commissionPercent,
      a.payouts.reduce((s, p) => s + p.amount, 0),
    ),
  }));
  const sum = (k: 'sales' | 'owed' | 'orders') => rows.reduce((s, r) => s + r.t[k], 0);

  return (
    <div className="ad-stack">
      <MarketingTabs current="ambassadors" canWrite={write} />
      <div className="ad-kpis">
        <Kpi label="Active ambassadors" value={rows.filter((r) => r.a.active).length} />
        <Kpi label="Orders with an ambassador code" value={sum('orders')} />
        <Kpi label="Delivered sales (net)" value={fmtTZS(sum('sales'))} />
        <Kpi label="Commission owed" value={fmtTZS(sum('owed'))} color={sum('owed') ? '#B4462E' : '#16825D'} />
      </div>

      <section className="ad-card">
        <h2 className="ad-h">Ambassadors</h2>
        <p className="ad-sub">The customer types the code at checkout for the discount. Commission is earned when the order is delivered, on the sale after discount, delivery excluded.</p>
        <div className="ad-scroll">
          <table className="ad-table" style={{ marginTop: 10 }} data-testid="ambassadors">
            <thead>
              <tr>
                <th>Ambassador</th>
                <th>Code</th>
                <th className="r">Orders</th>
                <th className="r">Delivered sales</th>
                <th className="r">Earned</th>
                <th className="r">In progress</th>
                <th className="r">Owed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ a, discount, t }) => (
                <tr key={a.id} style={a.active ? undefined : { opacity: 0.6 }} data-testid="ambassador">
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    <div className="ad-muted" style={{ fontSize: 11.5 }}>
                      {formatTzPhone(a.phone)} · {a.brandKey ? <BrandChip brand={a.brandKey} /> : 'Both brands'}
                    </div>
                  </td>
                  <td>
                    <span className="mono" style={{ fontWeight: 600 }}>
                      {a.code}
                    </span>
                    <div className="ad-muted" style={{ fontSize: 11.5 }}>
                      {discount}% off · {a.commissionPercent}% commission {a.active ? '' : '· paused'}
                    </div>
                  </td>
                  <td className="r">{t.orders}</td>
                  <td className="r">{fmtTZS(t.sales)}</td>
                  <td className="r">{fmtTZS(t.earned)}</td>
                  <td className="r ad-muted2">{fmtTZS(t.pending)}</td>
                  <td className="r" style={{ fontWeight: 600 }}>
                    {t.owed ? fmtTZS(t.owed) : <Pill cls="pill-green">Paid up</Pill>}
                  </td>
                  <td>
                    {write && (
                      <details className="ad-more">
                        <summary>Manage</summary>
                        <div className="ad-stack s8" style={{ width: 'min(300px, 70vw)' }}>
                          {t.owed > 0 && (
                            <AForm action={ambassadorPayoutAction.bind(null, a.id)} submit="Record payout" className="ad-stack s8" label={`Payout for ${a.name}`} resetOnOk>
                              <label className="ad-field">
                                Amount paid (TZS)
                                <input name="amount" type="number" min={1} max={t.owed} defaultValue={t.owed} required />
                              </label>
                              <label className="ad-field">
                                Note (optional)
                                <input name="note" maxLength={120} placeholder="e.g. Bank transfer ref" />
                              </label>
                            </AForm>
                          )}
                          <ActBtn action={toggleAmbassadorAction.bind(null, a.id)} className="ad-btn line sm" showOk>
                            {a.active ? 'Pause code' : 'Resume code'}
                          </ActBtn>
                          {a.payouts.length > 0 && (
                            <small className="ad-muted2">
                              Paid so far {fmtTZS(t.paid)} in {a.payouts.length} payout{a.payouts.length === 1 ? '' : 's'}
                            </small>
                          )}
                        </div>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="ad-empty">
                    No ambassadors yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {write && (
        <section className="ad-card">
          <h2 className="ad-h">Add an ambassador</h2>
          <AForm action={createAmbassadorAction} submit="Add ambassador" className="ad-form" resetOnOk label="Add an ambassador">
            <label className="ad-field">
              Full name
              <input name="name" required maxLength={80} />
            </label>
            <label className="ad-field">
              Phone
              <input name="phone" required maxLength={20} placeholder="+255 7XX XXX XXX" />
            </label>
            <label className="ad-field">
              Brand
              <select name="brand" defaultValue="both">
                <option value="both">Both brands</option>
                <option value="mruk">Mr UK</option>
                <option value="skywood">Skywood</option>
              </select>
            </label>
            <label className="ad-field">
              Personal code (optional)
              <input name="code" maxLength={20} placeholder="Made from the name, e.g. NEEMA10" />
            </label>
            <label className="ad-field">
              Customer discount (%)
              <input name="discount" type="number" min={0} max={30} defaultValue={AMBASSADOR_DEFAULTS.discountPercent} />
            </label>
            <label className="ad-field">
              Commission (%)
              <input name="commission" type="number" min={0} max={20} defaultValue={AMBASSADOR_DEFAULTS.commissionPercent} />
            </label>
          </AForm>
        </section>
      )}
    </div>
  );
}
