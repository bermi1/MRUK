'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { subscribeAction } from '@/app/actions/marketing';
import { requestOtpAction, verifyOtpAction } from '@/app/actions/store';

export interface AuthLabels {
  title: string;
  sub: string;
  name: string;
  phone: string;
  email: string;
  consent: string;
  sendCode: string;
  enterCode: string;
  verify: string;
  switchQ: string;
  switchLink: string;
  changeNumber: string;
  enterName: string;
}

/** Branded phone-OTP sign in / sign up page (same server actions as the sign-in modal). */
export function AuthPage({ brand, mode, next, labels, switchHref, logo, brandName, perks }: { brand: 'mruk' | 'skywood'; mode: 'login' | 'signup'; next: string; labels: AuthLabels; switchHref: string; logo: string; brandName: string; perks: string[] }) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [f, setF] = useState({ name: '', phone: '', email: '', code: '', consent: false });
  const [err, setErr] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [pending, start] = useTransition();
  const router = useRouter();
  const up = mode === 'signup';
  const set = (k: 'name' | 'phone' | 'email' | 'code') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setF({ ...f, [k]: e.target.value });
    setErr('');
  };
  const send = () =>
    start(async () => {
      if (up && f.name.trim().length < 2) return setErr(labels.enterName);
      const r = await requestOtpAction(f.phone);
      if (!r.ok) return setErr(r.error);
      setDevCode(r.data?.devCode);
      setF((x) => ({ ...x, phone: r.data!.phone }));
      setStep('code');
    });
  const verify = () =>
    start(async () => {
      const r = await verifyOtpAction(f.phone, f.code.trim(), up ? { name: f.name.trim(), email: f.email.trim() } : undefined);
      if (!r.ok) return setErr(r.error);
      if (up && f.consent) await subscribeAction(brand, { name: f.name.trim(), phone: f.phone, email: f.email.trim() || undefined, consent: true, source: 'signup' }).catch(() => undefined);
      router.replace(next);
      router.refresh();
    });

  return (
    <div className={`auth auth-${brand}`}>
      <aside className="auth-side" aria-hidden="true">
        <span className="auth-arch" />
        <ul>
          {perks.map((p, i) => (
            <li key={p} style={{ ['--i' as string]: i }}>
              {p}
            </li>
          ))}
        </ul>
      </aside>
      <form
        className="auth-card"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 'phone') send();
          else verify();
        }}
      >
        <img className="auth-logo" src={logo} alt={brandName} width={brand === 'mruk' ? 70 : 104} height={brand === 'mruk' ? 48 : 30} />
        <h1 className="auth-title">{labels.title}</h1>
        <p className="auth-sub">{labels.sub}</p>
        {step === 'phone' ? (
          <>
            {up && (
              <label className="auth-field">
                <span>{labels.name}</span>
                <input name="name" value={f.name} onChange={set('name')} autoComplete="name" required />
              </label>
            )}
            <label className="auth-field">
              <span>{labels.phone}</span>
              <input name="phone" value={f.phone} onChange={set('phone')} placeholder="+255 7XX XXX XXX" inputMode="tel" autoComplete="tel" required />
            </label>
            {up && (
              <>
                <label className="auth-field">
                  <span>{labels.email}</span>
                  <input name="email" type="email" value={f.email} onChange={set('email')} autoComplete="email" />
                </label>
                <label className="auth-check">
                  <input type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} />
                  <span>{labels.consent}</span>
                </label>
              </>
            )}
          </>
        ) : (
          <>
            <label className="auth-field">
              <span>{labels.enterCode.replace('{phone}', f.phone)}</span>
              <input name="code" className="auth-code" value={f.code} onChange={set('code')} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" required autoFocus />
            </label>
            {devCode && (
              <p className="auth-demo">
                Demo mode (no SMS is sent): your code is <b className="mono">{devCode}</b>
              </p>
            )}
            <button type="button" className="auth-alt" onClick={() => (setStep('phone'), setF((x) => ({ ...x, code: '' })))}>
              {labels.changeNumber}
            </button>
          </>
        )}
        <p className="err auth-err" role="alert">
          {err}
        </p>
        <button className="auth-btn" disabled={pending}>
          {pending ? '…' : step === 'phone' ? labels.sendCode : labels.verify}
        </button>
        <p className="auth-switch">
          {labels.switchQ} <Link href={switchHref}>{labels.switchLink}</Link>
        </p>
      </form>
    </div>
  );
}
