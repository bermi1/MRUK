import 'server-only';
import type { Metadata } from 'next';
import { fmt } from '@/lib/format';
import { absUrl, productLabel, publicUrl } from '@/lib/site';
import type { BrandKey, BrandView, CmsView, ProductView } from '@/lib/types';

/**
 * Search and AI-crawler metadata (docs/seo.md): titles, descriptions, canonical URLs,
 * Open Graph / Twitter cards and schema.org JSON-LD. All URLs are absolute public URLs
 * (see lib/site.ts), so a single-brand site never advertises its "/<brand>/..." aliases.
 */

export const TITLE_MAX = 60;
export const DESC_MAX = 155;

/** Shorten on a word boundary, adding an ellipsis when cut. */
export function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:·—–-]+$/, '')}…`;
}

/** "<page> · <Brand>" within 60 characters (the brand suffix is kept, the page part is shortened). */
export function brandTitle(page: string, brandName: string): string {
  const suffix = ` · ${brandName}`;
  return `${clip(page, TITLE_MAX - suffix.length)}${suffix}`;
}

interface PageMetaInput {
  brand: BrandView;
  /** Brand-relative path of the canonical URL ("" for home, "/c/fridges"). */
  path: string;
  /** Full title (already includes the brand where wanted); clipped to 60. */
  title: string;
  description: string;
  images?: { url: string; alt?: string }[];
  /** 'product': og:type is written by <OgProduct> in the page (Next's openGraph has no product type). */
  ogType?: 'website' | 'article' | 'product';
  noindex?: boolean;
  /** Extra <meta> tags (e.g. product:price:amount). */
  other?: Record<string, string>;
}

/** Metadata for one storefront page: absolute title, description, canonical, OG and Twitter. */
export function pageMeta(m: PageMetaInput): Metadata {
  const title = clip(m.title, TITLE_MAX);
  const description = clip(m.description, DESC_MAX);
  const url = publicUrl(m.brand.key, m.path);
  // Every page gets a share image: the page's own, else the brand hero (or logo).
  const own = (m.images ?? []).filter((i) => i.url);
  const images = (own.length ? own : [{ url: m.brand.heroImg || m.brand.logo, alt: m.brand.name }]).map((i) => ({ url: absUrl(i.url), alt: i.alt ?? title }));
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { ...(m.ogType === 'product' ? {} : { type: m.ogType ?? 'website' }), url, title, description, siteName: m.brand.name, locale: 'en_TZ', images },
    twitter: { card: 'summary_large_image', title, description, images: images.map((i) => i.url) },
    ...(m.noindex ? { robots: { index: false, follow: true } } : {}),
    ...(m.other ? { other: m.other } : {}),
  };
}

/** Metadata for private / per-visitor pages (cart, checkout, account...): never indexed, no canonical. */
export function privateMeta(title: string): Metadata {
  return { title, robots: { index: false, follow: false } };
}

/** Brand default share image: CMS SEO image, else the brand hero. */
export function brandImage(brand: BrandView, cms: CmsView): string {
  return cms.seo.img || brand.heroImg || brand.logo;
}

// Product copy -------------------------------------------------------------------

export function productTitle(p: ProductView, brandName: string): string {
  // "UK-F275 Double door refrigerator · TZS 1,250,000 · Mr UK" when it fits; price is dropped first.
  const price = ` · ${fmt(p.price)}`;
  const suffix = ` · ${brandName}`;
  const head = productLabel(p);
  if (head.length + price.length + suffix.length <= TITLE_MAX) return `${head}${price}${suffix}`;
  return brandTitle(head, brandName);
}

export function productDescription(p: ProductView, brandName: string): string {
  const feat = p.features.slice(0, 2).join(', ');
  const stock = p.stock > 0 ? '' : ' Currently out of stock.';
  return clip(`${brandName} ${productLabel(p)}${feat ? `: ${feat}` : ''}. ${fmt(p.price)} or pay monthly with Pay Later. Delivery across Tanzania.${stock}`, DESC_MAX);
}

// JSON-LD ------------------------------------------------------------------------

type Json = Record<string, unknown>;

/** Serialise for an inline <script type="application/ld+json"> (no "</script>" break-out). */
export function ldJson(data: Json | Json[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

const orgId = (b: BrandKey) => `${publicUrl(b)}#organization`;
const siteId = (b: BrandKey) => `${publicUrl(b)}#website`;

export function organizationLd(brand: BrandView, cms: CmsView): Json {
  const sameAs = Object.values(cms.social).filter(Boolean);
  const phone = brand.whatsapp ? `+${brand.whatsapp.replace(/\D/g, '')}` : undefined;
  return {
    '@type': ['Organization', 'OnlineStore'],
    '@id': orgId(brand.key),
    name: brand.name,
    legalName: brand.legal || undefined,
    url: publicUrl(brand.key),
    logo: { '@type': 'ImageObject', url: absUrl(brand.logo) },
    image: absUrl(brand.heroImg || brand.logo),
    slogan: brand.tagline || undefined,
    email: brand.supportEmail || undefined,
    areaServed: { '@type': 'Country', name: 'Tanzania' },
    sameAs: sameAs.length ? sameAs : undefined,
    contactPoint: phone
      ? [{ '@type': 'ContactPoint', contactType: 'customer service', telephone: phone, email: brand.supportEmail || undefined, url: `https://wa.me/${phone.slice(1)}`, areaServed: 'TZ', availableLanguage: ['English', 'Swahili'] }]
      : undefined,
  };
}

export function websiteLd(brand: BrandView): Json {
  return {
    '@type': 'WebSite',
    '@id': siteId(brand.key),
    name: brand.name,
    url: publicUrl(brand.key),
    inLanguage: 'en',
    publisher: { '@id': orgId(brand.key) },
    potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${publicUrl(brand.key, '/search')}?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
  };
}

export function breadcrumbLd(brand: BrandView, items: { name: string; path: string }[]): Json {
  const all = [{ name: brand.name, path: '' }, ...items];
  return {
    '@type': 'BreadcrumbList',
    itemListElement: all.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: publicUrl(brand.key, it.path) })),
  };
}

/** schema.org availability from live stock (≤ 5 left = limited, as the storefront badge says "Only n left"). */
export function availability(stock: number): string {
  if (stock <= 0) return 'https://schema.org/OutOfStock';
  return stock <= 5 ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock';
}

/** Default price validity when no promotion end date is known (marked default, docs/seo.md). */
function defaultPriceValidUntil(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString().slice(0, 10);
}

export function productLd(brand: BrandView, p: ProductView, deal?: { price: number; endsAt: string | null } | null): Json {
  const url = publicUrl(brand.key, `/p/${p.id}`);
  const images = p.images.filter(Boolean).map(absUrl);
  const price = deal ? deal.price : p.price;
  return {
    '@type': 'Product',
    '@id': `${url}#product`,
    url,
    name: productLabel(p),
    model: p.model,
    sku: p.model,
    mpn: p.model,
    category: p.sub ? `${p.catName} > ${p.sub}` : p.catName,
    brand: { '@type': 'Brand', name: brand.name },
    image: images.length ? images : undefined,
    description: [`${productLabel(p)}.`, p.features.length ? `${p.features.join(', ')}.` : ''].join(' ').trim(),
    additionalProperty: p.features.length ? p.features.map((f) => ({ '@type': 'PropertyValue', name: 'Feature', value: f })) : undefined,
    // No aggregateRating/review: the catalogue has no genuine customer reviews yet (never invent them).
    offers: {
      '@type': 'Offer',
      url,
      price: String(Math.round(price)),
      priceCurrency: 'TZS',
      priceValidUntil: deal?.endsAt ? deal.endsAt.slice(0, 10) : defaultPriceValidUntil(),
      availability: availability(p.stock),
      seller: { '@type': 'Organization', '@id': orgId(brand.key), name: brand.legal || brand.name, url: publicUrl(brand.key) },
    },
  };
}

export function itemListLd(brand: BrandView, name: string, products: ProductView[]): Json {
  return {
    '@type': 'ItemList',
    name,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: publicUrl(brand.key, `/p/${p.id}`), name: productLabel(p) })),
  };
}

export function faqLd(qas: { q: string; a: string }[]): Json {
  return { '@type': 'FAQPage', mainEntity: qas.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
}

/** Wrap one or more nodes in a single @graph document. */
export function graph(...nodes: (Json | null | undefined | false)[]): Json {
  return { '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) };
}
