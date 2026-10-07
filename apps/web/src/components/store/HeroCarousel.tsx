'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fmt } from '@/lib/format';

export interface Slide {
  eyebrow: string;
  title: string;
  sub: string;
  img: string;
  href: string;
  price: number;
}

/** Rotating hero (CMS-driven), 7 s per slide, pauses on hover. */
export function HeroCarousel({ slides, dealsHref, labels }: { slides: Slide[]; dealsHref: string; labels: { shopNow: string; seeDeals: string; perMonth: string } }) {
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  const n = slides.length;
  useEffect(() => {
    if (hold || n < 2) return;
    const t = window.setInterval(() => setI((x) => (x + 1) % n), 7000);
    return () => window.clearInterval(t);
  }, [hold, n]);
  const s = slides[i % Math.max(n, 1)];
  if (!s) return null;
  return (
    <section className="hero" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} aria-roledescription="carousel" aria-label="Featured products">
      <div className="arc" />
      <div className="hero-copy">
        <span className="mono" style={{ fontSize: 12, letterSpacing: '.16em', color: 'rgba(255,255,255,.62)' }}>
          {s.eyebrow}
        </span>
        <h1>{s.title}</h1>
        <p>{s.sub}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'clamp(16px, 2vw, 24px)', fontWeight: 600 }}>{fmt(s.price)}</span>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,.62)' }}>{labels.perMonth.replace('{amount}', fmt(s.price / 12))}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href={s.href} className="btn btn-white">
            {labels.shopNow}
          </Link>
          <Link href={dealsHref} className="btn btn-ghost-light d-only">
            {labels.seeDeals}
          </Link>
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 16, paddingTop: 12 }}>
          <button type="button" className="icon-btn d-only" style={{ border: '1px solid rgba(255,255,255,.3)', color: '#fff' }} onClick={() => setI((x) => (x + n - 1) % n)} aria-label="Previous slide">
            ←
          </button>
          <button type="button" className="icon-btn d-only" style={{ background: '#fff', color: '#12152B' }} onClick={() => setI((x) => (x + 1) % n)} aria-label="Next slide">
            →
          </button>
          <div className="dots">
            {slides.map((_, k) => (
              <button key={k} type="button" className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Slide ${k + 1}`} aria-current={k === i} />
            ))}
          </div>
        </div>
      </div>
      <div className="hero-art">
        <div className="c1" />
        <div className="c2" />
        {s.img && <img key={s.img} src={s.img} alt={s.title} />}
      </div>
    </section>
  );
}
