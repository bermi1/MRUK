import type { Metadata } from 'next';
import Link from 'next/link';
import { ADVANCE_STATUS_LABEL, ORDER_STATUS_LABEL, paymentLabel, type AdvanceStatus, type OrderStatus, type PaymentMethod } from '@bt/core';
import { CheckIcon } from '@/components/icons';
import { fmt, fmtDate, formatTzPhone } from '@/lib/format';
import { confirmationToken } from '@/server/orders';
import { advanceSummary, orderForOwner } from '@/server/orderview';

export const metadata: Metadata = { title: 'Order confirmed', robots: { index: false } };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ brand: string; number: string }>; searchParams: Promise<{ t?: string }> }) {
  const { brand, number } = await params;
  const o = await orderForOwner(brand, number, (await searchParams).t);
  const t = confirmationToken(o.number);
  const adv = advanceSummary(o);
  const method = o.paymentMethod as PaymentMethod;
  const steps = [method === 'salary_advance' ? 'Azania Bank reviews your Salary Advance' : method === 'pay_on_delivery' ? 'Have the cash or card ready on delivery' : 'Payment confirmed', 'We pack your order at the warehouse', 'Delivery team calls before arrival', 'Register your warranty after delivery'];
  const advStatus = adv ? ADVANCE_STATUS_LABEL[adv.status as AdvanceStatus] : '';
  return (
    <div className="wrap confirm" style={{ maxWidth: 1100, paddingTop: 48 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#E6F4EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckIcon />
        </div>
        <h1 style={{ margin: '6px 0 0', fontSize: 'clamp(28px, 3.4vw, 42px)', fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1.05 }}>Order confirmed. Asante!</h1>
        <div style={{ fontSize: 15.5, color: 'var(--muted2)', lineHeight: 1.6 }}>
          Order{' '}
          <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }} data-testid="order-number">
            {o.number}
          </span>{' '}
          is with our team ({ORDER_STATUS_LABEL[o.status as OrderStatus].toLowerCase()}). We&apos;ve sent an SMS to {formatTzPhone(o.contactPhone)}.
        </div>
        <ol className="card" style={{ listStyle: 'none', margin: 0, padding: 18, display: 'flex', flexDirection: 'column', gap: 10, borderRadius: 20 }}>
          {steps.map((s, i) => (
            <li key={s} style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 14.5 }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', background: i === 0 ? 'var(--az)' : 'var(--surface)', color: i === 0 ? '#fff' : 'var(--muted2)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href={`/${brand}/track?o=${o.number}`} className="btn btn-primary">
            Track order
          </Link>
          <Link href={`/${brand}`} className="btn btn-outline">
            Keep shopping
          </Link>
          {adv?.contract && (
            <a href={`/api/orders/${o.number}/contract?t=${t}`} className="btn" style={{ background: '#EAF6FC', color: 'var(--monthly)' }} data-testid="download-contract">
              Download contract
            </a>
          )}
          {o.invoices[0] && (
            <a href={`/api/orders/${o.number}/invoice?t=${t}`} className="btn btn-outline" style={{ borderWidth: 1, borderColor: 'var(--line)' }}>
              Invoice {o.invoices[0].number}
            </a>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {adv && (
          <>
            <div className="sa-card">
              <div className="c1" />
              <div className="c2" />
              <div className="row-top" style={{ position: 'relative' }}>
                <img src="/brand/azania-bank.png" alt="Azania Bank" style={{ width: 62, height: 62, objectFit: 'contain', margin: '-8px 0 0 -8px' }} />
                <span className="badge" style={{ background: adv.status === 'rejected' ? 'var(--warn)' : 'var(--az)', color: '#fff', fontWeight: 600 }}>
                  {advStatus}
                </span>
              </div>
              <div className="mono" style={{ fontSize: 14, letterSpacing: '.14em', marginTop: 'auto', position: 'relative' }}>
                SALARY ADVANCE •••• {adv.accountLast4}
              </div>
              <div className="row" style={{ marginTop: 12, fontSize: 11, position: 'relative', color: 'var(--muted2)' }}>
                <div>
                  <div>HOLDER</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{o.contactName.toUpperCase()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>PLAN</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--monthly)' }}>{adv.months} months</div>
                </div>
              </div>
            </div>
            <div className="card" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 18, alignItems: 'center', borderRadius: 22, padding: 18 }}>
              <div style={{ width: 120, height: 120, borderRadius: '50%', background: `conic-gradient(#16825D 0deg, #16825D ${adv.percent * 3.6}deg, #E6E8EF ${adv.percent * 3.6}deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }} role="img" aria-label={`${adv.percent}% paid`}>
                <div style={{ width: 92, height: 92, borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 22, fontWeight: 700 }}>{adv.percent}%</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>paid</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                <div className="row">
                  <span style={{ color: 'var(--muted)' }}>Paid</span>
                  <b style={{ color: 'var(--ok)' }}>{fmt(adv.paid)}</b>
                </div>
                <div className="row">
                  <span style={{ color: 'var(--muted)' }}>Remaining</span>
                  <b>{fmt(adv.remaining)}</b>
                </div>
                <div className="row">
                  <span style={{ color: 'var(--muted)' }}>Monthly</span>
                  <b className="monthly">{fmt(adv.monthly)}</b>
                </div>
                <div className="row">
                  <span style={{ color: 'var(--muted)' }}>First deduction</span>
                  <b>{adv.firstDue ? fmtDate(adv.firstDue) : 'Next payday'}</b>
                </div>
              </div>
            </div>
          </>
        )}
        <div className="card-soft" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 18, borderRadius: 22 }}>
          {o.items.map((i) => (
            <div key={i.id} className="row" style={{ fontSize: 14 }}>
              <span>
                {i.name} × {i.qty}
              </span>
              <span>{fmt(i.price * i.qty)}</span>
            </div>
          ))}
          {o.discount > 0 && (
            <div className="row" style={{ fontSize: 14, color: 'var(--ok)' }}>
              <span>Savings</span>
              <span>−{fmt(o.discount)}</span>
            </div>
          )}
          <div className="row" style={{ fontSize: 14, color: 'var(--muted2)' }}>
            <span>Delivery · {o.region}</span>
            <span>{o.deliveryFee ? fmt(o.deliveryFee) : 'Free'}</span>
          </div>
          <div className="sumtotal" style={{ fontSize: 17, paddingTop: 10 }}>
            <span>Total · {paymentLabel(method)}</span>
            <span>{fmt(o.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
