import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { revalidateTag, unstable_cache } from 'next/cache';
import { prisma } from '@bt/db';
import { bundlePrice, salePrice, type ProductFacts } from '@bt/core';
import type { BrandKey, BrandView, CategoryView, CmsView, HeroSlide, ProductView } from '@/lib/types';

export const BRAND_KEYS: BrandKey[] = ['mruk', 'skywood'];

export function isBrandKey(v: string): v is BrandKey {
  return v === 'mruk' || v === 'skywood';
}

/**
 * Catalogue reads are cached across requests (the database is a network hop away).
 * Admin changes call refreshCatalog(); the time limit is a safety net for stock
 * changes made by checkout, which re-checks stock in the database anyway.
 */
export const CATALOG_TAG = 'catalog';
const CATALOG_TTL = 60;
const cached = <A extends unknown[], R>(fn: (...a: A) => Promise<R>, key: string) => unstable_cache(fn, [key], { tags: [CATALOG_TAG], revalidate: CATALOG_TTL });

const loadBrand = cached(async (key: BrandKey) => prisma.brand.findUnique({ where: { key } }), 'brand');

export const getBrand = cache(async (key: string): Promise<BrandView> => {
  if (!isBrandKey(key)) notFound();
  const b = await loadBrand(key);
  if (!b) notFound();
  const t = b.tokens as Record<string, string>;
  return {
    key,
    name: b.name,
    legal: b.legal,
    domain: b.domain,
    tagline: b.tagline,
    whatsapp: b.whatsapp,
    supportEmail: b.supportEmail,
    heroImg: b.heroImg,
    primary: t.primary!,
    dark: t.dark!,
    soft: t.soft!,
    ink: t.ink!,
    accent: t.accent!,
    hi: t.hi!,
    r: t.r!,
    rs: t.rs!,
    head: t.head!,
    track: t.track!,
    logo: t.logo || `/brand/${key}.png`,
  };
});

export const getCategories = cache(
  cached(async (brand: BrandKey): Promise<CategoryView[]> => {
  const cats = await prisma.category.findMany({ where: { brandKey: brand }, orderBy: { sort: 'asc' }, include: { _count: { select: { products: { where: { hidden: false } } } } } });
  return cats.map((c) => ({ id: c.slug, name: c.name, short: c.short, img: c.img, subs: c.subs, count: c._count.products }));
  }, 'categories'),
);

type DbProduct = Awaited<ReturnType<typeof prisma.product.findMany<{ include: { category: true } }>>>[number];

export function toView(p: DbProduct): ProductView {
  return {
    id: p.id,
    brand: p.brandKey as BrandKey,
    cat: p.category.slug,
    catName: p.category.name,
    sub: p.sub,
    model: p.model,
    name: p.name,
    price: p.price,
    stock: p.stock,
    features: p.features,
    img: p.images[0] ?? '',
    images: p.images,
    tag: p.tag,
    rating: p.rating,
    reviews: p.reviews,
    hidden: p.hidden,
    createdAt: p.createdAt.toISOString(),
  };
}

export const getProducts = cache(
  cached(async (brand: BrandKey): Promise<ProductView[]> => {
    const ps = await prisma.product.findMany({ where: { brandKey: brand, hidden: false }, include: { category: true }, orderBy: [{ createdAt: 'asc' }] });
    return ps.map(toView);
  }, 'products'),
);

export const getAllProducts = cache(async (): Promise<ProductView[]> => {
  const [a, b] = await Promise.all([getProducts('mruk'), getProducts('skywood')]);
  return [...a, ...b];
});

export async function getProduct(brand: BrandKey, id: string): Promise<ProductView> {
  const p = (await getProducts(brand)).find((x) => x.id === id);
  if (!p) notFound();
  return p;
}

/** Sort products that have a photo first (prototype "popular" order). */
export function photoFirst<T extends { img: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => Number(!!b.img) - Number(!!a.img));
}

export function searchProducts(products: ProductView[], q: string): ProductView[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return products.filter((p) => {
    const t = `${p.model} ${p.name} ${p.sub} ${p.catName} ${p.features.join(' ')}`.toLowerCase();
    return terms.every((x) => t.includes(x));
  });
}

export function toFacts(p: ProductView): ProductFacts {
  return { id: p.id, brand: p.brand, model: p.model, name: p.name, category: p.catName, sub: p.sub, price: p.price, stock: p.stock, features: p.features };
}

// CMS --------------------------------------------------------------------------

const loadCmsBlocks = cached(async (brand: BrandKey) => (await prisma.cmsBlock.findMany({ where: { brandKey: brand } })).map((b) => ({ key: b.key, json: b.json })), 'cms');

/** Safe link for a CMS button: store-relative path or https URL only (no javascript:, no protocol-relative). */
export function safeHref(v: unknown): string {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  return /^\/(?!\/)[^\s]*$/.test(s) || /^https:\/\/[^\s]+$/.test(s) ? s : '';
}

/** Hero media must be one of our own uploaded public files. */
export function safeMedia(v: unknown): string {
  return typeof v === 'string' && /^\/api\/files\/public\/[a-z0-9][a-z0-9/_.-]{0,200}$/i.test(v) && !v.includes('..') ? v : '';
}

/** Fill the optional hero fields with safe defaults so older CMS rows keep working. */
export function heroDefaults(h: Partial<HeroSlide>): Required<HeroSlide> {
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    pid: str(h.pid),
    eyebrow: str(h.eyebrow),
    title: str(h.title),
    sub: str(h.sub),
    img: str(h.img),
    cta: str(h.cta).slice(0, 40),
    href: safeHref(h.href),
    price: typeof h.price === 'number' && Number.isFinite(h.price) && h.price >= 0 ? Math.round(h.price) : null,
    imgMobile: str(h.imgMobile),
    layout: h.layout === 'photo' ? 'photo' : 'product',
    theme: h.theme === 'light' ? 'light' : 'dark',
    align: h.align === 'center' || h.align === 'right' ? h.align : 'left',
    focal: typeof h.focal === 'string' && /^\d{1,3}% \d{1,3}%$/.test(h.focal.trim()) ? h.focal.trim() : '50% 50%',
    video: safeMedia(h.video),
    videoPoster: safeMedia(h.videoPoster),
    audio: safeMedia(h.audio),
  };
}

export const getCms = cache(async (brand: BrandKey): Promise<CmsView> => {
  const blocks = await loadCmsBlocks(brand);
  const m = Object.fromEntries(blocks.map((b) => [b.key, b.json])) as Record<string, unknown>;
  return {
    announcement: (m.announcement as string) ?? '',
    hero: (Array.isArray(m.hero) ? (m.hero as Partial<HeroSlide>[]) : []).map(heroDefaults),
    megaPromo: (m.megaPromo as CmsView['megaPromo']) ?? { eyebrow: '', title: '', cta: '', cat: '' },
    deals: (m.deals as CmsView['deals']) ?? [],
    seo: (m.seo as CmsView['seo']) ?? { title: '', desc: '', img: '' },
    hot: (m.hot as string[]) ?? [],
  };
});

export interface BundleView {
  title: string;
  save: number;
  tag: string;
  items: ProductView[];
  was: number;
  now: number;
}

export async function getBundles(brand: BrandKey): Promise<BundleView[]> {
  const [cms, products] = await Promise.all([getCms(brand), getProducts(brand)]);
  return cms.deals
    .map((d) => {
      const items = d.items.map((id) => products.find((p) => p.id === id)).filter((p): p is ProductView => !!p);
      const { was, now } = bundlePrice(items.map((p) => p.price), d.save);
      return { title: d.title, save: d.save, tag: d.tag ?? 'Bundle', items, was, now };
    })
    .filter((b) => b.items.length);
}

const loadFlashPromos = cached(
  async (brand: BrandKey) =>
    (await prisma.promotion.findMany({ where: { brandKey: brand, kind: 'flash', active: true }, orderBy: { createdAt: 'asc' } })).map((p) => ({ productId: p.productId, percent: p.percent, endsAt: p.endsAt?.toISOString() ?? null })),
  'flash',
);

export interface FlashDeal extends ProductView {
  off: number;
  dealPrice: number;
}

export async function getFlashDeals(brand: BrandKey): Promise<FlashDeal[]> {
  const [promos, products] = await Promise.all([loadFlashPromos(brand), getProducts(brand)]);
  const now = Date.now();
  return promos
    .filter((pr) => !pr.endsAt || new Date(pr.endsAt).getTime() > now)
    .map((pr) => {
      const p = products.find((x) => x.id === pr.productId);
      return p ? { ...p, off: pr.percent, dealPrice: salePrice(p.price, pr.percent) } : null;
    })
    .filter((x): x is FlashDeal => !!x);
}

const loadSuppliers = cached(async () => prisma.supplier.findMany({ orderBy: [{ city: 'asc' }, { area: 'asc' }] }), 'suppliers');

export async function getSuppliers(brand?: BrandKey) {
  const all = await loadSuppliers();
  return brand ? all.filter((s) => s.brands.includes(brand)) : all;
}

/** Call after any change the storefront shows (catalogue, prices, stock, CMS, promotions). */
export function refreshCatalog() {
  revalidateTag(CATALOG_TAG);
}
