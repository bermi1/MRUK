import Link from 'next/link';
import type { BrandView, CategoryView, ProductView } from '@/lib/types';
import type { MessageKey } from '@/lib/i18n';
import { REVIEWS } from '@/lib/content';
import { fmt } from '@/lib/format';
import type { BundleView } from '@/server/catalog';
import { AddBundleButton } from '../../CartButtons';
import { CatGlyph, glyphKind } from '../../CatGlyph';
import { PImg } from '../../PImg';
import { SafeImg } from '../../SafeImg';
import { ProductCard } from '../ProductCard';
import type { HeroLabels, HeroSlideView } from '../shared';
import { SkywoodHero } from './Hero';

type T = (k: MessageKey, v?: Record<string, string | number>) => string;

function Head({ eyebrow, title, sub, action, center }: { eyebrow: string; title: string; sub?: string; action?: React.ReactNode; center?: boolean }) {
  return (
    <div className={`sw-head ${center ? 'center' : ''}`} data-reveal>
      <div>
        <p className="sw-eyebrow">
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

export function SkywoodHome(props: {
  brand: BrandView;
  slides: HeroSlideView[];
  heroLabels: HeroLabels;
  cats: CategoryView[];
  products: ProductView[];
  bundles: BundleView[];
  supplierCount: number;
  cities: string[];
  compare: string[];
  focus: ProductView | undefined;
  t: T;
}) {
  const { brand, slides, heroLabels, cats, products, bundles, supplierCount, cities, compare, focus, t } = props;
  const b = `/${brand.key}`;
  const perMonth = t('perMonthShort');
  const edit = [...products].sort((x, y) => Number(!!y.img) - Number(!!x.img) || y.rating - x.rating).slice(0, 8);
  const quote = REVIEWS.skywood[1] ?? REVIEWS.skywood[0];
  const example = slides[0]?.price ?? products[0]?.price ?? 0;
  const [tag1, ...tagRest] = brand.tagline.split(/(?<=\.)\s+/);

  return (
    <div className="sw-home">
      <SkywoodHero slides={slides} labels={heroLabels} />

      {/* Statement */}
      <section className="sw-statement wrap" data-reveal>
        <p className="sw-statement-t">
          {tag1} {tagRest.length > 0 && <em>{tagRest.join(' ')}</em>}
        </p>
        <p className="sw-statement-s">{t('swIntro')}</p>
      </section>

      {/* Collections */}
      <section className="wrap sw-sec">
        <Head
          eyebrow={t('collections')}
          title={t('collectionsTitle')}
          action={
            <Link href={`${b}/c/all`} className="sw-link d-only">
              {t('viewAll')}
            </Link>
          }
        />
        <div className="sw-cols">
          {cats.map((c, i) => (
            <Link key={c.id} href={`${b}/c/${c.id}`} className={`sw-col c${i}`} data-reveal style={{ ['--i' as string]: i % 3 }}>
              <span className="sw-col-art">
                <span className="sw-col-arch" aria-hidden="true" />
                <CatGlyph kind={glyphKind(c.id, c.name)} className="sw-col-glyph" strokeWidth={0.9} />
                {c.img && <SafeImg src={c.img} alt="" />}
              </span>
              <span className="sw-col-cap">
                <span className="sw-col-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="sw-col-name">{c.name}</span>
                <span className="sw-col-go">
                  {t('explore')} <span aria-hidden="true">→</span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Story band */}
      {focus && (
        <section className="sw-story">
          <div className="wrap sw-story-in">
            <div className="sw-story-media" data-reveal>
              <span className="sw-story-light" aria-hidden="true" />
              <PImg src={focus.img} alt={focus.name} model={focus.model} sub={focus.sub} size="lg" />
            </div>
            <div className="sw-story-copy" data-reveal>
              <p className="sw-eyebrow light">
                <span className="sw-rule" aria-hidden="true" />
                {t('inFocus')} · {focus.catName}
              </p>
              <h2>{focus.name}</h2>
              <ul>
                {focus.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p className="sw-story-price">
                {fmt(focus.price)}
                <em>{t('orPerMonth', { amount: fmt(focus.price / 12) })}</em>
              </p>
              <Link href={`${b}/p/${focus.id}`} className="sw-btn light">
                {t('discover')}
                <span className="sw-btn-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* The edit */}
      <section className="wrap sw-sec">
        <Head
          eyebrow={t('theEdit')}
          title={t('theEditSub')}
          action={
            <Link href={`${b}/c/all`} className="sw-link d-only">
              {t('seeAll')}
            </Link>
          }
        />
        <div className="sw-edit">
          {edit.map((p, i) => (
            <div key={p.id} data-reveal style={{ ['--i' as string]: i % 4 }}>
              <ProductCard p={p} inCompare={compare.includes(p.id)} brand="skywood" badge={p.tag || undefined} perMonth={perMonth} />
            </div>
          ))}
        </div>
      </section>

      {/* Quote */}
      {quote && (
        <section className="sw-quote" data-reveal>
          <div className="wrap">
            <span className="sw-quote-mark" aria-hidden="true">
              “
            </span>
            <blockquote>{quote.q}</blockquote>
            <p className="sw-quote-by">
              {quote.name} · {quote.city} · <span>{quote.product}</span>
            </p>
          </div>
        </section>
      )}

      {/* Salary Advance */}
      <section className="wrap sw-sec">
        <div className="sw-adv" data-reveal>
          <div className="sw-adv-copy">
            <p className="sw-eyebrow">
              <span className="sw-rule" aria-hidden="true" />
              {t('salaryAdvance')}
            </p>
            <h2>{t('swAdvanceTitle')}</h2>
            <p>{t('swAdvanceBody')}</p>
            <img src="/brand/azania-bank.png" alt="Azania Bank" width={44} height={34} loading="lazy" className="sw-az" />
          </div>
          <ul className="sw-adv-terms">
            {[3, 6, 12].map((m, k) => (
              <li key={m} style={{ ['--i' as string]: k }}>
                <span className="sw-adv-n">{m}</span>
                <span className="sw-adv-l">{t('monthsWord')}</span>
                <span className="sw-adv-amt">{t('perMonthShort', { amount: fmt(example / m) })}</span>
              </li>
            ))}
          </ul>
          {slides[0] && (
            <p className="sw-adv-note">
              {slides[0].name} · {fmt(example)}
            </p>
          )}
        </div>
      </section>

      {/* Curated sets */}
      {bundles.length > 0 && (
        <section className="wrap sw-sec">
          <Head
            eyebrow={t('dealsAndBundles')}
            title={t('curatedSets')}
            action={
              <Link href={`${b}/deals`} className="sw-link d-only">
                {t('seeAll')}
              </Link>
            }
          />
          <div className="sw-sets">
            {bundles.slice(0, 3).map((d) => (
              <article key={d.title} className="sw-set" data-reveal>
                <div className="sw-set-imgs">
                  {d.items.map((p) => (
                    <PImg key={p.id} src={p.img} alt={p.name} model={p.model} sub={p.sub} size="sm" />
                  ))}
                </div>
                <div className="sw-set-copy">
                  <h3>{d.title}</h3>
                  <p>{d.items.map((p) => p.name).join(' · ')}</p>
                </div>
                <div className="sw-set-price">
                  <s>{fmt(d.was)}</s>
                  <b>{fmt(d.now)}</b>
                  <span>{t('saveN', { n: d.save })}</span>
                </div>
                <AddBundleButton brand="skywood" ids={d.items.map((p) => p.id)} className="sw-btn sw-btn-sm" />
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Visit */}
      <section className="wrap sw-visit" data-reveal>
        <p className="sw-eyebrow">
          <span className="sw-rule" aria-hidden="true" />
          {t('visitUs')}
        </p>
        <p className="sw-visit-t">{t('showroomsLine', { brand: brand.name, n: supplierCount })}</p>
        <p className="sw-visit-cities">{cities.join(' · ')}</p>
        <Link href={`${b}/suppliers`} className="sw-link">
          {t('findNearest')}
        </Link>
      </section>
    </div>
  );
}
