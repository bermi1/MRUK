'use client';
import { useRef } from 'react';

/** Horizontal scroll-snap rail with previous/next buttons (native scrolling on touch). */
export function Rail({ children, className = '', labels }: { children: React.ReactNode; className?: string; labels: { prev: string; next: string } }) {
  const ref = useRef<HTMLDivElement>(null);
  const by = (dir: number) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({
      left: dir * el.clientWidth * 0.8,
      behavior: reduce ? 'auto' : 'smooth',
    });
  };
  return (
    <div className={`rail2 ${className}`}>
      <div className="rail2-btns d-only">
        <button type="button" onClick={() => by(-1)} aria-label={labels.prev}>
          <span aria-hidden="true">←</span>
        </button>
        <button type="button" onClick={() => by(1)} aria-label={labels.next}>
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <div className="rail2-track nsb" ref={ref}>
        {children}
      </div>
    </div>
  );
}
