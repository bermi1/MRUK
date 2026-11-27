'use client';
import { useEffect, useRef, useState } from 'react';
import { primeAutoplay, videoAllowed } from '../HeroMedia';

/**
 * Silent product film that plays only while at least half of it is on screen and pauses when it leaves,
 * so it never spends data off-screen. Poster only with reduced motion, Save-Data or 2G.
 */
export function FilmTile({ src, poster, className = 'mv7-film-media' }: { src: string; poster: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [ok, setOk] = useState(false);
  const [near, setNear] = useState(false);

  useEffect(() => setOk(videoAllowed()), []);
  useEffect(() => {
    const el = box.current;
    if (!ok || !el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        if (e.isIntersecting) setNear(true);
        const v = vid.current;
        if (!v) return;
        if (e.intersectionRatio >= 0.5) primeAutoplay(v);
        else v.pause();
      },
      { threshold: [0, 0.5], rootMargin: '200px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ok]);

  return (
    <div ref={box} className={className} aria-hidden="true">
      <img src={poster} alt="" loading="lazy" decoding="async" width={960} height={540} />
      {ok && near && <video ref={vid} src={src} poster={poster} muted loop playsInline preload="metadata" tabIndex={-1} onCanPlay={(e) => e.currentTarget.getBoundingClientRect().top < window.innerHeight && primeAutoplay(e.currentTarget)} />}
    </div>
  );
}
