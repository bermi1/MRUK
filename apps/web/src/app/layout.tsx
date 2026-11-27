import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { getLocale } from '@/server/locale';
import { env } from '@/server/env';
import { noIndexSite, siteName, storeBrand } from '@/lib/site';
import { getPayLaterStates } from '@/server/paylater';
import '@/styles/globals.css';
import { SwRegister } from '@/components/SwRegister';

const geist = localFont({ src: '../fonts/Geist-latin.woff2', variable: '--font-geist', weight: '100 900', display: 'swap' });
const geistMono = localFont({ src: '../fonts/GeistMono-latin.woff2', variable: '--font-geist-mono', weight: '100 900', display: 'swap', preload: false });
const caveat = localFont({ src: '../fonts/Caveat-latin.woff2', variable: '--font-caveat', weight: '400 700', display: 'swap', preload: false });

// Every page reads live data (prices, stock, CMS): render on request, never at build time.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  // Pay Later copy only while the admin switch is on for at least one brand.
  const pl = await getPayLaterStates();
  const single = storeBrand();
  const on = single ? pl[single].enabled : pl.mruk.enabled || pl.skywood.enabled;
  // Single-brand site: only that brand's name (also on 404s and other pages outside /[brand]).
  const name = siteName();
  return {
    ...metadata,
    title: { default: on ? `${name} — Shop online, pay monthly` : `${name} — Shop online`, template: '%s' },
    applicationName: name,
    appleWebApp: { capable: true, title: name, statusBarStyle: 'default' },
    ...(single === 'skywood'
      ? { manifest: '/icons/skywood.webmanifest', icons: { icon: [{ url: '/icons/skywood-32.png', sizes: '32x32' }, { url: '/icons/skywood-192.png', sizes: '192x192' }], apple: '/icons/skywood-apple.png' } }
      : {}),
    description: `Refrigerators, TVs, kitchen, generators, sound and cooling, delivered across Tanzania.${on ? ' Pay in full or monthly with Pay Later by Azania Bank.' : ''}`,
    openGraph: { type: 'website', siteName: name, title: on ? `${name} — Shop online, pay monthly` : `${name} — Shop online`, description: on ? 'Appliances and electronics with Pay Later by Azania Bank.' : 'Appliances and electronics, delivered across Tanzania.' },
  };
}

const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  manifest: '/manifest.webmanifest',
  icons: { icon: [{ url: '/icons/mruk-32.png', sizes: '32x32' }, { url: '/icons/icon-192.png', sizes: '192x192' }], apple: '/icons/mruk-apple.png' },
  twitter: { card: 'summary_large_image' },
  // Vercel previews / SEO_NOINDEX sites stay out of search results (lib/site.ts).
  ...(noIndexSite() ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = { themeColor: '#1D2366', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale === 'sw' ? 'sw' : 'en'} className={`${geist.variable} ${geistMono.variable} ${caveat.variable}`}>
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
