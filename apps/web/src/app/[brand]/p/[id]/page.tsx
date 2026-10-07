import type { Metadata } from 'next';
import Link from 'next/link';
import { BuyBox } from '@/components/store/BuyBox';
import { Gallery } from '@/components/store/Gallery';
import { PImg } from '@/components/store/PImg';
import { fmt, stockLabel } from '@/lib/format';
import type { BrandKey } from '@/lib/types';
import { getCart, getCompareIds } from '@/server/cart';
import { getBrand, getFlashDeals, getProduct, getProducts, getSuppliers } from '@/server/catalog';
import { env } from '@/server/env';
import { getT } from '@/server/locale';

function abs(url: string) {
  return url.startsWith('http') ? url : `${env.APP_URL}${url}`;
}

/** Server-side OG/Twitter meta: image, name, price and monthly price (README). */
export async function generateMetadata({ params }: { params: Promise<{ brand: string; id: string }> }): Promise<Metadata> {
  const { brand: key, id } = (await params) as { brand: BrandKey; id: string };
  const [brand, p] = await Promise.all([getBrand(key), getProduct(key, id)]);
  const title = `${p.name} (${p.model}) — ${fmt(p.price)}`;
  const description = `${fmt(p.price)} or ${fmt(p.price / 12)}/month with Azania Bank Salary Advance. ${p.features.join(' · ')}.`;
  const images = p.img ? [{ url: abs(p.img), alt: p.name }] : undefined;
  return {
    title: p.name,
    description,
    alternates: { canonical: `/${key}/p/${p.id}` },
    openGraph: { type: 'website', title, description, siteName: brand.name, url: `/${key}/p/${p.id}`, images },
    twitter: { card: 'summary_large_image', title, description, images: images?.map((i) => i.url) },
    other: { 'product:price:amount': String(p.price), 'product:price:currency': 'TZS' },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ brand: string; id: string }> }) {
  const { brand: key, id } = (await params) as { brand: BrandKey; id: string };
  const [brand, base, products, cmp, cart, suppliers, t, flash] = await Promise.all([getBrand(key), getProduct(key, id), getProducts(key), getCompareIds(key), getCart(key), getSuppliers(key), getT(), getFlashDeals(key)]);
  const deal = flash.find((f) => f.id === base.id);
  const p = deal ? { ...base, price: deal.dealPrice } : base;
  const related = products.filter((x) => x.id !== p.id && x.cat === p.cat).slice(0, 8);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.model,
    brand: { '@type': 'Brand', name: brand.name },
    image: p.img ? [abs(p.img)] : undefined,
    description: p.features.join(', '),
    aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviews },
    offers: { '@type': 'Offer', priceCurrency: 'TZS', price: p.price, availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
  };
  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: 'var(--muted)' }}>
        <Link href={`/${key}`}>Home</Link> / <Link href={`/${key}/c/${p.cat}`}>{p.catName}</Link> / <span style={{ color: 'var(--text)' }}>{p.model}</span>
      </nav>
      <div className="pdp">
        <Gallery images={p.images} name={p.name} model={p.model} sub={p.sub} badge={stockLabel(p.stock)} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="eyebrow-muted" style={{ fontSize: 12 }}>
            {p.model}
          </div>
          <h1 style={{ margin: '10px 0 0', fontSize: 'clamp(26px, 3vw, 40px)', lineHeight: 1.06, fontWeight: 600, letterSpacing: '-.025em' }}>{p.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#B7791F', fontWeight: 600, marginTop: 10 }}>
            ★★★★★ <span style={{ color: 'var(--muted)', fontWeight: 500 }}>{p.rating.toFixed(1)} · {p.reviews} reviews</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {p.features.map((f) => (
              <span key={f} style={{ borderRadius: 999, background: 'var(--surface)', padding: '7px 13px', fontSize: 13, fontWeight: 500 }}>
                {f}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'clamp(26px, 3vw, 34px)', fontWeight: 600, letterSpacing: '-.02em' }}>{fmt(p.price)}</span>
            {deal && (
              <>
                <span style={{ fontSize: 16, color: 'var(--muted)', textDecoration: 'line-through' }}>{fmt(base.price)}</span>
                <span className="badge" style={{ background: '#E23B3B', color: '#fff' }}>
                  Flash deal −{deal.off}%
                </span>
              </>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t('vatNote')}</div>
          <BuyBox
            brand={key}
            product={{ id: p.id, name: p.name, model: p.model, price: p.price, stock: p.stock, img: p.img, features: p.features }}
            share={{ url: `https://${brand.domain}/p/${p.id}`, domain: brand.domain, brandName: brand.name }}
            inCompare={cmp.includes(p.id)}
            initialMonths={cart.months}
            labels={{ payInFull: t('payInFull'), payInFullSub: t('payInFullSub'), salaryAdvance: t('salaryAdvance'), salaryAdvanceSub: t('salaryAdvanceSub'), addToCart: t('addToCart'), buyNow: t('buyNow'), buyWithAdvance: t('buyWithAdvance'), share: t('share') }}
          />
          <div className="perks">
            <div>
              <b>Delivery</b>Dar tomorrow · regions 2–4 days
            </div>
            <div>
              <b>Pickup</b>
              {suppliers.length} showrooms
            </div>
            <div>
              <b>Support</b>WhatsApp 7 days
            </div>
          </div>
        </div>
      </div>
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
                <PImg src={r.img} alt="" model={r.model} size="xs" style={{ height: 100 }} />
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.25 }}>{r.name}</div>
                  <div style={{ fontSize: 14, marginTop: 4 }}>{fmt(r.price)}</div>
                  <div className="monthly" style={{ fontSize: 12 }}>
                    {fmt(r.price / 12)}/mo
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
