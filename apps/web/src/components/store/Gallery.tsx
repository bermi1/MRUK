'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PImg } from './PImg';
import { img } from '@/lib/img';
import { productLabel } from '@/lib/site';
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon } from '../icons';

export interface GalleryLabels {
  prev: string;
  next: string;
  /** "Photo {n}" */
  photo: string;
  thumbs: string;
  /** Optional: "Video", "In your home", "Zoom", "Close" */
  video?: string;
  lifestyle?: string;
  zoom?: string;
  close?: string;
}

type Item = { kind: 'photo' | 'life'; src: string } | { kind: 'video'; src: string; poster: string };

const fill = (tpl: string, v: Record<string, number>) => tpl.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''));

/**
 * Product gallery: large photo; click or tap zooms it in place (no zoom on mere hover, so nothing is cropped while browsing),
 * swipe/arrows between items, the product video as one of the items (plays with controls, muted
 * until the shopper turns sound on) and lifestyle "in your home" pictures after the photos.
 * Clicking a photo zooms it in place (no full-screen viewer); the counter counts photos only.
 */
export function Gallery({ images, name, model, sub, badge, labels, video, lifestyle = [] }: { images: string[]; name: string; model: string; sub: string; badge: string; labels: GalleryLabels; video?: { src: string; poster: string } | null; lifestyle?: string[] }) {
  const items: Item[] = [
    ...images.map((src) => ({ kind: 'photo' as const, src })),
    ...(video ? [{ kind: 'video' as const, src: video.src, poster: video.poster }] : []),
    ...lifestyle.slice(0, 3).map((src) => ({ kind: 'life' as const, src })),
  ];
  if (!items.length) items.push({ kind: 'photo', src: '' });
  const [i, setI] = useState(0);
  const [locked, setLocked] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const n = items.length;
  const label = productLabel({ model, name });
  const go = useCallback((d: number) => n > 1 && setI((k) => (k + d + n) % n), [n]);
  const cur = items[i] ?? items[0]!;
  const alt = (k: number, it: Item) => (it.kind === 'life' ? `${label}, ${labels.lifestyle ?? 'in use'}` : k === 0 ? label : `${label}, ${fill(labels.photo, { n: k + 1 })}`);

  useEffect(() => setLocked(false), [i]);

  const swipeHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== 'mouse') swipe.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: React.PointerEvent) => {
      const s = swipe.current;
      swipe.current = null;
      if (!s) return;
      const dx = e.clientX - s.x;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s.y)) go(dx < 0 ? 1 : -1);
    },
  };

  const canZoom = cur.kind !== 'video' && !!cur.src;

  return (
    <div className="pdp-gallery">
      <div
        className={`pdp-media ${locked && canZoom ? 'is-zoom' : ''} ${cur.kind === 'life' ? 'is-life' : ''}`}
        data-testid="gallery-media"
        {...swipeHandlers}
        onMouseMove={(e) => {
          if (!canZoom) return;
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => (setZoom(null), setLocked(false))}
        style={locked && zoom && canZoom ? ({ ['--zx' as string]: `${zoom.x}%`, ['--zy' as string]: `${zoom.y}%` } as React.CSSProperties) : undefined}
      >
        {cur.kind === 'video' ? (
          <video key={cur.src} className="pdp-video" src={cur.src} poster={cur.poster} controls muted autoPlay playsInline loop preload="metadata" aria-label={`${label}, ${labels.video ?? 'video'}`} />
        ) : (
          <button type="button" className="pdp-zoom-btn" onClick={() => cur.src && setLocked((z) => !z)} aria-pressed={locked} aria-label={`${labels.zoom ?? 'Zoom'}: ${alt(i, cur)}`}>
            <PImg src={cur.src} alt={alt(i, cur)} model={model} sub={sub} size="xl" cover={cur.kind === 'life'} style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />
          </button>
        )}
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
              {cur.kind === 'photo' ? `${i + 1} / ${images.length || 1}` : cur.kind === 'video' ? (labels.video ?? 'Video') : (labels.lifestyle ?? 'In use')}
            </span>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="thumbs nsb" role="group" aria-label={labels.thumbs}>
          {items.map((it, k) => (
            <button key={`${it.kind}-${it.src}`} type="button" aria-pressed={k === i} className={`${k === i ? 'on' : ''} t-${it.kind}`} onClick={() => setI(k)} aria-label={it.kind === 'video' ? (labels.video ?? 'Video') : it.kind === 'life' ? (labels.lifestyle ?? 'In use') : fill(labels.photo, { n: k + 1 })}>
              <img src={img(it.kind === 'video' ? it.poster : it.src, 128)} alt="" loading="lazy" />
              {it.kind === 'video' && (
                <span className="t-play" aria-hidden="true">
                  <PlayIcon size={14} />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

    </div>
  );
}
