'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fmt } from '@/lib/format';
import { HeroImage } from '../HeroImage';
import { fill, headlineLines, type HeroLabels, type HeroSlideView } from '../shared';

const DWELL = 9000;

/**
 * Skywood cinematic hero: a full-viewport plaster-and-light set (pure CSS) with the product
 * on a plinth, a slow Ken Burns drift, scroll parallax (CSS scroll timeline where supported),
 * and a serif headline revealed line by line. Slow cadence (9 s), minimal controls.
 */
export function SkywoodHero({ slides, labels }: { slides: HeroSlideView[]; labels: HeroLabels }) {
  const [i, setI] = useState(0);
  const [moved, setMoved] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hold, setHold] = useState(false);
  const n = slides.length;

  useEffect(() => {
    if (n < 2 || paused || hold || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setTimeout(() => {
      setMoved(true);
      setI((x) => (x + 1) % n);
    }, DWELL);
    return () => window.clearTimeout(t);
  }, [i, n, paused, hold]);

  const s = slides[i % Math.max(n, 1)];
  if (!s) return null;
  const go = (k: number) => {
    setMoved(true);
    setI(((k % n) + n) % n);
  };
  const lines = headlineLines(s.title);

  return (
    <section
      className={`sw-hero ${moved ? '' : 'is-first'} ${paused || hold ? 'is-paused' : ''}`}
      aria-roledescription="carousel"
      aria-label={s.eyebrow || 'Featured'}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
    >
      <div className="sw-hero-par">
        <div className="sw-hero-scene" key={`sc${i}`}>
          <span className="sw-wall" aria-hidden="true" />
          <span className="sw-arch" aria-hidden="true" />
          <span className="sw-floor" aria-hidden="true" />
          <span className="sw-light" aria-hidden="true" />
          <div className="sw-hero-obj">
            <span className="sw-shadow" aria-hidden="true" />
            <HeroImage src={s.img} alt={s.name} kind={`${s.kind} ${s.name}`} first={i === 0 && !moved} sizes="(max-width: 767px) 80vw, 46vw" w1={828} w2={1200} className="sw-hero-img" />
          </div>
        </div>
      </div>

      <div className="wrap sw-hero-copy" key={`cp${i}`}>
        <p className="sw-eyebrow">
          <span className="sw-rule" aria-hidden="true" />
          {s.eyebrow}
        </p>
        <h1>
          {lines.map((l, k) => (
            <span key={k} className="sw-line">
              <span style={{ ['--k' as string]: k }}>{l}</span>
              {k < lines.length - 1 ? ' ' : ''}
            </span>
          ))}
        </h1>
        <p className="sw-hero-sub">{s.sub}</p>
        <div className="sw-hero-cta">
          <Link href={s.href} className="sw-btn">
            {labels.discover}
            <span className="sw-btn-arrow" aria-hidden="true">
              →
            </span>
          </Link>
          <span className="sw-hero-price">
            {fmt(s.price)}
            <em>{fill(labels.perMonth, { amount: fmt(s.price / 12) })}</em>
          </span>
        </div>
      </div>

      <div className="wrap sw-hero-foot">
        {n > 1 ? (
          <div className="sw-count-wrap">
            <span className="sw-num" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="sw-track" aria-hidden="true">
              <span key={`p${i}`} className="sw-prog" style={{ animationDuration: `${DWELL}ms` }} />
            </span>
            <span className="sw-num dim" aria-hidden="true">
              {String(n).padStart(2, '0')}
            </span>
            <div className="sw-dots" role="tablist" aria-label="Slides">
              {slides.map((_, k) => (
                <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={fill(labels.slideN, { n: k + 1 })} onClick={() => go(k)} className={k === i ? 'on' : ''} />
              ))}
            </div>
            <button type="button" className="sw-pause" onClick={() => setPaused((p) => !p)} aria-pressed={paused} aria-label={paused ? labels.play : labels.pause}>
              {paused ? '▶' : '❙❙'}
            </button>
          </div>
        ) : (
          <span />
        )}
        <span className="sw-scroll d-only" aria-hidden="true">
          {labels.scrollHint}
          <i />
        </span>
      </div>
    </section>
  );
}
