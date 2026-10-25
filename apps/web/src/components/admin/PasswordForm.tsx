'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { changeOwnPasswordAction } from '@/app/actions/admin';
import { checkStaffPassword } from '@/lib/password';

/** Change your own password: current password, new password with live strength rules, confirmation. */
export function PasswordForm({ email, required }: { email: string; required: boolean }) {
  const router = useRouter();
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const check = checkStaffPassword(next, email);
  const mismatch = confirm.length > 0 && confirm !== next;
  return (
    <form
      className="ad-stack s12"
      aria-label="Change password"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          const r = await changeOwnPasswordAction(fd);
          if (r.ok) {
            form.reset();
            setNext('');
            setConfirm('');
            setMsg({ ok: true, text: r.data?.message ?? 'Password changed' });
            if (required) router.replace('/admin');
            router.refresh();
          } else setMsg({ ok: false, text: r.error });
        });
      }}
    >
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <label className="ad-field">
        Current password
        <input type="password" name="current" autoComplete="current-password" required maxLength={200} />
      </label>
      <label className="ad-field">
        New password
        <input type="password" name="next" autoComplete="new-password" required maxLength={128} value={next} onChange={(e) => setNext(e.target.value)} aria-describedby="pw-rules" />
      </label>
      <ul id="pw-rules" className="ad-rules" aria-label="Password rules">
        {check.rules.map((r) => (
          <li key={r.key} className={next ? (r.ok ? 'ok' : 'bad') : undefined}>
            {r.label}
          </li>
        ))}
      </ul>
      <label className="ad-field">
        Confirm new password
        <input type="password" name="confirm" autoComplete="new-password" required maxLength={128} value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={mismatch} />
        {mismatch && <span className="ad-err">The new passwords do not match</span>}
      </label>
      <div className="ad-row" style={{ flexWrap: 'wrap' }}>
        <button type="submit" className="ad-btn" disabled={pending || !check.ok || mismatch} aria-busy={pending}>
          {pending ? 'Saving…' : 'Change password'}
        </button>
        <span role={msg?.ok === false ? 'alert' : 'status'} className={`ad-msg ${msg?.ok ? 'ok' : 'err'}`}>
          {msg?.text}
        </span>
      </div>
    </form>
  );
}
