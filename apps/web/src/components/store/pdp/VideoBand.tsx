'use client';
import { useRef, useState } from 'react';
import { PlayIcon } from '@/components/icons';

/** Full-width product film: poster first, plays with controls only when the shopper presses play (saves data). */
export function VideoBand({ src, poster, title, label }: { src: string; poster: string; title: string; label: string }) {
  const [on, setOn] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  return (
    <div className="pv-frame">
      {on ? (
        <video ref={ref} className="pv-video" src={src} poster={poster} controls autoPlay playsInline preload="auto" aria-label={title} />
      ) : (
        <button type="button" className="pv-poster" onClick={() => setOn(true)} aria-label={`${label}: ${title}`}>
          <img src={poster} alt="" loading="lazy" decoding="async" />
          <span className="pv-play" aria-hidden="true">
            <PlayIcon size={26} />
          </span>
        </button>
      )}
    </div>
  );
}
