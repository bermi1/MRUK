import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { AppBar, TabBar } from '@/components/store/AppChrome';
import { Footer } from '@/components/store/Footer';
import { MrukHeader } from '@/components/store/brands/mruk/Header';
import { MrukMobileMenu } from '@/components/store/brands/mruk/MobileMenu';
import type { HeaderProps, MegaProduct, MobileMenuProps } from '@/components/store/brands/shared';
import { SkywoodHeader } from '@/components/store/brands/skywood/Header';
import { SkywoodMobileMenu } from '@/components/store/brands/skywood/MobileMenu';
import { RevealObserver } from '@/components/store/Reveal';
import { archivo, fraunces } from '@/fonts/brand';
import '@/styles/mruk.css';
import '@/styles/skywood.css';
import { MessagesProvider } from '@/components/store/Messages';
import { CompareTray, type TrayItem } from '@/components/store/CompareTray';
import { ToastProvider } from '@/components/store/Toast';
import { WhatsAppIcon } from '@/components/icons';
import { waLink } from '@/lib/format';
import { themeVars } from '@/lib/theme';
import { COMPARE_MAX, getCartCount, getCompareIds } from '@/server/cart';
import { getBrand, getCategories, getCms, getProducts, isBrandKey, photoFirst } from '@/server/catalog';
import { clientMessages } from '@/lib/i18n';
import { getLocale, getT } from '@/server/locale';
import { payLaterOn } from '@/server/paylater';
import { stripPayLater } from '@bt/core';
import { currentCustomer } from '@/server/session';

export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }): Promise<Metadata> {
  const { brand } = await params;
  if (!isBrandKey(brand)) return {};
  const [b, cms, payLater] = await Promise.all([getBrand(brand), getCms(brand), payLaterOn(brand)]);
  const img = cms.seo.img || b.heroImg;
  const desc = payLater ? cms.seo.desc : stripPayLater(cms.seo.desc) || b.tagline;
  const sky = brand === 'skywood';
  return {
    title: { default: cms.seo.title || b.name, template: `%s · ${b.name}` },
    applicationName: b.name,
    // Browser tab, home-screen and install icons follow the brand being viewed.
    icons: sky
      ? { icon: [{ url: '/icons/skywood-32.png', sizes: '32x32' }, { url: '/icons/skywood-192.png', sizes: '192x192' }], apple: '/icons/skywood-apple.png' }
      : { icon: [{ url: '/icons/mruk-32.png', sizes: '32x32' }, { url: '/icons/icon-192.png', sizes: '192x192' }], apple: '/icons/mruk-apple.png' },
    manifest: sky ? '/icons/skywood.webmanifest' : '/manifest.webmanifest',
    appleWebApp: { capable: true, title: b.name, statusBarStyle: 'default' },
    description: desc,
    openGraph: { title: cms.seo.title, description: desc, siteName: b.name, images: img ? [{ url: img }] : undefined, url: `/${brand}` },
    twitter: { card: 'summary_large_image', title: cms.seo.title, description: desc, images: img ? [img] : undefined },
  };
}

export async function generateViewport({ params }: { params: Promise<{ brand: string }> }): Promise<Viewport> {
  const { brand } = await params;
  return { themeColor: brand === 'skywood' ? '#111216' : '#1D2366' };
}

export default async function BrandLayout({ children, params }: { children: React.ReactNode; params: Promise<{ brand: string }> }) {
  const { brand: key } = await params;
  if (!isBrandKey(key)) notFound();
  const [brand, cms, cats, products, cartCount, cmp, customer, t, payLater] = await Promise.all([getBrand(key), getCms(key), getCategories(key), getProducts(key), getCartCount(key), getCompareIds(key), currentCustomer(), getT(), payLaterOn(key)]);
  const locale = await getLocale();
  // Only this brand's products that are still on sale count (stale or foreign ids in the cookie are ignored).
  const cmpItems: TrayItem[] = cmp.map((id) => products.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p).map((p) => ({ id: p.id, name: p.name, model: p.model, img: p.img }));
  const cmpCount = cmpItems.length;
  // Pay Later off: CMS copy that promises it is dropped (the announcement falls back to the service promise).
  const announcement = payLater ? cms.announcement : stripPayLater(cms.announcement) || `${t('trustDelivery')} · ${t('trustWarranty')}`;
  const megaPromo = payLater ? cms.megaPromo : { ...cms.megaPromo, eyebrow: stripPayLater(cms.megaPromo.eyebrow), title: stripPayLater(cms.megaPromo.title) || cms.megaPromo.title };
  // Pay Later labels are not even sent to the browser while it is off.
  const pl = (s: string) => (payLater ? s : '');
  // Separate Mr UK / Skywood deployments (STORE_BRAND): "all brands" links to the sister site instead of the shared landing page.
  const otherKey = key === 'mruk' ? 'skywood' : 'mruk';
  const sister = process.env.STORE_BRAND && process.env.OTHER_STORE_URL ? { href: `${process.env.OTHER_STORE_URL.replace(/\/$/, '')}/${otherKey}`, label: otherKey === 'mruk' ? 'Mr UK' : 'Skywood' } : null;
  const mega: Record<string, MegaProduct[]> = Object.fromEntries(
    cats.map((c) => [c.id, photoFirst(products.filter((p) => p.cat === c.id)).slice(0, 4).map((p) => ({ id: p.id, model: p.model, name: p.name, sub: p.sub, price: p.price, img: p.img }))]),
  );
  const header: HeaderProps = {
    brand,
    cms: { announcement, megaPromo },
    cats,
    mega,
    cartCount,
    compareCount: cmpCount,
    user: customer ? { name: customer.name, phone: customer.phone, email: customer.email } : null,
    locale,
    payLater,
    labels: {
      track: t('trackOrder'),
      language: t('language'),
      suppliers: t('suppliersNearYou'),
      support: t('support'),
      signIn: t('signIn'),
      compare: t('compare'),
      cart: t('cart'),
      deals: t('deals'),
      search: t('searchHint', { brand: brand.name }),
      searchShort: t('searchShort'),
      allBrands: sister ? sister.label : t('allBrands'),
      allBrandsHref: sister ? sister.href : '/',
      allCategories: t('allCategories'),
      menu: t('menu'),
      close: t('close'),
      featured: t('featured'),
      viewAllN: t('viewAllN'),
      productsN: t('productsN'),
      helpAndServices: t('helpAndServices'),
      account: t('account'),
      perMonth: pl(t('perMonthShort')),
      payLater: pl(t('payLater')),
      payLaterBy: pl(t('salaryAdvance')),
      payLaterHow: pl(t('payLaterHow')),
      payLaterEligibility: pl(t('payLaterEligibility')),
      payLaterFaq: pl(t('payLaterFaq')),
      payLaterSteps: payLater ? [t('plStep1'), t('plStep2'), t('plStep3'), t('plStep4'), t('plStep5')] : [],
    },
  };
  const menu: MobileMenuProps = {
    brand: key,
    brandName: brand.name,
    cats,
    announcement,
    locale,
    whatsapp: waLink(brand.whatsapp, `Hello ${brand.name}, I need help.`),
    compareCount: cmpCount,
    payLater,
    labels: {
      categories: t('categories'),
      shopAll: t('shopTitle'),
      payLaterHow: pl(t('payLaterHow')),
      chatWhatsApp: t('chatWhatsApp'),
      language: t('language'),
      menu: t('menu'),
      close: t('close'),
      openMenu: t('openMenu'),
      search: t('searchHint', { brand: brand.name }),
      searchShort: t('searchShort'),
      productsN: t('productsN'),
      helpAndServices: t('helpAndServices'),
      deals: t('deals'),
      track: t('trackOrder'),
      suppliers: t('suppliersNearYou'),
      support: t('support'),
      allBrands: sister ? sister.label : t('allBrands'),
      allBrandsHref: sister ? sister.href : '/',
      compare: t('compare'),
      salaryAdvance: pl(t('salaryAdvance')),
      salaryAdvanceSub: pl(t('salaryAdvanceSub')),
      payLater: pl(t('payLater')),
    },
  };
  const sky = key === 'skywood';
  return (
    <div className={`brand-root ${archivo.variable} ${fraunces.variable}`} data-brand={key} style={themeVars(brand)}>
      <MessagesProvider messages={clientMessages(locale)}>
      <ToastProvider>
        <a href="#main" className="skip">
          {t('skipToContent')}
        </a>
        <AppBar brand={key} brandName={brand.name} searchLabel={t('searchShort')} menu={sky ? <SkywoodMobileMenu {...menu} /> : <MrukMobileMenu {...menu} />} />
        {sky ? <SkywoodHeader {...header} /> : <MrukHeader {...header} />}
        <main id="main">{children}</main>
        <Footer brand={brand} cats={cats} t={t} social={cms.social} payLater={payLater} />
        <a href={waLink(brand.whatsapp, `Hello ${brand.name}, I need help.`)} target="_blank" rel="noopener noreferrer" className="wa-fab" aria-label="Chat on WhatsApp">
          <WhatsAppIcon />
        </a>
        <CompareTray brand={key} items={cmpItems} max={COMPARE_MAX} />
        <TabBar brand={key} cartCount={cartCount} labels={{ home: t('home'), shop: t('shop'), cart: t('cart'), account: t('account') }} />
        <RevealObserver />
      </ToastProvider>
      </MessagesProvider>
    </div>
  );
}
