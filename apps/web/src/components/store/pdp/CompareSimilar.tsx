import Link from 'next/link';
import { compareTwoAction } from '@/app/actions/store';
import { PImg } from '@/components/store/PImg';
import { Stars } from '@/components/icons';
import { fmt } from '@/lib/format';
import type { ProductView } from '@/lib/types';

/**
 * "Compare similar models": this product beside up to three of the same kind (same category and
 * sub-type), closest in price. Real catalogue data only (price, rating, the first features staff
 * entered). "Compare with this one" sets the compare list to exactly [this, that] and opens the
 * compare page, where the AI verdict runs for the pair.
 */
export function CompareSimilar({ brand, current, others, t }: { brand: string; current: ProductView; others: ProductView[]; t: { title: string; sub: string; price: string; rating: string; key: string; view: string; thisOne: string; pick: string; pickLabel: string; aiNote: string } }) {
  const cols = [current, ...others.slice(0, 3)];
  if (cols.length < 2) return null;
  const rows = 3;
  return (
    <section className="pcmp" id="compare" aria-labelledby="pcmp-h">
      <p className="pst-kicker">{t.sub}</p>
      <h2 id="pcmp-h" className="pcmp-h">
        {t.title}
      </h2>
      <p className="pcmp-note">{t.aiNote}</p>
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
                <td key={p.id} className="pcmp-act">
                  {p.id !== current.id && (
                    <>
                      <form action={compareTwoAction.bind(null, brand, current.id, p.id)}>
                        <button type="submit" className="btn btn-outline pcmp-pick" aria-label={t.pickLabel.replace('{name}', p.name)} data-testid="pcmp-pick">
                          {t.pick}
                        </button>
                      </form>
                      <Link href={`/${brand}/p/${p.id}`} className="pdx-link">
                        {t.view}
                      </Link>
                    </>
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
