'use client';
import { useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Tiny scroll-reveal helper (no animation library). Any element with `data-reveal`
 * fades/rises in once it enters the viewport. Content is never hidden without JS:
 * the hiding rule only applies under `html.rv`, which this component sets. Elements
 * already on screen at mount are marked visible before the first paint, so nothing
 * above the fold flashes or shifts. CSS skips all of it under prefers-reduced-motion.
 */
export function RevealObserver() {
  const path = usePathname();
  const first = useRef(path);
  // Client navigations (not the first load, so the LCP is never delayed) get the brand's page-enter motion.
  useLayoutEffect(() => {
    if (first.current !== path) document.documentElement.classList.add('nav');
  }, [path]);
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    const seen = new WeakSet<Element>();
    const scan = () => {
      const vh = window.innerHeight;
      for (const el of document.querySelectorAll<HTMLElement>('[data-reveal]:not(.in)')) {
        if (seen.has(el)) continue;
        seen.add(el);
        if (el.getBoundingClientRect().top < vh * 0.98) el.classList.add('in');
        else io.observe(el);
      }
    };
    scan();
    root.classList.add('rv');
    // Content streamed in or refreshed later (router.refresh) is picked up too, so it never stays hidden.
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [path]);
  return null;
}
