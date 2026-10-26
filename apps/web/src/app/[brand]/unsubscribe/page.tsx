import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { UnsubscribeConfirm } from '@/components/marketing/UnsubscribeConfirm';
import { isBrandKey } from '@/server/catalog';
import { BRAND_NAMES, parseUnsubscribeToken } from '@/server/marketing';

export const metadata: Metadata = { title: 'Unsubscribe', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** Minimal confirmation card (the storefront team restyles it). Unsubscribing needs a click: link scanners only GET. */
export default async function UnsubscribePage({ params, searchParams }: { params: Promise<{ brand: string }>; searchParams: Promise<{ t?: string }> }) {
  const { brand } = await params;
  if (!isBrandKey(brand)) notFound();
  const t = ((await searchParams).t ?? '').slice(0, 200);
  const valid = !!parseUnsubscribeToken(brand, t);
  const name = BRAND_NAMES[brand];
  return (
    <div className="wrap-narrow" style={{ paddingTop: 48, paddingBottom: 64 }}>
      <div className="card" style={{ padding: 28, borderRadius: 22, border: '1px solid var(--border)', maxWidth: 560 }} data-testid="unsubscribe-card">
        <div className="eyebrow">Messages from {name}</div>
        <h1 className="h1" style={{ marginTop: 6 }}>
          Unsubscribe
        </h1>
        {valid ? (
          <>
            <p style={{ fontSize: 15, lineHeight: 1.6, marginTop: 10 }}>Stop receiving {name} offers and campaign messages by SMS, WhatsApp and email. Messages about your orders and deliveries are not affected.</p>
            <UnsubscribeConfirm brand={brand} token={t} />
          </>
        ) : (
          <p style={{ fontSize: 15, lineHeight: 1.6, marginTop: 10 }} role="alert">
            This link is not valid or has been changed. To stop {name} messages, reply STOP to any of our SMS, or contact support.
          </p>
        )}
      </div>
    </div>
  );
}
