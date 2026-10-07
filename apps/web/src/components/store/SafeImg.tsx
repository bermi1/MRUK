'use client';
import { useEffect, useRef, useState } from 'react';

/** Decorative image that disappears instead of showing a broken icon when the URL fails. */
export function SafeImg(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [ok, setOk] = useState(true);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const i = ref.current;
    if (i && i.complete && i.naturalWidth === 0) setOk(false);
  }, [props.src]);
  if (!ok || !props.src) return null;
  // eslint-disable-next-line jsx-a11y/alt-text
  return <img ref={ref} loading="lazy" decoding="async" {...props} onError={() => setOk(false)} />;
}
