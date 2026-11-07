import type { MetadataRoute } from 'next';
import { absUrl, publicUrl, siteBrands, storeBrand } from '@/lib/site';
import { getCategories, getProducts } from '@/server/catalog';
import { env } from '@/server/env';
import { payLaterOn } from '@/server/paylater';

/**
 * sitemap.xml for this site only (single-brand: that brand's prefix-less public URLs; combined:
 * landing page plus both stores). lastmod comes from product updatedAt; product photos are listed
 * with the image sitemap extension. Well under the 50,000-URL limit, so no sitemap index is needed
 * (switch to generateSitemaps() if the catalogue ever passes ~40,000 products).
 */
// Live catalogue (cached reads), never a build-time snapshot.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const root = env.APP_URL.replace(/\/+$/, '');
  const out: MetadataRoute.Sitemap = [];
  if (!storeBrand()) out.push({ url: `${root}/`, changeFrequency: 'weekly', priority: 1 });
  for (const b of siteBrands()) {
    const [cats, products, payLater] = await Promise.all([getCategories(b), getProducts(b), payLaterOn(b)]);
    const latest = (list: { updatedAt?: string; createdAt: string }[]) => {
      const t = Math.max(0, ...list.map((p) => Date.parse(p.updatedAt ?? p.createdAt) || 0));
      return t ? new Date(t) : undefined;
    };
    const all = latest(products);
    out.push({ url: publicUrl(b), lastModified: all, changeFrequency: 'daily', priority: 1 });
    out.push({ url: publicUrl(b, '/shop'), lastModified: all, changeFrequency: 'daily', priority: 0.8 });
    for (const c of cats) out.push({ url: publicUrl(b, `/c/${c.id}`), lastModified: latest(products.filter((p) => p.cat === c.id)), changeFrequency: 'daily', priority: 0.8 });
    out.push({ url: publicUrl(b, '/deals'), changeFrequency: 'daily', priority: 0.7 });
    // Pay Later switched off for this brand: the page is a 404, so it is not listed.
    if (payLater) out.push({ url: publicUrl(b, '/pay-later'), changeFrequency: 'monthly', priority: 0.6 });
    out.push({ url: publicUrl(b, '/suppliers'), changeFrequency: 'monthly', priority: 0.5 });
    out.push({ url: publicUrl(b, '/support'), changeFrequency: 'monthly', priority: 0.4 });
    for (const p of products) {
      const images = p.images.filter(Boolean).slice(0, 10).map(absUrl);
      out.push({ url: publicUrl(b, `/p/${p.id}`), lastModified: new Date(p.updatedAt ?? p.createdAt), changeFrequency: 'weekly', priority: 0.7, ...(images.length ? { images } : {}) });
    }
  }
  out.push({ url: `${root}/privacy`, changeFrequency: 'yearly', priority: 0.1 });
  return out;
}
