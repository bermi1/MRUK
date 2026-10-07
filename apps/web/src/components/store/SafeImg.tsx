'use client';
import { useState } from 'react';

/** Decorative image that disappears instead of showing a broken icon when the URL fails. */
export function SafeImg(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [ok, setOk] = useState(true);
  if (!ok || !props.src) return null;
  // eslint-disable-next-line jsx-a11y/alt-text
  return <img loading="lazy" decoding="async" {...props} onError={() => setOk(false)} />;
}
