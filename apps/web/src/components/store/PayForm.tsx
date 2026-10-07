'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { payAction } from '@/app/actions/store';

/** Mock hosted payment page (replaced by the gateway / Azania redirect in production). */
export function PayForm({ number, method, done }: { number: string; method: 'card' | 'azania_account'; done: string }) {
  const [f, setF] = useState({ cardNumber: '', expiry: '', cvc: '', account: '', pin: '' });
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErr('');
        start(async () => {
          const r = await payAction(number, method, method === 'card' ? { cardNumber: f.cardNumber, expiry: f.expiry, cvc: f.cvc } : { account: f.account, pin: f.pin });
          if (!r.ok) return setErr(r.error);
          router.push(done);
        });
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      {method === 'card' ? (
        <>
          <label className="field">
            Card number
            <input className="input mono" value={f.cardNumber} onChange={set('cardNumber')} inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" required name="cardNumber" />
          </label>
          <div className="form-grid">
            <label className="field">
              Expiry (MM/YY)
              <input className="input mono" value={f.expiry} onChange={set('expiry')} autoComplete="cc-exp" placeholder="12/28" required name="expiry" />
            </label>
            <label className="field">
              CVC
              <input className="input mono" value={f.cvc} onChange={set('cvc')} inputMode="numeric" autoComplete="cc-csc" placeholder="123" required name="cvc" />
            </label>
          </div>
          <div className="note">Test mode: use 4242 4242 4242 4242, any future expiry and any CVC. 4000 0000 0000 0002 is declined.</div>
        </>
      ) : (
        <>
          <label className="field">
            Azania Bank account number
            <input className="input mono" value={f.account} onChange={set('account')} inputMode="numeric" placeholder="0150 2214 8821" required name="account" />
          </label>
          <label className="field">
            Mobile banking PIN
            <input className="input mono" type="password" value={f.pin} onChange={set('pin')} inputMode="numeric" maxLength={4} placeholder="••••" required name="pin" style={{ letterSpacing: '.4em' }} />
          </label>
          <div className="note">Test mode (mock Azania Bank): any 10+ digit account and any 4-digit PIN except 0000.</div>
        </>
      )}
      <div className="err" role="alert">
        {err}
      </div>
      <button className="btn btn-primary" disabled={pending} data-testid="pay-submit">
        {pending ? 'Authorising…' : 'Pay now'}
      </button>
    </form>
  );
}
