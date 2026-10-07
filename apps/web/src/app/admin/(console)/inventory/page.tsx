import Link from 'next/link';
import { prisma } from '@bt/db';
import { fmtTZS } from '@bt/core';
import { restockAction } from '@/app/actions/admin';
import { AForm } from '@/components/admin/AForm';
import { Forbidden, Kpi, Pill, Thumb } from '@/components/admin/ui';
import { adminFilters, BRAND_NAME } from '@/server/admin/context';
import { requireStaff } from '@/server/auth';

export const metadata = { title: 'Inventory' };

function level(stock: number) {
  if (stock <= 3) return { label: 'Reorder', cls: 'pill-red' };
  if (stock <= 6) return { label: 'Low', cls: 'pill-amber' };
  return { label: 'Healthy', cls: 'pill-green' };
}

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff();
  if (!ctx.can('inventory')) return <Forbidden what="inventory" />;
  const sp = await searchParams;
  const f = await adminFilters(ctx);
  const show = sp.show === 'low' ? 'low' : 'all';
  const all = await prisma.product.findMany({ where: { brandKey: { in: f.brands } }, orderBy: [{ stock: 'asc' }, { name: 'asc' }], select: { id: true, brandKey: true, model: true, name: true, price: true, stock: true, images: true, hidden: true } });
  const rows = show === 'low' ? all.filter((p) => p.stock <= 6) : all;
  const units = all.reduce((a, p) => a + p.stock, 0);
  const value = all.reduce((a, p) => a + p.stock * p.price, 0);
  const need = all.filter((p) => p.stock <= 6).length;

  return (
    <div className="ad-stack">
      <div className="ad-grid4">
        <Kpi label="Total SKUs" value={all.length} />
        <Kpi label="Units on hand" value={units.toLocaleString('en-US')} />
        <Kpi label="Stock value (retail)" value={`TZS ${(value / 1e6).toFixed(1)}M`} />
        <Kpi label="Low or reorder" value={<span style={{ color: '#B4462E' }}>{need}</span>} delta="Low ≤ 6 · Reorder ≤ 3" color="#8A8EA3" />
      </div>
      <section className="ad-card">
        <div className="ad-between">
          <div>
            <h2 className="ad-h">Stock by SKU</h2>
            <p className="ad-sub">Stock is reserved when an order is placed and returned on cancel or timeout. Per-branch stock is not tracked yet.</p>
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
                <th className="c">On hand</th>
                <th className="r">Value</th>
                <th>Status</th>
                <th>Quick restock</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const l = level(p.stock);
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="ad-row">
                        <Thumb src={p.images[0]} model={p.model} />
                        <div>
                          <div style={{ fontWeight: 500 }}>{p.name}</div>
                          <div className="ad-muted" style={{ fontSize: 11.5 }}>
                            {BRAND_NAME[p.brandKey]}
                            {p.hidden ? ' · hidden' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="mono ad-muted2" style={{ fontSize: 11.5 }}>
                      {p.model}
                    </td>
                    <td className="r">{fmtTZS(p.price)}</td>
                    <td className="c" style={{ fontWeight: 600 }}>
                      {p.stock}
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
                  <td colSpan={7} className="ad-empty">
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
