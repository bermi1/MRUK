import type { Metadata } from 'next';
import { ProductTile } from '@/components/store/ProductTile';
import type { BrandKey } from '@/lib/types';
import { getCompareIds } from '@/server/cart';
import { getBrand, getProducts, searchProducts } from '@/server/catalog';
import { SearchIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Search', robots: { index: false } };

export default async function SearchPage({ params, searchParams }: { params: Promise<{ brand: string }>; searchParams: Promise<{ q?: string }> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const q = ((await searchParams).q ?? '').slice(0, 80);
  const [brand, products, cmp] = await Promise.all([getBrand(key), getProducts(key), getCompareIds(key)]);
  const results = q ? searchProducts(products, q) : [];
  return (
    <div className="wrap page-top">
      <form role="search" action={`/${key}/search`} className="hdr-search" style={{ maxWidth: 640 }}>
        <SearchIcon />
        <label htmlFor="sq" className="sr-only">
          Search
        </label>
        <input id="sq" name="q" defaultValue={q} placeholder={`Search ${brand.name} products and models…`} autoFocus={!q} />
      </form>
      <h1 className="h1" style={{ marginTop: 22 }}>
        {q ? `${results.length} result${results.length === 1 ? '' : 's'} for “${q}”` : 'Search'}
      </h1>
      {q && results.length === 0 && <p style={{ color: 'var(--muted2)' }}>No products match. Try a model number (e.g. G3500Q) or a category like “fridge”.</p>}
      <div className="grid-5" style={{ marginTop: 20 }}>
        {results.map((p) => (
          <ProductTile key={p.id} p={p} brand={key} inCompare={cmp.includes(p.id)} />
        ))}
      </div>
    </div>
  );
}
