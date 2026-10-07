'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logoutAction, requestOtpAction, verifyOtpAction } from '@/app/actions/store';
import { initials } from '@/lib/format';

export interface SessionUser {
  name: string;
  phone: string;
  email: string;
}

/** Phone OTP sign in / register (+255). */
export function AuthModal({ brand, user, onClose }: { brand: string; user: SessionUser | null; onClose: () => void }) {
  const [tab, setTab] = useState<'in' | 'up'>('in');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [f, setF] = useState({ name: '', phone: '', email: '', code: '' });
  const [err, setErr] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setF({ ...f, [k]: e.target.value });
    setErr('');
  };

  const send = () =>
    start(async () => {
      if (tab === 'up' && f.name.trim().length < 2) return setErr('Enter your full name');
      const r = await requestOtpAction(f.phone);
      if (!r.ok) return setErr(r.error);
      setDevCode(r.data?.devCode);
      setF((x) => ({ ...x, phone: r.data!.phone }));
      setStep('code');
    });
  const verify = () =>
    start(async () => {
      const r = await verifyOtpAction(f.phone, f.code.trim(), tab === 'up' ? { name: f.name, email: f.email } : undefined);
      if (!r.ok) return setErr(r.error);
      onClose();
      router.refresh();
    });

  return (
    <div className="scrim" onClick={onClose} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <span id="auth-title" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.02em' }}>
            {user ? 'Your account' : tab === 'up' ? 'Create your account' : 'Welcome back'}
          </span>
          <button type="button" onClick={onClose} aria-label="Close" style={{ fontSize: 24, color: 'var(--muted)', width: 44, height: 44 }}>
            ×
          </button>
        </div>
        {user ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, borderRadius: 18, background: 'var(--surface)', padding: 16 }}>
              <span style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--p)', color: '#fff', fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials(user.name || 'Customer')}</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{user.name || 'Customer'}</div>
                <div style={{ fontSize: 13, color: 'var(--muted2)' }}>
                  {user.phone}
                  {user.email ? ` · ${user.email}` : ''}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Link href={`/${brand}/account`} onClick={onClose} className="btn btn-outline btn-sm" style={{ borderRadius: 14, borderWidth: 1, borderColor: 'var(--line)' }}>
                My orders
              </Link>
              <Link href={`/${brand}/support`} onClick={onClose} className="btn btn-outline btn-sm" style={{ borderRadius: 14, borderWidth: 1, borderColor: 'var(--line)' }}>
                Support
              </Link>
            </div>
            <button type="button" style={{ fontSize: 14, fontWeight: 600, color: 'var(--warn)', padding: 8 }} onClick={() => start(async () => { await logoutAction(); onClose(); router.refresh(); })}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <div className="seg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }} role="tablist">
              {(['in', 'up'] as const).map((k) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setStep('phone'); setErr(''); }}>
                  {k === 'in' ? 'Sign in' : 'Register'}
                </button>
              ))}
            </div>
            {step === 'phone' ? (
              <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {tab === 'up' && (
                  <label className="field">
                    Full name
                    <input className="input" value={f.name} onChange={set('name')} placeholder="Neema Mushi" autoComplete="name" required />
                  </label>
                )}
                <label className="field">
                  Phone number
                  <input className="input" value={f.phone} onChange={set('phone')} placeholder="+255 7XX XXX XXX" inputMode="tel" autoComplete="tel" required />
                </label>
                {tab === 'up' && (
                  <label className="field">
                    Email (optional)
                    <input className="input" type="email" value={f.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
                  </label>
                )}
                <div className="err" role="alert">{err}</div>
                <button className="btn btn-primary" style={{ borderRadius: 14 }} disabled={pending}>
                  {pending ? 'Sending…' : 'Get a one-time code by SMS'}
                </button>
              </form>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); verify(); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 14, color: 'var(--muted2)' }}>
                  We sent a 6-digit code to <b style={{ color: 'var(--text)' }}>{f.phone}</b>.{' '}
                  <button type="button" style={{ color: 'var(--monthly)', fontWeight: 600 }} onClick={() => setStep('phone')}>
                    Change
                  </button>
                </div>
                {devCode && (
                  <div style={{ borderRadius: 12, background: '#FFF3DC', color: '#8A5A00', padding: '10px 12px', fontSize: 13 }}>
                    Development mode (mock SMS): your code is <b className="mono">{devCode}</b>
                  </div>
                )}
                <label className="field">
                  One-time code
                  <input className="input mono" value={f.code} onChange={set('code')} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" style={{ fontSize: 20, letterSpacing: '.3em' }} required autoFocus />
                </label>
                <div className="err" role="alert">{err}</div>
                <button className="btn btn-primary" style={{ borderRadius: 14 }} disabled={pending}>
                  {pending ? 'Checking…' : tab === 'up' ? 'Create account' : 'Sign in'}
                </button>
                <button type="button" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--monthly)' }} onClick={send} disabled={pending}>
                  Resend code
                </button>
              </form>
            )}
            <div style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
              Your data is encrypted and never shared. By continuing you agree to the Terms and Privacy Policy.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
