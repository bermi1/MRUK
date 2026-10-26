'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { composeMessage, renderMessage, smsSegments } from '@bt/core';
import { audienceCountAction, saveCampaignAction, testSendAction } from '@/app/actions/marketing-admin';

type Brand = 'mruk' | 'skywood';
type Channel = 'sms' | 'whatsapp' | 'email';

export interface BuilderProps {
  brands: Brand[];
  initialBrand: Brand;
  categories: Record<Brand, { slug: string; name: string }[]>;
  codes: { code: string; percent: number; brandKey: string | null }[];
  canCreateCode: boolean;
  appUrl: string;
  staffName: string;
}

const BRAND_NAME: Record<Brand, string> = { mruk: 'Mr UK', skywood: 'Skywood' };

export function CampaignBuilder({ brands, initialBrand, categories, codes, canCreateCode, appUrl, staffName }: BuilderProps) {
  const router = useRouter();
  const [brand, setBrand] = useState<Brand>(initialBrand);
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<Channel>('sms');
  const [type, setType] = useState<'subscribers' | 'customers' | 'all'>('subscribers');
  const [cat, setCat] = useState('');
  const [lapsed, setLapsed] = useState('');
  const [minOrders, setMinOrders] = useState('');
  const [tier, setTier] = useState('');
  const [message, setMessage] = useState('Hi {name}, ');
  const [subject, setSubject] = useState('');
  const [promo, setPromo] = useState<'none' | 'existing' | 'new'>('none');
  const [code, setCode] = useState('');
  const [newCode, setNewCode] = useState({ code: '', percent: '10', expiresAt: '' });
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [at, setAt] = useState('');
  const [testTo, setTestTo] = useState('');
  const [count, setCount] = useState<{ n: number; optedOut: number; label: string } | null>(null);
  const [counting, setCounting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const ta = useRef<HTMLTextAreaElement>(null);

  const audience = useMemo(() => ({ type, filters: { boughtCategory: cat, lastOrderBeforeDays: lapsed, minOrders, tier } }), [type, cat, lapsed, minOrders, tier]);
  const brandCodes = codes.filter((c) => !c.brandKey || c.brandKey === brand);
  const codeValue = promo === 'existing' ? code : promo === 'new' ? newCode.code.toUpperCase() : '';

  useEffect(() => {
    let live = true;
    setCounting(true);
    const t = setTimeout(async () => {
      const r = await audienceCountAction(brand, channel, audience);
      if (!live) return;
      setCounting(false);
      setCount(r.ok && r.data ? { n: r.data.count, optedOut: r.data.optedOut, label: r.data.label } : null);
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [brand, channel, audience]);

  useEffect(() => {
    if (promo === 'existing' && code && !brandCodes.some((c) => c.code === code)) setCode('');
  }, [brand]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preview with a realistic unsubscribe link so the length (and SMS cost) is right.
  const sampleUrl = `${appUrl.replace(/\/$/, '')}/${brand}/unsubscribe?t=s.c${'x'.repeat(24)}.${'y'.repeat(32)}`;
  const preview = composeMessage(channel, BRAND_NAME[brand], renderMessage(message, { name: 'Neema', code: codeValue || 'CODE' }), sampleUrl);
  const seg = smsSegments(preview);
  const usesCode = message.includes('{code}');

  function insert(token: string) {
    const el = ta.current;
    if (!el) return setMessage((m) => m + token);
    const s = el.selectionStart ?? message.length;
    const e = el.selectionEnd ?? message.length;
    const next = message.slice(0, s) + token + message.slice(e);
    setMessage(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + token.length, s + token.length);
    });
  }

  function payload(mode: 'draft' | 'schedule' | 'send') {
    return {
      brand,
      name,
      channel,
      audience,
      message,
      subject,
      promoCode: promo === 'existing' ? code : '',
      newCode: promo === 'new' ? newCode : undefined,
      mode,
      scheduledAt: mode === 'schedule' ? at : undefined,
    };
  }

  function submit(mode: 'draft' | 'schedule' | 'send') {
    setMsg(null);
    start(async () => {
      const r = await saveCampaignAction(payload(mode));
      setConfirming(false);
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setMsg({ ok: true, text: r.data?.message ?? 'Saved' });
      if (r.data?.id) router.push(`/admin/marketing/${r.data.id}?done=${encodeURIComponent(r.data.message ?? '')}`);
    });
  }

  function askSend() {
    setMsg(null);
    start(async () => {
      const r = await audienceCountAction(brand, channel, audience);
      if (!r.ok || !r.data) return setMsg({ ok: false, text: r.ok ? 'Could not count recipients' : r.error });
      setCount({ n: r.data.count, optedOut: r.data.optedOut, label: r.data.label });
      if (!r.data.count) return setMsg({ ok: false, text: 'Nobody in this audience can receive the campaign. Change the audience or channel.' });
      setConfirming(true);
    });
  }

  return (
    <div className="ad-detail wide-aside">
      <section className="ad-card ad-stack">
        <h2 className="ad-h">New campaign</h2>
        <div className="ad-form three">
          <label className="ad-field full">
            Campaign name (staff only)
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. December fridge offer" required />
          </label>
          <label className="ad-field">
            Brand
            <select aria-label="Brand" value={brand} onChange={(e) => setBrand(e.target.value as Brand)} disabled={brands.length < 2}>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {BRAND_NAME[b]}
                </option>
              ))}
            </select>
          </label>
          <label className="ad-field">
            Channel
            <select aria-label="Channel" value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
            </select>
          </label>
          <label className="ad-field">
            Audience
            <select aria-label="Audience" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="subscribers">Subscribers</option>
              <option value="customers">Customers</option>
              <option value="all">Subscribers and customers</option>
            </select>
          </label>
        </div>

        <fieldset className="ad-box" style={{ border: '1px solid #ECEEF4', borderRadius: 12, padding: 12 }}>
          <legend className="ad-muted" style={{ fontSize: 12, padding: '0 4px' }}>
            Narrow the audience (optional)
          </legend>
          <div className="ad-form three">
            <label className="ad-field">
              Bought from category
              <select aria-label="Bought from category" value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="">Any</option>
                {categories[brand].map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="ad-field">
              No order in the last (days)
              <input value={lapsed} onChange={(e) => setLapsed(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="e.g. 90" />
            </label>
            <label className="ad-field">
              At least (orders)
              <input value={minOrders} onChange={(e) => setMinOrders(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="e.g. 2" />
            </label>
            <label className="ad-field">
              Loyalty tier
              <select aria-label="Loyalty tier" value={tier} onChange={(e) => setTier(e.target.value)}>
                <option value="">Any</option>
                <option>Member</option>
                <option>Silver</option>
                <option>Gold</option>
              </select>
            </label>
          </div>
          <p className="ad-muted2" style={{ fontSize: 12, marginTop: 8 }}>
            Filters use orders with this brand. Subscribers who never ordered only match &quot;Any&quot; and the Member tier.
          </p>
        </fieldset>

        <div className="ad-alert" role="status" aria-live="polite" data-testid="audience-count" style={{ fontSize: 13.5 }}>
          {counting && !count ? (
            'Counting recipients…'
          ) : count ? (
            <>
              <b>{count.n.toLocaleString('en-US')}</b> recipient{count.n === 1 ? '' : 's'} · {count.label}
              {count.optedOut ? <span className="ad-muted2"> · {count.optedOut} opted out (excluded)</span> : null}
            </>
          ) : (
            'Could not count recipients'
          )}
        </div>

        {channel === 'email' && (
          <label className="ad-field">
            Email subject
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} />
          </label>
        )}
        <label className="ad-field">
          Message
          <textarea aria-label="Message" ref={ta} value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={1000} aria-describedby="seg-count" />
        </label>
        <div className="ad-between" style={{ flexWrap: 'wrap', gap: 8 }}>
          <span className="ad-row" style={{ gap: 6 }}>
            <span className="ad-muted" style={{ fontSize: 12 }}>
              Insert:
            </span>
            <button type="button" className="ad-btn line sm" onClick={() => insert('{name}')}>
              {'{name}'}
            </button>
            <button type="button" className="ad-btn line sm" onClick={() => insert('{code}')}>
              {'{code}'}
            </button>
          </span>
          {channel === 'sms' ? (
            <span id="seg-count" className="ad-muted2" style={{ fontSize: 12.5 }} data-testid="sms-segments">
              {seg.chars} characters · {seg.segments} SMS{seg.segments === 1 ? '' : ' parts'} · {seg.encoding === 'gsm' ? 'GSM (160/153)' : 'Unicode (70/67)'} · {seg.remaining} left
            </span>
          ) : (
            <span id="seg-count" className="ad-muted2" style={{ fontSize: 12.5 }}>
              {preview.length} characters
            </span>
          )}
        </div>
        {seg.encoding === 'unicode' && channel === 'sms' && <p className="ad-msg err">Emoji or special characters switch SMS to Unicode: 70 characters per part, more parts per person.</p>}

        <fieldset style={{ border: '1px solid #ECEEF4', borderRadius: 12, padding: 12 }}>
          <legend className="ad-muted" style={{ fontSize: 12, padding: '0 4px' }}>
            Promo code {usesCode && promo === 'none' ? '(needed for {code})' : '(optional)'}
          </legend>
          <div className="ad-row" style={{ flexWrap: 'wrap', gap: 14 }}>
            {(['none', 'existing', ...(canCreateCode ? ['new'] : [])] as const).map((p) => (
              <label key={p} className="ad-check">
                <input type="radio" name="promo" checked={promo === p} onChange={() => setPromo(p as typeof promo)} /> {p === 'none' ? 'No code' : p === 'existing' ? 'Use an existing code' : 'Create a new code'}
              </label>
            ))}
          </div>
          {promo === 'existing' && (
            <label className="ad-field" style={{ marginTop: 10 }}>
              Code
              <select value={code} onChange={(e) => setCode(e.target.value)} aria-label="Promo code">
                <option value="">Choose…</option>
                {brandCodes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {c.percent ? `${c.percent}% off` : 'promo'} · {c.brandKey ? BRAND_NAME[c.brandKey as Brand] : 'both brands'}
                  </option>
                ))}
              </select>
            </label>
          )}
          {promo === 'new' && (
            <div className="ad-form three" style={{ marginTop: 10 }}>
              <label className="ad-field">
                New code
                <input value={newCode.code} onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })} maxLength={20} placeholder="XMAS10" />
              </label>
              <label className="ad-field">
                Discount %
                <input value={newCode.percent} onChange={(e) => setNewCode({ ...newCode, percent: e.target.value.replace(/\D/g, '') })} inputMode="numeric" />
              </label>
              <label className="ad-field">
                Ends
                <input type="date" value={newCode.expiresAt} onChange={(e) => setNewCode({ ...newCode, expiresAt: e.target.value })} />
              </label>
            </div>
          )}
        </fieldset>

        <fieldset style={{ border: '1px solid #ECEEF4', borderRadius: 12, padding: 12 }}>
          <legend className="ad-muted" style={{ fontSize: 12, padding: '0 4px' }}>
            When
          </legend>
          <div className="ad-row" style={{ flexWrap: 'wrap', gap: 14 }}>
            <label className="ad-check">
              <input type="radio" name="when" checked={when === 'now'} onChange={() => setWhen('now')} /> Send now
            </label>
            <label className="ad-check">
              <input type="radio" name="when" checked={when === 'later'} onChange={() => setWhen('later')} /> Schedule
            </label>
            {when === 'later' && (
              <label className="ad-field">
                Date and time (East Africa Time)
                <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
              </label>
            )}
          </div>
        </fieldset>

        {confirming && count ? (
          <div role="alertdialog" aria-labelledby="confirm-h" className="ad-alert warn" style={{ display: 'block' }}>
            <b id="confirm-h">
              Send to {count.n.toLocaleString('en-US')} recipient{count.n === 1 ? '' : 's'} now?
            </b>
            <p style={{ fontSize: 13, margin: '6px 0 10px' }}>
              {BRAND_NAME[brand]} · {channel === 'sms' ? `SMS, ${seg.segments} part${seg.segments === 1 ? '' : 's'} each (${(seg.segments * count.n).toLocaleString('en-US')} SMS)` : channel === 'whatsapp' ? 'WhatsApp' : 'Email'}. This cannot be undone.
            </p>
            <div className="ad-row">
              <button type="button" className="ad-btn" disabled={pending} onClick={() => submit('send')}>
                {pending ? 'Sending…' : `Confirm and send`}
              </button>
              <button type="button" className="ad-btn line" disabled={pending} onClick={() => setConfirming(false)}>
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="ad-row" style={{ flexWrap: 'wrap' }}>
            {when === 'now' ? (
              <button type="button" className="ad-btn" disabled={pending} onClick={askSend}>
                Send now…
              </button>
            ) : (
              <button type="button" className="ad-btn" disabled={pending} onClick={() => submit('schedule')}>
                Schedule campaign
              </button>
            )}
            <button type="button" className="ad-btn line" disabled={pending} onClick={() => submit('draft')}>
              Save draft
            </button>
          </div>
        )}
        {msg && (
          <span role={msg.ok ? 'status' : 'alert'} className={`ad-msg ${msg.ok ? 'ok' : 'err'}`}>
            {msg.text}
          </span>
        )}
      </section>

      <aside className="ad-stack">
        <section className="ad-card">
          <h2 className="ad-h">Preview</h2>
          <p className="ad-muted2" style={{ fontSize: 12 }}>
            As Neema would see it. The brand name and opt-out are added automatically.
          </p>
          <pre data-testid="campaign-preview" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#F4F5F9', borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit', marginTop: 8 }}>
            {channel === 'email' ? `Subject: ${subject || '—'}\n\n` : ''}
            {preview}
          </pre>
        </section>
        <section className="ad-card">
          <h2 className="ad-h">Send a test</h2>
          <p className="ad-muted2" style={{ fontSize: 12 }}>
            Sends one message marked [TEST] to you, {staffName.split(' ')[0]}.
          </p>
          <div className="ad-row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
            <input className="ad-input" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder={channel === 'email' ? 'you@company.co.tz' : '+255 7XX XXX XXX'} aria-label="Test recipient" style={{ flex: 1, minWidth: 160 }} />
            <button
              type="button"
              className="ad-btn line"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await testSendAction({ brand, channel, to: testTo, message, subject, promoCode: codeValue || undefined });
                  setTestMsg(r.ok ? { ok: true, text: r.data?.message ?? 'Sent' } : { ok: false, text: r.error });
                })
              }
            >
              Send test
            </button>
          </div>
          {testMsg && (
            <span role={testMsg.ok ? 'status' : 'alert'} className={`ad-msg ${testMsg.ok ? 'ok' : 'err'}`}>
              {testMsg.text}
            </span>
          )}
        </section>
      </aside>
    </div>
  );
}
