'use client';
import { useEffect, useRef, useState } from 'react';

type Conn = { saveData?: boolean; effectiveType?: string };

/** True when a background video may load: no reduced motion, no Save-Data, not on a 2G/3G-class connection. */
function videoAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const c = (navigator as Navigator & { connection?: Conn }).connection;
  if (c?.saveData) return false;
  if (c?.effectiveType && /(^|-)2g$|^3g$/.test(c.effectiveType)) return false;
  return true;
}

/**
 * Muted, looping background video for a hero slide. Rendered only after mount and only when
 * allowed, so the server HTML (and slow or data-saving phones) keep the poster/slide image.
 */
export function HeroVideo({ src, poster, className }: { src: string; poster?: string; className?: string }) {
  const [ok, setOk] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    setOk(videoAllowed());
  }, [src]);
  if (!ok || failed || !src) return null;
  const type = src.endsWith('.webm') ? 'video/webm' : 'video/mp4';
  return (
    <video className={className} muted autoPlay loop playsInline preload="metadata" poster={poster || undefined} aria-hidden="true" tabIndex={-1} onError={() => setFailed(true)}>
      <source src={src} type={type} onError={() => setFailed(true)} />
    </video>
  );
}

/** Background music toggle. Off by default and never starts on its own; stops when the slide changes or the hero unmounts. */
export function HeroSound({ src, labels, className }: { src: string; labels: { on: string; off: string }; className?: string }) {
  const [on, setOn] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    setOn(false);
    return () => {
      audio.current?.pause();
      audio.current = null;
    };
  }, [src]);
  if (!src) return null;
  const toggle = () => {
    if (on) {
      audio.current?.pause();
      setOn(false);
      return;
    }
    if (!audio.current) {
      audio.current = new Audio(src);
      audio.current.loop = true;
      audio.current.volume = 0.6;
    }
    audio.current
      .play()
      .then(() => setOn(true))
      .catch(() => setOn(false));
  };
  return (
    <button type="button" className={className} onClick={toggle} aria-pressed={on} aria-label={on ? labels.off : labels.on}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
        {on ? <path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" /> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
      </svg>
    </button>
  );
}
