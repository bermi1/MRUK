'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { WhatsAppIcon } from '../icons';

/**
 * Floating contact button. With an Instagram profile set (Admin › CMS › Social links) it opens a small
 * card: chat on WhatsApp directly, or scan the QR code / tap through to follow on Instagram. Without
 * one it is a plain WhatsApp link, as before.
 */
export function ContactFab({ brandName, waHref, instagram, qrSvg, labels }: { brandName: string; waHref: string; instagram: string; qrSvg: string; labels: { open: string; close: string; title: string; sub: string; chat: string; follow: string; scan: string; openIg: string } }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  const handle = instagram ? `@${instagram.replace(/\/+$/, '').split('/').pop()}` : '';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  if (!instagram) {
    return (
      <a href={waHref} target="_blank" rel="noopener noreferrer" className="wa-fab" aria-label={labels.chat}>
        <WhatsAppIcon />
      </a>
    );
  }
  return (
    <div className={`cfab ${open ? 'is-open' : ''}`} ref={box}>
      {open && (
        <div className="cfab-card" role="dialog" aria-labelledby={`${id}-t`} id={`${id}-card`}>
          <div className="cfab-head">
            <div>
              <p className="cfab-title" id={`${id}-t`}>
                {labels.title}
              </p>
              <p className="cfab-sub">{labels.sub}</p>
            </div>
            <button type="button" className="cfab-x" onClick={() => setOpen(false)} aria-label={labels.close}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <a href={waHref} target="_blank" rel="noopener noreferrer" className="cfab-wa" data-testid="cfab-whatsapp">
            <WhatsAppIcon size={20} />
            <span>{labels.chat}</span>
          </a>
          <div className="cfab-ig">
            <div className="cfab-qr" aria-hidden="true" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <div className="cfab-ig-copy">
              <p className="cfab-ig-t">{labels.follow}</p>
              <p className="cfab-ig-h">{handle}</p>
              <p className="cfab-ig-s">{labels.scan}</p>
              <a href={instagram} target="_blank" rel="noopener noreferrer" className="cfab-ig-link" data-testid="cfab-instagram">
                {labels.openIg} <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
          <p className="cfab-foot">{brandName}</p>
        </div>
      )}
      <button type="button" className="wa-fab" aria-expanded={open} aria-controls={`${id}-card`} aria-label={open ? labels.close : labels.open} onClick={() => setOpen((o) => !o)} data-testid="cfab">
        <WhatsAppIcon />
      </button>
    </div>
  );
}
