'use client';
import { useState, useTransition } from 'react';
import type { ActionResult } from '@/lib/types';

type FormAct = (fd: FormData) => Promise<ActionResult<{ message?: string } | undefined>>;

/**
 * Form posting to a server action without resetting inputs (React 19 resets forms that use
 * the `action` prop). Shows the action's message or error under the submit button.
 */
export function AForm({
  action,
  children,
  className,
  submit = 'Save',
  submitClass = 'ad-btn',
  resetOnOk = false,
  confirm,
  extra,
  label,
}: {
  action: FormAct;
  children: React.ReactNode;
  className?: string;
  submit?: string | null;
  submitClass?: string;
  resetOnOk?: boolean;
  confirm?: string;
  extra?: React.ReactNode;
  label?: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      aria-label={label}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData(form);
        start(async () => {
          const r = await action(fd);
          if (r.ok) {
            setMsg({ ok: true, text: r.data?.message ?? 'Saved' });
            if (resetOnOk) form.reset();
            else form.querySelectorAll<HTMLInputElement>('input[type=file]').forEach((i) => (i.value = ''));
          } else setMsg({ ok: false, text: r.error });
        });
      }}
    >
      <div className={className}>{children}</div>
      {(submit || extra || msg) && (
        <div className="ad-row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          {submit && (
            <button type="submit" className={submitClass} disabled={pending} aria-busy={pending}>
              {pending ? 'Saving…' : submit}
            </button>
          )}
          {extra}
          <span role={msg?.ok === false ? 'alert' : 'status'} className={`ad-msg ${msg?.ok ? 'ok' : 'err'}`} style={{ userSelect: 'text' }}>
            {msg?.text}
          </span>
        </div>
      )}
    </form>
  );
}
