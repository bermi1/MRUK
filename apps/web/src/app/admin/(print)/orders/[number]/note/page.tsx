import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@bt/db';
import { fmtDateTime, fmtTZS, formatTzPhone, ORDER_STATUS_LABEL, paymentLabel, type OrderStatus } from '@bt/core';
import { PrintButton } from '@/components/admin/PrintButton';
import { Forbidden } from '@/components/admin/ui';
import { requireStaff } from '@/server/auth';

export const metadata = { title: 'Picking and delivery note' };
export const dynamic = 'force-dynamic';

/** Printable picking list + delivery note for one order (A4 or phone screen). Staff with Orders access, own brands only. */
export default async function OrderNote({ params }: { params: Promise<{ number: string }> }) {
  const ctx = await requireStaff();
  if (!ctx.can('orders')) return <Forbidden what="orders" />;
  const { number } = await params;
  if (!/^[A-Z]{2}-\d{3,8}$/.test(number)) notFound();
  const o = await prisma.order.findUnique({ where: { number }, include: { items: true, brand: true, payments: { orderBy: { createdAt: 'desc' }, take: 1 } } });
  if (!o || !ctx.canBrand(o.brandKey)) notFound();
  const paid = o.payments[0]?.status === 'captured';
  const units = o.items.reduce((a, i) => a + i.qty, 0);
  return (
    <main className="ad-note">
      <div className="no-print ad-row" style={{ justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap' }}>
        <Link className="ad-btn line sm" href={`/admin/orders?o=${o.number}`}>
          ← Back to order
        </Link>
        <PrintButton>Print note</PrintButton>
      </div>
      <header className="ad-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <img src={`/brand/${o.brandKey}.png`} alt={o.brand.name} style={{ height: 38 }} />
          <div style={{ fontSize: 12, marginTop: 6 }}>{o.brand.legal}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Picking and delivery note</h1>
          <div className="mono" style={{ fontSize: 16, fontWeight: 700 }} data-testid="note-number">
            {o.number}
          </div>
          <div style={{ fontSize: 12 }}>Ordered {fmtDateTime(o.createdAt)} · {ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status}</div>
        </div>
      </header>
      <section className="ad-grid2" style={{ marginTop: 18, gap: 12 }}>
        <div className="ad-box">
          <div className="ad-cap" style={{ marginTop: 0 }}>DELIVER TO</div>
          <div style={{ fontWeight: 600 }}>{o.contactName}</div>
          <div>{formatTzPhone(o.contactPhone)}</div>
          <div>{o.addressLine || '—'}</div>
          <div>{o.region}</div>
        </div>
        <div className="ad-box">
          <div className="ad-cap" style={{ marginTop: 0 }}>PAYMENT</div>
          <div>{paymentLabel(o.paymentMethod)}</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{paid ? `Paid · ${fmtTZS(o.total)}` : o.paymentMethod === 'pay_on_delivery' ? `Collect on delivery: ${fmtTZS(o.total)}` : `Not paid yet · ${fmtTZS(o.total)}`}</div>
          <div style={{ fontSize: 12 }}>Branch: {o.branch}</div>
        </div>
      </section>
      <table className="ad-table" style={{ marginTop: 18 }}>
        <thead>
          <tr>
            <th style={{ width: 60 }}>Picked</th>
            <th>Model / SKU</th>
            <th>Item</th>
            <th className="c">Qty</th>
          </tr>
        </thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.id}>
              <td>
                <span className="ad-tick" aria-hidden="true" />
              </td>
              <td className="mono">{i.model}</td>
              <td>{i.name}</td>
              <td className="c" style={{ fontWeight: 700, fontSize: 15 }}>
                {i.qty}
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} className="r" style={{ fontWeight: 600 }}>
              Total units
            </td>
            <td className="c" style={{ fontWeight: 700 }}>
              {units}
            </td>
          </tr>
        </tbody>
      </table>
      <section className="ad-sign">
        {['Picked and packed by', 'Delivered by', 'Received in good condition by (customer)'].map((l) => (
          <div key={l}>
            <span>{l}</span>
            <i />
            <small>Name · signature · date</small>
          </div>
        ))}
      </section>
      <p style={{ fontSize: 11.5, marginTop: 18 }}>
        Check the goods with the customer before they sign. Questions: {o.brand.supportEmail}
      </p>
    </main>
  );
}
