'use client';
import { useState } from 'react';
import Link from 'next/link';
import { fmt } from '@/lib/format';
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { AddButton } from '../../CartButtons';
import { SafeImg } from '../../SafeImg';
import { fill, type HeroLabels, type HeroSlideView } from '../shared';

/**
 * "In the spotlight": the CMS hero slides (Admin › CMS), one product at a time.
 * Calm on purpose: no auto-advance; numbered buttons and arrows move between slides.
 */
export function Spotlight({ slides, labels, kicker, nav }: { slides: HeroSlideView[]; labels: HeroLabels; kicker: string; nav?: { prev: string; next: string } }) {
  const [i, setI] = useState(0);
  const n = slides.length;
  const s = slides[i % Math.max(n, 1)];
  if (!s) return null;
  const go = (k: number) => setI(((k % n) + n) % n);
  return (
    <div className="mv-story" data-testid="mruk-spotlight">
      <div className="mv-story-media" aria-hidden="true" key={`m${i}`}>
        {s.model && (
          <span className="mv-story-ghost" style={{ ['--len' as string]: Math.max(s.model.length, 5) }}>
            {s.model}
          </span>
        )}
        <span className="mv-story-glow" />
        <div className="mv-story-obj">{s.img && <SafeImg src={s.img} alt="" />}</div>
        <div className="mv-story-reflect">{s.img && <SafeImg src={s.img} alt="" />}</div>
      </div>
      <div className="mv-story-copy" key={`c${i}`}>
        <p className="mx-kicker">
          {kicker}
          {s.eyebrow ? ` · ${s.eyebrow}` : ''}
        </p>
        <h2 className="mx-h">{s.title}</h2>
        {s.sub && <p className="mx-p">{s.sub}</p>}
        {s.features.length > 0 && (
          <ul>
            {s.features.slice(0, 3).map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
        {s.showPrice && (
          <p className="mv-story-price">
            <b>{fmt(s.price)}</b>
            {labels.perMonth && <span>{fill(labels.perMonth, { amount: fmt(s.price / 12) })}</span>}
          </p>
        )}
        <div className="mx-row">
          <Link href={s.href} className="mu-btn mu-btn-navy">
            {s.cta || labels.discover} <ArrowRightIcon size={16} className="i-arrow" />
          </Link>
          {s.pid && <AddButton brand="mruk" id={s.pid} name={s.name} className="mx-textlink" label={labels.addToCart} />}
        </div>
        {n > 1 && (
          <div className="mv-spot-nav">
            <button type="button" onClick={() => go(i - 1)} aria-label={nav?.prev ?? 'Previous'}>
              <ChevronLeftIcon size={18} />
            </button>
            <div className="mv-spot-tabs" role="group" aria-label={kicker}>
              {slides.map((x, k) => (
                <button key={k} type="button" aria-pressed={k === i} aria-label={`${String(k + 1).padStart(2, '0')}, ${fill(labels.slideN, { n: k + 1 })}`} className={k === i ? 'on' : ''} onClick={() => go(k)}>
                  {String(k + 1).padStart(2, '0')}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => go(i + 1)} aria-label={nav?.next ?? 'Next'}>
              <ChevronRightIcon size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
