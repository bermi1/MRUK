import Link from 'next/link';
import type { BrandView, CategoryView, ProductView } from '@/lib/types';
import type { MessageKey } from '@/lib/i18n';
import { reviewsFor } from '@/lib/content';
import { fmt, initials } from '@/lib/format';
import type { BundleView, FlashDeal } from '@/server/catalog';
import { ArrowRightIcon, CardIcon, ChatIcon, PinIcon, ShieldIcon, Stars, TruckIcon } from '../../../icons';
import { AddBundleButton, AddButton } from '../../CartButtons';
import { subscribeLabels } from '../../Footer';
import { Subscribe } from '../../Subscribe';
import { PImg } from '../../PImg';
import { SafeImg } from '../../SafeImg';
import { ProductCard } from '../ProductCard';
import { Rail } from '../Rail';
import type { HeroLabels, HeroSlideView } from '../shared';
import { SkywoodHero } from './Hero';
import { productLabel } from '@/lib/site';
import { categoryFilm } from '@/lib/category-media';
import { FilmTile } from '../mruk/FilmTile';

type T = (k: MessageKey, v?: Record<string, string | number>) => string;

function Head({ eyebrow, title, sub, action, light }: { eyebrow: string; title: string; sub?: string; action?: React.ReactNode; light?: boolean }) {
  return (
    <div className={`sw-head ${light ? 'light' : ''}`} data-reveal>
      <div>
        <p className={`sw-eyebrow ${light ? 'light' : ''}`}>
          <span className="sw-rule" aria-hidden="true" />
          {eyebrow}
        </p>
        <h2>{title}</h2>
        {sub && <p className="sw-head-sub">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function More({ href, children, light }: { href: string; children: React.ReactNode; light?: boolean }) {
  return (
    <Link href={href} className={`sw-link ${light ? 'light' : ''}`}>
      {children}
      <ArrowRightIcon size={15} strokeWidth={1.5} />
    </Link>
  );
}

/**
 * Skywood home: an editorial gallery rhythm (wide/narrow alternation, arches, hairlines, light
 * ivory and plaster bands, slow reveals) that carries the same commerce depth as Mr UK: hero with live
 * price and Pay Later, service promise, collections, new arrivals, films, private offers, curated sets,
 * Pay Later steps, reviews, subscribe and showrooms.
 */
export function SkywoodHome(props: {
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
  const newest = [...products].filter((p) => p.img).sort((x, y) => y.createdAt.localeCompare(x.createdAt) || Number(!!y.img) - Number(!!x.img)).slice(0, 10);
  const reviews = reviewsFor('skywood', payLater);
  // A set is shown only when it has two or more pieces and every piece has its own photo (no empty boxes).
  const sets = bundles.filter((d) => d.items.length > 1 && d.items.every((p) => p.img)).slice(0, 3);
  // Category films (real Skywood footage, silent and caption-free) for the "In motion" strip.
  const films = cats.flatMap((c) => {
    const f = categoryFilm('skywood', c);
    return f ? [{ c, f }] : [];
  }).slice(0, 3);
  // Opening film (real Skywood lifestyle footage, no captions or graphics) comes first unless the CMS already set a video slide.
  const heroSlides: HeroSlideView[] = slides.some((x) => x.video)
    ? slides
    : [
        {
          ...SKYWOOD_FILM_SLIDE,
          eyebrow: t('swFilmEyebrow'),
          title: t('swFilmTitle'),
          sub: t('swFilmSub'),
          href: `${b}/shop`,
          name: brand.name,
          cta: t('filmShop'),
        },
        ...slides,
      ];
  const [tag1, ...tagRest] = brand.tagline.split(/(?<=\.)\s+/);
  const avg = products.length ? products.reduce((a, p) => a + p.rating, 0) / products.length : 0;
  const reviewCount = products.reduce((a, p) => a + p.reviews, 0);
  const catMeta = (c: CategoryView) => {
    const ps = products.filter((p) => p.cat === c.id);
    return { from: ps.length ? Math.min(...ps.map((p) => p.price)) : 0, hero: ps.find((p) => p.img) };
  };

  return (
    <div className="sw-home">
      <SkywoodHero slides={heroSlides} labels={heroLabels} dealsHref={`${b}/deals`} />

      {/* Service promise */}
      <section className="sw-promise" aria-label={t('swPromise')}>
        <div className="wrap sw-promise-in">
          {(
            [
              [<TruckIcon key="1" size={22} strokeWidth={1.3} />, t('trustDelivery'), t('trustDeliverySub'), `${b}/track`],
              [<ShieldIcon key="2" size={22} strokeWidth={1.3} />, t('trustWarranty'), t('trustWarrantySub'), `${b}/support`],
              payLater
                ? ([<CardIcon key="3" size={22} strokeWidth={1.3} />, t('trustAdvance'), t('trustAdvanceSub'), `${b}/pay-later`] as const)
                : ([<ChatIcon key="3" size={22} strokeWidth={1.3} />, t('trustSupport'), t('trustSupportSub'), `${b}/support#whatsapp`] as const),
              [<PinIcon key="4" size={22} strokeWidth={1.3} />, t('trustShowrooms', { n: supplierCount }), t('trustShowroomsSub'), `${b}/suppliers`],
            ] as const
          ).map(([icon, a, s, href], k) => (
            <Link key={href} href={href} className="sw-promise-item" style={{ ['--i' as string]: k }}>
              <span className="sw-promise-ico">{icon}</span>
              <span>
                <b>{a}</b>
                <span>{s}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Statement */}
      <section className="sw-statement" data-reveal>
        <div className="wrap sw-statement-in">
          <p className="sw-statement-t">
            {tag1} {tagRest.length > 0 && <em>{tagRest.join(' ')}</em>}
          </p>
          <p className="sw-statement-s">{t('swIntro')}</p>
        </div>
      </section>

      {/* Collections */}
      <section className="wrap sw-sec sw-sec-tight">
        <Head eyebrow={t('collections')} title={t('collectionsTitle')} action={<More href={`${b}/shop`}>{t('viewAll')}</More>} />
        <div className="sw-cols">
          {cats.map((c, i) => {
            const m = catMeta(c);
            const img = c.img || m.hero?.img || '';
            return (
              <Link key={c.id} href={`${b}/c/${c.id}`} className={`sw-col c${i} tone${i % 4}`} data-reveal style={{ ['--i' as string]: i % 3 }}>
                <span className="sw-col-art" aria-hidden="true">
                  <span className="sw-col-arch" />
                  <span className="sw-col-glow" />
                  {img && <SafeImg src={img} alt="" />}
                </span>
                <span className="sw-col-top">
                  <span className="sw-col-n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="sw-col-count">{t('productsN', { n: c.count })}</span>
                </span>
                <span className="sw-col-cap">
                  <span className="sw-col-name">{c.name}</span>
                  {c.subs.length > 0 && <span className="sw-col-subs">{c.subs.slice(0, 3).join(' · ')}</span>}
                  <span className="sw-col-foot">
                    {m.from > 0 && <span className="sw-col-from">{t('fromPrice', { amount: fmt(m.from) })}</span>}
                    <span className="sw-col-go">
                      {t('explore')} <ArrowRightIcon size={14} strokeWidth={1.5} />
                    </span>
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* New arrivals */}
      <section className="sw-sec sw-arrivals">
        <div className="wrap">
          <Head eyebrow={t('newArrivals')} title={t('newArrivalsSub', { brand: brand.name })} action={<More href={`${b}/shop?sort=new`}>{t('seeAll')}</More>} />
          <Rail labels={{ prev: t('prev'), next: t('next') }} className="sw-rail">
            {newest.map((p) => (
              <ProductCard key={p.id} p={p} inCompare={compare.includes(p.id)} brand="skywood" badge={p.tag || undefined} perMonth={perMonth} />
            ))}
          </Rail>
        </div>
      </section>

      {/* In motion: three category films, each plays only while on screen (poster first, none with reduced motion or Save-Data) */}
      {films.length > 1 && (
        <section className="wrap sw-sec sw-motion">
          <Head eyebrow={t('swMotion')} title={t('swMotionTitle')} />
          <div className="sw-motion-grid">
            {films.map(({ c, f }, i) => (
              <Link key={c.id} href={`${b}/c/${c.id}`} className="sw-motion-item" data-reveal style={{ ['--i' as string]: i }}>
                <FilmTile src={f.src} poster={f.poster} className="sw-motion-film" />
                <span className="sw-motion-cap">
                  <span className="sw-motion-n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="sw-motion-name">{c.name}</span>
                  <span className="sw-motion-go">
                    {t('explore')} <ArrowRightIcon size={14} strokeWidth={1.5} />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Private offers (flash promotions) */}
      {flash.length > 0 && (
        <section className="sw-offers">
          <div className="wrap sw-offers-in">
            <div className="sw-offers-copy" data-reveal>
              <p className="sw-eyebrow light">
                <span className="sw-rule" aria-hidden="true" />
                {t('swOffers')}
              </p>
              <h2>{t('swOffersTitle')}</h2>
              <p className="sw-offers-sub">{t('flashDealsSub')}</p>
              <More href={`${b}/deals`} light>
                {t('seeDeals')}
              </More>
            </div>
            <div className="sw-offers-list">
              {flash.filter((p) => p.stock > 0).slice(0, 3).map((p, i) => (
                <article key={p.id} className="sw-offer" data-reveal style={{ ['--i' as string]: i }}>
                  <Link href={`${b}/p/${p.id}`} className="stretch" aria-label={`${p.name}, ${fmt(p.dealPrice)}`} />
                  <div className="sw-offer-media">
                    <span className="sw-offer-arch" aria-hidden="true" />
                    <PImg src={p.img} alt="" model={p.model} sub={p.sub} size="md" />
                    <span className="sw-offer-seal">
                      <b>−{p.off}%</b>
                    </span>
                  </div>
                  <span className="sw-offer-model">{p.model}</span>
                  <h3>{p.name}</h3>
                  <div className="sw-offer-foot">
                    <div className="sw-offer-price">
                      <b>{fmt(p.dealPrice)}</b>
                      <s>{fmt(p.price)}</s>
                      {perMonth && <span>{perMonth.replace('{amount}', fmt(p.dealPrice / 12))}</span>}
                    </div>
                    {p.stock > 0 && <AddButton brand="skywood" id={p.id} name={p.name} className="sw-offer-add" />}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* In focus */}
      {focus && (
        <section className="wrap sw-sec">
          <div className="sw-story" data-reveal>
            <div className="sw-story-media">
              <span className="sw-story-arch" aria-hidden="true" />
              <span className="sw-story-light" aria-hidden="true" />
              <PImg src={focus.img} alt={productLabel(focus)} model={focus.model} sub={focus.sub} size="lg" />
            </div>
            <div className="sw-story-copy">
              <p className="sw-eyebrow">
                <span className="sw-rule" aria-hidden="true" />
                {t('inFocus')} · {focus.catName}
              </p>
              <h2>{focus.name}</h2>
              <Stars value={focus.rating} size={15} label={t('ratedOutOf', { r: focus.rating.toFixed(1) })} />
              <ul>
                {focus.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p className="sw-story-price">
                {fmt(focus.price)}
                {payLater && <em>{t('orPerMonth', { amount: fmt(focus.price / 12) })}</em>}
              </p>
              <div className="sw-story-cta">
                <Link href={`${b}/p/${focus.id}`} className="sw-btn">
                  {t('discover')}
                  <ArrowRightIcon size={18} strokeWidth={1.5} className="sw-btn-arrow" />
                </Link>
                {focus.stock > 0 && <AddButton brand="skywood" id={focus.id} name={focus.name} className="sw-btn sw-btn-ghost" label={t('addToCart')} />}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Curated sets */}
      {sets.length > 0 && (
        <section className="wrap sw-sec">
          <Head eyebrow={t('dealsAndBundles')} title={t('curatedSets')} sub={t('bundlesSub')} action={<More href={`${b}/deals`}>{t('seeAll')}</More>} />
          <div className="sw-sets">
            {sets.map((d, i) => (
              <article key={d.title} className="sw-set" data-reveal style={{ ['--i' as string]: i }}>
                <div className={`sw-set-stack n${Math.min(d.items.length, 3)}`}>
                  {d.items.slice(0, 3).map((p) => (
                    <Link key={p.id} href={`${b}/p/${p.id}`} className="sw-set-piece" aria-label={productLabel(p)}>
                      <PImg src={p.img} alt="" model={p.model} sub={p.sub} size="md" />
                    </Link>
                  ))}
                </div>
                <div className="sw-set-copy">
                  <div className="sw-set-title">
                    <h3>{d.title}</h3>
                    <span className="sw-set-save">{t('saveN', { n: d.save })}</span>
                  </div>
                  <ul>
                    {d.items.map((p) => (
                      <li key={p.id}>
                        <span>{p.name}</span>
                        <span>{fmt(p.price)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="sw-set-foot">
                  <div className="sw-set-price">
                    <s>{fmt(d.was)}</s>
                    <b>{fmt(d.now)}</b>
                    {payLater && <span>{t('orPerMonth', { amount: fmt(d.now / 12) })}</span>}
                  </div>
                  <AddBundleButton brand="skywood" ids={d.items.map((p) => p.id)} className="sw-btn sw-btn-sm" />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Pay Later */}
      {payLater && (
      <section className="sw-pl">
        <div className="wrap">
          <div className="sw-pl-top" data-reveal>
            <div className="sw-pl-copy">
              <p className="sw-eyebrow">
                <span className="sw-rule" aria-hidden="true" />
                {t('salaryAdvance')}
              </p>
              <h2>{t('swAdvanceTitle')}</h2>
              <div className="sw-pl-cta">
                <Link href={`${b}/pay-later`} className="sw-btn">
                  {t('payLaterHow')}
                  <ArrowRightIcon size={18} strokeWidth={1.5} className="sw-btn-arrow" />
                </Link>
                <img src="/brand/azania-bank.png" alt="Azania Bank" width={44} height={34} loading="lazy" className="sw-az" />
              </div>
            </div>
            <ol className="sw-pl-how">
              {(
                [
                  ['advanceStep1', 'advanceStep1Sub'],
                  ['advanceStep2', 'advanceStep2Sub'],
                  ['advanceStep3', 'advanceStep3Sub'],
                ] as const
              ).map(([a, d], n) => (
                <li key={a} style={{ ['--i' as string]: n }}>
                  <span className="sw-pl-how-n">{String(n + 1).padStart(2, '0')}</span>
                  <span>
                    <b>{t(a)}</b>
                    <small>{t(d)}</small>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="wrap sw-sec">
          <Head
            eyebrow={t('reviewsTitle')}
            title={reviewCount > 0 ? t('swRated', { r: avg.toFixed(1), n: reviewCount.toLocaleString('en-US') }) : t('reviewsTitle')}
            action={reviewCount > 0 ? <Stars value={avg} size={20} className="sw-head-stars" label={t('ratedOutOf', { r: avg.toFixed(1) })} /> : undefined}
          />
          <div className="sw-reviews">
            {reviews.slice(0, 3).map((r, i) => (
              <figure key={r.name} className={`sw-review ${i === 0 ? 'lead' : ''}`} data-reveal style={{ ['--i' as string]: i }}>
                <span className="sw-review-mark" aria-hidden="true">
                  <svg width="34" height="26" viewBox="0 0 34 26" fill="currentColor" aria-hidden="true" focusable="false">
                    <path d="M0 26V15C0 6.7 4.6 1.6 13 0l1.4 3.3C9.5 5 7.3 8 7 12h6v14zm19 0V15c0-8.3 4.6-13.4 13-15l1.4 3.3C28.5 5 26.3 8 26 12h6v14z" />
                  </svg>
                </span>
                <blockquote>{r.q}</blockquote>
                <figcaption>
                  <span className="sw-review-av" aria-hidden="true">
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

      <section className="wrap sw-sec" data-reveal>
        <Subscribe brand="skywood" source="home" labels={subscribeLabels(t, brand.name)} className="home-sub" />
      </section>

      {/* Showrooms (joined to the subscribe band: one hairline between them, no empty gap) */}
      <section className="wrap sw-sec sw-sec-join">
        <div className="sw-visit" data-reveal>
          <div className="sw-visit-copy">
            <p className="sw-eyebrow">
              <span className="sw-rule" aria-hidden="true" />
              {t('visitUs')}
            </p>
            <p className="sw-visit-t">{t('showroomsLine', { brand: brand.name, n: supplierCount })}</p>
            <More href={`${b}/suppliers`}>{t('findNearest')}</More>
          </div>
          <ul className="sw-visit-cities">
            {cities.map((c) => (
              <li key={c}>
                <PinIcon size={18} strokeWidth={1.3} />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

const SKYWOOD_FILM_SLIDE: HeroSlideView = {
  eyebrow: '',
  title: '',
  sub: '',
  img: '/video/skywood-film.webp',
  href: '/skywood/shop',
  price: 0,
  model: 'Skywood',
  name: 'Skywood',
  kind: 'Lifestyle',
  features: [],
  cta: '',
  pid: '',
  layout: 'photo',
  imgMobile: '',
  theme: 'dark',
  align: 'left',
  focal: '50% 50%',
  showPrice: false,
  video: '/video/skywood-film.mp4',
  videoPoster: '/video/skywood-film.webp',
  audio: '',
};
