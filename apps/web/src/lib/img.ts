/**
 * Product and banner photos come from the brands' websites as large PNG/JPEG files.
 * Route them through the Next.js image optimiser so phones get a resized WebP/AVIF
 * (much smaller on slow 3G). Logos, data/blob URLs and uploaded files are left as they are.
 */
const OPTIMISE = /^(https:\/\/www\.(mruk|skywood)\.co\.tz\/|\/img\/)/;

/** Widths must be in Next's default image/device sizes. */
export type ImgWidth = 96 | 128 | 256 | 384 | 640 | 828 | 1080 | 1200 | 1920;

export function img(src: string, w: ImgWidth, q = 70): string {
  if (!src || !OPTIMISE.test(src)) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`;
}

/** srcSet for 1x/2x screens, or undefined when the image isn't optimised. */
export function imgSet(src: string, w1: ImgWidth, w2: ImgWidth): string | undefined {
  if (!src || !OPTIMISE.test(src)) return undefined;
  return `${img(src, w1)} ${w1}w, ${img(src, w2)} ${w2}w`;
}
