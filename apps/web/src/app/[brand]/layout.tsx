import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppBar, TabBar } from '@/components/store/AppChrome';
import { Footer } from '@/components/store/Footer';
import { Header, type MegaProduct } from '@/components/store/Header';
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
  return {
    title: { default: cms.seo.title || b.name, template: `%s · ${b.name}` },
    description: cms.seo.desc,
    openGraph: { title: cms.seo.title, description: cms.seo.desc, siteName: b.name, images: img ? [{ url: img }] : undefined, url: `/${brand}` },
    twitter: { card: 'summary_large_image', title: cms.seo.title, description: cms.seo.desc, images: img ? [img] : undefined },
  };
}

export default async function BrandLayout({ children, params }: { children: React.ReactNode; params: Promise<{ brand: string }> }) {
  const { brand: key } = await params;
  if (!isBrandKey(key)) notFound();
  const [brand, cms, cats, products, cartCount, cmp, customer, t] = await Promise.all([getBrand(key), getCms(key), getCategories(key), getProducts(key), getCartCount(key), getCompareIds(key), currentCustomer(), getT()]);
  const mega: Record<string, MegaProduct[]> = Object.fromEntries(
    cats.map((c) => [c.id, photoFirst(products.filter((p) => p.cat === c.id)).slice(0, 4).map((p) => ({ id: p.id, model: p.model, name: p.name, price: p.price, img: p.img }))]),
  );
  return (
    <div className="brand-root" data-brand={key} style={themeVars(brand)}>
      <ToastProvider>
        <AppBar brand={key} />
        <Header
          brand={brand}
          cms={{ announcement: cms.announcement, megaPromo: cms.megaPromo }}
          cats={cats}
          mega={mega}
          cartCount={cartCount}
          compareCount={cmp.length}
          user={customer ? { name: customer.name, phone: customer.phone, email: customer.email } : null}
          labels={{ track: t('trackOrder'), suppliers: t('suppliersNearYou'), support: t('support'), signIn: t('signIn'), compare: t('compare'), cart: t('cart'), deals: t('deals'), search: t('searchHint', { brand: brand.name }), allBrands: t('allBrands') }}
        />
        <main id="main">{children}</main>
        <Footer brand={brand} cats={cats} t={t} />
        <a href={waLink(brand.whatsapp, `Hello ${brand.name}, I need help.`)} target="_blank" rel="noopener noreferrer" className="wa-fab" aria-label="Chat on WhatsApp">
          <WhatsAppIcon />
        </a>
        <TabBar brand={key} cartCount={cartCount} labels={{ home: t('home'), shop: t('shop'), cart: t('cart'), deals: t('deals'), account: t('account') }} />
      </ToastProvider>
    </div>
  );
}
