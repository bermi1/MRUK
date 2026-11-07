import type { Metadata } from 'next';
import Link from 'next/link';
import { ClearCompareButton, CompareToggle } from '@/components/store/CartButtons';
import { CompareAi } from '@/components/store/CompareAi';
import { PImg } from '@/components/store/PImg';
import { Stars, TickIcon } from '@/components/icons';
import { fmt, stockState } from '@/lib/format';
import type { BrandKey, ProductView } from '@/lib/types';
import { COMPARE_MAX, getCart, getCompareIds } from '@/server/cart';
import { getProducts } from '@/server/catalog';
import { getT } from '@/server/locale';

export const metadata: Metadata = { title: 'Compare products' };

type Cell = { t: React.ReactNode; c?: string; w?: number };

export default async function ComparePage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const [products, ids, cart, t] = await Promise.all([getProducts(key), getCompareIds(key), getCart(key), getT()]);
  const months = cart.months;
  // Only this brand's live products: ids of hidden/deleted products (or another brand's) are ignored.
  const chosen = ids.map((id) => products.find((p) => p.id === id)).filter((p): p is ProductView => !!p);
  // Prototype: with fewer than 2 picks, suggest products from the same category.
  let items = chosen;
  const seed = chosen[0] ?? products.find((p) => p.img) ?? products[0];
  if (items.length < 2 && seed) items = [...items, ...products.filter((p) => p.cat === seed.cat && !items.includes(p))].slice(0, COMPARE_MAX);
  const feats = [...new Set(items.flatMap((p) => p.features))];
  // Prices are what the customer pays today (flash deals applied, same as the cart).
  const minP = Math.min(...items.map((p) => p.price));
  const lowest = items.filter((p) => p.price === minP).length < items.length;
  const stock = (p: ProductView): Cell =>
    stockState(p.stock) === 'out' ? { t: t('outOfStock'), c: 'var(--warn)' } : stockState(p.stock) === 'low' ? { t: t('onlyLeft', { n: p.stock }), c: 'var(--warn)' } : { t: t('inStock', { n: p.stock }), c: 'var(--ok)' };
  const rows: { label: string; key: string; cells: Cell[] }[] = [
    {
      label: t('cmpPrice'),
      key: 'price',
      cells: items.map((p) => ({
        w: 600,
        t: (
          <span className="cmp-price" data-testid="compare-price">
            <b style={{ color: lowest && p.price === minP ? 'var(--ok)' : 'var(--text)' }}>{fmt(p.price)}</b>
            {p.off > 0 && (
              <>
                <s>{fmt(p.listPrice)}</s>
                <span className="cmp-off">−{p.off}%</span>
              </>
            )}
            {lowest && p.price === minP && <small>{t('cmpBestPrice')}</small>}
          </span>
        ),
      })),
    },
    { label: t('cmpMonthly'), key: 'monthly', cells: items.map((p) => ({ t: `${fmt(p.price / months)}/mo`, w: 500, c: 'var(--monthly)' })) },
    {
      label: t('cmpRating'),
      key: 'rating',
      cells: items.map((p) => ({
        t: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', color: '#B7791F' }}>
            <Stars value={p.rating} size={13} />
            <span style={{ color: 'var(--muted2)', fontWeight: 500 }}>
              {p.rating.toFixed(1)} · {t('cmpReviews', { n: p.reviews })}
            </span>
          </span>
        ),
      })),
    },
    { label: t('cmpType'), key: 'type', cells: items.map((p) => ({ t: p.sub })) },
    { label: t('cmpStock'), key: 'stock', cells: items.map(stock) },
    ...feats.map((f) => ({
      label: f,
      key: `f-${f}`,
      cells: items.map((p) =>
        p.features.includes(f)
          ? { t: <span role="img" aria-label={t('cmpYes')} style={{ display: 'inline-flex' }}><TickIcon size={18} strokeWidth={2.4} /></span>, c: 'var(--ok)', w: 600 }
          : { t: <span aria-label={t('cmpNo')}>—</span>, c: '#B4B8C8', w: 600 },
      ),
    })),
  ];
  return (
    <div className="wrap page-top">
      <div className="row cmp-head">
        <div>
          <div className="eyebrow">{t('cmpEyebrow')}</div>
          <h1 className="h1">{t('cmpTitle')}</h1>
          <p className="cmp-sub">
            {t('cmpSub')} {chosen.length < 2 ? t('cmpSuggest') : ''}
          </p>
        </div>
        <div className="cmp-actions">
          <span className="cmp-count" data-testid="compare-count">
            {t('cmpCount', { n: chosen.length, max: COMPARE_MAX })}
          </span>
          {chosen.length > 0 && <ClearCompareButton brand={key} />}
          <Link href={`/${key}/shop`} className="link-u">
            {t('cmpAddProducts')}
          </Link>
        </div>
      </div>
      {items.length === 0 ? (
        <p style={{ marginTop: 24 }}>{t('cmpEmpty')}</p>
      ) : (
        <div className="cmp-scroll">
          <div className="cmp-table" style={{ ['--cmp-n' as string]: items.length }} role="table" aria-label={t('cmpTitle')}>
            <div role="row" style={{ display: 'contents' }}>
              <div className="cmp-corner" role="columnheader" />
              {items.map((c) => (
                <div key={c.id} className="cmp-col" role="columnheader" data-testid="compare-col">
                  <div style={{ position: 'relative' }}>
                    <Link href={`/${key}/p/${c.id}`} aria-label={c.name}>
                      <PImg src={c.img} alt="" model={c.model} sub={c.sub} size="md" className="cmp-img" />
                    </Link>
                    {chosen.includes(c) ? (
                      <span className="cmp-x-wrap">
                        <CompareToggle brand={key} id={c.id} name={c.name} on className="cmp-x" />
                      </span>
                    ) : (
                      <span className="cmp-suggest">{t('cmpSuggested')}</span>
                    )}
                  </div>
                  <div>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {c.model}
                    </div>
                    <Link href={`/${key}/p/${c.id}`} className="cmp-name">
                      {c.name}
                    </Link>
                  </div>
                  {!chosen.includes(c) && <CompareToggle brand={key} id={c.id} name={c.name} on={false} long className="cmp-link" />}
                </div>
              ))}
            </div>
            {rows.map((r) => (
              <div key={r.key} style={{ display: 'contents' }} role="row" data-row={r.key}>
                <div className="cmp-label" role="rowheader">
                  {r.label}
                </div>
                {r.cells.map((v, i) => (
                  <div key={i} className="cmp-cell" style={{ fontWeight: v.w ?? 400, color: v.c ?? 'var(--text)' }} role="cell">
                    {v.t}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      {items.length > 0 && <CompareAi brand={key} ids={items.map((p) => p.id)} names={items.map((p) => p.model).join(', ')} months={months} />}
    </div>
  );
}
