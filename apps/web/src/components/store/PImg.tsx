'use client';
import { useEffect, useRef, useState } from 'react';
import { modelShort } from '@/lib/format';
import { img, imgSet } from '@/lib/img';

/**
 * Product image on a brand-coloured tile. Remote photos that fail to load
 * fall back to the prototype's model-number tile.
 */
const W1 = { xs: 96, sm: 256, md: 384, lg: 640, xl: 828 } as const;
const W2 = { xs: 256, sm: 640, md: 828, lg: 1200, xl: 1920 } as const;

export function PImg({ src, alt, model, sub, size = 'md', cover = false, className = '', style }: { src: string; alt: string; model: string; sub?: string; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; cover?: boolean; className?: string; style?: React.CSSProperties }) {
  const [broken, setBroken] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // Catch images that failed before hydration (onError fired before React attached).
  useEffect(() => {
    const i = ref.current;
    if (i && i.complete && i.naturalWidth === 0) setBroken(true);
  }, [src]);
  const show = src && !broken;
  const fs = { xs: 11, sm: 13, md: 16, lg: 26, xl: 72 }[size];
  return (
    <div className={`pimg ${cover ? 'cover' : ''} ${className}`} style={style}>
      {show ? (
        <img ref={ref} src={img(src, W1[size])} srcSet={imgSet(src, W1[size], W2[size])} sizes={`${W1[size]}px`} alt={alt} loading={size === 'xl' ? 'eager' : 'lazy'} fetchPriority={size === 'xl' ? 'high' : undefined} decoding="async" onError={() => setBroken(true)} />
      ) : (
        <div className="ph" style={{ fontSize: fs, padding: size === 'xl' ? 40 : size === 'lg' ? 18 : 10 }}>
          {sub && (size === 'lg' || size === 'xl') && <span className="sub">{sub.toUpperCase()}</span>}
          <span>{size === 'xl' ? model : modelShort(model)}</span>
        </div>
      )}
    </div>
  );
}
