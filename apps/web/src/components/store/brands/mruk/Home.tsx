import Link from 'next/link';
import type { BrandView, CategoryView, ProductView } from '@/lib/types';
import type { MessageKey } from '@/lib/i18n';
import { reviewsFor } from '@/lib/content';
import { fmt, waLink } from '@/lib/format';
import type { BundleView, FlashDeal } from '@/server/catalog';
import { AddBundleButton } from '../../CartButtons';
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
import { FilmTile } from './FilmTile';
import { Spotlight } from './Spotlight';
import { ShowcaseTabs } from './ShowcaseTabs';
import { productLabel } from '@/lib/site';

type T = (k: MessageKey, v?: Record<string, string | number>) => string;

/** Stills from the Mr UK kitchen shoot; each is used once on the page. */
const LIFE = {
  story: '/img/lifestyle/mruk-kitchen-cooking.webp',
  microwave: '/img/lifestyle/mruk-kitchen-microwave.webp',
  airfryer: '/img/lifestyle/mruk-kitchen-airfryer.webp',
};

function Head({ kicker, title, action }: { kicker?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mv7-head" data-reveal>
      <div>
        {kicker && <p className="mv7-kicker">{kicker}</p>}
        <h2 className="mv7-h2">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function More({ href, children, light }: { href: string; children: React.ReactNode; light?: boolean }) {
  return (
    <Link href={href} className={`mv7-link ${light ? 'light' : ''}`}>
      {children} <ArrowRightIcon size={16} className="i-arrow" />
    </Link>
  );
}

/**
 * Mr UK home (v7). Ten sections, one shopper question each, in this order:
 *  1 film hero + trust line   — "is this a real brand for homes like mine?"
 *  2 shop by category         — "where is my aisle?"
 *  3 spotlight (CMS slides)   — "what are you proud of right now?"
 *  4 best sellers / new       — "what do people like me buy?"
 *  5 kitchen story            — "how does it look in a real home?"
 *  6 deals and bundles        — "what is cheaper today?"
 *  7 see it working (films)   — "will it really work in a power cut / on match night?"
 *  8 Pay Later                — "can I afford it?"
 *  9 reviews                  — "can I trust you?"
 * 10 showrooms + subscribe    — "where can I see it, and how do I hear about offers?"
 * Light surfaces throughout; navy only for the film hero and Pay Later. Every image appears once.
 * Products without a photo, and single-item "bundles", are never merchandised.
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
  /** Seasonal offer (Admin › CMS): when on, it leads the offer banner. */
  offer?: { on: boolean; eyebrow: string; title: string; sub: string; cta: string; href: string; img: string };
  /** Admin switch: false removes the Pay Later section, trust item and every monthly price. */
  payLater: boolean;
  t: T;
}) {
  const { brand, slides, heroLabels, cats, products, flash, bundles, supplierCount, cities, compare, focus, payLater, t, offer } = props;
  const b = `/${brand.key}`;
  const perMonth = payLater ? t('perMonthShort') : '';
  const shown = products.filter((p) => p.img);
  const best = shown.filter((p) => p.stock > 0).sort((x, y) => y.reviews - x.reviews || y.rating - x.rating).slice(0, 10);
  const newest = [...shown].sort((x, y) => y.createdAt.localeCompare(x.createdAt)).slice(0, 10);
  const deals = flash.filter((p) => p.img);
  // Fill the deals row: popular in-stock products at their normal price (no deal badge) after the real deals.
  const dealFill = best.filter((p) => !deals.some((d) => d.id === p.id)).slice(0, Math.max(0, 8 - deals.length));
  const sets = bundles.filter((d) => d.items.length >= 2);
  const reviews = reviewsFor('mruk', payLater);
  const avg = products.length ? products.reduce((a, p) => a + p.rating, 0) / products.length : 0;
  const reviewCount = products.reduce((a, p) => a + p.reviews, 0);
  const kitchen = cats.find((c) => c.id === 'kitchen');
  const kitchenPicks = shown.filter((p) => p.cat === 'kitchen').slice(0, 3);
  const tvCat = cats.find((c) => c.id === 'music-tv');
  const genCat = cats.find((c) => c.id === 'generators');
  const catMeta = (c: CategoryView) => {
    const ps = products.filter((p) => p.cat === c.id);
    return { from: ps.length ? Math.min(...ps.map((p) => p.price)) : 0, pic: c.img || ps.find((p) => p.img)?.img || '' };
  };
  const films = [
    { src: MRUK_FILM.src, poster: MRUK_FILM.poster, label: t('mxFilm1') },
    { src: '/video/mruk-home-film.mp4', poster: '/video/mruk-home-film.webp', label: t('mxFilm2') },
  ];
  const spot: HeroSlideView[] = slides.length
    ? slides
    : focus
      ? [{ ...SPOT_BASE, eyebrow: focus.catName, title: productLabel(focus), img: focus.img, href: `${b}/p/${focus.id}`, price: focus.price, model: focus.model, name: focus.name, features: focus.features, pid: focus.stock > 0 ? focus.id : '', showPrice: true }]
      : [];
  const rail = (list: ProductView[]) => (
    <Rail labels={{ prev: t('prev'), next: t('next') }} className="mu-rail mv7-rail">
      {list.map((p) => (
        <ProductCard key={p.id} p={p} inCompare={compare.includes(p.id)} brand="mruk" badge={p.tag || undefined} perMonth={perMonth} />
      ))}
    </Rail>
  );
  // Hero key product: the first CMS slide's product, else the best seller.
  const keyProd = products.find((p) => p.id === slides[0]?.pid && p.img) ?? best[0];
  // Offer banner: the deepest live deal.
  // Prefer a deal whose photo is hosted with the site (always loads), then the biggest saving.
  const topDeal = [...deals].sort((a, c) => Number(c.img.startsWith('/')) - Number(a.img.startsWith('/')) || c.off - a.off)[0];
  const wa = brand.whatsapp ? waLink(brand.whatsapp, `Hello ${brand.name}, I would like to visit a showroom.`) : '';

  return (
    <div className="mu-home mv7">
      {/* 1 · Film hero */}
      <FilmsHero
        films={films}
        eyebrow={t('filmEyebrow')}
        title={t('filmTitle')}
        sub={t('filmSub')}
        primary={{ href: `${b}/shop`, label: t('filmShop') }}
        secondary={{ href: `${b}/deals`, label: t('mv7Deals') }}
        labels={{ pause: t('mv7PauseVideo'), play: t('pdPlay') }}
        feature={keyProd ? { href: `${b}/p/${keyProd.id}`, name: keyProd.name, model: keyProd.model, sub: keyProd.sub, img: keyProd.img, price: fmt(keyProd.price), kicker: t('mv7KeyProd') } : undefined}
      />
      {/* Trust line: the four promises in one calm row, each linking to the detail */}
      <nav className="mv7-trust" aria-label={t('helpAndServices')}>
        <div className="wrap mv7-trust-in nsb">
          {(
            [
              [<TruckIcon key="1" size={18} strokeWidth={1.4} />, t('trustDelivery'), `${b}/track`],
              [<ShieldIcon key="2" size={18} strokeWidth={1.4} />, t('trustWarranty'), `${b}/support`],
              payLater ? ([<CardIcon key="3" size={18} strokeWidth={1.4} />, t('trustAdvance'), `${b}/pay-later`] as const) : ([<ChatIcon key="3" size={18} strokeWidth={1.4} />, t('trustSupport'), `${b}/support#whatsapp`] as const),
              [<PinIcon key="4" size={18} strokeWidth={1.4} />, t('trustShowrooms', { n: supplierCount }), `${b}/suppliers`],
            ] as const
          ).map(([icon, label, href]) => (
            <Link key={href} href={href} className="mv7-trust-item">
              {icon}
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* 2 · Shop by category */}
      <section className="wrap mv7-sec">
        <Head title={t('shopByCategory')} action={<More href={`${b}/shop`}>{t('viewAll')}</More>} />
        <div className="mv7-cats nsb" data-reveal>
          {cats.map((c) => {
            const m = catMeta(c);
            return (
              <Link key={c.id} href={`${b}/c/${c.id}`} className="mv7-cat">
                <span className="mv7-cat-art" aria-hidden="true">
                  {m.pic && <SafeImg src={m.pic} alt="" />}
                </span>
                <span className="mv7-cat-name">{c.name}</span>
                {m.from > 0 && <span className="mv7-cat-from">{t('fromPrice', { amount: fmt(m.from) })}</span>}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Offer banner (blue): the deepest live deal, one tap to the deals page */}
      {(offer?.on || topDeal) && (
        <section className="wrap mv7-sec">
          <Link href={offer?.on ? offer.href : `${b}/deals`} className="mv7-offer" data-reveal>
            <span className="mv7-offer-copy">
              <span className="mv7-kicker light">{offer?.on ? offer.eyebrow || t('mv7Deals') : t('mv7Deals')}</span>
              <span className="mv7-offer-t">{offer?.on ? offer.title : t('mv7OfferT', { n: topDeal!.off, name: topDeal!.name })}</span>
              {offer?.on && offer.sub && <span className="mv7-offer-s">{offer.sub}</span>}
              {topDeal && (
                <span className="mv7-offer-p">
                  {offer?.on && <small>{topDeal.name} · </small>}
                  {fmt(topDeal.dealPrice)} <s>{fmt(topDeal.price)}</s>
                </span>
              )}
              <span className="mv7-offer-cta">
                {offer?.on ? offer.cta : t('seeDeals')} <ArrowRightIcon size={16} className="i-arrow" />
              </span>
            </span>
            <span className="mv7-offer-img" aria-hidden="true">
              {offer?.on && offer.img ? <img src={offer.img} alt="" loading="lazy" decoding="async" /> : topDeal ? <PImg src={topDeal.img} alt="" model={topDeal.model} sub={topDeal.sub} size="md" /> : null}
            </span>
          </Link>
        </section>
      )}

      {/* 7 · See it working: product films, playing only while on screen */}
      {(tvCat || genCat) && (
        <section className="mv7-blue mv7-films-band">
          <div className="wrap">
          <Head kicker={t('actionKicker')} title={t('actionTitle')} />
          <div className="mv7-films" data-reveal>
            {genCat && (
              <Link href={`${b}/c/${genCat.id}`} className="mv7-film">
                <FilmTile src="/video/mruk-generators.mp4" poster="/video/mruk-generators.webp" />
                <span className="mv7-h3">{t('needGenerators')}</span>
                <span className="mv7-link">
                  {genCat.name} <ArrowRightIcon size={16} className="i-arrow" />
                </span>
              </Link>
            )}
            {tvCat && (
              <Link href={`${b}/c/${tvCat.id}`} className="mv7-film">
                <FilmTile src="/video/mruk-tv.mp4" poster="/video/mruk-tv.webp" />
                <span className="mv7-h3">{t('needMusicTv')}</span>
                <span className="mv7-link">
                  {tvCat.name} <ArrowRightIcon size={16} className="i-arrow" />
                </span>
              </Link>
            )}
          </div>
          </div>
        </section>
      )}

      {/* 3 · Spotlight: Admin › CMS slides */}
      {spot.length > 0 && (
        <section className="wrap mv7-sec mv7-spot">
          <Spotlight slides={spot} labels={heroLabels} kicker={slides.length ? t('spotlight') : t('inFocus')} nav={{ prev: t('prev'), next: t('next') }} />
        </section>
      )}

      {/* 4 · Best sellers / new arrivals */}
      {best.length > 0 && (
        <section className="wrap mv7-sec">
          <Head title={t('mxShowcaseTitle')} action={<More href={`${b}/shop`}>{t('viewAll')}</More>} />
          <ShowcaseTabs
            label={t('mxShowcase')}
            tabs={[
              { id: 'best', label: t('mxBest'), panel: rail(best) },
              { id: 'new', label: t('newArrivals'), panel: rail(newest) },
            ]}
          />
        </section>
      )}

      {/* 5 · Kitchen story: products in a real Tanzanian kitchen */}
      <section className="wrap mv7-sec">
        <div className="mv7-story" data-reveal>
          <img className="mv7-story-main" src={LIFE.story} alt="" loading="lazy" decoding="async" width={1280} height={720} />
          <div className="mv7-story-copy">
            <p className="mv7-kicker">{t('mxLifeKicker')}</p>
            <h2 className="mv7-h2">{t('mxLifeTitle')}</h2>
            <p className="mv7-body">{t('mxLifeSub')}</p>
            {kitchenPicks.length > 0 && (
              <ul className="mv7-picks">
                {kitchenPicks.map((p) => (
                  <li key={p.id}>
                    <Link href={`${b}/p/${p.id}`}>
                      <span className="mv7-pick-img">
                        <PImg src={p.img} alt="" model={p.model} sub={p.sub} size="xs" />
                      </span>
                      <span className="mv7-pick-t">
                        {p.name}
                        <b>{fmt(p.price)}</b>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <More href={kitchen ? `${b}/c/${kitchen.id}` : `${b}/shop`}>{t('mxLifeCta')}</More>
          </div>
        </div>
        <div className="mv7-story-pair" data-reveal>
          <img src={LIFE.microwave} alt="" loading="lazy" decoding="async" width={1280} height={720} />
          <img src={LIFE.airfryer} alt="" loading="lazy" decoding="async" width={1280} height={720} />
        </div>
      </section>

      {/* 6 · Deals and bundles (light band) */}
      {(deals.length > 0 || sets.length > 0) && (
        <section className="mv7-deals">
          <div className="wrap">
            <Head
              kicker={t('mv7Deals')}
              title={t('mv7DealsTitle')}
              action={
                deals.length > 0 ? (
                  <div className="mv7-timer">
                    <span>{t('endsIn')}</span>
                    <Countdown compact />
                  </div>
                ) : undefined
              }
            />
            <ShowcaseTabs
              label={t('mv7Deals')}
              tabs={[
                ...(deals.length
                  ? [
                      {
                        id: 'deals',
                        label: t('flashDeals'),
                        panel: (
                          <Rail labels={{ prev: t('prev'), next: t('next') }} className="mu-rail mv7-rail">
                            {deals.map((p) => (
                              <ProductCard key={p.id} p={p} inCompare={compare.includes(p.id)} brand="mruk" price={p.dealPrice} was={p.price} badge={`−${p.off}%`} perMonth={perMonth} />
                            ))}
                            {dealFill.map((p) => (
                              <ProductCard key={p.id} p={p} inCompare={compare.includes(p.id)} brand="mruk" perMonth={perMonth} />
                            ))}
                          </Rail>
                        ),
                      },
                    ]
                  : []),
                ...(sets.length
                  ? [
                      {
                        id: 'sets',
                        label: t('bundlesTitle'),
                        panel: (
                          <div className="mv7-sets nsb" style={{ ['--n' as string]: Math.min(3, sets.length) }}>
                            {sets.map((d) => (
                              <article key={d.title} className="mv7-set">
                                <div className="mv7-set-art">
                                  {d.items.slice(0, 3).map((p) => (
                                    <span key={p.id}>
                                      <PImg src={p.img} alt={productLabel(p)} model={p.model} sub={p.sub} size="sm" />
                                    </span>
                                  ))}
                                  <span className="mv7-save">{t('saveN', { n: d.save })}</span>
                                </div>
                                <h3 className="mv7-h3">{d.title}</h3>
                                <p className="mv7-small">{d.items.map((p) => p.name).join(' + ')}</p>
                                <div className="mv7-set-foot">
                                  <p className="mv7-price">
                                    {fmt(d.now)} <s>{fmt(d.was)}</s>
                                  </p>
                                  <AddBundleButton brand="mruk" ids={d.items.map((p) => p.id)} className="mv7-btn" />
                                </div>
                              </article>
                            ))}
                          </div>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </section>
      )}

      {/* 8 · Pay Later (blue band) */}
      {payLater && (
        <section className="mv7-pl">
          <div className="wrap mv7-pl-in">
            <div>
              <img src="/brand/azania-bank-white.png" alt="Azania Bank" width={56} height={44} loading="lazy" className="mv7-az" />
              <h2 className="mv7-h2 light">{t('advanceTitle')}</h2>
              <More href={`${b}/pay-later`} light>
                {t('payLaterHow')}
              </More>
            </div>
            <ol className="mv7-steps">
              {(
                [
                  ['advanceStep1', 'advanceStep1Sub'],
                  ['advanceStep2', 'advanceStep2Sub'],
                  ['advanceStep3', 'advanceStep3Sub'],
                ] as const
              ).map(([a, d], n) => (
                <li key={a}>
                  <span className="mv7-step-n">{n + 1}</span>
                  <b>{t(a)}</b>
                  <span>{t(d)}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* 9 · Reviews */}
      {reviews.length > 0 && (
        <section className="wrap mv7-sec">
          <Head
            kicker={t('reviewsTitle')}
            title={reviewCount > 0 ? t('swRated', { r: avg.toFixed(1), n: reviewCount.toLocaleString('en-US') }) : t('reviewsTitle')}
            action={reviewCount > 0 ? <Stars value={avg} size={18} className="mv7-stars" label={t('ratedOutOf', { r: avg.toFixed(1) })} /> : undefined}
          />
          <div className="mv7-reviews nsb" data-reveal>
            {reviews.slice(0, 3).map((r) => (
              <figure key={r.name} className="mv7-review">
                <Stars value={5} size={14} className="mv7-stars" />
                <blockquote>{r.q}</blockquote>
                <figcaption>
                  <b>{r.name}</b> · {r.city} · {r.product}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* 10 · Showrooms (no stock photo we do not have: a calm panel with the real towns) + subscribe */}
      <section className="wrap mv7-sec mv7-last">
        <div className="mv7-visit" data-reveal>
          <div>
            <p className="mv7-kicker">{t('visitUs')}</p>
            <h2 className="mv7-h2">{t('mv7Visit', { n: supplierCount, m: cities.length })}</h2>
            <div className="mv7-row">
              <Link href={`${b}/suppliers`} className="mv7-btn">
                <PinIcon size={16} /> {t('findNearest')}
              </Link>
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="mv7-btn ghost">
                  <ChatIcon size={16} /> {t('chatWhatsApp')}
                </a>
              )}
            </div>
          </div>
          <ul className="mv7-towns" aria-label={t('visitUs')}>
            {cities.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <div className="mv7-sub">
          <Subscribe brand="mruk" source="home" labels={subscribeLabels(t, brand.name)} className="home-sub" />
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
