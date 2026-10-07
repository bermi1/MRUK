import Link from 'next/link';
import { prisma } from '@bt/db';
import { toggleProductHiddenAction, updateProductFieldAction, uploadProductPhotoAction } from '@/app/actions/admin';
import { ActBtn } from '@/components/admin/ActBtn';
import { InlineNumber } from '@/components/admin/InlineNumber';
import { NewProductForm } from '@/components/admin/NewProductForm';
import { PhotoUpload } from '@/components/admin/PhotoUpload';
import { Forbidden, Thumb } from '@/components/admin/ui';
import { adminFilters, BRAND_NAME, pickBrand } from '@/server/admin/context';
import { requireStaff } from '@/server/auth';

export const metadata = { title: 'Products and photos' };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff();
  if (!ctx.can('products')) return <Forbidden what="products" />;
  const sp = await searchParams;
  const f = await adminFilters(ctx);
  const brand = pickBrand(ctx, f, sp.b);
  if (!brand) return <Forbidden what="any brand catalogue" />;
  const cat = sp.cat && /^[a-z0-9-]{1,40}$/.test(sp.cat) ? sp.cat : '';
  const q = (sp.q ?? '').trim().slice(0, 60);
  const [cats, products] = await Promise.all([
    prisma.category.findMany({ where: { brandKey: brand }, orderBy: { sort: 'asc' } }),
    prisma.product.findMany({
      where: { brandKey: brand, ...(cat ? { category: { slug: cat } } : {}), ...(q ? { OR: [{ model: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] } : {}) },
      include: { category: { select: { name: true } } },
      orderBy: [{ category: { sort: 'asc' } }, { createdAt: 'asc' }],
    }),
  ]);
  const write = ctx.can('products.write');

  return (
    <div className="ad-detail" style={write ? undefined : { gridTemplateColumns: '1fr' }}>
      <section className="ad-card">
        <div className="ad-between">
          <div>
            <h2 className="ad-h">Catalogue</h2>
            <p className="ad-sub">Changes publish instantly to the live store · {products.length} products</p>
          </div>
          <div className="ad-seg" role="group" aria-label="Catalogue brand">
            {f.allowed.map((b) => (
              <Link key={b} href={`/admin/products?b=${b}`} aria-current={b === brand ? 'true' : undefined}>
                {BRAND_NAME[b]}
              </Link>
            ))}
          </div>
        </div>
        <form action="/admin/products" className="ad-row" style={{ marginTop: 12, flexWrap: 'wrap' }} role="search">
          <input type="hidden" name="b" value={brand} />
          <label className="ad-field" style={{ flexDirection: 'row', alignItems: 'center' }}>
            <span className="sr-only">Category</span>
            <select name="cat" defaultValue={cat} className="ad-input" style={{ width: 200 }}>
              <option value="">All categories</option>
              {cats.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <input className="ad-input" name="q" defaultValue={q} placeholder="Model or name" aria-label="Search products" style={{ width: 200 }} />
          <button className="ad-btn line" type="submit">
            Filter
          </button>
          {(cat || q) && (
            <Link className="ad-btn line" href={`/admin/products?b=${brand}`}>
              Clear
            </Link>
          )}
        </form>
        <div className="ad-scroll">
          <table className="ad-table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Photo</th>
                <th>Model</th>
                <th>Product</th>
                <th>Price (TZS)</th>
                <th className="c">Stock</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} data-product={p.id}>
                  <td>
                    <Thumb src={p.images[0]} model={p.model} dark={!p.images[0]} />
                  </td>
                  <td className="mono ad-muted2" style={{ fontSize: 11.5 }}>
                    {p.model}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                    <div className="ad-muted" style={{ fontSize: 11.5 }}>
                      {p.category.name} · {p.sub}
                    </div>
                  </td>
                  <td>{write ? <InlineNumber value={p.price} action={updateProductFieldAction.bind(null, p.id, 'price')} label={`Price of ${p.name}`} /> : p.price.toLocaleString('en-US')}</td>
                  <td className="c">{write ? <InlineNumber value={p.stock} action={updateProductFieldAction.bind(null, p.id, 'stock')} label={`Stock of ${p.name}`} width={70} /> : p.stock}</td>
                  <td>
                    {write ? (
                      <ActBtn action={toggleProductHiddenAction.bind(null, p.id)} className={`ad-pill ${p.hidden ? 'pill-grey' : 'pill-green'}`} label={`${p.hidden ? 'Hidden' : 'Live'}: toggle visibility of ${p.name}`}>
                        {p.hidden ? 'Hidden' : 'Live'}
                      </ActBtn>
                    ) : (
                      <span className={`ad-pill ${p.hidden ? 'pill-grey' : 'pill-green'}`}>{p.hidden ? 'Hidden' : 'Live'}</span>
                    )}
                  </td>
                  <td className="r">{write && <PhotoUpload action={uploadProductPhotoAction.bind(null, p.id)} name={p.name} />}</td>
                </tr>
              ))}
              {!products.length && (
                <tr>
                  <td colSpan={7} className="ad-empty">
                    No products {q || cat ? 'match this filter' : 'yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!write && <p className="ad-muted2" style={{ fontSize: 12.5 }}>Read-only: your role cannot edit products.</p>}
        {write && <p className="ad-muted" style={{ fontSize: 12 }}>Edit price or stock and press Enter (or leave the field) to publish. Photos: JPG, PNG or WebP up to 5 MB.</p>}
      </section>
      {write && (
        <aside className="ad-card ad-stack s12">
          <h2 className="ad-h">Add a product · {BRAND_NAME[brand]}</h2>
          <NewProductForm brand={brand} brandName={BRAND_NAME[brand]!} cats={cats.map((c) => ({ slug: c.slug, name: c.name, subs: c.subs }))} />
        </aside>
      )}
    </div>
  );
}
