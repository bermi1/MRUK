import type { Metadata } from 'next';
import { fmt, waLink } from '@/lib/format';
import type { BrandKey } from '@/lib/types';
import { getBrand } from '@/server/catalog';
import { trackView } from '@/server/orderview';
import { limit, RateLimitError } from '@/server/ratelimit';

export const metadata: Metadata = { title: 'Track order', robots: { index: false } };

export default async function TrackPage({ params, searchParams }: { params: Promise<{ brand: string }>; searchParams: Promise<{ o?: string }> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const q = ((await searchParams).o ?? '').trim().slice(0, 20);
  const brand = await getBrand(key);
  let tr: Awaited<ReturnType<typeof trackView>> = null;
  let err = '';
  if (q) {
    try {
      await limit('track', 30, 600);
      tr = await trackView(q);
      if (!tr) err = "We couldn't find that order number. Check the SMS we sent you, or contact support.";
    } catch (e) {
      err = e instanceof RateLimitError ? e.message : 'Something went wrong. Try again.';
    }
  }
  return (
    <div className="wrap-narrow" style={{ paddingTop: 40 }}>
      <div className="eyebrow">Track order</div>
      <h1 className="h1-xl">Where is my order?</h1>
      <form action={`/${key}/track`} style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <label htmlFor="o" className="sr-only">
          Order number
        </label>
        <input id="o" name="o" defaultValue={q} placeholder="Order number, e.g. MU-10482" className="input mono" style={{ flex: 1, borderRadius: 14, padding: '15px 16px', fontSize: 15 }} required data-testid="track-input" />
        <button className="btn btn-primary" style={{ borderRadius: 14 }}>
          Track
        </button>
      </form>
      {err && <div style={{ marginTop: 18, borderRadius: 18, background: '#FBE9E5', color: '#8A2E1B', padding: '16px 18px', fontSize: 14 }} role="alert">{err}</div>}
      {tr && (
        <div style={{ marginTop: 22, border: '1px solid var(--border)', borderRadius: 26, overflow: 'hidden' }} data-testid="track-result">
          <div style={{ background: 'var(--p)', color: '#fff', padding: '24px 26px' }} className="row">
            <div>
              <div style={{ fontSize: 13, opacity: 0.75 }}>Order {tr.number}</div>
              <div style={{ fontSize: 26, fontWeight: 600, marginTop: 2 }} data-testid="track-status">
                {tr.status}
              </div>
              <div style={{ fontSize: 14, opacity: 0.8, marginTop: 2 }}>{tr.eta}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, opacity: 0.75 }}>{tr.pay}</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{fmt(tr.total)}</div>
            </div>
          </div>
          <div className="track-body">
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
              {tr.steps.map((s) => (
                <li key={s.title} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', marginTop: 3, background: s.state === 'done' ? 'var(--ok)' : s.state === 'current' ? 'var(--az)' : 'var(--line)' }} />
                    <span style={{ flex: 1, width: 2, background: 'var(--border)', minHeight: 30 }} />
                  </div>
                  <div style={{ paddingBottom: 14 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: s.state === 'pending' ? 'var(--muted)' : 'var(--text)' }}>{s.title}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{s.state === 'done' ? 'Done' : s.state === 'current' ? 'In progress' : 'Pending'}</div>
                  </div>
                </li>
              ))}
            </ol>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Items</div>
              {tr.items.map((i) => (
                <div key={i.name} className="row" style={{ fontSize: 14, color: 'var(--muted2)' }}>
                  <span>
                    {i.name} × {i.qty}
                  </span>
                  <span>{fmt(i.line)}</span>
                </div>
              ))}
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>Delivery</div>
              <div style={{ fontSize: 14, color: 'var(--muted2)' }}>
                {tr.region} · {tr.phone}
              </div>
              <a href={waLink(brand.whatsapp, `Hello ${brand.name}, I have a question about order ${tr.number}.`)} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ marginTop: 8, alignSelf: 'flex-start', background: '#E8F7EE', color: '#137A3D' }}>
                Ask about this order
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
