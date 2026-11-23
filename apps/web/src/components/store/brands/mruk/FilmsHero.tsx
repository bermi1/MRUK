'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, PauseIcon, PlayIcon } from '@/components/icons';
import { videoAllowed } from '../HeroMedia';

export interface Film {
  src: string;
  poster: string;
  label: string;
}

/**
 * Mr UK video-only hero. The lifestyle films play one after the other (each to its end, then the next,
 * then back to the first), under one calm headline. The first poster is the first paint (LCP); videos load
 * only after mount and only where motion and data allow, so slow or data-saving phones keep the photo.
 * If the browser refuses autoplay, the poster simply stays. The pause button stops the film in place.
 */
export function FilmsHero({ films, eyebrow, title, sub, primary, secondary, labels }: {
  films: Film[];
  eyebrow: string;
  title: string;
  sub: string;
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
  labels: { pause: string; play: string };
}) {
  const [ok, setOk] = useState(false);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const refs = useRef<(HTMLVideoElement | null)[]>([]);
  const n = films.length;

  useEffect(() => setOk(videoAllowed()), []);

  // Start the active film from the beginning; keep the others paused and rewound.
  useEffect(() => {
    if (!ok) return;
    refs.current.forEach((v, k) => {
      if (!v) return;
      if (k === i) {
        v.currentTime = 0;
        if (!paused) v.play().catch(() => undefined);
      } else {
        v.pause();
      }
    });
    setProgress(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, ok]);

  const toggle = () => {
    const v = refs.current[i];
    if (!v) return setPaused((p) => !p);
    if (paused) {
      v.play().catch(() => undefined);
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  };

  const first = films[0];
  if (!first) return null;

  return (
    <section className="mu-film mv-films" aria-label={eyebrow} data-testid="mruk-film">
      <div className="mu-film-media" aria-hidden="true">
        <img src={first.poster} alt="" className="mu-film-img" fetchPriority="high" decoding="async" width={1600} height={900} />
        {ok &&
          films.map((f, k) => (
            <video
              key={f.src}
              ref={(el) => {
                refs.current[k] = el;
              }}
              className={`mu-film-img mv-film-v ${k === i ? 'on' : ''}`}
              muted
              playsInline
              loop={n === 1}
              preload={k === 0 || k === (i + 1) % n ? 'auto' : 'metadata'}
              poster={f.poster}
              tabIndex={-1}
              onEnded={() => n > 1 && setI((x) => (x + 1) % n)}
              onTimeUpdate={(e) => k === i && setProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
            >
              <source src={f.src} type="video/mp4" />
            </video>
          ))}
        <span className="mu-film-shade" />
      </div>
      <div className="wrap mu-film-in">
        <div className="mu-film-copy">
          <p className="mu-film-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="mu-film-sub">{sub}</p>
          <div className="mu-film-cta">
            <Link href={primary.href} className="mu-btn mu-btn-sky">
              {primary.label} <ArrowRightIcon size={16} className="i-arrow" />
            </Link>
            <Link href={secondary.href} className="mu-btn mu-btn-ghost">
              {secondary.label}
            </Link>
          </div>
        </div>
        {ok && (
          <div className="mv-film-ctrl">
            {n > 1 && (
              <div className="mv-film-tabs" role="tablist" aria-label={eyebrow}>
                {films.map((f, k) => (
                  <button key={f.src} type="button" role="tab" aria-selected={k === i} className={k === i ? 'on' : ''} onClick={() => setI(k)}>
                    <span className="mv-film-l">{f.label}</span>
                    <span className="mv-film-bar">
                      <span style={{ transform: `scaleX(${k === i ? progress : k < i ? 1 : 0})` }} />
                    </span>
                  </button>
                ))}
              </div>
            )}
            <button type="button" className="mv-film-pause" onClick={toggle} aria-pressed={paused} aria-label={paused ? labels.play : labels.pause}>
              {paused ? <PlayIcon size={16} strokeWidth={1.6} /> : <PauseIcon size={16} strokeWidth={1.6} />}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
