'use client';
import { useState } from 'react';
import type { ActionResult } from '@/lib/types';
import { AForm } from './AForm';
import { checkImage, IMAGE_ACCEPT } from './PhotoUpload';

/** SEO / Open Graph editor with live Google, WhatsApp and Facebook previews (prototype CMS panel). */
export function SeoEditor({ action, title: t0, desc: d0, img: i0, fallbackImg, domain }: { action: (fd: FormData) => Promise<ActionResult<{ message?: string } | undefined>>; title: string; desc: string; img: string; fallbackImg: string; domain: string }) {
  const [title, setTitle] = useState(t0);
  const [desc, setDesc] = useState(d0);
  const [img, setImg] = useState(i0);
  const [clear, setClear] = useState(false);
  const [err, setErr] = useState('');
  const og = clear ? fallbackImg : img || fallbackImg;
  return (
    <AForm action={action} submit="Publish SEO" className="ad-stack s12" label="SEO and social sharing">
      <label className="ad-field">
        Meta title <span className="ad-muted">({title.length}/70)</span>
        <input name="title" value={title} maxLength={70} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="ad-field">
        Meta description <span className="ad-muted">({desc.length}/170)</span>
        <textarea name="desc" rows={3} value={desc} maxLength={170} onChange={(e) => setDesc(e.target.value)} />
      </label>
      <div className="ad-row" style={{ flexWrap: 'wrap' }}>
        <label className="ad-upload" style={{ position: 'relative' }}>
          <input
            type="file"
            name="img"
            accept={IMAGE_ACCEPT}
            aria-label="Upload share image"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const bad = checkImage(f);
              if (bad) {
                e.target.value = '';
                return setErr(bad);
              }
              setErr('');
              setClear(false);
              setImg(URL.createObjectURL(f));
            }}
          />
          Upload share image (1200×630)
        </label>
        {i0 && (
          <label className="ad-check">
            <input type="checkbox" name="clearImg" checked={clear} onChange={(e) => setClear(e.target.checked)} /> Remove custom image
          </label>
        )}
        {err && <span className="ad-err">{err}</span>}
      </div>
      <div className="ad-cap">GOOGLE</div>
      <div style={{ border: '1px solid #ECEDF2', borderRadius: 12, padding: '12px 14px' }}>
        <div style={{ fontSize: 12, color: '#16825D' }}>https://{domain}</div>
        <div style={{ fontSize: 17, color: '#1A0DAB', marginTop: 2 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#4D5156', marginTop: 2, lineHeight: 1.45 }}>{desc}</div>
      </div>
      <div className="ad-cap">WHATSAPP</div>
      <div style={{ background: '#E5DDD5', borderRadius: 12, padding: 12 }}>
        <div style={{ background: '#DCF8C6', borderRadius: 10, padding: 5, maxWidth: 300, marginLeft: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 7, overflow: 'hidden' }}>
            <div className="ad-og">{og && <img src={og} alt="" />}</div>
            <div style={{ padding: '8px 10px', background: '#F0F0F0' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
              <div style={{ fontSize: 11.5, color: '#5E6378', marginTop: 2 }}>{desc}</div>
              <div style={{ fontSize: 11, color: '#8A8EA3', marginTop: 2 }}>{domain}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, padding: '6px 4px 2px' }}>https://{domain}</div>
        </div>
      </div>
      <div className="ad-cap">FACEBOOK</div>
      <div style={{ border: '1px solid #DADDE1', borderRadius: 10, overflow: 'hidden' }}>
        <div className="ad-og">{og && <img src={og} alt="" />}</div>
        <div style={{ padding: '10px 12px', background: '#F2F3F5' }}>
          <div style={{ fontSize: 11.5, color: '#606770', textTransform: 'uppercase' }}>{domain}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1D2129', marginTop: 2 }}>{title}</div>
        </div>
      </div>
    </AForm>
  );
}
