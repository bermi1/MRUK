import type { Metadata } from 'next';
import Link from 'next/link';
import { CompareToggle } from '@/components/store/CartButtons';
import { CompareAi } from '@/components/store/CompareAi';
import { PImg } from '@/components/store/PImg';
import { fmt } from '@/lib/format';
import type { BrandKey, ProductView } from '@/lib/types';
import { getCart, getCompareIds } from '@/server/cart';
import { getProducts } from '@/server/catalog';

export const metadata: Metadata = { title: 'Compare products' };

export default async function ComparePage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const [products, ids, cart] = await Promise.all([getProducts(key), getCompareIds(key), getCart(key)]);
  const months = cart.months;
  const chosen = ids.map((id) => products.find((p) => p.id === id)).filter((p): p is ProductView => !!p);
  // Prototype: with fewer than 2 picks, suggest products from the same category.
  let items = chosen;
  const seed = chosen[0] ?? products.find((p) => p.img) ?? products[0];
  if (items.length < 2 && seed) items = [...items, ...products.filter((p) => p.cat === seed.cat && !items.includes(p))].slice(0, 3);
  const feats = [...new Set(items.flatMap((p) => p.features))].slice(0, 8);
  const minP = Math.min(...items.map((p) => p.price));
  const rows: { label: string; cells: { t: string; c: string; w: number }[] }[] = [
    { label: 'Price', cells: items.map((p) => ({ t: fmt(p.price), w: 600, c: p.price === minP ? 'var(--ok)' : 'var(--text)' })) },
    { label: 'Salary Advance', cells: items.map((p) => ({ t: `${fmt(p.price / months)}/mo`, w: 500, c: 'var(--monthly)' })) },
    { label: 'Type', cells: items.map((p) => ({ t: p.sub, w: 400, c: 'var(--text)' })) },
    { label: 'Stock', cells: items.map((p) => ({ t: p.stock <= 5 ? `Only ${p.stock} left` : 'In stock', w: 400, c: p.stock <= 5 ? 'var(--warn)' : 'var(--ok)' })) },
    ...feats.map((f) => ({ label: f, cells: items.map((p) => ({ t: p.features.includes(f) ? '✓' : '—', w: 600, c: p.features.includes(f) ? 'var(--ok)' : '#C8CBD8' })) })),
  ];
  const cols = `200px repeat(${items.length}, minmax(180px, 1fr))`;
  return (
    <div className="wrap page-top">
      <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">AI compare</div>
          <h1 className="h1">Compare products</h1>
          <div style={{ fontSize: 14.5, color: 'var(--muted2)', marginTop: 6 }}>The AI answers only from the product data in our catalogue, so it never invents specs.{chosen.length < 2 ? ' Showing suggestions — add products with “+ Compare”.' : ''}</div>
        </div>
        <Link href={`/${key}/c/all`} className="link-u">
          Add products
        </Link>
      </div>
      <div style={{ overflowX: 'auto', marginTop: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: cols, border: '1px solid var(--border)', borderRadius: 24, overflow: 'hidden', minWidth: 560 }} role="table" aria-label="Product comparison">
          <div style={{ background: 'var(--surface)' }} role="columnheader" />
          {items.map((c) => (
            <div key={c.id} style={{ padding: 16, borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }} role="columnheader">
              <div style={{ position: 'relative' }}>
                <Link href={`/${key}/p/${c.id}`}>
                  <PImg src={c.img} alt={c.name} model={c.model} size="md" style={{ height: 170 }} />
                </Link>
                {chosen.includes(c) && (
                  <span style={{ position: 'absolute', right: 8, top: 8 }}>
                    <CompareToggle brand={key} id={c.id} on className="cmp-x" />
                  </span>
                )}
              </div>
              <div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {c.model}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{c.name}</div>
              </div>
            </div>
          ))}
          {rows.map((r) => (
            <div key={r.label} style={{ display: 'contents' }} role="row">
              <div style={{ padding: '13px 16px', background: 'var(--surface)', borderTop: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--muted2)' }} role="rowheader">
                {r.label}
              </div>
              {r.cells.map((v, i) => (
                <div key={i} style={{ padding: '13px 16px', borderTop: '1px solid var(--border)', borderLeft: '1px solid var(--border)', fontSize: 14, fontWeight: v.w, color: v.c }} role="cell">
                  {v.t}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {items.length > 0 && <CompareAi brand={key} ids={items.map((p) => p.id)} names={items.map((p) => p.model).join(', ')} months={months} />}
    </div>
  );
}
