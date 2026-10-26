'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setQtyAction, updateCartAction } from '@/app/actions/store';
import { fmt } from '@/lib/format';
import type { CartView as Cart } from '@/lib/types';
import { MinusIcon, PlusIcon, TickIcon } from '../icons';
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
        <Link href={`/${brand}/shop`} style={{ fontWeight: 600, color: 'var(--monthly)' }}>
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
                <button type="button" style={{ width: 44, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => qty(l.productId, Math.max(1, l.qty - 1))} aria-label={`Decrease ${l.name}`}>
                  <MinusIcon size={16} />
                </button>
                <span style={{ width: 22, textAlign: 'center', fontWeight: 600, fontSize: 14 }} aria-live="polite">
                  {l.qty}
                </span>
                <button type="button" style={{ width: 44, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => qty(l.productId, l.qty + 1)} disabled={l.qty >= l.stock} aria-label={`Increase ${l.name}`}>
                  <PlusIcon size={16} />
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

const DISCOUNT_EN = { promoCode: 'Promo code', apply: 'Apply', remove: 'Remove', applied: 'Code {code} applied', save: 'You save {amount}' };

/** Promo code: apply / remove with clear success and error states (reuses updateCartAction). */
export function DiscountField({ brand, code, error, saving = 0, labels = DISCOUNT_EN }: { brand: string; code: string | null; error: string | null; saving?: number; labels?: typeof DISCOUNT_EN }) {
  const [v, setV] = useState('');
  const [err, setErr] = useState(error ?? '');
  const [pending, start] = useTransition();
  const router = useRouter();
  const applied = !!code && !error;
  const submit = (next: string | null) =>
    start(async () => {
      const r = await updateCartAction(brand, { discountCode: next });
      setErr(r.ok ? '' : r.error);
      if (r.ok) setV('');
      router.refresh();
    });
  if (applied)
    return (
      <div className="promo promo-on" role="status">
        <span className="promo-tick" aria-hidden="true">
          <TickIcon size={16} strokeWidth={2.6} />
        </span>
        <span className="promo-txt">
          <b>{labels.applied.replace('{code}', code!)}</b>
          {saving > 0 && <span>{labels.save.replace('{amount}', fmt(saving))}</span>}
        </span>
        <button type="button" className="promo-remove" disabled={pending} onClick={() => submit(null)}>
          {labels.remove}
        </button>
      </div>
    );
  return (
    <form
      className="promo"
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) submit(v.trim());
      }}
    >
      <label htmlFor="dc" className="promo-label">
        {labels.promoCode}
      </label>
      <div className={`promo-row ${err ? 'is-err' : ''}`}>
        <input id="dc" className="promo-input" value={v} onChange={(e) => (setV(e.target.value.toUpperCase()), setErr(''))} placeholder="KARIBU10" autoComplete="off" aria-invalid={!!err} aria-describedby="dc-err" />
        <button className="promo-apply" disabled={pending || !v.trim()}>
          {pending ? '…' : labels.apply}
        </button>
      </div>
      <div id="dc-err" className="err" role="alert">
        {err}
      </div>
    </form>
  );
}
