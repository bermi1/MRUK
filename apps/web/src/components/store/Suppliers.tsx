'use client';
import { useMemo, useState } from 'react';
import { LocateIcon } from '../icons';

export interface SupplierRow {
  id: string;
  city: string;
  area: string;
  type: string;
  phone: string;
  hours: string;
  lat: number;
  lng: number;
}

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (x: number) => (x * Math.PI) / 180;
  const d1 = r(b.lat - a.lat);
  const d2 = r(b.lng - a.lng);
  const h = Math.sin(d1 / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(d2 / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function Suppliers({ list, brandName }: { list: SupplierRow[]; brandName: string }) {
  const [city, setCity] = useState('All');
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locErr, setLocErr] = useState('');
  const [sel, setSel] = useState(0);
  const cities = [...new Set(list.map((s) => s.city))];
  const rows = useMemo(() => {
    const r = list.filter((s) => city === 'All' || s.city === city).map((s) => ({ ...s, km: loc ? km(loc, s) : null }));
    if (loc) r.sort((a, b) => a.km! - b.km!);
    return r;
  }, [list, city, loc]);
  const s = rows[Math.min(sel, rows.length - 1)];
  const dir = (x: SupplierRow) => `https://www.google.com/maps/dir/?api=1&destination=${x.lat},${x.lng}`;
  return (
    <>
      <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">Suppliers near you</div>
          <h1 className="h1">Find a {brandName} showroom or dealer</h1>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            if (!navigator.geolocation) return setLocErr('Location unavailable');
            navigator.geolocation.getCurrentPosition(
              (p) => {
                setLoc({ lat: p.coords.latitude, lng: p.coords.longitude });
                setSel(0);
              },
              () => setLocErr('Location blocked, pick a city'),
            );
          }}
        >
          <LocateIcon /> {loc ? 'Sorted by distance' : locErr || 'Use my location'}
        </button>
      </div>
      <div className="nsb" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
        {['All', ...cities].map((c) => (
          <button key={c} type="button" className={`chip ${city === c ? 'on' : ''}`} onClick={() => { setCity(c); setSel(0); }} aria-pressed={city === c}>
            {c}
          </button>
        ))}
      </div>
      <div className="sup-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((x, i) => (
            <div key={x.id} role="button" tabIndex={0} onClick={() => setSel(i)} onKeyDown={(e) => e.key === 'Enter' && setSel(i)} style={{ cursor: 'pointer', borderRadius: 20, border: x === s ? '2px solid var(--p)' : '1px solid var(--border)', padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px' }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                {x.city} · {x.area}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--monthly)', textAlign: 'right' }}>{x.km != null ? (x.km < 1 ? '<1 km' : `${Math.round(x.km)} km`) : ''}</div>
              <div style={{ fontSize: 13, color: 'var(--muted2)' }}>{x.type}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ok)', textAlign: 'right' }}>{x.hours}</div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <a href={dir(x)} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" onClick={(e) => e.stopPropagation()}>
                  Directions
                </a>
                <a href={`https://wa.me/${x.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ background: '#E8F7EE', color: '#137A3D' }} onClick={(e) => e.stopPropagation()}>
                  WhatsApp
                </a>
                <a href={`tel:${x.phone.replace(/\s/g, '')}`} className="btn btn-sm" style={{ border: '1px solid var(--line)' }} onClick={(e) => e.stopPropagation()}>
                  {x.phone}
                </a>
              </div>
            </div>
          ))}
        </div>
        {s && (
          <div style={{ borderRadius: 24, overflow: 'hidden', border: '1px solid var(--border)', position: 'sticky', top: 20 }}>
            <iframe src={`https://maps.google.com/maps?q=${s.lat},${s.lng}&z=14&output=embed`} title={`Map of ${s.city} ${s.area}`} style={{ width: '100%', height: 460, border: 0, display: 'block', background: 'var(--surface)' }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            <div className="row" style={{ padding: '16px 18px' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {s.city} · {s.area}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted2)' }}>{s.hours}</div>
              </div>
              <a href={dir(s)} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                Open in Maps
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
