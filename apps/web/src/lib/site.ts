import type { BrandKey } from './types';

/**
 * Public URL scheme (SEO). Edge-safe: used by the middleware and by server code.
 *
 * - Single-brand site (STORE_BRAND=mruk|skywood, one Vercel project per brand): the brand's
 *   pages live at the root of APP_URL ("/", "/c/fridges", "/p/<id>"). The "/<brand>/..." form
 *   still resolves (internal links use it) but canonical URLs, Open Graph URLs, the sitemap
 *   and llms.txt always use the prefix-less form.
 * - The sister brand on a single-brand site lives at OTHER_STORE_URL (also prefix-less).
 * - Combined site (STORE_BRAND unset, development): "/<brand>/..." on APP_URL.
 */

/** Custom domains that map to one brand (middleware rewrites "/" to that brand's pages). */
export const HOST_BRAND: Record<string, BrandKey> = {
  'shop.mruk.co.tz': 'mruk',
  'shop.skywood.co.tz': 'skywood',
};

const trim = (u: string) => u.replace(/\/+$/, '');

export function storeBrand(): BrandKey | undefined {
  const v = process.env.STORE_BRAND;
  return v === 'mruk' || v === 'skywood' ? v : undefined;
}

function appUrl(): string {
  return trim(process.env.APP_URL || 'http://localhost:3000');
}

/** Origin plus prefix under which a brand's storefront paths live, without a trailing slash. */
export function brandBase(brand: BrandKey): string {
  const single = storeBrand();
  if (single === brand) return appUrl();
  if (single && process.env.OTHER_STORE_URL) return trim(process.env.OTHER_STORE_URL);
  return `${appUrl()}/${brand}`;
}

/**
 * Absolute public URL of a storefront path. `path` is brand-relative ("" or "/c/fridges").
 * The brand home is always returned with a trailing slash on a bare origin ("https://x.tz/"),
 * otherwise without one (Next's default trailingSlash: false).
 */
export function publicUrl(brand: BrandKey, path = ''): string {
  const base = brandBase(brand);
  if (!path || path === '/') return /^https?:\/\/[^/]+$/.test(base) ? `${base}/` : base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Absolute URL for a site asset (image) on this deployment. Leaves absolute URLs as they are. */
export function absUrl(src: string): string {
  if (!src) return '';
  if (/^https?:\/\//.test(src)) return src;
  return `${appUrl()}${src.startsWith('/') ? src : `/${src}`}`;
}

/** Brands whose pages this deployment publishes (sitemap, robots, llms.txt). */
export function siteBrands(): BrandKey[] {
  const single = storeBrand();
  return single ? [single] : ['mruk', 'skywood'];
}

/**
 * Keep previews and staging out of search engines: Vercel preview deployments
 * (VERCEL_ENV=preview|development) and any site with SEO_NOINDEX=true.
 */
export function noIndexSite(): boolean {
  if (process.env.SEO_NOINDEX === 'true') return true;
  const v = process.env.VERCEL_ENV;
  return !!v && v !== 'production';
}

/** "Model Name" for titles, alt text and structured data, without repeating a model already in the name. */
export function productLabel(p: { model: string; name: string }): string {
  const model = p.model.trim();
  const name = p.name.trim();
  if (!model) return name;
  return name.toLowerCase().includes(model.toLowerCase()) ? name : `${model} ${name}`;
}
