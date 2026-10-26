'use client';
import { useId, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { subscribeAction } from '@/app/actions/marketing';
import { TickIcon } from '../icons';

export interface SubscribeLabels {
  title: string;
  sub: string;
  phone: string;
  email: string;
  consent: string;
  subscribe: string;
  need: string;
  consentNeeded: string;
}

/** SMS / email subscribe with explicit, unticked consent (Tanzania PDPA). Each brand styles it. */
export function Subscribe({ brand, source, labels, className = '' }: { brand: 'mruk' | 'skywood'; source: 'footer' | 'home'; labels: SubscribeLabels; className?: string }) {
  const id = useId();
  const path = usePathname();
  const [f, setF] = useState({ phone: '', email: '', consent: false });
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');
  const [pending, start] = useTransition();
  // The home page has its own subscribe section; skip the footer copy there.
  if (source === 'footer' && path === `/${brand}`) return null;
  if (done)
    return (
      <div className={`sub sub-${brand} ${className} is-done`} role="status">
        <span className="sub-tick" aria-hidden="true">
          <TickIcon size={20} strokeWidth={2.4} />
        </span>
        <p className="sub-done">{done}</p>
      </div>
    );
  return (
    <form
      className={`sub sub-${brand} ${className}`}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.phone.trim() && !f.email.trim()) return setErr(labels.need);
        if (!f.consent) return setErr(labels.consentNeeded);
        start(async () => {
          const r = await subscribeAction(brand, { phone: f.phone.trim() || undefined, email: f.email.trim() || undefined, consent: true, source });
          if (r.ok) setDone(r.data.message);
          else setErr(r.error);
        });
      }}
    >
      <div className="sub-copy">
        <p className="sub-title">{labels.title}</p>
        <p className="sub-sub">{labels.sub}</p>
      </div>
      <div className="sub-fields">
        <label className="sr-only" htmlFor={`${id}-p`}>
          {labels.phone}
        </label>
        <input id={`${id}-p`} className="sub-input" type="tel" inputMode="tel" autoComplete="tel" placeholder={`${labels.phone} (+255…)`} value={f.phone} onChange={(e) => (setF({ ...f, phone: e.target.value }), setErr(''))} />
        <label className="sr-only" htmlFor={`${id}-e`}>
          {labels.email}
        </label>
        <input id={`${id}-e`} className="sub-input" type="email" autoComplete="email" placeholder={labels.email} value={f.email} onChange={(e) => (setF({ ...f, email: e.target.value }), setErr(''))} />
        <button className="sub-btn" disabled={pending}>
          {pending ? '…' : labels.subscribe}
        </button>
      </div>
      <label className="sub-consent">
        <input type="checkbox" checked={f.consent} onChange={(e) => (setF({ ...f, consent: e.target.checked }), setErr(''))} />
        <span>{labels.consent}</span>
      </label>
      <p className="sub-err" role="alert">
        {err}
      </p>
    </form>
  );
}
