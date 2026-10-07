'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addToCartAction, updateCartAction } from '@/app/actions/store';
import { fmt } from '@/lib/format';
import { ShareIcon } from '../icons';
import { CompareToggle } from './CartButtons';
import { useToast } from './Toast';
import { img } from '@/lib/img';

interface Props {
  brand: string;
  product: { id: string; name: string; model: string; price: number; stock: number; img: string; features: string[] };
  share: { url: string; domain: string; brandName: string };
  inCompare: boolean;
  initialMonths: number;
  labels: Record<'payInFull' | 'payInFullSub' | 'salaryAdvance' | 'salaryAdvanceSub' | 'addToCart' | 'buyNow' | 'buyWithAdvance' | 'share', string>;
}

/** Two purchase paths (README): Pay in full, or Azania Salary Advance with 3/6/12 months. */
export function BuyBox({ brand, product: p, share, inCompare, initialMonths, labels }: Props) {
  const [pay, setPay] = useState<'full' | 'salary'>('salary');
  const [months, setMonths] = useState(initialMonths);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const out = p.stock <= 0;

  const go = (checkout: boolean) =>
    start(async () => {
      const r = await addToCartAction(brand, p.id);
      if (!r.ok) return toast(r.error);
      await updateCartAction(brand, { months });
      if (checkout) router.push(`/${brand}/checkout?method=${pay === 'salary' ? 'salary_advance' : 'azania_account'}`);
      else router.push(`/${brand}/cart`);
    });

  const text = `${p.name} (${p.model}) — ${fmt(p.price)} or ${fmt(p.price / months)}/mo. ${share.url}`;
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }} role="radiogroup" aria-label="Payment option">
        <button type="button" role="radio" aria-checked={pay === 'full'} onClick={() => setPay('full')} className="payopt" style={{ border: pay === 'full' ? '2px solid var(--p)' : '1px solid var(--line)' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{labels.payInFull}</div>
            <div style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 2 }}>{labels.payInFullSub}</div>
          </div>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{fmt(p.price)}</span>
        </button>
        <div role="radio" aria-checked={pay === 'salary'} tabIndex={0} onClick={() => setPay('salary')} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setPay('salary')} className="payopt" style={{ display: 'block', border: pay === 'salary' ? '2px solid var(--az)' : '1px solid var(--line)', background: pay === 'salary' ? '#F3FAFE' : '#fff' }}>
          <div className="row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
              <img src="/brand/azania-mark.png" alt="Azania Bank" style={{ width: 34, height: 34, objectFit: 'contain' }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{labels.salaryAdvance}</div>
                <div style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 1 }}>{labels.salaryAdvanceSub}</div>
              </div>
            </div>
            <span className="monthly" style={{ fontSize: 15, fontWeight: 600 }} data-testid="monthly">
              {fmt(p.price / months)}/mo
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                type="button"
                className={`chip chip-az ${m === months ? 'on' : ''}`}
                style={{ padding: '7px 14px', fontSize: 13, minHeight: 36 }}
                aria-pressed={m === months}
                onClick={(e) => {
                  e.stopPropagation();
                  setMonths(m);
                  setPay('salary');
                }}
              >
                {m} months
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
        <button type="button" className="btn btn-outline-p" disabled={pending || out} onClick={() => go(false)}>
          {labels.addToCart}
        </button>
        <button type="button" className="btn btn-primary" disabled={pending || out} onClick={() => go(true)} data-testid="buy-now">
          {out ? 'Out of stock' : pending ? '…' : pay === 'salary' ? labels.buyWithAdvance : labels.buyNow}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 16, fontSize: 14, fontWeight: 600, alignItems: 'center' }}>
        <CompareToggle brand={brand} id={p.id} on={inCompare} long className="cmp-link" />
        <button type="button" onClick={() => setShareOpen((x) => !x)} style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 44 }} aria-expanded={shareOpen}>
          <ShareIcon /> {labels.share}
        </button>
      </div>
      {shareOpen && (
        <div className="share-sheet" role="dialog" aria-label="Share this product">
          <div className="row">
            <span style={{ fontSize: 16, fontWeight: 600 }}>Share this product</span>
            <button type="button" onClick={() => setShareOpen(false)} aria-label="Close" style={{ fontSize: 22, color: 'var(--muted)', width: 36, height: 36 }}>
              ×
            </button>
          </div>
          <div style={{ marginTop: 14, border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ aspectRatio: '1.91/1', background: 'var(--p)', position: 'relative' }}>
              {p.img && <img src={img(p.img, 384)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', padding: '6%' }} />}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.8) 100%)' }} />
              <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14, color: '#fff' }} className="row">
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 13, opacity: 0.85 }}>{p.model}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(p.price)}</div>
                  <div className="monthly-light" style={{ fontSize: 12 }}>
                    {fmt(p.price / 12)}/mo
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '10px 14px', background: 'var(--surface)' }}>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', textTransform: 'uppercase' }}>{share.domain}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {p.name} · {share.brandName}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted2)' }}>{p.features.join(' · ')}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginTop: 14, textAlign: 'center', fontSize: 11.5, fontWeight: 500 }}>
            <a className="share-btn" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
              <span style={{ background: '#1FA855', color: '#fff' }}>W</span>WhatsApp
            </a>
            <a className="share-btn" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(share.url)}`} target="_blank" rel="noopener noreferrer">
              <span style={{ background: '#1877F2', color: '#fff' }}>f</span>Facebook
            </a>
            <button
              type="button"
              className="share-btn"
              onClick={async () => {
                if (navigator.share) await navigator.share({ title: p.name, text, url: share.url }).catch(() => undefined);
                else toast('Save the product image, then add it to your Instagram Story with the link sticker');
              }}
            >
              <span style={{ background: '#E1306C', color: '#fff' }}>IG</span>Story
            </button>
            <a className="share-btn" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
              <span style={{ background: '#000', color: '#fff' }}>X</span>X
            </a>
            <button
              type="button"
              className="share-btn"
              onClick={() => {
                navigator.clipboard?.writeText(share.url).catch(() => undefined);
                setCopied(true);
              }}
            >
              <span style={{ background: 'var(--surface)' }}>⧉</span>
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
