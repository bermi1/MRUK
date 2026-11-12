'use client';
import { useRef, useState, useTransition } from 'react';
import type { ActionResult } from '@/lib/types';

const digits = (s: string) => s.replace(/[,\s]/g, '');
/** 2450000 → "2,450,000" (anything that is not a plain whole number is shown as typed). */
const group = (s: string) => (/^\d+$/.test(digits(s)) ? Number(digits(s)).toLocaleString('en-US') : s);

/**
 * Inline numeric edit that saves on blur or Enter (price, stock). With `grouped`, the number shows thousands
 * separators while not being edited (prices); the server accepts either form.
 */
export function InlineNumber({ value, action, label, width, grouped = false }: { value: number; action: (v: string) => Promise<ActionResult<{ message?: string } | undefined>>; label: string; width?: number; grouped?: boolean }) {
  const [v, setV] = useState(String(value));
  const [saved, setSaved] = useState(String(value));
  const [state, setState] = useState<'idle' | 'saved' | 'bad'>('idle');
  const [focused, setFocused] = useState(false);
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  // Enter saves and disables the input, which also fires blur: remember the value in flight so it is sent once.
  const inFlight = useRef<string | null>(null);
  const save = () => {
    const next = digits(v.trim());
    if (next === digits(saved) || next === inFlight.current) return;
    inFlight.current = next;
    start(async () => {
      const r = await action(v).finally(() => {
        inFlight.current = null;
      });
      if (r.ok) {
        setSaved(next);
        setV(next);
        setState('saved');
        setErr('');
        setTimeout(() => setState('idle'), 2000);
      } else {
        setState('bad');
        setErr(r.error);
      }
    });
  };
  return (
    <span className="ad-inlinewrap">
      <input
        className={`ad-inline ${state === 'saved' ? 'saved' : state === 'bad' ? 'bad' : ''}`}
        style={width ? { width } : undefined}
        inputMode="numeric"
        aria-label={label}
        aria-invalid={state === 'bad'}
        value={grouped && !focused ? group(v) : v}
        disabled={pending}
        onFocus={() => setFocused(true)}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          setFocused(false);
          save();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            save();
          }
          if (e.key === 'Escape') setV(saved);
        }}
      />
      {err && state === 'bad' && <span className="ad-err">{err}</span>}
      {state === 'saved' && (
        <span className="ad-msg ok" role="status">
          Saved
        </span>
      )}
    </span>
  );
}
