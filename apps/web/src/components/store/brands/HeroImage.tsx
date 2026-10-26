'use client';
import { useEffect, useRef, useState } from 'react';
import { img, imgSet, type ImgWidth } from '@/lib/img';
import { CatGlyph, glyphKind } from '../CatGlyph';

/**
 * Hero image. The first slide is the LCP element: eager, fetchPriority=high and never
 * animated from opacity 0. An optional phone image (CMS imgMobile) is served through
 * <picture>. If the photo can't load (offline, removed), a line-art glyph of the category
 * takes its place so the stage still looks designed.
 */
export function HeroImage({
  src,
  mobileSrc,
  alt,
  kind,
  first,
  sizes,
  w1,
  w2,
  className,
  focal,
}: {
  src: string;
  mobileSrc?: string;
  alt: string;
  kind: string;
  first: boolean;
  sizes: string;
  w1: ImgWidth;
  w2: ImgWidth;
  className?: string;
  focal?: string;
}) {
  const [broken, setBroken] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setBroken(false);
    const i = ref.current;
    if (i && i.complete && i.naturalWidth === 0) setBroken(true);
  }, [src, mobileSrc]);
  if (!src || broken) return <CatGlyph kind={glyphKind(kind)} className={`${className ?? ''} hero-glyph`} strokeWidth={1.1} />;
  const el = (
    <img
      ref={ref}
      className={className}
      src={img(src, w1, 75)}
      srcSet={imgSet(src, w1, w2)}
      sizes={sizes}
      alt={alt}
      style={focal ? { objectPosition: focal } : undefined}
      loading={first ? 'eager' : 'lazy'}
      fetchPriority={first ? 'high' : 'auto'}
      decoding={first ? 'sync' : 'async'}
      onError={() => setBroken(true)}
    />
  );
  if (!mobileSrc || mobileSrc === src) return el;
  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={imgSet(mobileSrc, 640, 1080) ?? mobileSrc} sizes="100vw" />
      {el}
    </picture>
  );
}
