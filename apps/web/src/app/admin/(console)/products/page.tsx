import Link from 'next/link';
import { prisma } from '@bt/db';
import { publishProductAction, toggleProductHiddenAction, updateProductFieldAction, uploadProductPhotoAction } from '@/app/actions/admin';
import { ActBtn } from '@/components/admin/ActBtn';
import { InlineNumber } from '@/components/admin/InlineNumber';
import { PhotoUpload } from '@/components/admin/PhotoUpload';
import { BrandMark, Forbidden, Thumb } from '@/components/admin/ui';
import { adminFilters, BRAND_NAME, DRAFT_WHERE, pickBrand } from '@/server/admin/context';
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
  // Drafts view: every hidden product, the ones still without a price first (drafts from the client's
  // photo/spec pack are created hidden with price 0). A row stays here after its price is set, so staff
  // can press Publish next to it.
  const drafts = sp.f === 'drafts';
  const [cats, rows, draftCount] = await Promise.all([
    prisma.category.findMany({ where: { brandKey: brand }, orderBy: { sort: 'asc' } }),
    prisma.product.findMany({
      where: { brandKey: brand, ...(drafts ? { hidden: true } : {}), ...(cat ? { category: { slug: cat } } : {}), ...(q ? { OR: [{ model: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] } : {}) },
      include: { category: { select: { name: true } } },
      orderBy: [{ category: { sort: 'asc' } }, { createdAt: 'asc' }],
    }),
    prisma.product.count({ where: { brandKey: brand, ...DRAFT_WHERE } }),
  ]);
  const products = drafts ? [...rows].sort((a, b) => Number(a.price > 0) - Number(b.price > 0)) : rows;
  const write = ctx.can('products.write');
  const base = `/admin/products?b=${brand}`;

  return (
    <div className="ad-stack">
      <section className="ad-card">
        <div className="ad-between">
          <BrandMark brand={brand}>
            {BRAND_NAME[brand]} catalogue · {products.length} {drafts ? 'hidden products' : 'products'} · changes publish instantly
          </BrandMark>
          <div className="ad-row" style={{ flexWrap: 'wrap' }}>
            {f.allowed.length > 1 && (
              <div className="ad-seg" role="group" aria-label="Catalogue brand">
                {f.allowed.map((b) => (
                  <Link key={b} href={`/admin/products?b=${b}${drafts ? '&f=drafts' : ''}`} aria-current={b === brand ? 'true' : undefined}>
                    {BRAND_NAME[b]}
                  </Link>
                ))}
              </div>
            )}
            <div className="ad-seg" role="group" aria-label="Show">
              <Link href={base} aria-current={!drafts ? 'true' : undefined}>
                All products
              </Link>
              <Link href={`${base}&f=drafts`} aria-current={drafts ? 'true' : undefined} data-testid="drafts-filter">
                Drafts — needs price{draftCount ? ` (${draftCount})` : ''}
              </Link>
            </div>
            <a className="ad-btn line sm" href={`/${brand}`} target="_blank" rel="noopener">
              View live store
            </a>
            {write && (
              <Link className="ad-btn sm" href={`/admin/products/new?b=${brand}`}>
                + Add product
              </Link>
            )}
          </div>
        </div>
        <form action="/admin/products" className="ad-row" style={{ marginTop: 12, flexWrap: 'wrap' }} role="search">
          <input type="hidden" name="b" value={brand} />
          {drafts && <input type="hidden" name="f" value="drafts" />}
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
            <Link className="ad-btn line" href={drafts ? `${base}&f=drafts` : base}>
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
                <th className="c" title="Units that can still be sold (unpaid orders already hold theirs)">Available</th>
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
                    {p.hidden && p.price <= 0 ? (
                      <span className="ad-row" style={{ flexWrap: 'wrap', gap: 4 }} data-testid="draft-pill">
                        {write ? (
                          // Publishing is refused on the server until a price is set; the button explains why.
                          <ActBtn action={publishProductAction.bind(null, p.id)} className="ad-pill pill-amber" label={`Draft, needs price: publish ${p.name}`}>
                            Draft · needs price
                          </ActBtn>
                        ) : (
                          <span className="ad-pill pill-amber">Draft · needs price</span>
                        )}
                      </span>
                    ) : drafts && p.hidden ? (
                      write ? (
                        <ActBtn action={publishProductAction.bind(null, p.id)} className="ad-btn sm" label={`Publish ${p.name}`}>
                          Publish
                        </ActBtn>
                      ) : (
                        <span className="ad-pill pill-grey">Hidden</span>
                      )
                    ) : write ? (
                      <ActBtn action={toggleProductHiddenAction.bind(null, p.id)} className={`ad-pill ${p.hidden ? 'pill-grey' : 'pill-green'}`} label={`${p.hidden ? 'Hidden' : 'Live'}: toggle visibility of ${p.name}`}>
                        {p.hidden ? 'Hidden' : 'Live'}
                      </ActBtn>
                    ) : (
                      <span className={`ad-pill ${p.hidden ? 'pill-grey' : 'pill-green'}`}>{p.hidden ? 'Hidden' : 'Live'}</span>
                    )}
                  </td>
                  <td className="r">
                    {write && (
                      <span className="ad-row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        <PhotoUpload action={uploadProductPhotoAction.bind(null, p.id)} name={p.name} />
                        <Link className="ad-btn line sm" href={`/admin/products/${p.id}`} aria-label={`Edit ${p.name}`}>
                          Edit
                        </Link>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!products.length && (
                <tr>
                  <td colSpan={7} className="ad-empty">
                    {drafts ? 'No drafts or hidden products. Everything is live.' : `No products ${q || cat ? 'match this filter' : 'yet'}`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!write && <p className="ad-muted2" style={{ fontSize: 12.5 }}>Read-only: your role cannot edit products.</p>}
        {write && drafts && (
          <p className="ad-muted" style={{ fontSize: 12 }} data-testid="drafts-help">
            Drafts are hidden from the store. Type the price (and stock) and press Enter, then press Publish. A product without a price cannot be published.
          </p>
        )}
        {write && <p className="ad-muted" style={{ fontSize: 12 }}>Edit price or available stock (sets the exact number; use Inventory to add a delivery) and press Enter (or leave the field) to publish. Photos: JPG, PNG or WebP up to 5 MB.</p>}
      </section>
    </div>
  );
}
