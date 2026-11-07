import type { Metadata } from 'next';
import { isPaymentMethod, type PaymentMethod } from '@bt/core';
import { CheckoutFlow } from '@/components/store/CheckoutFlow';
import { formatTzPhone } from '@/lib/format';
import type { BrandKey } from '@/lib/types';
import { getCart } from '@/server/cart';
import { getBrand } from '@/server/catalog';
import { getT } from '@/server/locale';
import { payLaterOn } from '@/server/paylater';
import { currentCustomer } from '@/server/session';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ brand: string }>; searchParams: Promise<{ method?: string; app?: string }> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const sp = await searchParams;
  const [brand, cart, customer, t, payLater] = await Promise.all([getBrand(key), getCart(key), currentCustomer(), getT(), payLaterOn(key)]);
  const asked: PaymentMethod = sp.method && isPaymentMethod(sp.method) ? sp.method : payLater ? 'salary_advance' : 'azania_account';
  const method: PaymentMethod = asked === 'salary_advance' && !payLater ? 'azania_account' : asked;
  return (
    <div className="wrap page-top" style={{ maxWidth: 1200 }}>
      <h1 className="h1 no-print" style={{ marginTop: 0 }}>
        {t('checkout')}
      </h1>
      <CheckoutFlow
        brand={{ key, name: brand.name, legal: brand.legal, logo: brand.logo }}
        cart={cart}
        prefill={{ name: customer?.name ?? '', phone: customer ? formatTzPhone(customer.phone) : '', email: customer?.email ?? '' }}
        initialMethod={method}
        channel={sp.app ? 'app' : 'web'}
        payLater={payLater}
      />
    </div>
  );
}
