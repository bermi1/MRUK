'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setQtyAction, updateCartAction } from '@/app/actions/store';
import { fmt } from '@/lib/format';
import type { CartView as Cart } from '@/lib/types';
import { PImg } from './PImg';

export function CartItems({ cart, brand }: { cart: Cart; brand: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const qty = (id: string, n: number) =>
    start(async () => {
      await setQtyAction(brand, id, n);
      router.refresh();
    });
  if (!cart.lines.length)
    return (
      <div style={{ border: '1px dashed var(--line)', borderRadius: 20, padding: 40, textAlign: 'center', color: 'var(--muted2)' }}>
        Your cart is empty.{' '}
        <Link href={`/${brand}/c/all`} style={{ fontWeight: 600, color: 'var(--monthly)' }}>
          Browse products
        </Link>
      </div>
    );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: pending ? 0.6 : 1, transition: 'opacity .15s' }}>
      {cart.lines.map((l) => (
        <div key={l.productId} className="cartline" data-testid="cart-line">
          <Link href={`/${brand}/p/${l.productId}`}>
            <PImg src={l.img} alt={l.name} model={l.model} size="sm" style={{ height: 110 }} />
          </Link>
          <div>
            <div className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
              {l.model}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{l.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--line)', borderRadius: 999 }}>
                <button type="button" style={{ width: 40, height: 36 }} onClick={() => qty(l.productId, Math.max(1, l.qty - 1))} aria-label={`Decrease ${l.name}`}>
                  −
                </button>
                <span style={{ width: 22, textAlign: 'center', fontWeight: 600, fontSize: 14 }} aria-live="polite">
                  {l.qty}
                </span>
                <button type="button" style={{ width: 40, height: 36 }} onClick={() => qty(l.productId, l.qty + 1)} disabled={l.qty >= l.stock} aria-label={`Increase ${l.name}`}>
                  +
                </button>
              </div>
              <button type="button" style={{ fontSize: 13, color: 'var(--muted)', minHeight: 36 }} onClick={() => qty(l.productId, 0)}>
                Remove
              </button>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{fmt(l.price * l.qty)}</div>
            <div className="monthly" style={{ fontSize: 12 }}>
              {fmt((l.price * l.qty) / cart.months)}/mo
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DiscountField({ brand, code, error }: { brand: string; code: string | null; error: string | null }) {
  const [v, setV] = useState(code ?? '');
  const [err, setErr] = useState(error ?? '');
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateCartAction(brand, { discountCode: v.trim() || null });
          setErr(r.ok ? '' : r.error);
          router.refresh();
        });
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
    >
      <label htmlFor="dc" className="field">
        Discount code
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input id="dc" className="input" value={v} onChange={(e) => setV(e.target.value.toUpperCase())} placeholder="e.g. KARIBU10" style={{ textTransform: 'uppercase' }} />
        <button className="btn btn-outline btn-sm" disabled={pending} style={{ borderRadius: 12, borderWidth: 1 }}>
          {code && !v ? 'Remove' : 'Apply'}
        </button>
      </div>
      <div className="err" role="alert">{err}</div>
    </form>
  );
}
