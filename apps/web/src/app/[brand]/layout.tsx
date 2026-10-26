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
import { ToastProvider } from '@/components/store/Toast';
import { WhatsAppIcon } from '@/components/icons';
import { waLink } from '@/lib/format';
import { themeVars } from '@/lib/theme';
import { getCartCount, getCompareIds } from '@/server/cart';
import { getBrand, getCategories, getCms, getProducts, isBrandKey, photoFirst } from '@/server/catalog';
import { getT } from '@/server/locale';
import { currentCustomer } from '@/server/session';

export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }): Promise<Metadata> {
  const { brand } = await params;
  if (!isBrandKey(brand)) return {};
  const [b, cms] = await Promise.all([getBrand(brand), getCms(brand)]);
  const img = cms.seo.img || b.heroImg;
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
    description: cms.seo.desc,
    openGraph: { title: cms.seo.title, description: cms.seo.desc, siteName: b.name, images: img ? [{ url: img }] : undefined, url: `/${brand}` },
    twitter: { card: 'summary_large_image', title: cms.seo.title, description: cms.seo.desc, images: img ? [img] : undefined },
  };
}

export async function generateViewport({ params }: { params: Promise<{ brand: string }> }): Promise<Viewport> {
  const { brand } = await params;
  return { themeColor: brand === 'skywood' ? '#111216' : '#1D2366' };
}

export default async function BrandLayout({ children, params }: { children: React.ReactNode; params: Promise<{ brand: string }> }) {
  const { brand: key } = await params;
  if (!isBrandKey(key)) notFound();
  const [brand, cms, cats, products, cartCount, cmp, customer, t] = await Promise.all([getBrand(key), getCms(key), getCategories(key), getProducts(key), getCartCount(key), getCompareIds(key), currentCustomer(), getT()]);
  const mega: Record<string, MegaProduct[]> = Object.fromEntries(
    cats.map((c) => [c.id, photoFirst(products.filter((p) => p.cat === c.id)).slice(0, 4).map((p) => ({ id: p.id, model: p.model, name: p.name, sub: p.sub, price: p.price, img: p.img }))]),
  );
  const header: HeaderProps = {
    brand,
    cms: { announcement: cms.announcement, megaPromo: cms.megaPromo },
    cats,
    mega,
    cartCount,
    compareCount: cmp.length,
    user: customer ? { name: customer.name, phone: customer.phone, email: customer.email } : null,
    labels: {
      track: t('trackOrder'),
      suppliers: t('suppliersNearYou'),
      support: t('support'),
      signIn: t('signIn'),
      compare: t('compare'),
      cart: t('cart'),
      deals: t('deals'),
      search: t('searchHint', { brand: brand.name }),
      searchShort: t('searchShort'),
      allBrands: t('allBrands'),
      allCategories: t('allCategories'),
      menu: t('menu'),
      close: t('close'),
      featured: t('featured'),
      viewAllN: t('viewAllN'),
      productsN: t('productsN'),
      helpAndServices: t('helpAndServices'),
      account: t('account'),
      perMonth: t('perMonthShort'),
      payLater: t('payLater'),
      payLaterBy: t('salaryAdvance'),
      payLaterHow: t('payLaterHow'),
      payLaterEligibility: t('payLaterEligibility'),
      payLaterFaq: t('payLaterFaq'),
      payLaterSteps: [t('plStep1'), t('plStep2'), t('plStep3'), t('plStep4'), t('plStep5')],
    },
  };
  const menu: MobileMenuProps = {
    brand: key,
    brandName: brand.name,
    cats,
    announcement: cms.announcement,
    labels: {
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
      allBrands: t('allBrands'),
      compare: t('compare'),
      salaryAdvance: t('salaryAdvance'),
      salaryAdvanceSub: t('salaryAdvanceSub'),
      payLater: t('payLater'),
    },
  };
  const sky = key === 'skywood';
  return (
    <div className={`brand-root ${archivo.variable} ${fraunces.variable}`} data-brand={key} style={themeVars(brand)}>
      <ToastProvider>
        <a href="#main" className="skip">
          {t('skipToContent')}
        </a>
        <AppBar brand={key} menu={sky ? <SkywoodMobileMenu {...menu} /> : <MrukMobileMenu {...menu} />} />
        {sky ? <SkywoodHeader {...header} /> : <MrukHeader {...header} />}
        <main id="main">{children}</main>
        <Footer brand={brand} cats={cats} t={t} />
        <a href={waLink(brand.whatsapp, `Hello ${brand.name}, I need help.`)} target="_blank" rel="noopener noreferrer" className="wa-fab" aria-label="Chat on WhatsApp">
          <WhatsAppIcon />
        </a>
        <TabBar brand={key} cartCount={cartCount} labels={{ home: t('home'), shop: t('shop'), cart: t('cart'), deals: t('deals'), account: t('account') }} />
        <RevealObserver />
      </ToastProvider>
    </div>
  );
}
