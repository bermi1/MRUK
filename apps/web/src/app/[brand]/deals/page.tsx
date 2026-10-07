import type { Metadata } from 'next';
import Link from 'next/link';
import { AddBundleButton } from '@/components/store/CartButtons';
import { Countdown } from '@/components/store/Countdown';
import { PImg } from '@/components/store/PImg';
import { fmt } from '@/lib/format';
import type { BrandKey } from '@/lib/types';
import { getBundles, getFlashDeals } from '@/server/catalog';

export const metadata: Metadata = { title: 'Deals and bundles' };

export default async function DealsPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const [bundles, flash] = await Promise.all([getBundles(key), getFlashDeals(key)]);
  return (
    <div className="wrap" style={{ paddingTop: 20 }}>
      <section className="deals-hero">
        <div style={{ position: 'absolute', right: -120, top: -120, width: 420, height: 420, borderRadius: '50%', background: 'rgba(255,255,255,.05)' }} />
        <div>
          <span className="mono" style={{ fontSize: 12, letterSpacing: '.16em', opacity: 0.75 }}>
            DEALS, BUNDLES AND OFFERS
          </span>
          <h1 style={{ margin: '10px 0 0', fontSize: 'clamp(26px, 4vw, 56px)', fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1 }}>Save more when you buy together.</h1>
        </div>
        <div className="deals-timer">
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>Flash deals end in</div>
          <Countdown />
        </div>
      </section>
      <h2 className="deals-h2">Bundle packages</h2>
      <div className="grid-3" style={{ marginTop: 18 }}>
        {bundles.map((b) => (
          <article key={b.title} style={{ border: '1px solid var(--border)', borderRadius: 26, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', height: 200, gap: 2, background: 'var(--border)' }}>
              {b.items.slice(0, 3).map((t) => (
                <Link key={t.id} href={`/${key}/p/${t.id}`} style={{ flex: 1, position: 'relative' }}>
                  <PImg src={t.img} alt={t.name} model={t.model} size="sm" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />
                </Link>
              ))}
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              <div className="row">
                <span style={{ fontSize: 19, fontWeight: 600 }}>{b.title}</span>
                <span className="badge" style={{ background: '#E6F4EE', color: 'var(--ok)' }}>
                  Save {b.save}%
                </span>
              </div>
              {b.items.map((l) => (
                <div key={l.id} className="row" style={{ fontSize: 13.5, color: 'var(--muted2)' }}>
                  <span>{l.name}</span>
                  <span>{fmt(l.price)}</span>
                </div>
              ))}
              <div className="row" style={{ alignItems: 'flex-end', marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'line-through' }}>{fmt(b.was)}</div>
                  <div style={{ fontSize: 22, fontWeight: 600 }}>{fmt(b.now)}</div>
                </div>
                <AddBundleButton brand={key} ids={b.items.map((p) => p.id)} />
              </div>
            </div>
          </article>
        ))}
      </div>
      {flash.length > 0 && (
        <>
          <h2 className="deals-h2">Flash deals</h2>
          <div className="grid-4" style={{ marginTop: 18 }}>
            {flash.slice(0, 8).map((p) => (
              <Link key={p.id} href={`/${key}/p/${p.id}`} className="ptile shade-tb" style={{ height: 320 }}>
                <PImg src={p.img} alt={p.name} model={p.model} size="lg" />
                <span className="badge" style={{ position: 'absolute', left: 14, top: 14, background: '#E23B3B', color: '#fff', zIndex: 2 }}>
                  −{p.off}%
                </span>
                <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, zIndex: 2 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginTop: 6 }}>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>{fmt(p.dealPrice)}</span>
                    <span style={{ fontSize: 13, opacity: 0.6, textDecoration: 'line-through' }}>{fmt(p.price)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
      <div className="grid-3" style={{ marginTop: 48 }}>
        <div style={{ borderRadius: 22, background: '#EAF6FC', padding: 24, display: 'flex', gap: 14, alignItems: 'center' }}>
          <img src="/brand/azania-mark.png" alt="" style={{ width: 56, height: 44, objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Salary Advance on every deal</div>
            <div style={{ fontSize: 13, color: '#3D5566', marginTop: 3 }}>Bundles can be paid monthly too</div>
          </div>
        </div>
        <div style={{ borderRadius: 22, background: 'var(--surface)', padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Free delivery in Dar</div>
          <div style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 3 }}>On orders over TZS 500,000</div>
        </div>
        <div style={{ borderRadius: 22, background: 'var(--surface)', padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Showroom pickup</div>
          <div style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 3 }}>Reserve online, collect in 24 hours</div>
        </div>
      </div>
    </div>
  );
}
