import Link from 'next/link';
import { PImg } from '@/components/store/PImg';
import { Stars } from '@/components/icons';
import { fmt } from '@/lib/format';
import type { ProductView } from '@/lib/types';

/**
 * "Compare similar models": this product beside up to two from the same category, closest in price.
 * Answers "is this the right one for me?" on the page, from real catalogue data only (price, rating,
 * the first features staff entered) so nothing is invented.
 */
export function CompareSimilar({ brand, current, others, t }: { brand: string; current: ProductView; others: ProductView[]; t: { title: string; sub: string; price: string; rating: string; key: string; view: string; thisOne: string } }) {
  const cols = [current, ...others.slice(0, 2)];
  if (cols.length < 2) return null;
  const rows = 3;
  return (
    <section className="pcmp" id="compare" aria-labelledby="pcmp-h">
      <p className="pst-kicker">{t.sub}</p>
      <h2 id="pcmp-h" className="pcmp-h">
        {t.title}
      </h2>
      <div className="pcmp-scroll">
        <table className="pcmp-table">
          <thead>
            <tr>
              <td />
              {cols.map((p) => (
                <th key={p.id} scope="col" className={p.id === current.id ? 'is-this' : ''}>
                  <span className="pcmp-img">
                    <PImg src={p.img} alt="" model={p.model} sub={p.sub} size="sm" />
                  </span>
                  {p.id === current.id && <span className="pcmp-tag">{t.thisOne}</span>}
                  <span className="pcmp-name">{p.name}</span>
                  <span className="pcmp-model">{p.model}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{t.price}</th>
              {cols.map((p) => (
                <td key={p.id}>
                  <b>{fmt(p.price)}</b>
                  {p.off > 0 && <s>{fmt(p.listPrice)}</s>}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">{t.rating}</th>
              {cols.map((p) => (
                <td key={p.id}>
                  <Stars value={p.rating} size={13} className="pst-stars" /> {p.rating.toFixed(1)} ({p.reviews})
                </td>
              ))}
            </tr>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                <th scope="row">{r === 0 ? t.key : ''}</th>
                {cols.map((p) => (
                  <td key={p.id}>{p.features[r] ?? '—'}</td>
                ))}
              </tr>
            ))}
            <tr>
              <td />
              {cols.map((p) => (
                <td key={p.id}>
                  {p.id !== current.id && (
                    <Link href={`/${brand}/p/${p.id}`} className="pdx-link">
                      {t.view}
                    </Link>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
