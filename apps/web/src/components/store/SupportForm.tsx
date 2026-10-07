'use client';
import { useRef, useState, useTransition } from 'react';
import { aiTipsAction, createTicketAction } from '@/app/actions/store';
import { FAQS } from '@/lib/content';

const ISSUES = ['Repair', 'Installation', 'Warranty claim', 'Delivery', 'Other'];

export function SupportForm({ brand, brandName, whatsapp, products, prefill }: { brand: string; brandName: string; whatsapp: string; products: { id: string; label: string }[]; prefill: { name: string; phone: string } }) {
  const [tk, setTk] = useState({ issue: 'Repair', name: prefill.name, phone: prefill.phone, order: '', productId: '', description: '' });
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [tips, setTips] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ number: string; phone: string } | null>(null);
  const [faq, setFaq] = useState(0);
  const [pending, start] = useTransition();
  const [tipsPending, startTips] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof tk) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setTk({ ...tk, [k]: e.target.value });
    setErr('');
  };
  const prod = products.find((p) => p.id === tk.productId);
  const waText = `Hello ${brandName} support. ${done ? `Ticket ${done.number}. ` : ''}Issue: ${tk.issue}. Product: ${prod ? prod.label : '-'}. Order: ${tk.order || '-'}. ${tk.description}`;
  const wa = `https://wa.me/${whatsapp}?text=${encodeURIComponent(waText)}`;

  const submit = () =>
    start(async () => {
      const fd = new FormData();
      Object.entries(tk).forEach(([k, v]) => fd.set(k, v));
      if (photo) fd.set('photo', photo);
      const r = await createTicketAction(brand, fd);
      if (!r.ok) return setErr(r.error);
      setDone(r.data!);
    });

  return (
    <div className="support-grid">
      {done ? (
        <div style={{ borderRadius: 26, background: 'var(--p)', color: '#fff', padding: 32, display: 'flex', flexDirection: 'column', gap: 12 }} role="status">
          <div style={{ fontSize: 13, opacity: 0.75 }}>Request received</div>
          <div className="mono" style={{ fontSize: 36, fontWeight: 600 }} data-testid="ticket-number">
            {done.number}
          </div>
          <div style={{ fontSize: 15, opacity: 0.85, lineHeight: 1.55 }}>Our support team will call you on {done.phone} within 2 working hours. You can also continue on WhatsApp with your ticket number.</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-wa btn-sm">
              Continue on WhatsApp
            </a>
            <button type="button" className="btn btn-ghost-light btn-sm" onClick={() => { setDone(null); setTips(''); setPhoto(null); setPreview(''); setTk({ ...tk, order: '', productId: '', description: '' }); }}>
              New request
            </button>
          </div>
        </div>
      ) : (
        <form className="card" style={{ borderRadius: 26, padding: 26, display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div style={{ fontSize: 19, fontWeight: 600 }}>Send a request</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="radiogroup" aria-label="Issue type">
            {ISSUES.map((l) => (
              <button key={l} type="button" role="radio" aria-checked={tk.issue === l} className={`chip ${tk.issue === l ? 'on' : ''}`} onClick={() => setTk({ ...tk, issue: l })}>
                {l}
              </button>
            ))}
          </div>
          <div className="form-grid">
            <label className="field">
              Full name
              <input className="input" value={tk.name} onChange={set('name')} required autoComplete="name" name="name" />
            </label>
            <label className="field">
              Phone
              <input className="input" value={tk.phone} onChange={set('phone')} required inputMode="tel" autoComplete="tel" placeholder="+255 7XX XXX XXX" name="phone" />
            </label>
            <label className="field">
              Order number (optional)
              <input className="input mono" value={tk.order} onChange={set('order')} placeholder="MU-10482" name="order" />
            </label>
            <label className="field">
              Product
              <select className="input" value={tk.productId} onChange={set('productId')} name="productId">
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            Describe the problem
            <textarea className="input" value={tk.description} onChange={set('description')} rows={4} placeholder="What happened, when, and any error lights or sounds" required name="description" />
          </label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ cursor: 'pointer', border: '1.5px dashed #C8CBD8', borderRadius: 14, padding: '14px 18px', fontSize: 13.5, fontWeight: 500 }}>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f && f.size > 5 * 1024 * 1024) return setErr('Photo must be smaller than 5 MB');
                  setPhoto(f);
                  setPreview(f ? URL.createObjectURL(f) : '');
                }}
              />
              + Add photo
            </label>
            {preview && <img src={preview} alt="Selected photo" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover' }} />}
            <button
              type="button"
              style={{ marginLeft: 'auto', fontSize: 13.5, fontWeight: 600, color: 'var(--monthly)', minHeight: 44 }}
              onClick={() =>
                startTips(async () => {
                  const r = await aiTipsAction(brand, tk.issue, tk.productId, tk.description);
                  setTips(r.ok ? r.data!.text : r.error);
                })
              }
            >
              ✦ {tipsPending ? 'Thinking…' : 'Get AI quick fixes'}
            </button>
          </div>
          {tips && (
            <div style={{ borderRadius: 16, background: '#EAF6FC', padding: '14px 16px', fontSize: 13.5, lineHeight: 1.6, color: '#1F3A4D', whiteSpace: 'pre-wrap' }} aria-live="polite">
              {tips}
            </div>
          )}
          <div className="err" role="alert">
            {err}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button className="btn btn-primary" disabled={pending} data-testid="send-ticket">
              {pending ? 'Sending…' : 'Send to support team'}
            </button>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-wa">
              Send via WhatsApp
            </a>
          </div>
        </form>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>Common questions</div>
        {FAQS.map(([q, a], i) => (
          <div key={q} style={{ border: '1px solid var(--border)', borderRadius: 18 }}>
            <button type="button" aria-expanded={faq === i} onClick={() => setFaq(faq === i ? -1 : i)} style={{ width: '100%', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', fontSize: 14.5, fontWeight: 600, textAlign: 'left', gap: 10 }}>
              <span>{q}</span>
              <span aria-hidden="true">{faq === i ? '−' : '+'}</span>
            </button>
            {faq === i && <div style={{ fontSize: 13.5, color: 'var(--muted2)', lineHeight: 1.55, padding: '0 16px 14px' }}>{a}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
