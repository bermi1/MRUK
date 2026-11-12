import type { HeroLabels, HeroSlideView } from '@/components/store/brands/shared';
import { SkywoodHome } from '@/components/store/brands/skywood/Home';
import type { BrandKey } from '@/lib/types';
import { getCompareIds } from '@/server/cart';
import { getBrand, getBundles, getCategories, getCms, getFlashDeals, getProducts, getSuppliers } from '@/server/catalog';
import { getT } from '@/server/locale';
import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import { brandImage, graph, organizationLd, pageMeta, websiteLd } from '@/server/seo';
import { payLaterOn } from '@/server/paylater';
import { stripPayLater } from '@bt/core';

export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }): Promise<Metadata> {
  const { brand: key } = (await params) as { brand: BrandKey };
  const [brand, cms, cats, payLater] = await Promise.all([getBrand(key), getCms(key), getCategories(key), payLaterOn(key)]);
  const title = cms.seo.title || `${brand.name} — ${brand.tagline}`;
  const desc = payLater ? cms.seo.desc : stripPayLater(cms.seo.desc);
  // With Pay Later off its sentence is stripped, which can leave a description too short for search results.
  const base = desc || `${brand.name}: ${cats.map((c) => c.name).join(', ')}.`;
  const description = base.length >= 70 || /delivered across tanzania/i.test(base) ? base : `${base} Delivered across Tanzania.`;
  return pageMeta({ brand, path: '', title, description, images: [{ url: brandImage(brand, cms), alt: brand.name }] });
}

/**
 * Brand home. Same data for both brands (CMS hero slides, catalogue, bundles, flash deals,
 * showrooms); each brand renders it with its own structure and art direction.
 */
export default async function BrandHome({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const [brand, cms, cats, products, bundles, suppliers, flash, compare, t, payLater] = await Promise.all([getBrand(key), getCms(key), getCategories(key), getProducts(key), getBundles(key), getSuppliers(key), getFlashDeals(key), getCompareIds(key), getT(), payLaterOn(key)]);
  const b = `/${key}`;
  const byId = (id: string) => products.find((p) => p.id === id);
  const slides: HeroSlideView[] = cms.hero
    .map((h) => {
      const p = byId(h.pid) ?? products[0];
      if (!p) return null;
      const price = h.price ?? p.price;
      return {
        // Pay Later off: drop CMS hero copy that promises it.
        eyebrow: payLater ? h.eyebrow : stripPayLater(h.eyebrow),
        title: h.title,
        sub: payLater ? h.sub : stripPayLater(h.sub),
        img: h.img || p.img || cats.find((c) => c.id === p.cat)?.img || '',
        href: h.href || `${b}/p/${p.id}`,
        price,
        showPrice: price > 0,
        cta: h.cta,
        pid: p.stock > 0 ? p.id : '',
        layout: h.layout ?? 'product',
        imgMobile: h.imgMobile ?? '',
        theme: h.theme ?? 'dark',
        align: h.align ?? 'left',
        focal: h.focal ?? '50% 50%',
        model: p.model,
        name: p.name,
        kind: `${p.sub} ${p.catName}`,
        features: p.features,
        video: h.video,
        videoPoster: h.videoPoster,
        audio: h.audio,
      };
    })
    .filter((s): s is HeroSlideView => !!s);
  const heroLabels: HeroLabels = {
    shopNow: t('shopNow'),
    seeDeals: t('seeDeals'),
    // Empty when Pay Later is off: the heroes then show the price without the monthly chip.
    perMonth: payLater ? t('orPerMonth') : '',
    withAdvance: payLater ? t('withAdvance') : '',
    pause: t('pause'),
    play: t('play'),
    slideN: t('slideN'),
    discover: t('discover'),
    scrollHint: t('scrollHint'),
    addToCart: t('addToCart'),
    musicOn: t('musicOn'),
    musicOff: t('musicOff'),
  };
  const cities = [...new Set(suppliers.map((s) => s.city))];
  const common = { brand, slides, heroLabels, cats, products, bundles, supplierCount: suppliers.length, cities, compare, payLater, t };

  const ld = <JsonLd data={graph(organizationLd(brand, cms), websiteLd(brand))} />;

  // Both brands share the gallery layout; Mr UK gets its own palette, type scale and grid (mruk.css, .mu-sw).
  const heroIds = new Set(cms.hero.map((h) => h.pid));
  const focus = products.find((p) => p.img && !heroIds.has(p.id)) ?? products.find((p) => p.img) ?? products[0];
  return (
    <>
      {ld}
      <SkywoodHome {...common} flash={flash} focus={focus} />
    </>
  );
}
