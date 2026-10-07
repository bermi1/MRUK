import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { getLocale } from '@/server/locale';
import { env } from '@/server/env';
import '@/styles/globals.css';
import { SwRegister } from '@/components/SwRegister';

const geist = localFont({ src: '../fonts/Geist-latin.woff2', variable: '--font-geist', weight: '100 900', display: 'swap' });
const geistMono = localFont({ src: '../fonts/GeistMono-latin.woff2', variable: '--font-geist-mono', weight: '100 900', display: 'swap' });
const caveat = localFont({ src: '../fonts/Caveat-latin.woff2', variable: '--font-caveat', weight: '400 700', display: 'swap' });

// Every page reads live data (prices, stock, CMS): render on request, never at build time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: { default: 'Mr UK and Skywood — Shop online, pay monthly', template: '%s' },
  description: 'Refrigerators, TVs, kitchen, generators, sound and cooling, delivered across Tanzania. Pay in full or monthly with Azania Bank Salary Advance.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Mr UK and Skywood',
  appleWebApp: { capable: true, title: 'Mr UK and Skywood', statusBarStyle: 'default' },
  icons: { icon: [{ url: '/icons/mruk-32.png', sizes: '32x32' }, { url: '/icons/icon-192.png', sizes: '192x192' }], apple: '/icons/mruk-apple.png' },
  openGraph: { type: 'website', siteName: 'Mr UK and Skywood', title: 'Mr UK and Skywood — Shop online, pay monthly', description: 'Appliances and electronics with Azania Bank Salary Advance.' },
  twitter: { card: 'summary_large_image' },
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
