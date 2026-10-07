import type { MetadataRoute } from 'next';
import { env } from '@/server/env';
import { BRAND_KEYS, getCategories, getProducts } from '@/server/catalog';

/** Landing page, both stores, every category and every visible product. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.APP_URL.replace(/\/$/, '');
  const out: MetadataRoute.Sitemap = [{ url: `${base}/`, changeFrequency: 'weekly', priority: 1 }];
  for (const b of BRAND_KEYS) {
    const [cats, products] = await Promise.all([getCategories(b), getProducts(b)]);
    out.push({ url: `${base}/${b}`, changeFrequency: 'daily', priority: 0.9 });
    out.push({ url: `${base}/${b}/deals`, changeFrequency: 'daily', priority: 0.7 });
    for (const c of cats) out.push({ url: `${base}/${b}/c/${c.id}`, changeFrequency: 'daily', priority: 0.8 });
    for (const p of products) out.push({ url: `${base}/${b}/p/${p.id}`, lastModified: p.createdAt, changeFrequency: 'weekly', priority: 0.6 });
  }
  return out;
}
