import Link from 'next/link';
import { prisma } from '@bt/db';
import { fmtTZS } from '@bt/core';
import { restockAction } from '@/app/actions/admin';
import { AForm } from '@/components/admin/AForm';
import { BrandChip, Forbidden, Kpi, Pill, Thumb } from '@/components/admin/ui';
import { adminFilters, LOW_STOCK, REORDER_STOCK } from '@/server/admin/context';
import { requireStaff } from '@/server/auth';
import { releaseExpiredReservations } from '@/server/orders';

/** Order statuses that hold stock for a sale that is not complete yet. */
const RESERVING_STATUSES = ['placed', 'bank_review'];

export const metadata = { title: 'Inventory' };

function level(stock: number) {
  if (stock <= REORDER_STOCK) return { label: 'Reorder', cls: 'pill-red' };
  if (stock <= LOW_STOCK) return { label: 'Low', cls: 'pill-amber' };
  return { label: 'Healthy', cls: 'pill-green' };
}

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff();
  if (!ctx.can('inventory')) return <Forbidden what="inventory" />;
  const sp = await searchParams;
  const f = await adminFilters(ctx);
  const show = sp.show === 'low' ? 'low' : 'all';
  // Unpaid orders past their 30-minute hold give their stock back before we count.
  await releaseExpiredReservations();
  // Drafts (hidden, no price yet) are priced and stocked in Products › Drafts, not here.
  const all = await prisma.product.findMany({ where: { brandKey: { in: f.brands }, NOT: { hidden: true, price: { lte: 0 } } }, orderBy: [{ stock: 'asc' }, { name: 'asc' }], select: { id: true, brandKey: true, model: true, name: true, price: true, stock: true, images: true, hidden: true } });
  // Product.stock is what can still be sold. Units held for unpaid orders (awaiting payment, or a
  // Salary Advance waiting for the bank) were already taken off it and come back if the order is not completed.
  const held = await prisma.orderItem.groupBy({ by: ['productId'], where: { productId: { in: all.map((p) => p.id) }, order: { status: { in: RESERVING_STATUSES } } }, _sum: { qty: true } });
  const reservedOf = new Map(held.map((h) => [h.productId, h._sum.qty ?? 0]));
  const reservedUnits = held.reduce((a, h) => a + (h._sum.qty ?? 0), 0);
  const rows = show === 'low' ? all.filter((p) => p.stock <= LOW_STOCK) : all;
  const units = all.reduce((a, p) => a + p.stock, 0);
  const value = all.reduce((a, p) => a + p.stock * p.price, 0);
  const need = all.filter((p) => p.stock <= LOW_STOCK).length;

  return (
    <div className="ad-stack">
      <div className="ad-grid4">
        <Kpi label="Total SKUs" value={all.length} />
        <Kpi label="Units available" value={units.toLocaleString('en-US')} delta={`${reservedUnits.toLocaleString('en-US')} reserved for unpaid orders`} color="#8A8EA3" />
        <Kpi label="Stock value (retail)" value={`TZS ${(value / 1e6).toFixed(1)}M`} />
        <Kpi label="Low or reorder" value={<span style={{ color: '#B4462E' }}>{need}</span>} delta={`Low ≤ ${LOW_STOCK} · Reorder ≤ ${REORDER_STOCK}`} color="#8A8EA3" />
      </div>
      <section className="ad-card">
        <div className="ad-between">
          <div>
            <h2 className="ad-h">Stock by SKU</h2>
            <p className="ad-sub">Available = can still be sold. Reserved = held for unpaid orders (awaiting payment, or Pay Later waiting for Azania Bank); it returns to available if the order is cancelled or not paid in 30 minutes. Quick restock adds to available. Per-branch stock is not tracked yet.</p>
          </div>
          <nav className="ad-tabs" aria-label="Stock filter">
            <Link className="ad-tab" href="/admin/inventory" aria-current={show === 'all' ? 'true' : undefined}>
              All <span>{all.length}</span>
            </Link>
            <Link className="ad-tab" href="/admin/inventory?show=low" aria-current={show === 'low' ? 'true' : undefined}>
              Needs attention <span>{need}</span>
            </Link>
          </nav>
        </div>
        <div className="ad-scroll">
          <table className="ad-table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th className="r">Price</th>
                <th className="c">Available</th>
                <th className="c">Reserved</th>
                <th className="r">Value</th>
                <th>Status</th>
                <th>Quick restock</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const l = level(p.stock);
                return (
                  <tr key={p.id} data-product={p.id}>
                    <td>
                      <div className="ad-row">
                        <Thumb src={p.images[0]} model={p.model} />
                        <div>
                          <div style={{ fontWeight: 500 }}>{p.name}</div>
                          <div className="ad-muted" style={{ fontSize: 11.5 }}>
                            <BrandChip brand={p.brandKey} />
                            {p.hidden ? ' · hidden' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="mono ad-muted2" style={{ fontSize: 11.5 }}>
                      {p.model}
                    </td>
                    <td className="r">{fmtTZS(p.price)}</td>
                    <td className="c" style={{ fontWeight: 600 }} data-testid="stock-available">
                      {p.stock}
                    </td>
                    <td className="c ad-muted2" data-testid="stock-reserved">
                      {reservedOf.get(p.id) ?? 0}
                    </td>
                    <td className="r ad-muted2">{fmtTZS(p.stock * p.price)}</td>
                    <td>
                      <Pill cls={l.cls}>{l.label}</Pill>
                    </td>
                    <td>
                      <AForm action={restockAction.bind(null, p.id)} submit="Add" submitClass="ad-btn sm" className="ad-row">
                        <input className="ad-inline" name="qty" inputMode="numeric" defaultValue="10" aria-label={`Units to add for ${p.name}`} style={{ width: 64 }} />
                      </AForm>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="ad-empty">
                    All stock is healthy
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
