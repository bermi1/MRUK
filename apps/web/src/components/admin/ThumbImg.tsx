'use client';
import { useState } from 'react';

/** Product thumbnail image that falls back to the short model label when the file is missing (no broken-image icon). */
export function ThumbImg({ src, label }: { src: string; label: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return <span>{label}</span>;
  return <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} />;
}
