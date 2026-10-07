'use client';
import { useState, useTransition } from 'react';
import type { ActionResult } from '@/lib/types';

type Act = () => Promise<ActionResult<{ message?: string } | undefined>>;

/** One-click admin action (server action with bound arguments). Shows errors inline. */
export function ActBtn({ action, children, className = 'ad-btn', confirm, label, pressed, showOk = false }: { action: Act; children: React.ReactNode; className?: string; confirm?: string; label?: string; pressed?: boolean; showOk?: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
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
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            const r = await action();
            setMsg(r.ok ? (showOk && r.data?.message ? { ok: true, text: r.data.message } : null) : { ok: false, text: r.error });
          });
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
