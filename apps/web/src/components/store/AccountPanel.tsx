'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteAccountAction, logoutAction, setLocaleAction, updateProfileAction } from '@/app/actions/store';

export function SignInPrompt() {
  return (
    <button type="button" className="btn btn-primary" onClick={() => window.dispatchEvent(new Event('bt-open-auth'))}>
      Sign in with your phone
    </button>
  );
}

export function ProfileForm({ name, email, locale }: { name: string; email: string; locale: 'en' | 'sw' }) {
  const [f, setF] = useState({ name, email });
  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await updateProfileAction(f);
            setMsg(r.ok ? 'Saved' : r.error);
            router.refresh();
          });
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <label className="field">
          Full name
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />
        </label>
        <label className="field">
          Email
          <input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" />
        </label>
        <div className="row">
          <span className="note" role="status">{msg}</span>
          <button className="btn btn-primary btn-sm" disabled={pending}>
            Save details
          </button>
        </div>
      </form>
      <div>
        <div className="field" style={{ marginBottom: 6 }}>
          Language / Lugha
        </div>
        <div className="seg">
          {(['en', 'sw'] as const).map((l) => (
            <button key={l} type="button" className={locale === l ? 'on' : ''} onClick={() => start(async () => { await setLocaleAction(l); router.refresh(); })}>
              {l === 'en' ? 'English' : 'Kiswahili'}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        <a href="/api/account/export" className="btn btn-outline btn-sm" style={{ borderWidth: 1, borderColor: 'var(--line)' }}>
          Download my data
        </a>
        <button type="button" className="btn btn-outline btn-sm" style={{ borderWidth: 1, borderColor: 'var(--line)' }} onClick={() => start(async () => { await logoutAction(); router.refresh(); })}>
          Sign out
        </button>
        <button
          type="button"
          className="btn btn-sm"
          style={{ color: 'var(--warn)' }}
          onClick={() => {
            if (window.confirm('Delete your account? Your orders stay on record for tax law but are no longer linked to you.')) start(async () => { await deleteAccountAction(); });
          }}
        >
          Delete my account
        </button>
      </div>
    </div>
  );
}
