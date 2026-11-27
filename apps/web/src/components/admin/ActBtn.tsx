'use client';
import { useState, useTransition } from 'react';
import type { ActionResult } from '@/lib/types';

type Act = () => Promise<ActionResult<{ message?: string } | undefined>>;

/**
 * One-click admin action (server action with bound arguments). Shows errors inline.
 * `ask` shows a non-blocking inline confirmation ({ text, yes }) instead of the browser's confirm dialog.
 */
export function ActBtn({ action, children, className = 'ad-btn', confirm, ask, label, pressed, showOk = false }: { action: Act; children: React.ReactNode; className?: string; confirm?: string; ask?: { text: string; yes: string }; label?: string; pressed?: boolean; showOk?: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [asking, setAsking] = useState(false);
  const go = () =>
    start(async () => {
      setAsking(false);
      const r = await action();
      setMsg(r.ok ? (showOk && r.data?.message ? { ok: true, text: r.data.message } : null) : { ok: false, text: r.error });
    });
  if (asking && ask)
    return (
      <div role="group" aria-label={ask.text} className="ad-ask">
        <span>{ask.text}</span>
        <button type="button" className={className} disabled={pending} aria-busy={pending} onClick={go}>
          {pending ? 'Working…' : ask.yes}
        </button>
        <button type="button" className="ad-btn line" disabled={pending} onClick={() => setAsking(false)}>
          Not yet
        </button>
      </div>
    );
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={pending}
        aria-busy={pending}
        aria-label={label}
        aria-pressed={pressed}
        onClick={() => {
          if (ask) return setAsking(true);
          if (confirm && !window.confirm(confirm)) return;
          go();
        }}
      >
        {pending ? 'Working…' : children}
      </button>
      {msg && (
        <span role={msg.ok ? 'status' : 'alert'} className={`ad-msg ${msg.ok ? 'ok' : 'err'}`} style={{ flexBasis: '100%' }}>
          {msg.text}
        </span>
      )}
    </>
  );
}
