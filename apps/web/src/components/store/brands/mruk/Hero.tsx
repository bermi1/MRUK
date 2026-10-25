'use client';
import { Fragment, useState } from 'react';
import Link from 'next/link';
import { fmt } from '@/lib/format';
import { HeroImage } from '../HeroImage';
import { fill, type HeroLabels, type HeroSlideView } from '../shared';

/**
 * Mr UK kinetic hero: full-bleed navy stage, product on a lit plinth with depth layers,
 * copy that rises in per slide, and segmented progress bars that double as slide tabs.
 * The progress bar's CSS animation drives auto-advance (animationend → next), so pausing
 * (hover, focus, the pause button) freezes both together; with reduced motion there is no
 * animation and therefore no auto-advance.
 */
export function MrukHero({ slides, dealsHref, labels }: { slides: HeroSlideView[]; dealsHref: string; labels: HeroLabels }) {
  const [i, setI] = useState(0);
  const [moved, setMoved] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const n = slides.length;
  const s = slides[i % Math.max(n, 1)];
  if (!s) return null;
  const go = (k: number) => {
    setMoved(true);
    setI(((k % n) + n) % n);
  };
  const words = s.title.split(/\s+/);
  return (
    <section
      className={`mu-hero ${moved ? '' : 'is-first'} ${paused || hover ? 'is-paused' : ''}`}
      aria-roledescription="carousel"
      aria-label={s.eyebrow || 'Featured'}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <div className="mu-hero-bg" aria-hidden="true">
        <span className="mu-hero-grid" />
        <span className="mu-hero-glow" />
        <span className="mu-hero-arc" />
      </div>
      <div className="wrap mu-hero-in">
        <div className="mu-hero-copy" key={`c${i}`} aria-live={paused ? 'polite' : 'off'}>
          <p className="mu-hero-eyebrow">
            <span>{String(i + 1).padStart(2, '0')}</span>
            {s.eyebrow}
          </p>
          <h1>
            {words.map((w, k) => (
              <Fragment key={k}>
                <span className="mu-w" style={{ ['--k' as string]: k }}>
                  {w}
                </span>
                {k < words.length - 1 ? ' ' : ''}
              </Fragment>
            ))}
          </h1>
          <p className="mu-hero-sub">{s.sub}</p>
          <div className="mu-hero-price">
            <span className="mu-hero-amt">{fmt(s.price)}</span>
            <span className="mu-hero-chip">
              {fill(labels.perMonth, { amount: fmt(s.price / 12) })} <em>{labels.withAdvance}</em>
            </span>
          </div>
          <div className="mu-hero-cta">
            <Link href={s.href} className="mu-btn mu-btn-sky">
              {labels.shopNow} <span aria-hidden="true">→</span>
            </Link>
            <Link href={dealsHref} className="mu-btn mu-btn-ghost">
              {labels.seeDeals}
            </Link>
          </div>
        </div>
        <div className="mu-hero-stage" key={`s${i}`}>
          <span className="mu-hero-word" aria-hidden="true">
            {s.model}
          </span>
          <span className="mu-ring r1" aria-hidden="true" />
          <span className="mu-ring r2" aria-hidden="true" />
          <span className="mu-plinth" aria-hidden="true" />
          <HeroImage src={s.img} alt={s.name} kind={`${s.kind} ${s.name}`} first={i === 0 && !moved} sizes="(max-width: 767px) 70vw, 560px" w1={640} w2={1080} className="mu-hero-img" />
          <ul className="mu-specs" aria-label={s.name}>
            {s.features.slice(0, 3).map((f, k) => (
              <li key={f} style={{ ['--k' as string]: k }}>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {n > 1 && (
        <div className="wrap mu-hero-ctrl">
          <div className="mu-tabs" role="tablist" aria-label={labels.slideN.replace('{n}', '').trim()}>
            {slides.map((x, k) => (
              <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={fill(labels.slideN, { n: k + 1 })} className={k === i ? 'on' : ''} onClick={() => go(k)}>
                <span className="mu-tab-label">{x.eyebrow}</span>
                <span className="mu-tab-bar">{k === i && <span className="mu-tab-fill" key={`f${i}`} onAnimationEnd={() => go(i + 1)} />}</span>
              </button>
            ))}
          </div>
          <button type="button" className="mu-pause" onClick={() => setPaused((p) => !p)} aria-label={paused ? labels.play : labels.pause} aria-pressed={paused}>
            {paused ? (
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M3 1.5v11l9-5.5z" fill="currentColor" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M3 1.5h3v11H3zM8 1.5h3v11H8z" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
      )}
    </section>
  );
}
