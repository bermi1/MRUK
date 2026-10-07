import type { Metadata } from 'next';
import Link from 'next/link';
import { CartItems, DiscountField } from '@/components/store/CartView';
import { fmt } from '@/lib/format';
import type { BrandKey } from '@/lib/types';
import { getCart } from '@/server/cart';
import { getT } from '@/server/locale';

export const metadata: Metadata = { title: 'Cart', robots: { index: false } };

export default async function CartPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const [cart, t] = await Promise.all([getCart(key), getT()]);
  return (
    <div className="wrap page-top">
      <h1 className="h1" style={{ marginTop: 0 }}>
        {t('cart')}
      </h1>
      <div className="two-col">
        <CartItems cart={cart} brand={key} />
        <div className="card-soft" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="sumrow">
            <span>{t('subtotal')}</span>
            <b>{fmt(cart.subtotal)}</b>
          </div>
          {cart.bundles.map((b) => (
            <div key={b.title} className="sumrow" style={{ color: 'var(--ok)' }}>
              <span>Bundle: {b.title}</span>
              <b style={{ color: 'var(--ok)' }}>−{fmt(b.saving)}</b>
            </div>
          ))}
          {cart.discount > cart.bundles.reduce((a, b) => a + b.saving, 0) && (
            <div className="sumrow" style={{ color: 'var(--ok)' }}>
              <span>Code {cart.discountCode}</span>
              <b style={{ color: 'var(--ok)' }}>−{fmt(cart.discount - cart.bundles.reduce((a, b) => a + b.saving, 0))}</b>
            </div>
          )}
          <div className="sumrow">
            <span>
              {t('delivery')} · {cart.region}
            </span>
            <b>{cart.lines.length ? (cart.delivery ? fmt(cart.delivery) : t('free')) : '—'}</b>
          </div>
          <div className="sumtotal">
            <span>{t('total')}</span>
            <span data-testid="cart-total">{fmt(cart.total)}</span>
          </div>
          <div className="sumrow monthly" style={{ fontWeight: 600 }}>
            <span>Salary Advance · {cart.months} months</span>
            <span>{fmt(cart.total / cart.months)}/mo</span>
          </div>
          <DiscountField brand={key} code={cart.discountCode} error={cart.discountError} />
          {cart.lines.length ? (
            <Link href={`/${key}/checkout`} className="btn btn-primary btn-block" data-testid="go-checkout">
              {t('checkout')}
            </Link>
          ) : (
            <span className="btn btn-primary btn-block" aria-disabled="true">
              {t('checkout')}
            </span>
          )}
          <div className="note">Delivery is free in Dar es Salaam on orders over TZS 500,000. Change your region at checkout.</div>
        </div>
      </div>
    </div>
  );
}
