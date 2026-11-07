'use client';
import { useRef, useState, useTransition } from 'react';
import type { ActionResult } from '@/lib/types';

/** Inline numeric edit that saves on blur or Enter (price, stock). */
export function InlineNumber({ value, action, label, width }: { value: number; action: (v: string) => Promise<ActionResult<{ message?: string } | undefined>>; label: string; width?: number }) {
  const [v, setV] = useState(String(value));
  const [saved, setSaved] = useState(String(value));
  const [state, setState] = useState<'idle' | 'saved' | 'bad'>('idle');
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  // Enter saves and disables the input, which also fires blur: remember the value in flight so it is sent once.
  const inFlight = useRef<string | null>(null);
  const save = () => {
    const next = v.trim();
    if (next === saved || next === inFlight.current) return;
    inFlight.current = next;
    start(async () => {
      const r = await action(v).finally(() => {
        inFlight.current = null;
      });
      if (r.ok) {
        setSaved(v.trim());
        setState('saved');
        setErr('');
        setTimeout(() => setState('idle'), 1500);
      } else {
        setState('bad');
        setErr(r.error);
      }
    });
  };
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
      <input
        className={`ad-inline ${state === 'saved' ? 'saved' : state === 'bad' ? 'bad' : ''}`}
        style={width ? { width } : undefined}
        inputMode="numeric"
        aria-label={label}
        aria-invalid={state === 'bad'}
        value={v}
        disabled={pending}
        onChange={(e) => setV(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            save();
          }
          if (e.key === 'Escape') setV(saved);
        }}
      />
      {err && state === 'bad' && <span className="ad-err">{err}</span>}
    </span>
  );
}
