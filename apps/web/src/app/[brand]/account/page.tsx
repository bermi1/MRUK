import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@bt/db';
import { ORDER_STATUS_LABEL, paymentLabel, type OrderStatus, type PaymentMethod } from '@bt/core';
import { ProfileForm, SignInPrompt } from '@/components/store/AccountPanel';
import { fmt, fmtDate, formatTzPhone } from '@/lib/format';
import type { BrandKey } from '@/lib/types';
import { getLocale } from '@/server/locale';
import { confirmationPath } from '@/server/orders';
import { currentCustomer } from '@/server/session';

export const metadata: Metadata = { title: 'Account', robots: { index: false } };

export default async function AccountPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const [c, locale] = await Promise.all([currentCustomer(), getLocale()]);
  if (!c)
    return (
      <div className="wrap-narrow page-top" style={{ maxWidth: 560 }}>
        <div className="eyebrow">Account</div>
        <h1 className="h1">Sign in to see your orders</h1>
        <p style={{ color: 'var(--muted2)', lineHeight: 1.6 }}>We send a one-time code by SMS to your +255 number. No password needed.</p>
        <SignInPrompt />
      </div>
    );
  const orders = await prisma.order.findMany({ where: { OR: [{ customerId: c.id }, { contactPhone: c.phone }] }, orderBy: { createdAt: 'desc' }, take: 50, include: { items: true, advance: true } });
  return (
    <div className="wrap page-top">
      <div className="eyebrow">Account</div>
      <h1 className="h1">Habari, {c.name.split(' ')[0] || 'there'}</h1>
      <div style={{ color: 'var(--muted2)' }}>{formatTzPhone(c.phone)}</div>
      <div className="two-col">
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 12px' }}>My orders</h2>
          {orders.length === 0 && <div className="card">No orders yet. <Link href={`/${key}`} style={{ color: 'var(--monthly)', fontWeight: 600 }}>Start shopping</Link></div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orders.map((o) => (
              <Link key={o.id} href={confirmationPath(o.brandKey as BrandKey, o.number)} className="card row" style={{ padding: 16, borderRadius: 18 }}>
                <div>
                  <div className="mono" style={{ fontWeight: 600 }}>{o.number}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted2)' }}>
                    {fmtDate(o.createdAt)} · {o.items.map((i) => i.name).join(', ')}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{paymentLabel(o.paymentMethod as PaymentMethod)}{o.advance ? ` · ${o.advance.termMonths} × ${fmt(o.advance.monthly)}` : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600 }}>{fmt(o.total)}</div>
                  <span className="badge" style={{ background: 'var(--surface)' }}>{ORDER_STATUS_LABEL[o.status as OrderStatus]}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section className="card-soft">
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 12px' }}>My details</h2>
          <ProfileForm name={c.name} email={c.email} locale={locale} />
        </section>
      </div>
    </div>
  );
}
