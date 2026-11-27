import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { fmtDay } from '@/components/store/account/util';
import type { MessageKey } from '@/lib/i18n';
import { fmt, waLink } from '@/lib/format';
import type { BrandKey } from '@/lib/types';
import { getBrand } from '@/server/catalog';
import { getLocale, getT } from '@/server/locale';
import { trackView } from '@/server/orderview';
import { limit, RateLimitError } from '@/server/ratelimit';

export const metadata: Metadata = { title: 'Track order', robots: { index: false } };

export default async function TrackPage({ params, searchParams }: { params: Promise<{ brand: string }>; searchParams: Promise<{ o?: string; p?: string; t?: string }> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const sp = await searchParams;
  const q = (sp.o ?? '').trim().slice(0, 20);
  // Last 4 digits of the order's phone (typed), or the signed order token (confirmation links).
  const p = (sp.p ?? '').replace(/\D/g, '').slice(-4);
  const token = (sp.t ?? '').slice(0, 64);
  const [brand, t, locale] = await Promise.all([getBrand(key), getT(), getLocale()]);
  let tr: Awaited<ReturnType<typeof trackView>> = null;
  let err = '';
  if (q) {
    try {
      await limit('track', 30, 600);
      tr = await trackView(q, { phoneLast4: p, token });
      // Neutral: never say whether the number or the phone digits were wrong. Only shown once digits were typed.
      if (!tr && (p || token)) err = t('trkNotFound');
    } catch (e) {
      err = e instanceof RateLimitError ? e.message : t('trkError');
    }
  }
  // A sister-brand order is shown in its own store (its branding, WhatsApp number and support).
  if (tr && tr.brand !== key) {
    const qs = new URLSearchParams({ o: tr.number, ...(p ? { p } : {}), ...(token ? { t: token } : {}) });
    redirect(`/${tr.brand}/track?${qs.toString()}`);
  }
  // Invoice link: only for visitors who hold the signed token or the owner's session (the route checks the same).
  const invoiceHref = tr?.invoice && (tr.by === 'token' || tr.by === 'owner') ? `/api/orders/${tr.number}/invoice${tr.by === 'token' ? `?t=${encodeURIComponent(token)}` : ''}` : null;
  const howToPay = tr && tr.method === 'pay_before_delivery' && tr.statusKey === 'confirmed';
  return (
    <div className="wrap-narrow" style={{ paddingTop: 40 }}>
      <div className="eyebrow">{t('trackOrder')}</div>
      <h1 className="h1-xl">{t('trkTitle')}</h1>
      {!tr && <p style={{ margin: '10px 0 0', fontSize: 14.5, color: 'var(--muted2)' }}>{t('trkHint')}</p>}
      <form action={`/${key}/track`} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
        <label htmlFor="o" className="sr-only">
          {t('trkNumber')}
        </label>
        <input id="o" name="o" defaultValue={q} placeholder={t('trkNumberPh')} className="input mono" style={{ flex: '2 1 200px', borderRadius: 14, padding: '15px 16px', fontSize: 15 }} required data-testid="track-input" />
        <label htmlFor="p" className="sr-only">
          {t('trkPhone')}
        </label>
        <input id="p" name="p" defaultValue={p} placeholder={t('trkPhonePh')} inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" className="input mono" style={{ flex: '1 1 120px', borderRadius: 14, padding: '15px 16px', fontSize: 15 }} required={!tr} data-testid="track-phone" />
        <button className="btn btn-primary" style={{ borderRadius: 14, minHeight: 48 }}>
          {t('trkSubmit')}
        </button>
      </form>
      {err && <div style={{ marginTop: 18, borderRadius: 18, background: '#FBE9E5', color: '#8A2E1B', padding: '16px 18px', fontSize: 14 }} role="alert">{err}</div>}
      {tr && (
        <div style={{ marginTop: 22, border: '1px solid var(--border)', borderRadius: 26, overflow: 'hidden' }} data-testid="track-result">
          <div style={{ background: 'var(--p)', color: '#fff', padding: '24px 26px' }} className="row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, opacity: 0.75 }}>{t('trkOrder', { n: tr.number })}</div>
              <div style={{ fontSize: 26, fontWeight: 600, marginTop: 2 }} data-testid="track-status">
                {tr.status}
              </div>
              {(tr.closed || tr.eta) && <div style={{ fontSize: 14, opacity: 0.8, marginTop: 2 }}>{tr.closed ? t('trkClosed') : t('trkEta', { eta: tr.eta! })}</div>}
            </div>
            <div style={{ textAlign: 'right', flex: 'none' }}>
              <div style={{ fontSize: 13, opacity: 0.75 }}>{tr.pay}</div>
              <div className="amt" style={{ fontSize: 20, fontWeight: 600 }}>
                {fmt(tr.total)}
              </div>
            </div>
          </div>
          {howToPay && (
            <div style={{ margin: '18px 26px 0', borderRadius: 18, background: 'var(--surface)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="how-to-pay">
              <div style={{ fontSize: 15, fontWeight: 600 }}>{t('trkHowPay')}</div>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--muted2)', lineHeight: 1.55 }}>{t('trkHowPayBody')}</p>
              {invoiceHref ? (
                <a href={invoiceHref} className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} data-testid="track-invoice">
                  {t('trkInvoice', { n: tr.invoice! })}
                </a>
              ) : (
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted2)' }}>{t('trkInvoiceSent')}</p>
              )}
            </div>
          )}
          <div className="track-body">
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
              {tr.steps.map((s) => (
                <li key={s.key} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', marginTop: 3, background: s.state === 'done' ? 'var(--ok)' : s.state === 'current' ? 'var(--az)' : 'var(--line)' }} />
                    <span style={{ flex: 1, width: 2, background: 'var(--border)', minHeight: 30 }} />
                  </div>
                  <div style={{ paddingBottom: 14 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: s.state === 'pending' ? 'var(--muted)' : 'var(--text)' }}>{t(`step_${s.key}` as MessageKey)}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                      {s.state === 'done' ? t('trkDone') : s.state === 'current' ? t('trkInProgress') : t('trkPending')}
                      {s.at && ` · ${fmtDay(locale, s.at, false)}`}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{t('trkItems')}</div>
              {tr.items.map((i) => (
                <div key={i.name} className="row" style={{ fontSize: 14, color: 'var(--muted2)' }}>
                  <span className="amt-label">
                    {i.name} × {i.qty}
                  </span>
                  <span className="amt">{fmt(i.line)}</span>
                </div>
              ))}
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>{t('trkDelivery')}</div>
              <div style={{ fontSize: 14, color: 'var(--muted2)' }}>
                {tr.region} · {tr.phone}
              </div>
              <a href={waLink(brand.whatsapp, `Hello ${brand.name}, I have a question about order ${tr.number}.`)} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ marginTop: 8, alignSelf: 'flex-start', background: '#E8F7EE', color: '#137A3D' }}>
                {t('trkAsk')}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
