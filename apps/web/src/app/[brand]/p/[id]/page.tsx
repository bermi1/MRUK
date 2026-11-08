import type { Metadata } from 'next';
import Link from 'next/link';
import { BuyBox } from '@/components/store/BuyBox';
import { Gallery } from '@/components/store/Gallery';
import { PImg } from '@/components/store/PImg';
import { ArrowRightIcon, ChatIcon, PinIcon, SparkleIcon, Stars } from '@/components/icons';
import { Highlights } from '@/components/store/pdp/Highlights';
import { ProductDetails, type DetailSection } from '@/components/store/pdp/ProductDetails';
import { StickyBuyBar } from '@/components/store/pdp/StickyBuyBar';
import { fmt, stockState, waLink } from '@/lib/format';
import type { BrandKey } from '@/lib/types';
import { getCart, getCompareIds } from '@/server/cart';
import { getBrand, getFlashDeals, getProduct, getProducts, getSuppliers } from '@/server/catalog';
import { getT } from '@/server/locale';
import { JsonLd, OgProduct } from '@/components/seo/JsonLd';
import { productLabel, publicUrl } from '@/lib/site';
import { breadcrumbLd, graph, pageMeta, productDescription, productLd, productTitle } from '@/server/seo';
import { payLaterOn } from '@/server/paylater';
import { cleanSpecs, deliveryFee, featureFacts, FREE_DELIVERY_THRESHOLD, highlights, REGIONS } from '@bt/core';

/** Server-side title, description, canonical and OG/Twitter card (image, model, name, price in TZS). */
export async function generateMetadata({ params }: { params: Promise<{ brand: string; id: string }> }): Promise<Metadata> {
  const { brand: key, id } = (await params) as { brand: BrandKey; id: string };
  const [brand, base, flash, payLater] = await Promise.all([getBrand(key), getProduct(key, id), getFlashDeals(key), payLaterOn(key)]);
  const deal = flash.find((f) => f.id === base.id);
  const p = deal ? { ...base, price: deal.dealPrice } : base;
  return pageMeta({
    brand,
    path: `/p/${p.id}`,
    title: productTitle(p, brand.name),
    description: productDescription(p, brand.name, payLater),
    images: p.images.slice(0, 4).map((src) => ({ url: src, alt: productLabel(p) })),
    ogType: 'product',
  });
}

/** Staff descriptions are plain text; blank lines (or single line breaks) separate paragraphs. */
const paragraphs = (text: string | undefined) =>
  (text ?? '')
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);

export default async function ProductPage({ params }: { params: Promise<{ brand: string; id: string }> }) {
  const { brand: key, id } = (await params) as { brand: BrandKey; id: string };
  const [brand, p, products, cmp, cart, suppliers, t, payLater, flash] = await Promise.all([getBrand(key), getProduct(key, id), getProducts(key), getCompareIds(key), getCart(key), getSuppliers(key), getT(), payLaterOn(key), getFlashDeals(key)]);
  // getProducts already applies live deals (p.price = what the customer pays); the deal gives its end date.
  const deal = flash.find((f) => f.id === p.id);
  const st = stockState(p.stock);
  const stockText = st === 'out' ? t('outOfStock') : st === 'low' ? t('onlyLeft', { n: p.stock }) : t('inStock', { n: p.stock });
  const related = products.filter((x) => x.id !== p.id && x.cat === p.cat).slice(0, 8);
  const jsonLd = graph(
    productLd(brand, p, deal ? { price: deal.dealPrice, endsAt: deal.dealEndsAt } : null),
    breadcrumbLd(brand, [
      { name: p.catName, path: `/c/${p.cat}` },
      { name: productLabel(p), path: `/p/${p.id}` },
    ]),
  );

  const url = publicUrl(key, `/p/${p.id}`);
  const features = p.features.map((f) => f.trim()).filter(Boolean);
  const desc = paragraphs(p.description);
  const specs = cleanSpecs(p.specs);
  const wa = brand.whatsapp ? waLink(brand.whatsapp, `Hello ${brand.name}, I have a question about ${p.name} (${p.model}): ${url}`) : '';
  const waBtn = wa ? (
    <a className="pdx-wa" href={wa} target="_blank" rel="noopener noreferrer">
      <ChatIcon size={18} /> {t('chatWhatsApp')}
    </a>
  ) : null;
  const featureList = (
    <ul className="pdx-bullets">
      {features.map((f) => (
        <li key={f}>{f}</li>
      ))}
    </ul>
  );

  // Spec table: model, brand, category and type, then what staff entered; without staff specs,
  // only the measurable facts the features themselves state (nothing invented).
  const factLabel = { capacity: t('specCapacity'), power: t('specPower'), cooling: t('specCooling'), size: t('specSize') } as const;
  const specRows: { label: string; value: string }[] = [
    { label: t('specModel'), value: p.model },
    { label: t('specBrand'), value: brand.name },
    { label: t('specCategory'), value: p.catName },
    ...(p.sub && p.sub.toLowerCase() !== p.catName.toLowerCase() ? [{ label: t('specType'), value: p.sub }] : []),
    ...(specs.length ? specs : featureFacts(features).map((f) => ({ label: factLabel[f.kind], value: f.value }))),
  ];

  const sections: DetailSection[] = [];
  if (desc.length || features.length)
    sections.push({
      id: 'overview',
      title: t('pdOverview'),
      content: desc.length ? (
        <div className="pdx-prose" data-testid="pdp-overview">
          {desc.map((d, k) => (
            <p key={k}>{d}</p>
          ))}
        </div>
      ) : (
        // No description yet: the features become the overview (and the Key features section is skipped).
        <div className="pdx-prose" data-testid="pdp-overview">
          <p>{t('pdOverviewLead', { name: p.name, model: p.model })}</p>
          {featureList}
        </div>
      ),
    });
  if (desc.length && features.length) sections.push({ id: 'features', title: t('pdFeatures'), content: featureList });
  sections.push({
    id: 'specs',
    title: t('pdSpecs'),
    content: (
      <table className="pdx-specs" data-testid="pdp-specs">
        <caption className="sr-only">{t('pdSpecs')}</caption>
        <tbody>
          {specRows.map((r, k) => (
            <tr key={`${r.label}-${k}`}>
              <th scope="row">{r.label}</th>
              <td>{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
  });
  sections.push({
    id: 'delivery',
    title: t('pdDelivery'),
    content: (
      <div className="pdx-prose">
        <table className="pdx-specs pdx-fees" data-testid="pdp-fees">
          <thead>
            <tr>
              <th scope="col">{t('pdRegion')}</th>
              <th scope="col">{t('pdFee')}</th>
              <th scope="col">{t('pdEta')}</th>
            </tr>
          </thead>
          <tbody>
            {REGIONS.map((r) => {
              const fee = deliveryFee(r.name, p.price);
              return (
                <tr key={r.name}>
                  <th scope="row">{r.name}</th>
                  <td>{fee === 0 ? <b className="pdx-free">{t('pdFree')}</b> : fmt(fee)}</td>
                  <td>{r.eta === 'tomorrow' ? t('pdEtaNext') : t('pdEtaDays')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="pdx-note">
          {t('pdFreeDar', { amount: fmt(FREE_DELIVERY_THRESHOLD) })} {t('pdFeeNote')}
        </p>
        {suppliers.length > 0 && (
          <p>
            {t('pdPickup')}{' '}
            <Link href={`/${key}/suppliers`} className="pdx-link">
              <PinIcon size={15} /> {t('pdShowrooms', { n: suppliers.length })}
            </Link>
          </p>
        )}
        <p>{t('pdReturns')}</p>
        {waBtn}
      </div>
    ),
  });
  sections.push({
    id: 'warranty',
    title: t('pdWarranty'),
    content: (
      <div className="pdx-prose">
        <p>{t('pdWarrantyAsk')}</p>
        {waBtn}
        <ul className="pdx-links">
          <li>
            <Link href={`/${key}/support`} className="pdx-link">
              {t('pdSupportForm')} <ArrowRightIcon size={15} />
            </Link>
          </li>
          {brand.supportEmail && (
            <li>
              <a href={`mailto:${brand.supportEmail}`} className="pdx-link">
                {t('pdEmail', { email: brand.supportEmail })}
              </a>
            </li>
          )}
          {suppliers.length > 0 && (
            <li>
              <Link href={`/${key}/suppliers`} className="pdx-link">
                {t('pdShowrooms', { n: suppliers.length })} <ArrowRightIcon size={15} />
              </Link>
            </li>
          )}
        </ul>
      </div>
    ),
  });
  if (payLater)
    sections.push({
      id: 'pay-later',
      title: t('pdPayLater'),
      content: (
        <div className="pdx-prose">
          <p>{t('pdPlLead')}</p>
          <p className="monthly" style={{ fontWeight: 600 }}>
            {t('pdPlFrom', { amount: fmt(p.price / 12) })}
          </p>
          <Link href={`/${key}/pay-later`} className="pdx-link">
            {t('pdPlLink')} <ArrowRightIcon size={15} />
          </Link>
        </div>
      ),
    });

  const galleryLabels = {
    dialog: t('pdPhotos', { name: productLabel(p) }),
    close: t('pdClose'),
    prev: t('pdPrev'),
    next: t('pdNext'),
    zoomIn: t('pdZoomIn'),
    zoomOut: t('pdZoomOut'),
    hint: t('pdZoomHint'),
    count: t('pdCount', { n: '{n}', total: '{total}' }),
    photo: t('pdPhoto', { n: '{n}' }),
    expand: t('pdExpand', { n: '{n}', total: '{total}' }),
    thumbs: t('pdPhotos', { name: productLabel(p) }),
  };

  return (
    <div className="wrap pdp-page" style={{ paddingTop: 24 }}>
      <JsonLd data={jsonLd} />
      <OgProduct price={p.price} availability={p.stock > 0 ? 'in stock' : 'out of stock'} brand={brand.name} />
      <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: 'var(--muted)' }}>
        <Link href={`/${key}`}>{t('home')}</Link> / <Link href={`/${key}/c/${p.cat}`}>{p.catName}</Link> / <span style={{ color: 'var(--text)' }}>{p.model}</span>
      </nav>
      <div className="pdp">
        <Gallery images={p.images} name={p.name} model={p.model} sub={p.sub} badge={stockText} labels={galleryLabels} />
        <div className="pdp-info">
          <div className="eyebrow-muted" style={{ fontSize: 12 }}>
            {p.model}
          </div>
          <h1 style={{ margin: '10px 0 0', fontSize: 'clamp(26px, 3vw, 40px)', lineHeight: 1.06, fontWeight: 600, letterSpacing: '-.025em' }}>{p.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#B7791F', fontWeight: 600, marginTop: 10 }}>
            <Stars value={p.rating} size={15} /> <span style={{ color: 'var(--muted)', fontWeight: 500 }}>{p.rating.toFixed(1)} · {p.reviews} reviews</span>
          </div>
          <Highlights items={highlights(features, 4)} label={t('pdHighlights')} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
            <span data-testid="pdp-price" style={{ fontSize: 'clamp(26px, 3vw, 34px)', fontWeight: 600, letterSpacing: '-.02em' }}>{fmt(p.price)}</span>
            {p.off > 0 && (
              <>
                <s data-testid="pdp-was" style={{ fontSize: 16, color: 'var(--muted)' }}>{fmt(p.listPrice)}</s>
                <span className="badge" style={{ background: '#E23B3B', color: '#fff' }}>
                  {t('flashDealOff', { n: p.off })}
                </span>
              </>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t('vatNote')}</div>
          <div className={`pdp-stock is-${st}`} data-testid="stock-status" data-stock={st} role="status">
            <i aria-hidden="true" />
            {stockText}
          </div>
          {p.price >= 1000 && (
            <div className="earn-pts">
              <SparkleIcon size={16} /> {t('earnPoints', { n: Math.floor(p.price / 1000).toLocaleString('en-US') })}
            </div>
          )}
          <BuyBox
            brand={key}
            product={{ id: p.id, name: p.name, model: p.model, price: p.price, stock: p.stock, img: p.img, features: p.features }}
            share={{ url, domain: brand.domain, brandName: brand.name }}
            inCompare={cmp.includes(p.id)}
            initialMonths={cart.months}
            payLater={payLater}
            labels={{ payInFull: t('payInFull'), payInFullSub: t('payInFullSub'), salaryAdvance: payLater ? t('salaryAdvance') : '', salaryAdvanceSub: payLater ? t('salaryAdvanceSub') : '', addToCart: t('addToCart'), buyNow: t('buyNow'), buyWithAdvance: payLater ? t('buyWithAdvance') : '', share: t('share') }}
          />
          <div id="pdp-buy-sentinel" aria-hidden="true" />
          <div className="perks">
            <a href="#delivery">
              <b>{t('perkDelivery')}</b>
              {t('perkDeliveryV')}
            </a>
            <Link href={`/${key}/suppliers`}>
              <b>{t('perkPickup')}</b>
              {t('perkPickupV', { n: suppliers.length })}
            </Link>
            <a href="#warranty">
              <b>{t('perkSupport')}</b>
              {t('perkSupportV')}
            </a>
          </div>
        </div>
      </div>
      <ProductDetails title={t('pdDetails')} sections={sections} />
      <StickyBuyBar
        brand={key}
        id={p.id}
        name={p.name}
        model={p.model}
        image={p.img}
        price={fmt(p.price)}
        monthly={payLater ? t('orPerMonth', { amount: fmt(p.price / 12) }) : ''}
        stock={p.stock}
        labels={{ addToCart: t('addToCart'), outOfStock: t('outOfStock') }}
      />
      {related.length > 0 && (
        <>
          <div className="row" style={{ alignItems: 'flex-end', marginTop: 56 }}>
            <h2 style={{ margin: 0, fontSize: 'clamp(20px, 2.4vw, 30px)', fontWeight: 600, letterSpacing: '-.02em' }}>{t('moreIn', { cat: p.catName })}</h2>
            <Link href={`/${key}/c/${p.cat}`} className="link-u">
              {t('viewCategory')}
            </Link>
          </div>
          <div className="rail nsb">
            {related.map((r) => (
              <Link key={r.id} href={`/${key}/p/${r.id}`} className="related">
                <PImg src={r.img} alt="" model={r.model} sub={r.sub} size="xs" style={{ height: 100 }} />
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.25 }}>{r.name}</div>
                  <div style={{ fontSize: 14, marginTop: 4 }}>
                    {fmt(r.price)}
                    {r.off > 0 && <s style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 6 }}>{fmt(r.listPrice)}</s>}
                  </div>
                  {payLater && (
                    <div className="monthly" style={{ fontSize: 12 }}>
                      {fmt(r.price / 12)}/mo
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
