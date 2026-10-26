import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthPage } from '@/components/store/AuthPage';
import { safeNext } from '@/lib/next-path';
import type { BrandKey } from '@/lib/types';
import { getBrand } from '@/server/catalog';
import { getT } from '@/server/locale';
import { currentCustomer } from '@/server/session';

export const metadata: Metadata = { title: 'Create account', robots: { index: false } };

export default async function SignupPage({ params, searchParams }: { params: Promise<{ brand: string }>; searchParams: Promise<{ next?: string }> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const next = safeNext((await searchParams).next, `/${key}/account`);
  if (await currentCustomer()) redirect(next);
  const [t, brand] = await Promise.all([getT(), getBrand(key)]);
  return (
    <AuthPage
      brand={key}
      logo={brand.logo}
      brandName={brand.name}
      perks={[t('trustAdvance'), t('trustDelivery'), t('trustWarranty')]}
      mode="signup"
      next={next}
      switchHref={`/${key}/login?next=${encodeURIComponent(next)}`}
      labels={{ title: t('createAccount'), sub: t('authSub'), name: t('fullName'), phone: t('phone'), email: t('emailOptional'), consent: t('marketingConsent'), sendCode: t('sendCode'), enterCode: t('enterCode'), verify: t('verifyContinue'), switchQ: t('haveAccount'), switchLink: t('signIn'), changeNumber: t('changeNumber'), enterName: t('enterName') }}
    />
  );
}
