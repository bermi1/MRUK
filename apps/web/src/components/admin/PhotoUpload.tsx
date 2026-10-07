'use client';
import { useState, useTransition } from 'react';
import type { ActionResult } from '@/lib/types';

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX = 5 * 1024 * 1024;

export function checkImage(f: File): string | null {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return 'Use a JPG, PNG or WebP image';
  if (f.size > MAX) return 'Images must be 5 MB or smaller';
  return null;
}

/** "Upload photo" button that posts the file straight to a server action. */
export function PhotoUpload({ action, label = 'Upload photo', name }: { action: (fd: FormData) => Promise<ActionResult<{ message?: string } | undefined>>; label?: string; name: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <label className="ad-upload" style={{ position: 'relative' }}>
        <input
          type="file"
          accept={IMAGE_ACCEPT}
          aria-label={`${label} for ${name}`}
          disabled={pending}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            const bad = checkImage(f);
            if (bad) return setErr(bad);
            const fd = new FormData();
            fd.set('photo', f);
            start(async () => {
              const r = await action(fd);
              setErr(r.ok ? '' : r.error);
            });
          }}
        />
        {pending ? 'Uploading…' : label}
      </label>
      {err && <span className="ad-err" role="alert">{err}</span>}
    </span>
  );
}

/** File input with a live preview, for use inside an AForm (hero slides, OG image, new product). */
export function ImagePick({ name, current, text, variant = 'drop', alt = '' }: { name: string; current?: string; text: string; variant?: 'drop' | 'slide'; alt?: string }) {
  const [preview, setPreview] = useState(current ?? '');
  const [err, setErr] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className={variant === 'slide' ? 'ad-slideimg' : 'ad-drop'}>
        <input
          type="file"
          name={name}
          accept={IMAGE_ACCEPT}
          aria-label={text}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const bad = checkImage(f);
            if (bad) {
              e.target.value = '';
              setErr(bad);
              return;
            }
            setErr('');
            setPreview(URL.createObjectURL(f));
          }}
        />
        {preview && <img src={preview} alt={alt} />}
        <span>{text}</span>
      </label>
      {err && <span className="ad-err" role="alert">{err}</span>}
    </div>
  );
}
