'use client';
import { useState } from 'react';
import { modelShort } from '@/lib/format';

/**
 * Product image on a brand-coloured tile. Remote photos that fail to load
 * fall back to the prototype's model-number tile.
 */
export function PImg({ src, alt, model, sub, size = 'md', cover = false, className = '', style }: { src: string; alt: string; model: string; sub?: string; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; cover?: boolean; className?: string; style?: React.CSSProperties }) {
  const [broken, setBroken] = useState(false);
  const show = src && !broken;
  const fs = { xs: 11, sm: 13, md: 16, lg: 26, xl: 72 }[size];
  return (
    <div className={`pimg ${cover ? 'cover' : ''} ${className}`} style={style}>
      {show ? (
        <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setBroken(true)} />
      ) : (
        <div className="ph" style={{ fontSize: fs, padding: size === 'xl' ? 40 : size === 'lg' ? 18 : 10 }}>
          {sub && (size === 'lg' || size === 'xl') && <span className="sub">{sub.toUpperCase()}</span>}
          <span>{size === 'xl' ? model : modelShort(model)}</span>
        </div>
      )}
    </div>
  );
}
