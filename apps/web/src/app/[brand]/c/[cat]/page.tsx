import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductRow, ProductTile } from '@/components/store/ProductTile';
import { SafeImg } from '@/components/store/SafeImg';
import type { BrandKey } from '@/lib/types';
import { getCart, getCompareIds } from '@/server/cart';
import { getBrand, getCategories, getProducts, photoFirst } from '@/server/catalog';

type SP = Promise<{ sub?: string; sort?: string; view?: string }>;

export async function generateMetadata({ params }: { params: Promise<{ brand: string; cat: string }> }): Promise<Metadata> {
  const { brand, cat } = await params;
  const cats = await getCategories(brand as BrandKey);
  const c = cats.find((x) => x.id === cat);
  return { title: c ? c.name : 'All products', description: c ? `${c.name}: ${c.subs.join(', ')}. Pay in full or monthly with Azania Bank Salary Advance.` : undefined };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ brand: string; cat: string }>; searchParams: SP }) {
  const { brand: key, cat: catId } = (await params) as { brand: BrandKey; cat: string };
  const sp = await searchParams;
  const [brand, cats, products, cmp, cart] = await Promise.all([getBrand(key), getCategories(key), getProducts(key), getCompareIds(key), getCart(key)]);
  const cat = catId === 'all' ? null : cats.find((c) => c.id === catId);
  if (catId !== 'all' && !cat) notFound();
  const sub = sp.sub && (cat?.subs.includes(sp.sub) ?? false) ? sp.sub : 'All';
  const sort = sp.sort === 'low' || sp.sort === 'high' ? sp.sort : 'popular';
  const view = sp.view === 'list' ? 'list' : 'grid';
  let list = products.filter((p) => !cat || p.cat === cat.id).filter((p) => sub === 'All' || p.sub === sub);
  list = sort === 'low' ? [...list].sort((a, b) => a.price - b.price) : sort === 'high' ? [...list].sort((a, b) => b.price - a.price) : photoFirst(list);
  const base = `/${key}/c/${catId}`;
  const q = (patch: Record<string, string>) => {
    const u = new URLSearchParams({ ...(sub !== 'All' ? { sub } : {}), ...(sort !== 'popular' ? { sort } : {}), ...(view !== 'grid' ? { view } : {}), ...patch });
    for (const [k, v] of [...u.entries()]) if (v === '' || (k === 'sub' && v === 'All') || (k === 'sort' && v === 'popular') || (k === 'view' && v === 'grid')) u.delete(k);
    const s = u.toString();
    return s ? `${base}?${s}` : base;
  };
  const heroImg = cat ? cat.img : brand.heroImg;

  return (
    <div className="wrap" style={{ paddingTop: 20 }}>
      <div className="cathero">
        <div style={{ padding: '30px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <nav aria-label="Breadcrumb" style={{ fontSize: 13, opacity: 0.7 }}>
            <Link href={`/${key}`}>Home</Link> / {cat?.name ?? 'All products'}
          </nav>
          <h1 style={{ margin: '8px 0 0', fontSize: 'clamp(26px, 3.4vw, 44px)', fontWeight: 600, letterSpacing: '-.03em' }}>{cat?.name ?? 'All products'}</h1>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>{list.length} products · Salary Advance on every item</div>
        </div>
        <div className="art">{heroImg && <SafeImg src={heroImg} alt="" />}</div>
      </div>
      {!cat && (
        <div className="nsb" style={{ display: 'flex', gap: 8, marginTop: 18, overflowX: 'auto' }}>
          {cats.map((c) => (
            <Link key={c.id} href={`/${key}/c/${c.id}`} className="chip">
              {c.short}
            </Link>
          ))}
        </div>
      )}
      <div className="filters">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['All', ...(cat?.subs ?? [])].map((s) => (
            <Link key={s} href={q({ sub: s })} className={`chip ${sub === s ? 'on' : ''}`} aria-current={sub === s}>
              {s}
            </Link>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 'none' }}>
          {(
            [
              ['popular', 'Popular'],
              ['low', 'Price ↑'],
              ['high', 'Price ↓'],
            ] as const
          ).map(([k, l]) => (
            <Link key={k} href={q({ sort: k })} className={`sortlink ${sort === k ? 'on' : ''}`}>
              {l}
            </Link>
          ))}
          <div className="seg d-only" style={{ marginLeft: 6, padding: 3, borderRadius: 10 }}>
            <Link href={q({ view: 'grid' })} className={view === 'grid' ? 'on' : ''} style={{ fontSize: 12.5, padding: '6px 12px', borderRadius: 8 }}>
              Grid
            </Link>
            <Link href={q({ view: 'list' })} className={view === 'list' ? 'on' : ''} style={{ fontSize: 12.5, padding: '6px 12px', borderRadius: 8 }}>
              List
            </Link>
          </div>
        </div>
      </div>
      {list.length === 0 && <div style={{ border: '1px dashed var(--line)', borderRadius: 20, padding: 40, textAlign: 'center', color: 'var(--muted2)', marginTop: 20 }}>No products here yet.</div>}
      {view === 'grid' ? (
        <div className="grid-5" style={{ marginTop: 20 }}>
          {list.map((p) => (
            <ProductTile key={p.id} p={p} brand={key} inCompare={cmp.includes(p.id)} months={cart.months} />
          ))}
        </div>
      ) : (
        <div className="grid-2" style={{ marginTop: 20 }}>
          {list.map((p) => (
            <ProductRow key={p.id} p={p} brand={key} inCompare={cmp.includes(p.id)} months={cart.months} />
          ))}
        </div>
      )}
    </div>
  );
}
