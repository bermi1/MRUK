'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { img } from '@/lib/img';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, ZoomInIcon, ZoomOutIcon } from '../../icons';

export interface LightboxLabels {
  dialog: string;
  close: string;
  prev: string;
  next: string;
  zoomIn: string;
  zoomOut: string;
  hint: string;
  /** "{n} of {total}" and "Photo {n}" templates. */
  count: string;
  photo: string;
}

const MAX = 4;
const ZOOM = 2.5;
const fill = (tpl: string, v: Record<string, number>) => tpl.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''));
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Full-screen photo viewer. Loaded on first open (next/dynamic) so it adds nothing to the page's first JS.
 * Arrow keys / swipe change photo; click, double-tap, pinch or +/- zoom; drag pans while zoomed;
 * Esc closes; Tab is trapped inside; focus returns to the opener on close.
 */
export function Lightbox({ images, index, alt, labels, onIndex, onClose }: { images: string[]; index: number; alt: string; labels: LightboxLabels; onIndex: (i: number) => void; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; px: number; py: number; dist: number; scale: number; moved: boolean } | null>(null);
  const lastTap = useRef(0);
  const n = images.length;

  const reset = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };
  const go = useCallback(
    (d: number) => {
      if (n < 2) return;
      onIndex((index + d + n) % n);
    },
    [index, n, onIndex],
  );
  useEffect(reset, [index]);

  // Lock page scroll, focus the dialog, restore focus to the opener on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    closeBtn.current?.focus();
    return () => {
      html.style.overflow = prev;
      opener?.focus?.();
    };
  }, []);

  const zoomTo = (s: number, cx?: number, cy?: number) => {
    const next = clamp(s, 1, MAX);
    if (next === 1) return reset();
    // Keep the point under the cursor/fingers still while scaling.
    const el = box.current?.querySelector<HTMLElement>('.lbx-stage');
    if (el && cx !== undefined && cy !== undefined) {
      const r = el.getBoundingClientRect();
      const ox = cx - (r.left + r.width / 2);
      const oy = cy - (r.top + r.height / 2);
      const k = next / scale;
      setPos((p) => ({ x: ox - (ox - p.x) * k, y: oy - (oy - p.y) * k }));
    }
    setScale(next);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === '+' || e.key === '=') zoomTo(scale + 1);
    else if (e.key === '-') zoomTo(scale - 1);
    else if (e.key === 'Tab') {
      const f = [...(box.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [])];
      if (!f.length) return;
      const first = f[0]!;
      const last = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const down = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...ptrs.current.values()];
    const dist = pts.length > 1 ? Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y) : 0;
    gesture.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y, dist, scale, moved: false };
  };
  const move = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || !ptrs.current.has(e.pointerId)) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...ptrs.current.values()];
    if (pts.length > 1 && g.dist > 0) {
      g.moved = true;
      const d = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      setScale(clamp((g.scale * d) / g.dist, 1, MAX));
      return;
    }
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) g.moved = true;
    if (scale > 1) setPos({ x: g.px + dx, y: g.py + dy });
  };
  const up = (e: React.PointerEvent) => {
    const g = gesture.current;
    ptrs.current.delete(e.pointerId);
    if (!g) return;
    if (ptrs.current.size > 0) {
      // One finger lifted after a pinch: continue as a pan from here.
      const [p] = [...ptrs.current.values()];
      gesture.current = { ...g, x: p!.x, y: p!.y, px: pos.x, py: pos.y, dist: 0, scale };
      return;
    }
    gesture.current = null;
    if (scale <= 1.02) {
      if (scale !== 1) reset();
      const dx = e.clientX - g.x;
      if (g.moved && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - g.y)) return go(dx < 0 ? 1 : -1);
    }
    if (g.moved) return;
    // Click (mouse) or tap: toggle zoom at that point. Double-tap on touch does the same.
    const now = Date.now();
    if (e.pointerType === 'touch' && now - lastTap.current > 320) {
      lastTap.current = now;
      return;
    }
    lastTap.current = 0;
    if (scale > 1) reset();
    else zoomTo(ZOOM, e.clientX, e.clientY);
  };

  const src = images[index] ?? '';
  // Portal to the brand root: the gallery column is sticky (its own stacking context), which would
  // otherwise keep the dialog under the site header. The brand root keeps the brand CSS variables.
  return createPortal(
    <div ref={box} className="lbx" role="dialog" aria-modal="true" aria-label={labels.dialog} onKeyDown={onKey} data-testid="lightbox">
      <div className="lbx-top">
        <span className="lbx-count" aria-live="polite" data-testid="lightbox-count">
          {fill(labels.count, { n: index + 1, total: n })}
        </span>
        <div className="lbx-tools">
          <button type="button" className="lbx-btn" onClick={() => zoomTo(scale > 1 ? 1 : ZOOM)} aria-label={scale > 1 ? labels.zoomOut : labels.zoomIn} aria-pressed={scale > 1}>
            {scale > 1 ? <ZoomOutIcon size={20} /> : <ZoomInIcon size={20} />}
          </button>
          <button ref={closeBtn} type="button" className="lbx-btn" onClick={onClose} aria-label={labels.close} data-testid="lightbox-close">
            <CloseIcon size={22} />
          </button>
        </div>
      </div>
      <div className={`lbx-stage ${scale > 1 ? 'is-zoomed' : ''}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <img
          key={src}
          src={img(src, 1920, 80)}
          srcSet={src && img(src, 1080) !== src ? `${img(src, 1080, 80)} 1080w, ${img(src, 1920, 80)} 1920w` : undefined}
          sizes="100vw"
          alt={`${alt}, ${fill(labels.photo, { n: index + 1 })}`}
          draggable={false}
          style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${scale})` }}
          data-testid="lightbox-img"
        />
      </div>
      {n > 1 && (
        <>
          <button type="button" className="lbx-btn lbx-nav lbx-prev" onClick={() => go(-1)} aria-label={labels.prev} data-testid="lightbox-prev">
            <ChevronLeftIcon size={26} />
          </button>
          <button type="button" className="lbx-btn lbx-nav lbx-next" onClick={() => go(1)} aria-label={labels.next} data-testid="lightbox-next">
            <ChevronRightIcon size={26} />
          </button>
        </>
      )}
      <div className="lbx-foot">
        <span className="lbx-hint">{labels.hint}</span>
        {n > 1 && (
          <div className="lbx-thumbs">
            {images.map((s, k) => (
              <button key={s} type="button" className={k === index ? 'on' : ''} aria-current={k === index ? 'true' : undefined} aria-label={fill(labels.photo, { n: k + 1 })} onClick={() => onIndex(k)}>
                <img src={img(s, 128)} alt="" loading="lazy" draggable={false} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.querySelector('.brand-root') ?? document.body,
  );
}
