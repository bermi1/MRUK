'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { beginEnrolAction, staffLoginAction, verifyTotpAction } from '@/app/actions/admin';

type Step = 'password' | 'totp' | 'enrol';

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [enrol, setEnrol] = useState<{ secret: string; qr: string } | null>(null);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  /** A deploy while this page was open makes the old page's server calls fail: reload once instead of crashing. */
  const guard = (fn: () => Promise<void>) =>
    start(async () => {
      try {
        await fn();
      } catch {
        let reloaded = false;
        try {
          reloaded = sessionStorage.getItem('bt-login-reloaded') === '1';
          if (!reloaded) sessionStorage.setItem('bt-login-reloaded', '1');
        } catch {
          /* storage blocked */
        }
        if (!reloaded) {
          setError('The admin was just updated. Reloading the page, please sign in again.');
          window.setTimeout(() => window.location.reload(), 1200);
        } else setError('Could not reach the server. Check your connection and try again.');
      }
    });

  const submitPassword = () =>
    guard(async () => {
      setError('');
      const r = await staffLoginAction(email, password);
      if (!r.ok) return void setError(r.error);
      setPassword('');
      if (r.data?.next === 'done') {
        router.replace('/admin');
        router.refresh();
        return;
      }
      if (r.data?.next === 'enrol') {
        const e = await beginEnrolAction();
        if (!e.ok) return void setError(e.error);
        setEnrol(e.data ?? null);
        setStep('enrol');
      } else setStep('totp');
    });

  const submitCode = () =>
    guard(async () => {
      setError('');
      const r = await verifyTotpAction(code);
      if (!r.ok) {
        setCode('');
        return void setError(r.error);
      }
      try {
        sessionStorage.removeItem('bt-login-reloaded');
      } catch {
        /* storage blocked */
      }
      router.replace('/admin');
      router.refresh();
    });

  return (
    <form
      className="box"
      onSubmit={(e) => {
        e.preventDefault();
        if (step === 'password') submitPassword();
        else submitCode();
      }}
    >
      {step === 'password' && (
        <>
          <div>
            <h2>Sign in to Commerce OS</h2>
            <p className="ad-sub" style={{ fontSize: 13.5 }}>Staff only.</p>
          </div>
          <label className="ad-field">
            Work email
            <input type="email" name="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </label>
          <label className="ad-field">
            Password
            <input type="password" name="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
        </>
      )}
      {step === 'enrol' && enrol && (
        <>
          <div>
            <h2>Set up two-factor sign-in</h2>
            <p className="ad-sub" style={{ fontSize: 13.5, lineHeight: 1.5 }}>Scan this code with Google Authenticator, Microsoft Authenticator or 1Password, then enter the 6-digit code it shows.</p>
          </div>
          <div className="qr">
            <img src={enrol.qr} alt="QR code for your authenticator app" width={180} height={180} />
          </div>
          <div>
            <div className="ad-sub" style={{ marginBottom: 4 }}>Can&apos;t scan? Enter this key manually:</div>
            <div className="secret" data-testid="totp-secret">
              {enrol.secret}
            </div>
          </div>
        </>
      )}
      {step === 'totp' && (
        <div>
          <h2>Enter your 6-digit code</h2>
          <p className="ad-sub" style={{ fontSize: 13.5 }}>Open your authenticator app for Commerce OS. No code for this account, or a new phone? Ask an owner to reset your two-factor sign-in (Settings › Staff), then sign in again to scan a new QR code.</p>
        </div>
      )}
      {step !== 'password' && (
        <label className="ad-field">
          Authentication code
          <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus style={{ letterSpacing: '0.3em', fontSize: 18 }} />
        </label>
      )}
      {error && (
        <div className="ad-alert" role="alert">
          {error}
        </div>
      )}
      <button type="submit" className="ad-btn block" disabled={pending} aria-busy={pending}>
        {pending ? 'Checking…' : step === 'password' ? 'Continue' : step === 'enrol' ? 'Verify and finish set-up' : 'Sign in'}
      </button>
      {step !== 'password' && (
        <button type="button" className="ad-btn line block" onClick={() => { setStep('password'); setCode(''); setError(''); }}>
          Use a different account
        </button>
      )}
    </form>
  );
}
