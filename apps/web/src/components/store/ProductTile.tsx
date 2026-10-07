import Link from 'next/link';
import type { ProductView } from '@/lib/types';
import { fmt } from '@/lib/format';
import { AddButton, CompareToggle } from './CartButtons';
import { PImg } from './PImg';

/** Category grid tile (prototype: 300px tall, image cover, gradient, meta at the bottom). */
export function ProductTile({ p, brand, inCompare, months = 12 }: { p: ProductView; brand: string; inCompare: boolean; months?: number }) {
  return (
    <div className="ptile shade-tb" data-testid="product-tile">
      <Link href={`/${brand}/p/${p.id}`} className="stretch" aria-label={`${p.name}, ${fmt(p.price)}`} />
      <PImg src={p.img} alt={p.name} model={p.model} size="lg" />
      <div className="tags">
        <span className="glass">{p.sub.toUpperCase()}</span>
        <CompareToggle brand={brand} id={p.id} on={inCompare} />
      </div>
      <div className="meta">
        <div className="mono" style={{ fontSize: 11, opacity: 0.7 }}>
          {p.model}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.2, marginTop: 3 }}>{p.name}</div>
        <div className="row" style={{ alignItems: 'flex-end', marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{fmt(p.price)}</div>
            <div className="monthly-light" style={{ fontSize: 11.5 }}>
              {fmt(p.price / months)}/mo
            </div>
          </div>
          {p.stock > 0 ? <AddButton brand={brand} id={p.id} name={p.name} /> : <span style={{ fontSize: 11, fontWeight: 600 }}>Out of stock</span>}
        </div>
      </div>
    </div>
  );
}

export function ProductRow({ p, brand, inCompare, months = 12 }: { p: ProductView; brand: string; inCompare: boolean; months?: number }) {
  return (
    <div className="lrow" style={{ gridTemplateColumns: '120px 1fr auto', borderRadius: 20, padding: '10px 16px 10px 10px', gap: 16 }}>
      <Link href={`/${brand}/p/${p.id}`} className="stretch" aria-label={`${p.name}, ${fmt(p.price)}`} />
      <PImg src={p.img} alt="" model={p.model} size="sm" style={{ height: 120 }} />
      <div style={{ minWidth: 0 }}>
        <div className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
          {p.model}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{p.name}</div>
        <div style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 6 }}>{p.features.join(' · ')}</div>
        <CompareToggle brand={brand} id={p.id} on={inCompare} long className="cmp-link" />
      </div>
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{fmt(p.price)}</div>
        <div className="monthly" style={{ fontSize: 12 }}>
          {fmt(p.price / months)}/mo
        </div>
        {p.stock > 0 && <AddButton brand={brand} id={p.id} name={p.name} className="btn btn-primary btn-sm" label="Add" />}
      </div>
    </div>
  );
}
