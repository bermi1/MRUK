'use client';
import { useState } from 'react';
import { PImg } from './PImg';

export function Gallery({ images, name, model, sub, badge }: { images: string[]; name: string; model: string; sub: string; badge: string }) {
  const [i, setI] = useState(0);
  return (
    <div>
      <div className="pdp-media">
        <PImg src={images[i] ?? ''} alt={name} model={model} sub={sub} size="xl" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />
        <span style={{ position: 'absolute', left: 20, top: 20, background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(10px)', color: '#fff', borderRadius: 999, fontSize: 12, fontWeight: 600, padding: '6px 12px' }}>{badge}</span>
      </div>
      {images.length > 1 && (
        <div className="thumbs" role="tablist" aria-label="Product photos">
          {images.map((src, k) => (
            <button key={src} type="button" role="tab" aria-selected={k === i} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Photo ${k + 1}`}>
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
