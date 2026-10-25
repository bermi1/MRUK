'use client';
import { useEffect, useRef, useState } from 'react';
import { img, imgSet, type ImgWidth } from '@/lib/img';
import { CatGlyph, glyphKind } from '../CatGlyph';

/**
 * Hero product image. The first slide is the LCP element: eager, fetchPriority=high and
 * never animated from opacity 0. If the photo can't load (offline, removed), a line-art
 * glyph of the category takes its place so the stage still looks designed.
 */
export function HeroImage({ src, alt, kind, first, sizes, w1, w2, className }: { src: string; alt: string; kind: string; first: boolean; sizes: string; w1: ImgWidth; w2: ImgWidth; className?: string }) {
  const [broken, setBroken] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setBroken(false);
    const i = ref.current;
    if (i && i.complete && i.naturalWidth === 0) setBroken(true);
  }, [src]);
  if (!src || broken) return <CatGlyph kind={glyphKind(kind)} className={`${className ?? ''} hero-glyph`} strokeWidth={1.1} />;
  return (
    <img
      ref={ref}
      className={className}
      src={img(src, w1, 75)}
      srcSet={imgSet(src, w1, w2)}
      sizes={sizes}
      alt={alt}
      loading={first ? 'eager' : 'lazy'}
      fetchPriority={first ? 'high' : 'auto'}
      decoding={first ? 'sync' : 'async'}
      onError={() => setBroken(true)}
    />
  );
}
