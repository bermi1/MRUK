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

  const submitPassword = () =>
    start(async () => {
      setError('');
      const r = await staffLoginAction(email, password);
      if (!r.ok) return setError(r.error);
      setPassword('');
      if (r.data?.next === 'enrol') {
        const e = await beginEnrolAction();
        if (!e.ok) return setError(e.error);
        setEnrol(e.data ?? null);
        setStep('enrol');
      } else setStep('totp');
    });

  const submitCode = () =>
    start(async () => {
      setError('');
      const r = await verifyTotpAction(code);
      if (!r.ok) {
        setCode('');
        return setError(r.error);
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
            <p className="ad-sub" style={{ fontSize: 13.5 }}>Staff only. Two-factor authentication is required.</p>
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
          <p className="ad-sub" style={{ fontSize: 13.5 }}>Open your authenticator app for Commerce OS.</p>
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
