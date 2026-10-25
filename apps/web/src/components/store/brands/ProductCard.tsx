import Link from 'next/link';
import type { ProductView } from '@/lib/types';
import { fmt } from '@/lib/format';
import { AddButton } from '../CartButtons';
import { PImg } from '../PImg';

/**
 * Vertical product card used on both brand homes. Same data and actions; each brand's
 * stylesheet gives it its own look (.pc-mruk: bold retail card; .pc-skywood: quiet gallery card).
 */
export function ProductCard({ p, brand, badge, was, price, perMonth }: { p: ProductView; brand: 'mruk' | 'skywood'; badge?: string; was?: number; price?: number; perMonth: string }) {
  const now = price ?? p.price;
  return (
    <article className={`pc pc-${brand}`}>
      <Link href={`/${brand}/p/${p.id}`} className="stretch" aria-label={`${p.name}, ${fmt(now)}`} />
      <div className="pc-media">
        <PImg src={p.img} alt="" model={p.model} sub={p.sub} size="md" />
        {badge && <span className="pc-badge">{badge}</span>}
      </div>
      <div className="pc-body">
        <span className="pc-model">{p.model}</span>
        <h3 className="pc-name">{p.name}</h3>
        <div className="pc-foot">
          <div>
            <div className="pc-price">
              {fmt(now)}
              {was && was > now && <s>{fmt(was)}</s>}
            </div>
            <div className="pc-mo">{perMonth.replace('{amount}', fmt(now / 12))}</div>
          </div>
          {p.stock > 0 && <AddButton brand={brand} id={p.id} name={p.name} className="pc-add" label={<span aria-hidden="true">+</span>} />}
        </div>
      </div>
    </article>
  );
}
