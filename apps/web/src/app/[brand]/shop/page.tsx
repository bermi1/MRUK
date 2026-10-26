import type { Metadata } from 'next';
import Link from 'next/link';
import { z } from 'zod';
import { CatGlyph, glyphKind } from '@/components/store/CatGlyph';
import { SafeImg } from '@/components/store/SafeImg';
import { ProductCard } from '@/components/store/brands/ProductCard';
import { ShopControls } from '@/components/store/ShopControls';
import { PayLaterBanner } from '@/components/store/PayLaterBanner';
import { fmt } from '@/lib/format';
import type { BrandKey, ProductView } from '@/lib/types';
import { getCompareIds } from '@/server/cart';
import { getCategories, getProducts, photoFirst } from '@/server/catalog';
import { getT } from '@/server/locale';

const PAGE = 24;
const SORTS = ['popular', 'low', 'high', 'new'] as const;
type Sort = (typeof SORTS)[number];

/** Query string: every value optional and bounded; anything invalid falls back to the default. */
const Query = z.object({
  cat: z.string().max(60).regex(/^[a-z0-9-]+$/).optional().catch(undefined),
  sort: z.enum(SORTS).optional().catch(undefined),
  min: z.coerce.number().int().min(0).max(1_000_000_000).optional().catch(undefined),
  max: z.coerce.number().int().min(0).max(1_000_000_000).optional().catch(undefined),
  stock: z.literal('1').optional().catch(undefined),
  n: z.coerce.number().int().min(1).max(50).optional().catch(undefined),
});
type Q = z.infer<typeof Query>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('shopTitle') };
}

function sortList(list: ProductView[], sort: Sort): ProductView[] {
  if (sort === 'low') return [...list].sort((a, b) => a.price - b.price);
  if (sort === 'high') return [...list].sort((a, b) => b.price - a.price);
  if (sort === 'new') return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return photoFirst([...list].sort((a, b) => b.rating * Math.log10(10 + b.reviews) - a.rating * Math.log10(10 + a.reviews)));
}

/** All products: every visible product with category chips, sort, price range, in-stock filter and load-more, all in the URL. */
export default async function ShopPage({ params, searchParams }: { params: Promise<{ brand: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const raw = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const q: Q = Query.parse({ cat: one(raw.cat), sort: one(raw.sort), min: one(raw.min), max: one(raw.max), stock: one(raw.stock), n: one(raw.n) });
  const [cats, products, cmp, t] = await Promise.all([getCategories(key), getProducts(key), getCompareIds(key), getT()]);
  const b = `/${key}`;
  const cat = cats.find((c) => c.id === q.cat);
  const sort: Sort = q.sort ?? 'popular';
  const lo = q.min !== undefined && q.max !== undefined ? Math.min(q.min, q.max) : q.min;
  const hi = q.min !== undefined && q.max !== undefined ? Math.max(q.min, q.max) : q.max;
  const filtered = products
    .filter((p) => !cat || p.cat === cat.id)
    .filter((p) => lo === undefined || p.price >= lo)
    .filter((p) => hi === undefined || p.price <= hi)
    .filter((p) => !q.stock || p.stock > 0);
  const list = sortList(filtered, sort);
  const pages = q.n ?? 1;
  const shown = list.slice(0, pages * PAGE);
  const perMonth = t('perMonthShort');
  const filterOn = lo !== undefined || hi !== undefined || !!q.stock;

  const href = (patch: Partial<Record<keyof Q, string | number | undefined>>) => {
    const cur: Record<string, string | number | undefined> = { cat: cat?.id, sort: sort === 'popular' ? undefined : sort, min: lo, max: hi, stock: q.stock, ...patch };
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(cur)) if (v !== undefined && v !== '') u.set(k, String(v));
    const s = u.toString();
    return s ? `${b}/shop?${s}` : `${b}/shop`;
  };
  const sortLabel: Record<Sort, string> = { popular: t('sortPopular'), low: t('sortLow'), high: t('sortHigh'), new: t('sortNew') };
  const prices = products.map((p) => p.price);
  const floor = prices.length ? Math.min(...prices) : 0;
  const ceil = prices.length ? Math.max(...prices) : 0;

  return (
    <div className={`wrap shop shop-${key}`}>
      <header className="shop-head">
        <h1 className="shop-title">{cat ? cat.name : t('shopTitle')}</h1>
        <p className="shop-sub">{t('shopSub', { n: filtered.length })}</p>
      </header>

      {/* "Shop by category": one compact row of category shortcuts. */}
      <nav className="shop-cats nsb" aria-label={t('shopByCategory')}>
        {cats.map((c) => (
          <Link key={c.id} href={`${b}/c/${c.id}`} className="shop-cat">
            <span className="shop-cat-art" aria-hidden="true">
              <CatGlyph kind={glyphKind(c.id, c.name)} className="shop-cat-glyph" strokeWidth={1.4} />
              {c.img && <SafeImg src={c.img} alt="" />}
            </span>
            <span className="shop-cat-name">{c.short}</span>
          </Link>
        ))}
      </nav>

      <div className="shop-bar">
        <nav className="shop-chips nsb" aria-label={t('categories')}>
          <Link href={href({ cat: undefined, n: undefined })} scroll={false} className={`shop-chip ${!cat ? 'on' : ''}`} aria-current={!cat ? 'page' : undefined}>
            {t('allFilter')}
          </Link>
          {cats.map((c) => (
            <Link key={c.id} href={href({ cat: c.id, n: undefined })} scroll={false} className={`shop-chip ${cat?.id === c.id ? 'on' : ''}`} aria-current={cat?.id === c.id ? 'page' : undefined}>
              {c.short}
            </Link>
          ))}
        </nav>
        <ShopControls
          sort={sort}
          sorts={SORTS.map((x) => [x, sortLabel[x]])}
          cat={cat?.id}
          min={lo}
          max={hi}
          stock={!!q.stock}
          floor={floor}
          ceil={ceil}
          clearHref={href({ min: undefined, max: undefined, stock: undefined, n: undefined })}
          labels={{ sortBy: t('sortBy'), filters: t('filters'), priceRange: t('priceRange'), minPrice: t('minPrice'), maxPrice: t('maxPrice'), inStockOnly: t('inStockOnly'), apply: t('applyFilters'), clear: t('clearFilters'), close: t('close') }}
        />
      </div>

      {filterOn && (
        <p className="shop-active">
          {lo !== undefined && <span className="shop-tag">{t('fromPrice', { amount: fmt(lo) })}</span>}
          {hi !== undefined && <span className="shop-tag">≤ {fmt(hi)}</span>}
          {q.stock && <span className="shop-tag">{t('inStockOnly')}</span>}
          <Link href={href({ min: undefined, max: undefined, stock: undefined, n: undefined })} scroll={false} className="shop-tag-clear">
            {t('clearFilters')}
          </Link>
        </p>
      )}

      {shown.length === 0 ? (
        <div className="shop-empty">
          <p>{t('noMatches')}</p>
          <Link href={`${b}/shop`} className="shop-tag-clear">
            {t('clearFilters')}
          </Link>
        </div>
      ) : (
        <div className="shop-grid" data-testid="shop-grid">
          {shown.map((p) => (
            <ProductCard key={p.id} p={p} brand={key} inCompare={cmp.includes(p.id)} badge={p.stock <= 0 ? t('outOfStock') : p.tag || undefined} perMonth={perMonth} />
          ))}
        </div>
      )}

      <div className="shop-more">
        <p aria-live="polite">{t('showingNofM', { n: shown.length, total: list.length })}</p>
        {shown.length < list.length && (
          <Link href={href({ n: pages + 1 })} scroll={false} className="btn btn-outline">
            {t('loadMore')}
          </Link>
        )}
      </div>
      <PayLaterBanner brand={key} title={t('salaryAdvance')} sub={t('swAdvanceBody')} cta={t('payLaterHow')} href={`${b}/pay-later`} />
    </div>
  );
}
