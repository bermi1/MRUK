import { MrukHome } from '@/components/store/brands/mruk/Home';
import type { HeroLabels, HeroSlideView } from '@/components/store/brands/shared';
import { SkywoodHome } from '@/components/store/brands/skywood/Home';
import type { BrandKey } from '@/lib/types';
import { getBrand, getBundles, getCategories, getCms, getFlashDeals, getProducts, getSuppliers } from '@/server/catalog';
import { getT } from '@/server/locale';

/**
 * Brand home. Same data for both brands (CMS hero slides, catalogue, bundles, flash deals,
 * showrooms); each brand renders it with its own structure and art direction.
 */
export default async function BrandHome({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const [brand, cms, cats, products, bundles, suppliers, flash, t] = await Promise.all([getBrand(key), getCms(key), getCategories(key), getProducts(key), getBundles(key), getSuppliers(key), getFlashDeals(key), getT()]);
  const b = `/${key}`;
  const byId = (id: string) => products.find((p) => p.id === id);
  const slides: HeroSlideView[] = cms.hero
    .map((h) => {
      const p = byId(h.pid) ?? products[0];
      if (!p) return null;
      return {
        eyebrow: h.eyebrow,
        title: h.title,
        sub: h.sub,
        img: h.img || p.img || cats.find((c) => c.id === p.cat)?.img || '',
        href: `${b}/p/${p.id}`,
        price: p.price,
        model: p.model,
        name: p.name,
        kind: `${p.sub} ${p.catName}`,
        features: p.features,
      };
    })
    .filter((s): s is HeroSlideView => !!s);
  const heroLabels: HeroLabels = {
    shopNow: t('shopNow'),
    seeDeals: t('seeDeals'),
    perMonth: t('orPerMonth'),
    withAdvance: t('withAdvance'),
    pause: t('pause'),
    play: t('play'),
    slideN: t('slideN'),
    discover: t('discover'),
    scrollHint: t('scrollHint'),
  };
  const cities = [...new Set(suppliers.map((s) => s.city))];
  const common = { brand, slides, heroLabels, cats, products, bundles, supplierCount: suppliers.length, cities, t };

  if (key === 'skywood') {
    const heroIds = new Set(cms.hero.map((h) => h.pid));
    const focus = products.find((p) => p.img && !heroIds.has(p.id)) ?? products.find((p) => p.img) ?? products[0];
    return <SkywoodHome {...common} focus={focus} />;
  }
  return <MrukHome {...common} flash={flash} />;
}
