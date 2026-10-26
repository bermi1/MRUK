'use client';
import { useState } from 'react';
import Link from 'next/link';
import { fmt } from '@/lib/format';
import { ArrowRightIcon, PauseIcon, PlayIcon } from '../../../icons';
import { AddButton } from '../../CartButtons';
import { PImg } from '../../PImg';
import { HeroImage } from '../HeroImage';
import { fill, headlineLines, type HeroLabels, type HeroSlideView } from '../shared';

/**
 * Skywood gallery hero: a plaster room lit by a slow gold light, the product on a stone plinth
 * framed by two offset arches (depth), a ghosted serif model number behind it and a quiet
 * "in detail" card. Copy on the left with the live price, the monthly Pay Later price and two
 * actions. Thumbnail tabs (desktop) or numbered rules (phone) show progress; the progress
 * animation drives auto-advance, so hover, focus and the pause button freeze it, and with
 * reduced motion there is no animation and no auto-advance.
 */
export function SkywoodHero({ slides, labels, dealsHref }: { slides: HeroSlideView[]; labels: HeroLabels; dealsHref: string }) {
  const [i, setI] = useState(0);
  const [moved, setMoved] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hold, setHold] = useState(false);
  const n = slides.length;
  const s = slides[i % Math.max(n, 1)];
  if (!s) return null;
  const go = (k: number) => {
    setMoved(true);
    setI(((k % n) + n) % n);
  };
  const lines = headlineLines(s.title);
  const photo = s.layout === 'photo';
  const first = i === 0 && !moved;

  return (
    <section
      className={`sw-hero ${moved ? '' : 'is-first'} ${paused || hold ? 'is-paused' : ''} ${photo ? `is-photo theme-${s.theme}` : ''} align-${s.align}`}
      aria-roledescription="carousel"
      aria-label={s.eyebrow || 'Featured'}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
    >
      <div className="sw-hero-room" aria-hidden="true">
        <span className="sw-wall" />
        <span className="sw-beam" />
        <span className="sw-floor" />
      </div>

      {photo ? (
        <div className="sw-hero-scene" key={`ph${i}`}>
          <HeroImage src={s.img} mobileSrc={s.imgMobile} alt={s.name} kind={`${s.kind} ${s.name}`} first={first} sizes="100vw" w1={1080} w2={1920} focal={s.focal} className="sw-hero-photo" />
          <span className="sw-photo-shade" aria-hidden="true" />
        </div>
      ) : (
        <div className="sw-stage" key={`st${i}`}>
          <span className="sw-ghost" aria-hidden="true">
            {s.model}
          </span>
          <span className="sw-arch back" aria-hidden="true" />
          <span className="sw-arch front" aria-hidden="true" />
          <span className="sw-plinth" aria-hidden="true" />
          <div className="sw-obj">
            <HeroImage src={s.img} alt={s.name} kind={`${s.kind} ${s.name}`} first={first} sizes="(max-width: 767px) 70vw, 520px" w1={640} w2={1080} className="sw-hero-img" />
          </div>
          {s.features.length > 0 && (
            <div className="sw-detail">
              <span className="sw-detail-h">{s.name}</span>
              <ul>
                {s.features.slice(0, 3).map((f, k) => (
                  <li key={f} style={{ ['--k' as string]: k }}>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="wrap sw-hero-in">
        <div className="sw-hero-copy" key={`cp${i}`} aria-live={paused ? 'polite' : 'off'}>
          <p className="sw-eyebrow">
            <span className="sw-hero-idx">{String(i + 1).padStart(2, '0')}</span>
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
          {s.showPrice && (
            <div className="sw-hero-price">
              <span className="sw-hero-amt">{fmt(s.price)}</span>
              <span className="sw-hero-mo">
                {fill(labels.perMonth, { amount: fmt(s.price / 12) })} <em>{labels.withAdvance}</em>
              </span>
            </div>
          )}
          <div className="sw-hero-cta">
            <Link href={s.href} className="sw-btn">
              {s.cta || labels.discover}
              <ArrowRightIcon size={18} strokeWidth={1.5} className="sw-btn-arrow" />
            </Link>
            {s.pid ? (
              <AddButton brand="skywood" id={s.pid} name={s.name} className="sw-btn sw-btn-ghost" label={labels.addToCart} />
            ) : (
              <Link href={dealsHref} className="sw-btn sw-btn-ghost">
                {labels.seeDeals}
              </Link>
            )}
          </div>
        </div>
      </div>

      {n > 1 && (
        <div className="wrap sw-hero-ctrl">
          <div className="sw-thumbs" role="tablist" aria-label={labels.slideN.replace('{n}', '').trim()}>
            {slides.map((x, k) => (
              <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={fill(labels.slideN, { n: k + 1 })} className={k === i ? 'on' : ''} onClick={() => go(k)}>
                <span className="sw-thumb-art" aria-hidden="true">
                  <PImg src={x.img} alt="" model={x.model} sub={x.kind} size="xs" />
                </span>
                <span className="sw-thumb-copy" aria-hidden="true">
                  <span className="sw-thumb-n">{String(k + 1).padStart(2, '0')}</span>
                  <span className="sw-thumb-l">{x.eyebrow || x.name}</span>
                </span>
                <span className="sw-thumb-bar">{k === i && <span className="sw-thumb-fill" key={`f${i}`} onAnimationEnd={() => go(i + 1)} />}</span>
              </button>
            ))}
          </div>
          <button type="button" className="sw-pause" onClick={() => setPaused((p) => !p)} aria-pressed={paused} aria-label={paused ? labels.play : labels.pause}>
            {paused ? <PlayIcon size={16} strokeWidth={1.5} /> : <PauseIcon size={16} strokeWidth={1.5} />}
          </button>
        </div>
      )}
    </section>
  );
}
