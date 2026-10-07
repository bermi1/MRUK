'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ProductView } from '@/lib/types';
import { fmt, stockLabel } from '@/lib/format';
import { CompareToggle } from './CartButtons';
import { PImg } from './PImg';

/** "New this season": up to 8 items, auto-scrolls every 3 s, pauses on hover. */
export function NewArrivals({ items, brand, compare, title, sub, pill }: { items: ProductView[]; brand: string; compare: string[]; title: string; sub: string; pill: string }) {
  const steps = Math.max(1, items.length - 3);
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  useEffect(() => {
    if (hold) return;
    const t = window.setInterval(() => setI((x) => (x + 1) % steps), 3000);
    return () => window.clearInterval(t);
  }, [hold, steps]);
  return (
    <>
      <div className="sec-head">
        <div style={{ maxWidth: 660 }}>
          <div className="pill">
            <span className="dot" />
            {pill}
          </div>
          <h2>{title}</h2>
          <p>{sub}</p>
        </div>
        <div className="d-only" style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
          <div className="dots dark">
            {Array.from({ length: steps }, (_, k) => (
              <button key={k} type="button" className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Page ${k + 1}`} />
            ))}
          </div>
          <button type="button" className="icon-btn" style={{ border: '1px solid var(--line)' }} onClick={() => setI((x) => (x + steps - 1) % steps)} aria-label="Previous">
            ←
          </button>
          <button type="button" className="icon-btn" style={{ background: 'var(--p)', color: '#fff' }} onClick={() => setI((x) => (x + 1) % steps)} aria-label="Next">
            →
          </button>
        </div>
      </div>
      <div className="carousel nsb" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} onTouchStart={() => setHold(true)} style={{ overflowX: 'auto' }}>
        <div className="carousel-track" style={{ transform: `translateX(calc(${-i} * (25% + 4px)))` }}>
          {items.map((p) => (
            <Link key={p.id} href={`/${brand}/p/${p.id}`} className="carousel-item">
              <div style={{ height: 260, borderRadius: 'var(--r)', overflow: 'hidden', position: 'relative' }} className="na-img">
                <PImg src={p.img} alt={p.name} model={p.model} sub={p.sub} size="lg" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />
                <span className="badge" style={{ position: 'absolute', left: 12, top: 12, background: 'var(--hi)', color: '#fff' }}>
                  NEW
                </span>
                <span style={{ position: 'absolute', right: 12, top: 12 }}>
                  <CompareToggle brand={brand} id={p.id} on={compare.includes(p.id)} />
                </span>
              </div>
              <div className="row-top">
                <div style={{ minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {p.model}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.25, marginTop: 3 }}>{p.name}</div>
                  <div style={{ fontSize: 12.5, color: p.stock <= 5 ? 'var(--warn)' : 'var(--ok)', fontWeight: 500, marginTop: 4 }}>{stockLabel(p.stock)}</div>
                </div>
                <div style={{ textAlign: 'right', flex: 'none' }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{fmt(p.price)}</div>
                  <div className="monthly" style={{ fontSize: 12 }}>
                    {fmt(p.price / 12)}/mo
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
