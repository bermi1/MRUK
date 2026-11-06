import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthPage } from '@/components/store/AuthPage';
import { safeNext } from '@/lib/next-path';
import type { BrandKey } from '@/lib/types';
import { getBrand } from '@/server/catalog';
import { getT } from '@/server/locale';
import { payLaterOn } from '@/server/paylater';
import { currentCustomer } from '@/server/session';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default async function LoginPage({ params, searchParams }: { params: Promise<{ brand: string }>; searchParams: Promise<{ next?: string }> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const next = safeNext((await searchParams).next, `/${key}/account`);
  if (await currentCustomer()) redirect(next);
  const [t, brand, payLater] = await Promise.all([getT(), getBrand(key), payLaterOn(key)]);
  return (
    <AuthPage
      brand={key}
      logo={brand.logo}
      brandName={brand.name}
      perks={[payLater ? t('trustAdvance') : t('trustSupport'), t('trustDelivery'), t('trustWarranty')]}
      mode="login"
      next={next}
      switchHref={`/${key}/signup?next=${encodeURIComponent(next)}`}
      labels={{ title: t('welcomeBack'), sub: payLater ? t('authSub') : t('authSubNoPl'), name: t('fullName'), phone: t('phone'), email: t('emailOptional'), consent: t('marketingConsent'), sendCode: t('sendCode'), enterCode: t('enterCode'), verify: t('verifyContinue'), switchQ: t('noAccount'), switchLink: t('createAccount'), changeNumber: t('changeNumber'), enterName: t('enterName') }}
    />
  );
}
