'use client';
import { useRef, useState } from 'react';
import { PImg } from './PImg';
import { img } from '@/lib/img';
import { productLabel } from '@/lib/site';
import { ChevronLeftIcon, ChevronRightIcon } from '../icons';

export interface GalleryLabels {
  prev: string;
  next: string;
  /** "Photo {n}" */
  photo: string;
  thumbs: string;
}

const fill = (tpl: string, v: Record<string, number>) => tpl.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''));

/** Large product photo shown in place, with thumbnails and swipe/arrows between photos (no full-screen viewer). */
export function Gallery({ images, name, model, sub, badge, labels }: { images: string[]; name: string; model: string; sub: string; badge: string; labels: GalleryLabels }) {
  const [i, setI] = useState(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const n = images.length;
  const label = productLabel({ model, name });
  const go = (d: number) => n > 1 && setI((k) => (k + d + n) % n);

  return (
    <div className="pdp-gallery">
      <div
        className="pdp-media"
        data-testid="gallery-media"
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse') swipe.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const s = swipe.current;
          swipe.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s.y)) go(dx < 0 ? 1 : -1);
        }}
      >
        <PImg src={images[i] ?? ''} alt={i === 0 ? label : `${label}, ${fill(labels.photo, { n: i + 1 })}`} model={model} sub={sub} size="xl" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />
        <span className="pdp-badge">{badge}</span>
        {n > 1 && (
          <>
            <button type="button" className="pdp-arrow pdp-arrow-l" onClick={() => go(-1)} aria-label={labels.prev}>
              <ChevronLeftIcon size={22} />
            </button>
            <button type="button" className="pdp-arrow pdp-arrow-r" onClick={() => go(1)} aria-label={labels.next}>
              <ChevronRightIcon size={22} />
            </button>
            <span className="pdp-count" data-testid="gallery-count" aria-hidden="true">
              {i + 1} / {n}
            </span>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="thumbs nsb" role="group" aria-label={labels.thumbs}>
          {images.map((src, k) => (
            <button key={src} type="button" aria-pressed={k === i} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={fill(labels.photo, { n: k + 1 })}>
              <img src={img(src, 128)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
