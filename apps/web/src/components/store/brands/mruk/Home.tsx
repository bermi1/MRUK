import Link from 'next/link';
import type { BrandView, CategoryView, ProductView } from '@/lib/types';
import type { MessageKey } from '@/lib/i18n';
import { reviewsFor } from '@/lib/content';
import { img } from '@/lib/img';
import { fmt, initials } from '@/lib/format';
import type { BundleView, FlashDeal } from '@/server/catalog';
import { AddBundleButton, AddButton } from '../../CartButtons';
import { subscribeLabels } from '../../Footer';
import { Subscribe } from '../../Subscribe';
import { Countdown } from '../../Countdown';
import { PImg } from '../../PImg';
import { SafeImg } from '../../SafeImg';
import { ProductCard } from '../ProductCard';
import { Rail } from '../Rail';
import type { HeroLabels, HeroSlideView } from '../shared';
import { ArrowRightIcon, CardIcon, ChatIcon, PinIcon, ShieldIcon, Stars, TruckIcon } from '../../../icons';
import { MRUK_FILM } from './FilmHero';
import { FilmsHero } from './FilmsHero';
import { Spotlight } from './Spotlight';
import { productLabel } from '@/lib/site';

type T = (k: MessageKey, v?: Record<string, string | number>) => string;

/** Lifestyle stills from the Mr UK kitchen film (real products in a Tanzanian home). */
const LIFE = {
  statement: '/img/lifestyle/mruk-kitchen-cooking.webp',
  main: '/img/lifestyle/mruk-kitchen-microwave.webp',
  side: '/img/lifestyle/mruk-kitchen-airfryer.webp',
};

function Head({ kicker, title, sub, action, light }: { kicker: string; title: string; sub?: string; action?: React.ReactNode; light?: boolean }) {
  return (
    <div className="mv-head" data-reveal>
      <div>
        <p className={`mx-kicker ${light ? 'light' : ''}`}>{kicker}</p>
        <h2 className={`mx-h ${light ? 'light' : ''}`}>{title}</h2>
        {sub && <p className="mx-p">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function More({ href, children, light }: { href: string; children: React.ReactNode; light?: boolean }) {
  return (
    <Link href={href} className={`mx-textlink ${light ? 'light' : ''}`}>
      {children} <ArrowRightIcon size={16} className="i-arrow" />
    </Link>
  );
}

/**
 * Mr UK home (v5): the same calm rhythm as the Skywood home, in Mr UK's own language (navy and sky,
 * rounded forms, Archivo). Opening film first in the hero carousel, then a promise strip, a statement on a
 * lifestyle photo, collections as large product photographs, a kitchen lifestyle story, new arrivals,
 * offers, one product in focus, sets, Pay Later, how buying works, reviews, subscribe and showrooms.
 * Every section carries a product photo or a lifestyle photo; there are no drawn illustrations.
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
  focus: ProductView | undefined;
  /** Admin switch: false removes the Pay Later section, promise item and every monthly price. */
  payLater: boolean;
  t: T;
}) {
  const { brand, slides, heroLabels, cats, products, flash, bundles, supplierCount, cities, compare, focus, payLater, t } = props;
  const b = `/${brand.key}`;
  const perMonth = payLater ? t('perMonthShort') : '';
  const newest = [...products].sort((x, y) => y.createdAt.localeCompare(x.createdAt) || Number(!!y.img) - Number(!!x.img)).slice(0, 10);
  const reviews = reviewsFor('mruk', payLater);
  const avg = products.length ? products.reduce((a, p) => a + p.rating, 0) / products.length : 0;
  const reviewCount = products.reduce((a, p) => a + p.reviews, 0);
  const kitchen = cats.find((c) => c.id === 'kitchen');
  const catMeta = (c: CategoryView) => {
    const ps = products.filter((p) => p.cat === c.id);
    return { from: ps.length ? Math.min(...ps.map((p) => p.price)) : 0, hero: ps.find((p) => p.img) };
  };
  // Hero = video only: two caption-free lifestyle films from the Mr UK kitchen shoot, played one after the other.
  const films = [
    { src: MRUK_FILM.src, poster: MRUK_FILM.poster, label: t('mxFilm1') },
    { src: '/video/mruk-home-film.mp4', poster: '/video/mruk-home-film.webp', label: t('mxFilm2') },
  ];
  // Spotlight = the CMS hero slides (Admin › CMS); without any, the "in focus" product.
  const spot: HeroSlideView[] = slides.length
    ? slides
    : focus
      ? [{ ...SPOT_BASE, eyebrow: focus.catName, title: productLabel(focus), img: focus.img, href: `${b}/p/${focus.id}`, price: focus.price, model: focus.model, name: focus.name, features: focus.features, pid: focus.stock > 0 ? focus.id : '', showPrice: true }]
      : [];

  return (
    <div className="mu-home mv">
      <FilmsHero
        films={films}
        eyebrow={t('filmEyebrow')}
        title={t('filmTitle')}
        sub={t('filmSub')}
        primary={{ href: `${b}/shop`, label: t('filmShop') }}
        secondary={{ href: `${b}/deals`, label: t('filmDeals') }}
        labels={{ pause: heroLabels.pause, play: heroLabels.play }}
      />

      {/* Service promise */}
      <section className="mv-promise" aria-label={t('helpAndServices')}>
        <div className="wrap mv-promise-in">
          {(
            [
              [<TruckIcon key="1" size={22} strokeWidth={1.4} />, t('trustDelivery'), t('trustDeliverySub'), `${b}/track`],
              [<ShieldIcon key="2" size={22} strokeWidth={1.4} />, t('trustWarranty'), t('trustWarrantySub'), `${b}/support`],
              payLater
                ? ([<CardIcon key="3" size={22} strokeWidth={1.4} />, t('trustAdvance'), t('trustAdvanceSub'), `${b}/pay-later`] as const)
                : ([<ChatIcon key="3" size={22} strokeWidth={1.4} />, t('trustSupport'), t('trustSupportSub'), `${b}/support#whatsapp`] as const),
              [<PinIcon key="4" size={22} strokeWidth={1.4} />, t('trustShowrooms', { n: supplierCount }), t('trustShowroomsSub'), `${b}/suppliers`],
            ] as const
          ).map(([icon, a, s, href]) => (
            <Link key={href} href={href} className="mv-promise-item">
              <span className="mv-promise-ico">{icon}</span>
              <span>
                <b>{a}</b>
                <span>{s}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Statement on a lifestyle photo */}
      <section className="mv-statement" data-reveal>
        <img className="mv-statement-bg" src={LIFE.statement} alt="" loading="lazy" decoding="async" width={1600} height={900} />
        <div className="wrap mv-statement-in">
          <p className="mv-statement-t">{brand.tagline}.</p>
          <p className="mv-statement-s">{t('mxStatement')}</p>
        </div>
      </section>

      {/* Collections: one large product photograph per category */}
      <section className="wrap mv-sec">
        <Head kicker={t('collections')} title={t('collectionsTitle')} action={<More href={`${b}/shop`}>{t('viewAll')}</More>} />
        <div className="mv-cols">
          {cats.map((c, i) => {
            const m = catMeta(c);
            const pic = c.img || m.hero?.img || '';
            return (
              <Link key={c.id} href={`${b}/c/${c.id}`} className={`mv-col c${i}`} data-reveal style={{ ['--i' as string]: i % 3 }}>
                <span className="mv-col-art" aria-hidden="true">
                  <span className="mv-col-glow" />
                  {pic && <SafeImg src={pic} alt="" />}
                </span>
                <span className="mv-col-top">
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <span>{t('productsN', { n: c.count })}</span>
                </span>
                <span className="mv-col-cap">
                  <span className="mv-col-name">{c.name}</span>
                  {c.subs.length > 0 && <span className="mv-col-subs">{c.subs.slice(0, 3).join(' · ')}</span>}
                  <span className="mv-col-foot">
                    {m.from > 0 && <span>{t('fromPrice', { amount: fmt(m.from) })}</span>}
                    <span className="mv-col-go">
                      {t('explore')} <ArrowRightIcon size={14} />
                    </span>
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Kitchen lifestyle story */}
      <section className="mx-life mv-life">
        <div className="wrap mx-life-in">
          <div className="mx-life-media" data-reveal>
            <img src={LIFE.main} alt="" loading="lazy" decoding="async" className="mx-life-main" width={1600} height={900} />
            <img src={LIFE.side} alt="" loading="lazy" decoding="async" className="mx-life-side" width={1600} height={900} />
          </div>
          <div className="mx-life-copy" data-reveal>
            <p className="mx-kicker">{t('mxLifeKicker')}</p>
            <h2 className="mx-h">{t('mxLifeTitle')}</h2>
            <p className="mx-p">{t('mxLifeSub')}</p>
            <More href={kitchen ? `${b}/c/${kitchen.id}` : `${b}/shop`}>{t('mxLifeCta')}</More>
          </div>
        </div>
      </section>

      {/* New arrivals */}
      <section className="mv-sec mv-arrivals">
        <div className="wrap">
          <Head kicker={t('newArrivals')} title={t('newArrivalsSub', { brand: brand.name })} />
          <Rail labels={{ prev: t('prev'), next: t('next') }} className="mu-rail">
            {newest.map((p) => (
              <ProductCard key={p.id} p={p} inCompare={compare.includes(p.id)} brand="mruk" badge={p.tag || undefined} perMonth={perMonth} />
            ))}
          </Rail>
        </div>
      </section>

      {/* Offers (flash promotions) */}
      {flash.length > 0 && (
        <section className="mv-offers">
          <div className="wrap mv-offers-in">
            <div className="mv-offers-copy" data-reveal>
              <p className="mx-kicker light">{t('flashDeals')}</p>
              <h2 className="mx-h light">{t('flashDealsSub')}</h2>
              <div className="mx-timer mv-timer">
                <span>{t('endsIn')}</span>
                <Countdown compact />
              </div>
              <More href={`${b}/deals`} light>
                {t('seeDeals')}
              </More>
            </div>
            <div className="mv-offers-list">
              {flash.slice(0, 3).map((p, i) => (
                <article key={p.id} className="mv-offer" data-reveal style={{ ['--i' as string]: i }}>
                  <Link href={`${b}/p/${p.id}`} className="stretch" aria-label={`${p.name}, ${fmt(p.dealPrice)}`} />
                  <div className="mv-offer-media">
                    <PImg src={p.img} alt="" model={p.model} sub={p.sub} size="md" />
                    <span className="mv-offer-seal">−{p.off}%</span>
                  </div>
                  <span className="mv-offer-model">{p.model}</span>
                  <h3>{p.name}</h3>
                  <div className="mv-offer-foot">
                    <div className="mv-offer-price">
                      <b>{fmt(p.dealPrice)}</b>
                      <s>{fmt(p.price)}</s>
                    </div>
                    {p.stock > 0 && <AddButton brand="mruk" id={p.id} name={p.name} className="mv-offer-add" />}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* In the spotlight: Admin › CMS slides, one product at a time */}
      {spot.length > 0 && (
        <section className="wrap mv-sec">
          <Spotlight slides={spot} labels={heroLabels} kicker={slides.length ? t('spotlight') : t('inFocus')} />
        </section>
      )}

      {/* Sets */}
      {bundles.length > 0 && (
        <section className="wrap mv-sec">
          <Head kicker={t('dealsAndBundles')} title={t('bundlesTitle')} sub={t('bundlesSub')} action={<More href={`${b}/deals`}>{t('seeAll')}</More>} />
          <div className="mv-sets">
            {bundles.slice(0, 3).map((d, i) => (
              <article key={d.title} className="mv-set" data-reveal style={{ ['--i' as string]: i }}>
                <div className="mv-set-stack">
                  {d.items.slice(0, 3).map((p) => (
                    <span key={p.id} className="mv-set-piece">
                      <PImg src={p.img} alt={productLabel(p)} model={p.model} sub={p.sub} size="sm" />
                    </span>
                  ))}
                  <span className="mx-save mv-set-save">{t('saveN', { n: d.save })}</span>
                </div>
                <h3>{d.title}</h3>
                <p className="mv-set-items">{d.items.map((p) => p.name).join(' + ')}</p>
                <div className="mv-set-foot">
                  <div className="mv-set-price">
                    <s>{fmt(d.was)}</s>
                    <b>{fmt(d.now)}</b>
                  </div>
                  <AddBundleButton brand="mruk" ids={d.items.map((p) => p.id)} className="mu-btn mu-btn-navy mu-btn-sm" />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Pay Later */}
      {payLater && (
        <section className="mv-pl">
          <div className="wrap mv-pl-in" data-reveal>
            <div>
              <img src="/brand/azania-bank-white.png" alt="Azania Bank" width={46} height={36} loading="lazy" className="mv-az" />
              <h2 className="mx-h light">{t('advanceTitle')}</h2>
              <More href={`${b}/pay-later`} light>
                {t('payLaterHow')}
              </More>
            </div>
            <ol className="mv-pl-how">
              {(
                [
                  ['advanceStep1', 'advanceStep1Sub'],
                  ['advanceStep2', 'advanceStep2Sub'],
                  ['advanceStep3', 'advanceStep3Sub'],
                ] as const
              ).map(([a, d], n) => (
                <li key={a}>
                  <span className="mv-pl-n">{String(n + 1).padStart(2, '0')}</span>
                  <span>
                    <b>{t(a)}</b>
                    <small>{t(d)}</small>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* How buying works, beside a still from the film */}
      <section className="wrap mv-sec" data-testid="mruk-journey">
        <div className="mv-journey">
          <div className="mv-journey-photo" aria-hidden="true">
            <img src={MRUK_FILM.poster} alt="" loading="lazy" decoding="async" width={1600} height={900} />
          </div>
          <div>
            <p className="mx-kicker">{t('journeyKicker')}</p>
            <h2 className="mx-h">{t('journeyTitle')}</h2>
            <ol className="mv-journey-steps">
              {(
                [
                  ['journey1', 'journey1Sub'],
                  ['journey2', 'journey2Sub'],
                  ['journey3', 'journey3Sub'],
                  ['journey4', 'journey4Sub'],
                ] as const
              ).map(([a, sb], k) => (
                <li key={a}>
                  <span className="mv-journey-n">{String(k + 1).padStart(2, '0')}</span>
                  <span>
                    <b>{t(a)}</b>
                    <small>{t(sb)}</small>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="wrap mv-sec">
          <Head
            kicker={t('reviewsTitle')}
            title={reviewCount > 0 ? t('swRated', { r: avg.toFixed(1), n: reviewCount.toLocaleString('en-US') }) : t('reviewsTitle')}
            action={reviewCount > 0 ? <Stars value={avg} size={20} className="mx-stars" label={t('ratedOutOf', { r: avg.toFixed(1) })} /> : undefined}
          />
          <div className="mv-reviews">
            {reviews.slice(0, 3).map((r, i) => (
              <figure key={r.name} className={`mv-review ${i === 0 ? 'lead' : ''}`} data-reveal style={{ ['--i' as string]: i }}>
                <blockquote>“{r.q}”</blockquote>
                <figcaption>
                  <span className="mv-review-av" aria-hidden="true">
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
        </section>
      )}

      <section className="wrap mv-sec" data-reveal>
        <Subscribe brand="mruk" source="home" labels={subscribeLabels(t, brand.name)} className="home-sub" />
      </section>

      {/* Showrooms, on a lifestyle photo */}
      <section className="wrap mv-sec mv-last">
        <div className="mv-visit" data-reveal>
          <img className="mv-visit-bg" src={img(LIFE.side, 1200)} alt="" loading="lazy" decoding="async" />
          <div className="mv-visit-copy">
            <p className="mx-kicker light">{t('visitUs')}</p>
            <p className="mv-visit-t">{t('showroomsLine', { brand: brand.name, n: supplierCount })}</p>
            <More href={`${b}/suppliers`} light>
              {t('findNearest')}
            </More>
          </div>
          <ul className="mv-visit-cities">
            {cities.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

const SPOT_BASE: HeroSlideView = {
  eyebrow: '',
  title: '',
  sub: '',
  img: '',
  href: '',
  price: 0,
  model: '',
  name: '',
  kind: '',
  features: [],
  cta: '',
  pid: '',
  layout: 'product',
  imgMobile: '',
  theme: 'dark',
  align: 'left',
  focal: '50% 50%',
  showPrice: true,
  video: '',
  videoPoster: '',
  audio: '',
};
