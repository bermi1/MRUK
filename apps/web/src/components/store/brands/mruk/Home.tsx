import Link from 'next/link';
import type { BrandView, CategoryView, ProductView } from '@/lib/types';
import type { MessageKey } from '@/lib/i18n';
import { reviewsFor } from '@/lib/content';
import { fmt } from '@/lib/format';
import type { BundleView, FlashDeal } from '@/server/catalog';
import { AddBundleButton, AddButton } from '../../CartButtons';
import { Countdown } from '../../Countdown';
import { PImg } from '../../PImg';
import { SafeImg } from '../../SafeImg';
import { ProductCard } from '../ProductCard';
import { Rail } from '../Rail';
import type { HeroLabels, HeroSlideView } from '../shared';
import { ArrowRightIcon, BoltIcon, Stars } from '../../../icons';
import { FilmHero } from './FilmHero';
import { productLabel } from '@/lib/site';

type T = (k: MessageKey, v?: Record<string, string | number>) => string;

const fill = (s: string, vars: Record<string, string | number>) => Object.entries(vars).reduce((a, [k, v]) => a.replace(`{${k}}`, String(v)), s);

/** Lifestyle stills from the Mr UK kitchen film (real products in a Tanzanian home). */
const LIFE = { main: '/img/lifestyle/mruk-kitchen-microwave.webp', side: '/img/lifestyle/mruk-kitchen-airfryer.webp' };

/**
 * Mr UK home (v4, editorial): one full-screen lifestyle film, a quiet statement, then large "chapters" (the CMS
 * hero slides, one product each, standing on a glossy floor with its reflection), a lifestyle story, two product
 * rails, one featured bundle, a slim Pay Later line, the four-step journey and one customer voice.
 * No tile grids: every section is either a full-width panel or a horizontal rail.
 */
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
  /** Admin switch: false removes the Pay Later line and every monthly price. */
  payLater: boolean;
  t: T;
}) {
  const { brand, slides, heroLabels, cats, products, flash, bundles, supplierCount, cities, compare, payLater, t } = props;
  const b = `/${brand.key}`;
  const perMonth = payLater ? t('perMonthShort') : '';
  const loved = [...products].sort((x, y) => y.reviews - x.reviews || y.rating - x.rating).slice(0, 10);
  const reviews = reviewsFor('mruk', payLater);
  const voice = reviews[0];
  const avgRating = products.length ? products.reduce((a, p) => a + p.rating, 0) / products.length : 5;
  const reviewCount = products.reduce((a, p) => a + p.reviews, 0);
  const exampleMonthly = products.length ? Math.min(...products.map((p) => p.price)) / 12 : 0;
  const kitchen = cats.find((c) => c.id === 'kitchen');
  const bundle = bundles[0];

  return (
    <div className="mu-home mx">
      <FilmHero eyebrow={t('filmEyebrow')} title={t('filmTitle')} sub={t('filmSub')} primary={{ href: `${b}/shop`, label: t('filmShop') }} secondary={{ href: `${b}/deals`, label: t('filmDeals') }} />

      {/* Statement + the collection as one quiet row */}
      <section className="mx-statement" aria-label={t('helpAndServices')}>
        <div className="wrap">
          <p className="mx-statement-t" data-reveal>
            {t('mxStatement')}
          </p>
          <p className="mx-trust" data-reveal>
            {t('mxTrust', { n: supplierCount })}
          </p>
          <nav className="mx-cats nsb" aria-label={t('mxCats')}>
            {cats.map((c, i) => (
              <Link key={c.id} href={`${b}/c/${c.id}`} className="mx-cat" data-reveal style={{ ['--i' as string]: i }}>
                <span className="mx-cat-art" aria-hidden="true">
                  {c.img && <SafeImg src={c.img} alt="" />}
                </span>
                <span className="mx-cat-name">{c.name}</span>
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {/* Chapters: Admin › CMS › Hero slides, one product per full-width panel */}
      {slides.slice(0, 3).map((s, i) => (
        <Chapter key={`${s.title}-${i}`} s={s} i={i} labels={heroLabels} />
      ))}

      {/* Lifestyle story */}
      <section className="mx-life">
        <div className="wrap mx-life-in">
          <div className="mx-life-media" data-reveal>
            <img src={LIFE.main} alt="" loading="lazy" decoding="async" className="mx-life-main" width={1600} height={900} />
            <img src={LIFE.side} alt="" loading="lazy" decoding="async" className="mx-life-side" width={1600} height={900} />
          </div>
          <div className="mx-life-copy" data-reveal>
            <p className="mx-kicker">{t('mxLifeKicker')}</p>
            <h2 className="mx-h">{t('mxLifeTitle')}</h2>
            <p className="mx-p">{t('mxLifeSub')}</p>
            <Link href={kitchen ? `${b}/c/${kitchen.id}` : `${b}/shop`} className="mx-textlink">
              {t('mxLifeCta')} <ArrowRightIcon size={16} className="i-arrow" />
            </Link>
          </div>
        </div>
      </section>

      {/* Most loved */}
      <section className="mx-sec">
        <div className="wrap">
          <div className="mx-head" data-reveal>
            <div>
              <p className="mx-kicker">{t('mxLoved')}</p>
              <h2 className="mx-h">{t('mxLovedTitle')}</h2>
            </div>
          </div>
          <Rail labels={{ prev: t('prev'), next: t('next') }} className="mu-rail mx-rail">
            {loved.map((p) => (
              <ProductCard key={p.id} p={p} inCompare={compare.includes(p.id)} brand="mruk" badge={p.tag || undefined} perMonth={perMonth} />
            ))}
          </Rail>
        </div>
      </section>

      {/* Flash deals, as a rail on deep navy */}
      {flash.length > 0 && (
        <section className="mx-deals">
          <div className="wrap">
            <div className="mx-head" data-reveal>
              <div>
                <p className="mx-kicker light">
                  <BoltIcon size={13} strokeWidth={2} /> {t('flashDeals')}
                </p>
                <h2 className="mx-h light">{t('flashDealsSub')}</h2>
                <div className="mx-timer-row">
                  <div className="mx-timer">
                    <span>{t('endsIn')}</span>
                    <Countdown compact />
                  </div>
                </div>
              </div>
            </div>
            <Rail labels={{ prev: t('prev'), next: t('next') }} className="mu-rail mx-rail">
              {flash.map((p) => (
                <ProductCard key={p.id} p={p} inCompare={compare.includes(p.id)} brand="mruk" price={p.dealPrice} was={p.price} badge={t('off', { n: p.off })} perMonth={perMonth} />
              ))}
            </Rail>
          </div>
        </section>
      )}

      {/* One featured bundle */}
      {bundle && (
        <section className="mx-sec">
          <div className="wrap">
            <article className="mx-bundle" data-reveal>
              <div className="mx-bundle-copy">
                <p className="mx-kicker">{t('mxBundle')}</p>
                <h2 className="mx-h">{bundle.title}</h2>
                <p className="mx-p">{bundle.items.map((p) => p.name).join(' + ')}</p>
                <p className="mx-bundle-price">
                  <b>{fmt(bundle.now)}</b> <s>{fmt(bundle.was)}</s> <span className="mx-save">{t('saveN', { n: bundle.save })}</span>
                </p>
                <div className="mx-row">
                  <AddBundleButton brand="mruk" ids={bundle.items.map((p) => p.id)} className="mu-btn mu-btn-navy" />
                  <Link href={`${b}/deals`} className="mx-textlink">
                    {t('seeAll')} <ArrowRightIcon size={16} className="i-arrow" />
                  </Link>
                </div>
              </div>
              <div className="mx-bundle-items" aria-hidden="true">
                {bundle.items.slice(0, 3).map((p) => (
                  <span key={p.id} className="mx-bundle-item">
                    <PImg src={p.img} alt={productLabel(p)} model={p.model} sub={p.sub} size="sm" />
                  </span>
                ))}
              </div>
            </article>
          </div>
        </section>
      )}

      {/* Pay Later, one line */}
      {payLater && (
        <section className="mx-pl">
          <div className="wrap mx-pl-in" data-reveal>
            <img src="/brand/azania-bank-white.png" alt="Azania Bank" width={40} height={31} loading="lazy" />
            <p>
              <b>{t('mxPlTitle')}</b> <span>{t('fromPerMonth', { amount: fmt(exampleMonthly) })}</span>
            </p>
            <Link href={`${b}/shop`} className="mx-textlink light">
              {t('buyWithAdvance')} <ArrowRightIcon size={16} className="i-arrow" />
            </Link>
          </div>
        </section>
      )}

      {/* How buying works */}
      <section className="mx-sec" data-testid="mruk-journey">
        <div className="wrap">
          <div className="mx-head" data-reveal>
            <div>
              <p className="mx-kicker">{t('journeyKicker')}</p>
              <h2 className="mx-h">{t('journeyTitle')}</h2>
            </div>
          </div>
          <ol className="mx-steps">
            {(
              [
                ['journey1', 'journey1Sub'],
                ['journey2', 'journey2Sub'],
                ['journey3', 'journey3Sub'],
                ['journey4', 'journey4Sub'],
              ] as const
            ).map(([a, sb], k) => (
              <li key={a} data-reveal style={{ ['--i' as string]: k }}>
                <span className="mx-step-n">{String(k + 1).padStart(2, '0')}</span>
                <b>{t(a)}</b>
                <span>{t(sb)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* One voice + showrooms */}
      {voice && (
        <section className="mx-voice">
          <div className="wrap mx-voice-in" data-reveal>
            <p className="mx-kicker">
              {t('mxVoice')} · {avgRating.toFixed(1)} / 5 · {reviewCount.toLocaleString('en-US')}+
            </p>
            <figure>
              <Stars value={5} size={16} className="mx-stars" />
              <blockquote>“{voice.q}”</blockquote>
              <figcaption>
                {voice.name} · {voice.city} · {voice.product}
              </figcaption>
            </figure>
            <Link href={`${b}/suppliers`} className="mx-showrooms">
              <span>{t('trustShowrooms', { n: supplierCount })}</span>
              <span className="mx-cities">{cities.join(' · ')}</span>
              <span className="mx-textlink">
                {t('findNearest')} <ArrowRightIcon size={16} className="i-arrow" />
              </span>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * One CMS slide as a full-width chapter. Product slides stand the cut-out on a glossy floor with a soft
 * mirror reflection (a flipped copy fading out, hidden from assistive tech); photo slides fill the panel.
 * The headline is the slide title, so staff edit it live in Admin › CMS.
 */
function Chapter({ s, i, labels }: { s: HeroSlideView; i: number; labels: HeroLabels }) {
  const photo = s.layout === 'photo';
  const dark = photo ? s.theme === 'dark' : i % 2 === 0;
  const flip = i % 2 === 1;
  return (
    <section className={`mx-ch ${dark ? 'is-dark' : 'is-light'} ${flip ? 'is-flip' : ''} ${photo ? 'is-photo' : ''}`} aria-label={s.eyebrow || s.name}>
      {photo && (
        <div className="mx-ch-photo" aria-hidden="true">
          <img src={s.img} alt="" loading="lazy" decoding="async" style={s.focal ? { objectPosition: s.focal } : undefined} />
          <span className="mx-ch-shade" />
        </div>
      )}
      <div className="wrap mx-ch-in">
        <div className="mx-ch-copy" data-reveal>
          {s.eyebrow && <p className={`mx-kicker ${dark ? 'light' : ''}`}>{s.eyebrow}</p>}
          <h2 className="mx-ch-t">{s.title}</h2>
          {s.sub && <p className="mx-ch-sub">{s.sub}</p>}
          {s.showPrice && (
            <p className="mx-ch-price">
              <b>{fmt(s.price)}</b>
              {labels.perMonth && <span>{fill(labels.perMonth, { amount: fmt(s.price / 12) })}</span>}
            </p>
          )}
          <div className="mx-row">
            <Link href={s.href} className={`mu-btn ${dark ? 'mu-btn-sky' : 'mu-btn-navy'}`}>
              {s.cta || labels.discover} <ArrowRightIcon size={16} className="i-arrow" />
            </Link>
            {s.pid && <AddButton brand="mruk" id={s.pid} name={s.name} className={`mx-textlink ${dark ? 'light' : ''}`} label={labels.addToCart} />}
          </div>
        </div>
        {!photo && (
          <div className="mx-stage" data-reveal aria-hidden="true">
            {s.model && (
              <span className="mx-ghost" style={{ ['--len' as string]: Math.max(s.model.length, 5) }}>
                {s.model}
              </span>
            )}
            <span className="mx-glow" />
            <div className="mx-obj">
              <SafeImg src={s.img} alt="" />
            </div>
            <div className="mx-reflect">
              <SafeImg src={s.img} alt="" />
            </div>
            <span className="mx-floor" />
          </div>
        )}
      </div>
    </section>
  );
}
