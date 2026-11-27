import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ProductRow, ProductTile } from '@/components/store/ProductTile';
import { SafeImg } from '@/components/store/SafeImg';
import { HeroVideo } from '@/components/store/brands/HeroMedia';
import { categoryFilm } from '@/lib/category-media';
import { PayLaterBanner } from '@/components/store/PayLaterBanner';
import { getT } from '@/server/locale';
import type { BrandKey } from '@/lib/types';
import { getCart, getCompareIds } from '@/server/cart';
import { getBrand, getCategories, getProducts, getShowroomOnly, photoFirst } from '@/server/catalog';
import { JsonLd } from '@/components/seo/JsonLd';
import { fmt, waLink } from '@/lib/format';
import { brandTitle, breadcrumbLd, graph, itemListLd, pageMeta } from '@/server/seo';
import { payLaterOn } from '@/server/paylater';

type SP = Promise<{ sub?: string; sort?: string; view?: string }>;

export async function generateMetadata({ params }: { params: Promise<{ brand: string; cat: string }> }): Promise<Metadata> {
  const { brand: key, cat } = (await params) as { brand: BrandKey; cat: string };
  if (cat === 'all') return {};
  const [brand, cats, products, payLater] = await Promise.all([getBrand(key), getCategories(key), getProducts(key), payLaterOn(key)]);
  const c = cats.find((x) => x.id === cat);
  if (!c) notFound();
  const list = products.filter((p) => p.cat === c.id);
  const from = list.length ? Math.min(...list.map((p) => p.price)) : 0;
  const lead = photoFirst(list)[0];
  return pageMeta({
    brand,
    path: `/c/${c.id}`,
    title: brandTitle(`${c.name} in Tanzania`, brand.name),
    description: `${brand.name} ${c.name.toLowerCase()}${c.subs.length ? ` (${c.subs.join(', ')})` : ''}: ${list.length} models${from ? ` from ${fmt(from)}` : ''}. ${payLater ? 'Pay in full or monthly, delivered' : 'Delivered'} across Tanzania.`,
    images: [{ url: lead?.img || c.img || brand.heroImg, alt: c.name }],
  });
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ brand: string; cat: string }>; searchParams: SP }) {
  const { brand: key, cat: catId } = (await params) as { brand: BrandKey; cat: string };
  if (catId === 'all') permanentRedirect(`/${key}/shop`);
  const sp = await searchParams;
  const [brand, cats, products, cmp, cart, t, payLater] = await Promise.all([getBrand(key), getCategories(key), getProducts(key), getCompareIds(key), getCart(key), getT(), payLaterOn(key)]);
  const cat = catId === 'all' ? null : cats.find((c) => c.id === catId);
  if (catId !== 'all' && !cat) notFound();
  const sub = sp.sub && (cat?.subs.includes(sp.sub) ?? false) ? sp.sub : 'All';
  const sort = sp.sort === 'low' || sp.sort === 'high' ? sp.sort : 'popular';
  const view = sp.view === 'list' ? 'list' : 'grid';
  const inCat = products.filter((p) => !cat || p.cat === cat.id);
  // Only sub-category chips that lead somewhere.
  const subs = (cat?.subs ?? []).filter((s) => inCat.some((p) => p.sub === s));
  let list = inCat.filter((p) => sub === 'All' || p.sub === sub);
  list = sort === 'low' ? [...list].sort((a, b) => a.price - b.price) : sort === 'high' ? [...list].sort((a, b) => b.price - a.price) : photoFirst(list);
  const base = `/${key}/c/${catId}`;
  const q = (patch: Record<string, string>) => {
    const u = new URLSearchParams({ ...(sub !== 'All' ? { sub } : {}), ...(sort !== 'popular' ? { sort } : {}), ...(view !== 'grid' ? { view } : {}), ...patch });
    for (const [k, v] of [...u.entries()]) if (v === '' || (k === 'sub' && v === 'All') || (k === 'sort' && v === 'popular') || (k === 'view' && v === 'grid')) u.delete(k);
    const s = u.toString();
    return s ? `${base}?${s}` : base;
  };
  // Published products without a photo are not sold online: list them as text (no placeholder tiles).
  const noPhoto = cat ? await getShowroomOnly(key, cat.id) : [];
  const fewItems = list.length < 4;
  const heroImg = cat ? cat.img : brand.heroImg;
  // Silent looping film where we have caption-free footage: poster first (LCP), video only after mount.
  const film = cat ? categoryFilm(key, cat) : null;

  return (
    <div className="wrap" style={{ paddingTop: 20 }}>
      {cat && <JsonLd data={graph(breadcrumbLd(brand, [{ name: cat.name, path: `/c/${cat.id}` }]), itemListLd(brand, cat.name, list))} />}
      <div className={film ? 'cathero has-film' : 'cathero'}>
        <div className="cathero-copy" style={{ padding: '30px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <nav aria-label="Breadcrumb" style={{ fontSize: 13, opacity: 0.7 }}>
            <Link href={`/${key}`}>Home</Link> / {cat?.name ?? 'All products'}
          </nav>
          <h1 style={{ margin: '8px 0 0', fontSize: 'clamp(26px, 3.4vw, 44px)', fontWeight: 600, letterSpacing: '-.03em' }}>{cat?.name ?? 'All products'}</h1>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>{t('productsN', { n: list.length })}{payLater ? ' · Pay Later on every item' : ''}</div>
        </div>
        <div className="art">
          {film ? (
            <>
              <SafeImg src={film.poster || heroImg} alt="" loading="eager" fetchPriority="high" />
              <HeroVideo src={film.src} poster={film.poster || heroImg} className="cathero-video" />
            </>
          ) : (
            heroImg && <SafeImg src={heroImg} alt="" />
          )}
        </div>
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
          {(subs.length > 1 || sub !== 'All' ? ['All', ...subs] : []).map((s) => (
            <Link key={s} href={q({ sub: s })} className={`chip ${sub === s ? 'on' : ''}`} aria-current={sub === s}>
              {s}
            </Link>
          ))}
        </div>
        {!fewItems && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 'none' }}>
          {(
            [
              ['popular', 'Popular'],
              ['low', 'Price: low to high'],
              ['high', 'Price: high to low'],
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
        )}
      </div>
      {list.length === 0 && <div style={{ border: '1px dashed var(--line)', borderRadius: 20, padding: 40, textAlign: 'center', color: 'var(--muted2)', marginTop: 20 }}>No products here yet.</div>}
      {view === 'grid' ? (
        <div className="grid-5" style={{ marginTop: 20 }}>
          {list.map((p) => (
            <ProductTile key={p.id} p={p} brand={key} inCompare={cmp.includes(p.id)} months={cart.months} payLater={payLater} />
          ))}
        </div>
      ) : (
        <div className="grid-2" style={{ marginTop: 20 }}>
          {list.map((p) => (
            <ProductRow key={p.id} p={p} brand={key} inCompare={cmp.includes(p.id)} months={cart.months} payLater={payLater} />
          ))}
        </div>
      )}
      {noPhoto.length > 0 && (
        <section className="also-avail" aria-labelledby="also-h">
          <h2 id="also-h">{t('alsoInShowrooms')}</h2>
          <ul>
            {noPhoto.map((p) => (
              <li key={p.id}>
                <span className="also-name">
                  {p.name}
                  <span className="also-model">{p.model}</span>
                </span>
                <span className="also-price">{fmt(p.price)}</span>
                {brand.whatsapp && (
                  <a className="also-wa" href={waLink(brand.whatsapp, `Hello ${brand.name}, I would like to ask about the ${p.name} (${p.model}).`)} target="_blank" rel="noopener noreferrer">
                    {t('enquireWhatsApp')}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {payLater && <PayLaterBanner brand={key} title={t('salaryAdvance')} sub={t('swAdvanceBody')} cta={t('payLaterHow')} href={`/${key}/pay-later`} />}
    </div>
  );
}
