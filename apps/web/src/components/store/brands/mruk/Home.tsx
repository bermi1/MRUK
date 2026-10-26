import Link from 'next/link';
import type { BrandView, CategoryView, ProductView } from '@/lib/types';
import type { MessageKey } from '@/lib/i18n';
import { REVIEWS } from '@/lib/content';
import { fmt, initials } from '@/lib/format';
import type { BundleView, FlashDeal } from '@/server/catalog';
import { AddBundleButton } from '../../CartButtons';
import { subscribeLabels } from '../../Footer';
import { Subscribe } from '../../Subscribe';
import { CatGlyph, glyphKind } from '../../CatGlyph';
import { Countdown } from '../../Countdown';
import { PImg } from '../../PImg';
import { SafeImg } from '../../SafeImg';
import { CategoryChips } from '../CategoryChips';
import { ProductCard } from '../ProductCard';
import { Rail } from '../Rail';
import type { HeroLabels, HeroSlideView } from '../shared';
import { MrukHero } from './Hero';

type T = (k: MessageKey, v?: Record<string, string | number>) => string;

const NEED: Record<string, MessageKey> = {
  generators: 'needGenerators',
  fridges: 'needFridges',
  agriculture: 'needAgriculture',
  'music-tv': 'needMusicTv',
  kitchen: 'needKitchen',
  washing: 'needWashing',
};

function Head({ kicker, title, sub, action }: { kicker: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mu-head" data-reveal>
      <div>
        <p className="mu-kicker">{kicker}</p>
        <h2>{title}</h2>
        {sub && <p className="mu-head-sub">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function MrukHome(props: {
  brand: BrandView;
  slides: HeroSlideView[];
  heroLabels: HeroLabels;
  cats: CategoryView[];
  products: ProductView[];
  flash: FlashDeal[];
  bundles: BundleView[];
  supplierCount: number;
  cities: string[];
  compare: string[];
  t: T;
}) {
  const { brand, slides, heroLabels, cats, products, flash, bundles, supplierCount, cities, compare, t } = props;
  const b = `/${brand.key}`;
  const perMonth = t('perMonthShort');
  const newest = [...products].sort((x, y) => y.createdAt.localeCompare(x.createdAt) || y.price - x.price).slice(0, 10);
  const needs = cats.filter((c) => NEED[c.id]).slice(0, 4);
  const reviews = REVIEWS.mruk;
  const exampleMonthly = Math.min(...products.map((p) => p.price)) / 12;

  return (
    <div className="mu-home">
      <CategoryChips brand="mruk" cats={cats} payLater={t('payLater')} deals={t('deals')} />
      <MrukHero slides={slides} dealsHref={`${b}/deals`} labels={heroLabels} />

      {/* Trust bar */}
      <section className="mu-trust" aria-label={t('helpAndServices')}>
        <div className="wrap">
          {(
            [
              ['truck', t('trustDelivery'), t('trustDeliverySub')],
              ['shield', t('trustWarranty'), t('trustWarrantySub')],
              ['card', t('trustAdvance'), t('trustAdvanceSub')],
              ['pin', t('trustShowrooms', { n: supplierCount }), t('trustShowroomsSub')],
            ] as const
          ).map(([icon, a, s]) => (
            <div key={icon} className="mu-trust-item">
              <TrustIcon kind={icon} />
              <div>
                <b>{a}</b>
                <span>{s}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="wrap">
        {/* Category rail */}
        <section className="mu-sec">
          <Head
            kicker={t('shopByCategory')}
            title={`${brand.tagline}.`}
            action={
              <Link href={`${b}/c/all`} className="mu-link d-only">
                {t('viewAll')} →
              </Link>
            }
          />
          <div className="mu-cats nsb">
            {cats.map((c, i) => (
              <Link key={c.id} href={`${b}/c/${c.id}`} className="mu-cat" data-reveal style={{ ['--i' as string]: i }}>
                <span className="mu-cat-art">
                  <CatGlyph kind={glyphKind(c.id, c.name)} className="mu-cat-glyph" />
                  {c.img && <SafeImg src={c.img} alt="" />}
                </span>
                <span className="mu-cat-name">{c.name}</span>
                <span className="mu-cat-count">{t('productsN', { n: c.count })}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Flash deals */}
      {flash.length > 0 && (
        <section className="mu-flash">
          <div className="wrap">
            <div className="mu-flash-head" data-reveal>
              <div>
                <p className="mu-kicker light">
                  <span className="mu-bolt" aria-hidden="true">
                    ⚡
                  </span>{' '}
                  {t('flashDeals')}
                </p>
                <h2>{t('flashDealsSub')}</h2>
              </div>
              <div className="mu-flash-timer">
                <span>{t('endsIn')}</span>
                <Countdown compact />
              </div>
            </div>
            <div className="mu-flash-grid">
              {flash.slice(0, 4).map((p, i) => (
                <div key={p.id} data-reveal style={{ ['--i' as string]: i }}>
                  <ProductCard p={p} inCompare={compare.includes(p.id)} brand="mruk" price={p.dealPrice} was={p.price} badge={t('off', { n: p.off })} perMonth={perMonth} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="wrap">
        {/* Shop by need */}
        {needs.length > 0 && (
          <section className="mu-sec">
            <Head kicker={t('shopByNeed')} title={t('shopByNeedSub')} />
            <div className="mu-needs">
              {needs.map((c, i) => (
                <Link key={c.id} href={`${b}/c/${c.id}`} className={`mu-need n${i}`} data-reveal style={{ ['--i' as string]: i }}>
                  <span className="mu-need-art" aria-hidden="true">
                    <CatGlyph kind={glyphKind(c.id, c.name)} className="mu-need-glyph" strokeWidth={1.2} />
                    {c.img && <SafeImg src={c.img} alt="" />}
                  </span>
                  <span className="mu-need-copy">
                    <span className="mu-need-title">{t(NEED[c.id]!)}</span>
                    <span className="mu-need-subs">{c.subs.join(' · ')}</span>
                    <span className="mu-need-go">
                      {c.name} <span aria-hidden="true">→</span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* New arrivals */}
        <section className="mu-sec">
          <Head kicker={t('newArrivals')} title={t('newArrivalsSub', { brand: brand.name })} />
          <Rail labels={{ prev: t('prev'), next: t('next') }} className="mu-rail">
            {newest.map((p) => (
              <ProductCard key={p.id} p={p} inCompare={compare.includes(p.id)} brand="mruk" badge={p.tag || undefined} perMonth={perMonth} />
            ))}
          </Rail>
        </section>

        {/* Bundles */}
        {bundles.length > 0 && (
          <section className="mu-sec">
            <Head
              kicker={t('dealsAndBundles')}
              title={t('bundlesTitle')}
              sub={t('bundlesSub')}
              action={
                <Link href={`${b}/deals`} className="mu-link d-only">
                  {t('seeAll')} →
                </Link>
              }
            />
            <div className="mu-bundles">
              {bundles.slice(0, 3).map((d, i) => (
                <article key={d.title} className="mu-bundle" data-reveal style={{ ['--i' as string]: i }}>
                  <div className="mu-bundle-top">
                    <span className="mu-bundle-tag">{t('saveN', { n: d.save })}</span>
                    <h3>{d.title}</h3>
                  </div>
                  <div className="mu-bundle-items">
                    {d.items.map((p, k) => (
                      <span key={p.id} className="mu-bundle-item">
                        {k > 0 && (
                          <span className="mu-plus" aria-hidden="true">
                            +
                          </span>
                        )}
                        <PImg src={p.img} alt={p.name} model={p.model} sub={p.sub} size="sm" />
                      </span>
                    ))}
                  </div>
                  <p className="mu-bundle-names">{d.items.map((p) => p.name).join(' + ')}</p>
                  <div className="mu-bundle-foot">
                    <div>
                      <s>{fmt(d.was)}</s>
                      <b>{fmt(d.now)}</b>
                      <span className="mu-bundle-mo">{t('orPerMonth', { amount: fmt(d.now / 12) })}</span>
                    </div>
                    <AddBundleButton brand="mruk" ids={d.items.map((p) => p.id)} className="mu-btn mu-btn-navy mu-btn-sm" />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Salary Advance */}
      <section className="mu-advance">
        <div className="wrap">
          <div className="mu-advance-in" data-reveal>
            <div className="mu-advance-copy">
              <img src="/brand/azania-bank-white.png" alt="Azania Bank" width={46} height={36} className="mu-az" loading="lazy" />
              <h2>{t('advanceTitle')}</h2>
              <p>{t('fromPerMonth', { amount: fmt(exampleMonthly) })}</p>
              <Link href={`${b}/c/all`} className="mu-btn mu-btn-sky">
                {t('buyWithAdvance')} <span aria-hidden="true">→</span>
              </Link>
            </div>
            <ol className="mu-steps">
              {(
                [
                  ['advanceStep1', 'advanceStep1Sub'],
                  ['advanceStep2', 'advanceStep2Sub'],
                  ['advanceStep3', 'advanceStep3Sub'],
                ] as const
              ).map(([a, s], k) => (
                <li key={a} style={{ ['--i' as string]: k }}>
                  <span className="mu-step-n">{k + 1}</span>
                  <b>{t(a)}</b>
                  <span>{t(s)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <div className="wrap">
        <section className="mu-sec" data-reveal>
          <Subscribe brand="mruk" source="home" labels={subscribeLabels(t, brand.name)} className="home-sub" />
        </section>

        {/* Reviews + showrooms */}
        <section className="mu-sec mu-social">
          <div className="mu-reviews">
            <Head kicker="4.8 ★ · 1,200+" title={t('reviewsTitle')} />
            <div className="mu-review-list nsb">
              {reviews.map((r, i) => (
                <figure key={r.name} className="mu-review" data-reveal style={{ ['--i' as string]: i }}>
                  <div className="mu-stars" aria-label="5 out of 5">
                    ★★★★★
                  </div>
                  <blockquote>{r.q}</blockquote>
                  <figcaption>
                    <span className="mu-avatar" aria-hidden="true">
                      {initials(r.name)}
                    </span>
                    <span>
                      <b>{r.name}</b>
                      {r.city} · {r.product}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
          <Link href={`${b}/suppliers`} className="mu-showrooms" data-reveal>
            <p className="mu-kicker light">{t('showroomsTitle')}</p>
            <b>{t('trustShowrooms', { n: supplierCount })}</b>
            <span className="mu-cities">
              {cities.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </span>
            <span className="mu-link light">{t('findNearest')} →</span>
          </Link>
        </section>
      </div>
    </div>
  );
}

function TrustIcon({ kind }: { kind: 'truck' | 'shield' | 'card' | 'pin' }) {
  const d = {
    truck: 'M3 6h11v9H3zM14 9h4l3 3v3h-7M7 18a2 2 0 100-4 2 2 0 000 4zM17 18a2 2 0 100-4 2 2 0 000 4z',
    shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4',
    card: 'M3 6h18v12H3zM3 10h18M7 15h4',
    pin: 'M12 21s-6-5.5-6-11a6 6 0 0112 0c0 5.5-6 11-6 11zM12 12a2 2 0 100-4 2 2 0 000 4z',
  }[kind];
  return (
    <span className="mu-trust-icon" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
    </span>
  );
}
