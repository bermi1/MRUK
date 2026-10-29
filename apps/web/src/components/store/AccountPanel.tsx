'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addAddressAction, removeAddressAction, reorderAction, setDefaultAddressAction, setMarketingPrefsAction } from '@/app/actions/account';
import { deleteAccountAction, logoutAction, setLocaleAction, updateProfileAction } from '@/app/actions/store';
import type { Locale } from '@/lib/i18n';
import { PinIcon, PlusIcon } from '@/components/icons';
import { errText, makeT } from './account/util';
import { useToast } from './Toast';

/** Client widgets of the customer dashboard (/[brand]/account). Labels come from lib/i18n.ts. */

export function SignInPrompt({ label }: { label: string }) {
  return (
    <button type="button" className="btn btn-primary" onClick={() => window.dispatchEvent(new Event('bt-open-auth'))} data-testid="account-sign-in">
      {label}
    </button>
  );
}

// Orders ---------------------------------------------------------------------------------------

export function ReorderButton({ brand, number, locale }: { brand: string; number: string; locale: Locale }) {
  const t = makeT(locale);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const toast = useToast();
  const router = useRouter();
  return (
    <span className="acc-reorder">
      <button
        type="button"
        className="btn btn-outline btn-sm"
        disabled={pending}
        data-testid="reorder"
        onClick={() =>
          start(async () => {
            const r = await reorderAction(brand, number);
            if (!r.ok) return toast(errText(t, r.error));
            const { added, skipped } = r.data!;
            toast(added === 0 ? t('accReorderNone') : skipped ? t('accReorderSome', { n: added, m: skipped }) : t('accReorderDone', { n: added }));
            if (added) setDone(true);
            router.refresh();
          })
        }
      >
        {t('accReorder')}
      </button>
      {done && (
        <Link href={`/${brand}/cart`} className="link-u acc-tocart">
          {t('accGoToCart')}
        </Link>
      )}
    </span>
  );
}

// Addresses ------------------------------------------------------------------------------------

type Address = { id: string; region: string; line: string; isDefault: boolean };

export function AddressBook({ brand, locale, addresses, regions }: { brand: string; locale: Locale; addresses: Address[]; regions: string[] }) {
  const t = makeT(locale);
  const [f, setF] = useState({ region: regions[0] ?? '', line: '', makeDefault: addresses.length === 0 });
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(addresses.length === 0);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        setErr(errText(t, r.error ?? ''));
        return;
      }
      setErr('');
      after?.();
      router.refresh();
    });
  return (
    <div className="acc-addr">
      {addresses.length === 0 ? (
        <div className="acc-empty">
          <PinIcon size={22} />
          <p>{t('accNoAddresses')}</p>
        </div>
      ) : (
        <ul className="acc-addr-list" data-testid="address-list">
          {addresses.map((a) => (
            <li key={a.id} className={`acc-addr-item${a.isDefault ? ' is-default' : ''}`} data-testid="address-item">
              <div className="acc-addr-ico" aria-hidden="true">
                <PinIcon size={18} />
              </div>
              <div className="acc-addr-txt">
                <div className="acc-addr-region">
                  {a.region}
                  {a.isDefault && <span className="acc-badge acc-badge-def">{t('accDefault')}</span>}
                </div>
                <div className="acc-addr-line">{a.line}</div>
              </div>
              <div className="acc-addr-acts">
                {!a.isDefault && (
                  <button type="button" className="acc-txtbtn" disabled={pending} onClick={() => run(() => setDefaultAddressAction(brand, a.id))}>
                    {t('accMakeDefault')}
                  </button>
                )}
                <button
                  type="button"
                  className="acc-txtbtn acc-danger"
                  disabled={pending}
                  data-testid="address-remove"
                  onClick={() => {
                    if (window.confirm(t('accRemoveConfirm'))) run(() => removeAddressAction(brand, a.id), () => toast(t('accSaved')));
                  }}
                >
                  {t('remove')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {open ? (
        <form
          className="acc-addr-form"
          data-testid="address-form"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => addAddressAction(brand, f),
              () => {
                setF({ region: regions[0] ?? '', line: '', makeDefault: false });
                toast(t('accSaved'));
              },
            );
          }}
        >
          <div className="acc-h3">{t('accAddAddress')}</div>
          <div className="acc-addr-grid">
            <label className="field">
              {t('accRegion')}
              <select className="input" name="region" value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })}>
                {regions.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="field">
              {t('accAddressLine')}
              <input className="input" name="line" value={f.line} onChange={(e) => setF({ ...f, line: e.target.value })} placeholder={t('accAddressHint')} autoComplete="street-address" minLength={5} maxLength={240} required />
            </label>
          </div>
          <label className="check">
            <input type="checkbox" checked={f.makeDefault} onChange={(e) => setF({ ...f, makeDefault: e.target.checked })} />
            {t('accUseDefault')}
          </label>
          <div className="row">
            <span className="err" role="alert">
              {err}
            </span>
            <button className="btn btn-primary btn-sm" disabled={pending} data-testid="address-save">
              {t('accSaveAddress')}
            </button>
          </div>
        </form>
      ) : (
        <>
          {err && (
            <p className="err" role="alert">
              {err}
            </p>
          )}
          <button type="button" className="acc-add" onClick={() => setOpen(true)} data-testid="address-add">
            <PlusIcon size={16} />
            {t('accAddAddress')}
          </button>
        </>
      )}
    </div>
  );
}

// Settings -------------------------------------------------------------------------------------

export function DetailsForm({ name, email, locale }: { name: string; email: string; locale: Locale }) {
  const t = makeT(locale);
  const [f, setF] = useState({ name, email });
  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="acc-stack">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await updateProfileAction(f);
            setMsg(r.ok ? t('accSaved') : r.error);
            router.refresh();
          });
        }}
        className="acc-stack"
      >
        <label className="field">
          {t('fullName')}
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" maxLength={120} />
        </label>
        <label className="field">
          {t('email')}
          <input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" maxLength={200} />
        </label>
        <div className="row">
          <span className="note" role="status">
            {msg}
          </span>
          <button className="btn btn-primary btn-sm" disabled={pending}>
            {t('accSaveDetails')}
          </button>
        </div>
      </form>
      <div>
        <div className="field" style={{ marginBottom: 6 }}>
          {t('language')} / Lugha
        </div>
        <div className="seg" role="group" aria-label={t('language')}>
          {(['en', 'sw'] as const).map((l) => (
            <button
              key={l}
              type="button"
              className={locale === l ? 'on' : ''}
              aria-pressed={locale === l}
              onClick={() =>
                start(async () => {
                  await setLocaleAction(l);
                  router.refresh();
                })
              }
            >
              {l === 'en' ? 'English' : 'Kiswahili'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

type Prefs = { sms: boolean; email: boolean; whatsapp: boolean; consentAt: string | null; unsubscribedAt: string | null; softOptIn: boolean; hasEmail: boolean };

export function MarketingPrefs({ brand, brandName, locale, prefs }: { brand: string; brandName: string; locale: Locale; prefs: Prefs }) {
  const t = makeT(locale);
  const [p, setP] = useState({ sms: prefs.sms, email: prefs.email, whatsapp: prefs.whatsapp });
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  const save = (next: typeof p) => {
    const prev = p;
    setP(next);
    start(async () => {
      const r = await setMarketingPrefsAction(brand, next);
      if (!r.ok) {
        setP(prev);
        setErr(errText(t, r.error));
        return;
      }
      setErr('');
      router.refresh();
    });
  };
  const channels = [
    ['sms', t('accChSms')],
    ['email', t('accChEmail')],
    ['whatsapp', t('accChWhatsapp')],
  ] as const;
  return (
    <div className="acc-prefs" data-testid="marketing-prefs">
      <ul className="acc-switches">
        {channels.map(([k, label]) => {
          const disabled = pending || (k === 'email' && !prefs.hasEmail && !p.email);
          return (
            <li key={k}>
              <span id={`pref-${k}`}>{label}</span>
              <button type="button" role="switch" aria-checked={p[k]} aria-labelledby={`pref-${k}`} className="acc-switch" disabled={disabled} data-testid={`pref-${k}`} onClick={() => save({ ...p, [k]: !p[k] })}>
                <i aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      {!prefs.hasEmail && <p className="note">{t('accNeedEmailNote')}</p>}
      <p className="note" role="status" data-testid="prefs-status">
        {prefs.consentAt ? t('accConsentAt', { date: prefs.consentAt }) : prefs.unsubscribedAt ? t('accOptedOut', { brand: brandName, date: prefs.unsubscribedAt }) : prefs.softOptIn ? t('accSoftOptIn', { brand: brandName }) : ''}
      </p>
      {prefs.softOptIn && (
        <button type="button" className="acc-txtbtn" disabled={pending} onClick={() => save({ sms: false, email: false, whatsapp: false })}>
          {t('accStopAll')}
        </button>
      )}
      {err && (
        <p className="err" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}

export function DataPanel({ locale }: { locale: Locale }) {
  const t = makeT(locale);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="acc-stack">
      <div className="acc-btnrow">
        <a href="/api/account/export" download className="btn btn-outline btn-sm" data-testid="export-data">
          {t('accDownloadData')}
        </a>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() =>
            start(async () => {
              await logoutAction();
              router.refresh();
            })
          }
        >
          {t('signOut')}
        </button>
      </div>
      <div className="acc-danger-zone">
        <div className="acc-h3">{t('accDeleteTitle')}</div>
        <p className="note">{t('accDeleteSub')}</p>
        {confirming ? (
          <form
            className="acc-stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (typed.trim().toUpperCase() !== 'DELETE') return;
              start(async () => {
                await deleteAccountAction();
              });
            }}
          >
            <label className="field">
              {t('accDeleteType')}
              <input className="input mono" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" data-testid="delete-confirm-input" />
            </label>
            <div className="acc-btnrow">
              <button className="btn btn-sm acc-btn-danger" disabled={pending || typed.trim().toUpperCase() !== 'DELETE'}>
                {t('accDeleteConfirm')}
              </button>
              <button type="button" className="btn btn-sm" onClick={() => (setConfirming(false), setTyped(''))}>
                {t('accCancel')}
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="acc-txtbtn acc-danger" onClick={() => setConfirming(true)} data-testid="delete-account">
            {t('accDeleteTitle')}
          </button>
        )}
      </div>
    </div>
  );
}
