import type { Metadata } from 'next';
import { ProductTile } from '@/components/store/ProductTile';
import type { BrandKey } from '@/lib/types';
import { getCompareIds } from '@/server/cart';
import Link from 'next/link';
import { getBrand, getCategories, getProducts, photoFirst, searchProducts } from '@/server/catalog';
import { getT } from '@/server/locale';
import { payLaterOn } from '@/server/paylater';
import { SearchIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Search', robots: { index: false, follow: true } };

export default async function SearchPage({ params, searchParams }: { params: Promise<{ brand: string }>; searchParams: Promise<{ q?: string }> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const q = ((await searchParams).q ?? '').slice(0, 80);
  const [brand, products, cmp, cats, t, payLater] = await Promise.all([getBrand(key), getProducts(key), getCompareIds(key), getCategories(key), getT(), payLaterOn(key)]);
  const results = q ? searchProducts(products, q) : [];
  const none = !!q && results.length === 0;
  const popular = none || !q ? photoFirst(products).slice(0, 5) : [];
  return (
    <div className="wrap page-top">
      <form role="search" action={`/${key}/search`} className="hdr-search" style={{ maxWidth: 640 }}>
        <SearchIcon />
        <label htmlFor="sq" className="sr-only">
          {t('searchShort')}
        </label>
        <input id="sq" name="q" type="search" enterKeyHint="search" defaultValue={q} placeholder={t('searchHint', { brand: brand.name })} autoFocus={!q} />
      </form>
      <h1 className="h1" style={{ marginTop: 22 }}>
        {q ? (results.length === 1 ? t('searchResultOne', { q }) : t('searchResults', { n: results.length, q })) : t('searchShort')}
      </h1>
      {none && (
        <>
          <p style={{ color: 'var(--muted2)' }} data-testid="search-none">
            {t('searchNone', { model: products[0]?.model ?? '' })}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {cats.map((c) => (
              <Link key={c.id} href={`/${key}/c/${c.id}`} className="chip" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>
                {c.name}
              </Link>
            ))}
          </div>
        </>
      )}
      {popular.length > 0 && (
        <h2 style={{ marginTop: 32, fontSize: 20, fontWeight: 600 }}>{t('searchPopular')}</h2>
      )}
      <div className="grid-5" style={{ marginTop: 20 }}>
        {(results.length ? results : popular).map((p) => (
          <ProductTile key={p.id} p={p} brand={key} inCompare={cmp.includes(p.id)} payLater={payLater} />
        ))}
      </div>
    </div>
  );
}
