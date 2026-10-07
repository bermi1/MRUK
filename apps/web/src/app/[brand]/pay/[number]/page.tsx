import type { Metadata } from 'next';
import Link from 'next/link';
import { PayForm } from '@/components/store/PayForm';
import { fmt } from '@/lib/format';
import { confirmationPath } from '@/server/orders';
import { orderForOwner } from '@/server/orderview';

export const metadata: Metadata = { title: 'Payment', robots: { index: false } };

export default async function PayPage({ params, searchParams }: { params: Promise<{ brand: string; number: string }>; searchParams: Promise<{ t?: string }> }) {
  const { brand, number } = await params;
  const o = await orderForOwner(brand, number, (await searchParams).t);
  const method = o.paymentMethod === 'card' ? 'card' : 'azania_account';
  const done = confirmationPath(brand as 'mruk' | 'skywood', o.number);
  return (
    <div className="wrap-narrow page-top" style={{ maxWidth: 560 }}>
      <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="row">
          <div>
            <div className="eyebrow">Secure payment</div>
            <h1 style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 600, letterSpacing: '-.02em' }}>{method === 'card' ? 'Pay by card' : 'Pay from your Azania Bank account'}</h1>
          </div>
          {method === 'azania_account' ? <img src="/brand/azania-mark.png" alt="Azania Bank" style={{ width: 56, height: 44, objectFit: 'contain' }} /> : <span className="paym-mono" style={{ background: '#12152B' }}>CD</span>}
        </div>
        <div className="card-soft row" style={{ padding: 16 }}>
          <span>
            Order <b className="mono">{o.number}</b>
          </span>
          <b style={{ fontSize: 20 }}>{fmt(o.total)}</b>
        </div>
        {o.status === 'placed' ? (
          <>
            <PayForm number={o.number} method={method} done={done} />
            {o.reservedUntil && <div className="note">Your items are reserved until {o.reservedUntil.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dar_es_Salaam' })}.</div>}
          </>
        ) : (
          <div>
            This order is <b>{o.status === 'cancelled' ? 'cancelled' : 'already paid'}</b>.{' '}
            <Link href={done} style={{ color: 'var(--monthly)', fontWeight: 600 }}>
              View order
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
