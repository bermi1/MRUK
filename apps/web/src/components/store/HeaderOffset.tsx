'use client';
import { useEffect } from 'react';

/**
 * Publishes the visible site header's bottom edge as `--hdr-h` on <html>, so sticky bars and
 * galleries sit exactly under it in both header states (full, and compact after scrolling) and on
 * phones (app bar). Watches scroll and the header's own size (its category row folds with a transition).
 */
export function HeaderOffset() {
  useEffect(() => {
    const root = document.documentElement;
    const headers = Array.from(document.querySelectorAll<HTMLElement>('.mu-hdr, .sw-hdr, .appbar'));
    let raf = 0;
    const update = () => {
      raf = 0;
      let bottom = 0;
      for (const h of headers) {
        if (!h.offsetParent && getComputedStyle(h).position !== 'fixed') continue; // hidden at this width
        bottom = Math.max(bottom, h.getBoundingClientRect().bottom);
      }
      root.style.setProperty('--hdr-h', `${Math.max(0, Math.round(bottom))}px`);
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    const ro = new ResizeObserver(queue);
    headers.forEach((h) => ro.observe(h));
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
      if (raf) cancelAnimationFrame(raf);
      root.style.removeProperty('--hdr-h');
    };
  }, []);
  return null;
}
