'use client';
import { useState, useTransition } from 'react';
import { unsubscribeAction } from '@/app/actions/marketing';

export function UnsubscribeConfirm({ brand, token }: { brand: 'mruk' | 'skywood'; token: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (msg?.ok)
    return (
      <p role="status" style={{ marginTop: 16, fontSize: 15, fontWeight: 600 }}>
        {msg.text}
      </p>
    );
  return (
    <div style={{ marginTop: 18 }}>
      <button type="button" className="btn btn-primary" disabled={pending} aria-busy={pending} style={{ minHeight: 44 }} onClick={() => start(async () => {
        const r = await unsubscribeAction(brand, token);
        setMsg(r.ok ? { ok: true, text: r.data.message } : { ok: false, text: r.error });
      })}>
        {pending ? 'Working…' : 'Unsubscribe me'}
      </button>
      {msg && !msg.ok && (
        <p role="alert" style={{ marginTop: 10, color: '#8A2E1B', fontSize: 14 }}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
