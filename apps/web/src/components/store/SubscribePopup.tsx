'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowRightIcon, CloseIcon } from '../icons';
import { Subscribe, type SubscribeLabels } from './Subscribe';

const KEY = 'bt_sub_pop';
const SNOOZE_DAYS = 14;
// Never interrupt buying, account or help flows.
const SKIP = /\/(cart|checkout|order|pay|account|login|signup|track|support|unsubscribe|compare)(\/|$)/;

/**
 * One-time subscribe invitation: shown once per visitor after 15 s on a browsing page or after scrolling
 * 60% down, never on checkout/account/help pages, never to automated browsers, hidden for 14 days once
 * closed (or for good once subscribed). The form inside records consent like the footer form.
 */
export function SubscribePopup({ brand, labels, close, logo, brandName, offer, photo }: { brand: 'mruk' | 'skywood'; labels: SubscribeLabels; close: string; logo: string; brandName: string; offer: { on: boolean; eyebrow: string; title: string; sub: string; cta: string; href: string; img: string }; photo: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (SKIP.test(path) || navigator.webdriver) return;
    try {
      const until = Number(localStorage.getItem(KEY) || 0);
      if (until && until > Date.now()) return;
    } catch {
      return;
    }
    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      setOpen(true);
      cleanup();
    };
    const timer = window.setTimeout(show, 15000);
    const onScroll = () => {
      const h = document.documentElement;
      if ((h.scrollTop + innerHeight) / h.scrollHeight > 0.6) show();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
    return cleanup;
  }, [path]);

  const dismiss = (days = SNOOZE_DAYS) => {
    setOpen(false);
    try {
      localStorage.setItem(KEY, String(Date.now() + days * 864e5));
    } catch {
      /* private mode: just close */
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismiss();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div className={`subpop subpop-${brand}`} role="dialog" aria-modal="true" aria-label={labels.title} onClick={() => dismiss()}>
      <div className={`subpop-card ${offer.on ? 'has-offer' : ''}`} onClick={(e) => e.stopPropagation()} onSubmit={() => window.setTimeout(() => dismiss(3650), 2500)}>
        <button type="button" className="subpop-x" onClick={() => dismiss()} aria-label={close} autoFocus>
          <CloseIcon size={20} />
        </button>
        {offer.on && (
          <Link href={offer.href} className="subpop-offer" onClick={() => dismiss()}>
            <img src={offer.img || photo} alt="" loading="lazy" decoding="async" />
            <span className="subpop-offer-in">
              {offer.eyebrow && <span className="subpop-eyebrow">{offer.eyebrow}</span>}
              <span className="subpop-offer-t">{offer.title}</span>
              {offer.sub && <span className="subpop-offer-s">{offer.sub}</span>}
              <span className="subpop-offer-cta">
                {offer.cta} <ArrowRightIcon size={15} />
              </span>
            </span>
          </Link>
        )}
        <div className="subpop-main">
          <img className="subpop-logo" src={logo} alt={brandName} width={120} height={40} />
          <Subscribe brand={brand} source="home" labels={labels} className="subpop-form" />
        </div>
      </div>
    </div>
  );
}
