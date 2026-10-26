'use client';
import { useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../../icons';

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
          <ChevronLeftIcon size={18} />
        </button>
        <button type="button" onClick={() => by(1)} aria-label={labels.next}>
          <ChevronRightIcon size={18} />
        </button>
      </div>
      <div className="rail2-track nsb" ref={ref}>
        {children}
      </div>
    </div>
  );
}
