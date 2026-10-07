import { prisma } from '@bt/db';
import { updateCategoryAction } from '@/app/actions/admin';
import { AForm } from '@/components/admin/AForm';
import { Forbidden, Pill } from '@/components/admin/ui';
import { adminFilters } from '@/server/admin/context';
import { requireStaff } from '@/server/auth';

export const metadata = { title: 'Brands and categories' };

export default async function CatalogPage() {
  const ctx = await requireStaff();
  if (!ctx.can('catalog')) return <Forbidden what="brands and categories" />;
  const f = await adminFilters(ctx);
  const brands = await prisma.brand.findMany({
    where: { key: { in: f.brands } },
    orderBy: { key: 'asc' },
    include: { categories: { orderBy: { sort: 'asc' }, include: { _count: { select: { products: true } } } }, _count: { select: { products: true } } },
  });
  const write = ctx.can('products.write');
  return (
    <div className="ad-grid2">
      {brands.map((b) => {
        const t = b.tokens as Record<string, string>;
        return (
          <section key={b.key} className="ad-card ad-stack s12" aria-label={b.name}>
            <div className="ad-between">
              <div className="ad-row" style={{ gap: 12 }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: t.primary, color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{b.key === 'mruk' ? 'UK' : 'SW'}</span>
                <div>
                  <h2 className="ad-h" style={{ fontSize: 16 }}>
                    {b.name}
                  </h2>
                  <p className="ad-sub">
                    {b.domain} · {b._count.products} products
                  </p>
                </div>
              </div>
              <div className="ad-row" style={{ gap: 6 }} aria-label="Brand colours">
                {[t.primary, t.hi, t.accent].map((c, i) => (
                  <span key={i} title={c} style={{ width: 22, height: 22, borderRadius: 6, background: c, border: '1px solid #ECEDF2' }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, fontSize: 12.5 }}>
              {[
                ['Card corners', `${t.r} / ${t.rs}`],
                ['Heading weight', t.head],
                ['Tracking', t.track],
                ['Status', 'Live'],
              ].map(([l, v]) => (
                <div key={l} className="ad-box" style={{ padding: 10 }}>
                  <div className="ad-muted">{l}</div>
                  <div style={{ fontWeight: 600, marginTop: 2, color: l === 'Status' ? '#16825D' : undefined }}>{v}</div>
                </div>
              ))}
            </div>
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Sub-categories</th>
                  <th className="c">Products</th>
                  <th>Menu</th>
                </tr>
              </thead>
              <tbody>
                {b.categories.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500, verticalAlign: 'top' }}>
                      {c.name}
                      <div className="ad-muted" style={{ fontSize: 11.5, fontWeight: 400 }}>
                        Short: {c.short}
                      </div>
                    </td>
                    <td className="ad-muted2" style={{ fontSize: 12 }}>
                      {c.subs.join(', ')}
                      {write && (
                        <details className="ad-more">
                          <summary>Edit</summary>
                          <AForm action={updateCategoryAction.bind(null, c.id)} className="ad-form" label={`Edit ${c.name}`}>
                            <label className="ad-field">
                              Name
                              <input name="name" defaultValue={c.name} required maxLength={60} />
                            </label>
                            <label className="ad-field">
                              Short name (menu)
                              <input name="short" defaultValue={c.short} required maxLength={30} />
                            </label>
                            <label className="ad-field full">
                              Sub-categories (comma separated)
                              <input name="subs" defaultValue={c.subs.join(', ')} required maxLength={600} />
                            </label>
                          </AForm>
                        </details>
                      )}
                    </td>
                    <td className="c" style={{ verticalAlign: 'top' }}>
                      {c._count.products}
                    </td>
                    <td style={{ verticalAlign: 'top' }}>
                      <Pill cls="pill-green">Shown</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
