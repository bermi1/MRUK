'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { fmtTZS } from '@bt/core';
import { checkModelAction, saveProductAction, uploadProductImageAction } from '@/app/actions/product-admin';
import { checkImage, IMAGE_ACCEPT } from './PhotoUpload';

export interface EditorCategory {
  slug: string;
  name: string;
  subs: string[];
}

export interface EditorProduct {
  id?: string;
  brand: 'mruk' | 'skywood';
  category: string;
  sub: string;
  model: string;
  name: string;
  price: string;
  stock: string;
  features: string[];
  description: string;
  specs: { label: string; value: string }[];
  images: string[];
  hidden: boolean;
}

const SPEC_SUGGESTIONS = ['Capacity', 'Power', 'Dimensions (W × H × D)', 'Weight', 'Warranty', 'Energy rating', 'Voltage', 'Colour', 'Noise level', 'Fuel / power source', 'Material', 'Run time'];
const BRAND_NAME = { mruk: 'Mr UK', skywood: 'Skywood' } as const;

const digits = (s: string) => s.replace(/[,\s]/g, '');

/** Inline checks shown under each field as staff type (the server checks again). */
function validate(p: EditorProduct): Record<string, string> {
  const e: Record<string, string> = {};
  if (!p.category) e.category = 'Choose a category';
  if (!p.sub) e.sub = 'Choose a sub-category';
  if (p.model.trim().length < 2) e.model = 'Enter the model number (at least 2 characters)';
  if (p.name.trim().length < 2) e.name = 'Enter the product name';
  const price = Number(digits(p.price));
  if (!digits(p.price)) e.price = 'Enter the price in TZS';
  else if (!Number.isInteger(price)) e.price = 'Whole shillings only, e.g. 1,250,000';
  else if (price <= 0 && !p.hidden) e.price = 'Set a price before publishing';
  else if (price > 0 && price < 1000) e.price = 'At least TZS 1,000';
  const stock = Number(digits(p.stock));
  if (!digits(p.stock) || !Number.isInteger(stock) || stock < 0) e.stock = 'Enter 0 or more units';
  return e;
}

export function ProductEditor({ initial, brands, categories, canHide = true }: { initial: EditorProduct; brands: ('mruk' | 'skywood')[]; categories: Record<string, EditorCategory[]>; canHide?: boolean }) {
  const router = useRouter();
  const [p, setP] = useState<EditorProduct>(initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErr, setServerErr] = useState<{ text: string; field?: string } | null>(null);
  const [ok, setOk] = useState('');
  const [dupes, setDupes] = useState<{ id: string; name: string; hidden: boolean }[]>([]);
  const [uploading, setUploading] = useState(0);
  const [photoErr, setPhotoErr] = useState('');
  const [pending, start] = useTransition();
  const [newFeature, setNewFeature] = useState('');
  const drag = useRef<number | null>(null);
  const editing = !!initial.id;

  const cats = categories[p.brand] ?? [];
  const subs = cats.find((c) => c.slug === p.category)?.subs ?? [];
  const errors = useMemo(() => validate(p), [p]);
  const set = <K extends keyof EditorProduct>(k: K, v: EditorProduct[K]) => {
    setOk('');
    setP((x) => ({ ...x, [k]: v }));
  };
  const show = (k: string) => (touched[k] || touched._all ? errors[k] : undefined) ?? (serverErr?.field === k ? serverErr.text : undefined);

  // Duplicate model warning (same brand), checked shortly after typing stops.
  useEffect(() => {
    const m = p.model.trim();
    if (m.length < 2) return setDupes([]);
    let live = true;
    const t = setTimeout(async () => {
      const r = await checkModelAction(p.brand, m, initial.id);
      if (live && r.ok) setDupes(r.data?.matches ?? []);
    }, 400);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [p.brand, p.model, initial.id]);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setPhotoErr('');
    const list = Array.from(files).slice(0, Math.max(0, 8 - p.images.length));
    if (files.length > list.length) setPhotoErr('At most 8 photos per product');
    for (const f of list) {
      const bad = checkImage(f);
      if (bad) {
        setPhotoErr(`${f.name}: ${bad}`);
        continue;
      }
      setUploading((n) => n + 1);
      const fd = new FormData();
      fd.set('photo', f);
      const r = await uploadProductImageAction(p.brand, fd).catch(() => ({ ok: false as const, error: 'Upload failed. Check your connection.' }));
      setUploading((n) => n - 1);
      if (r.ok && r.data) {
        const url = r.data.url;
        setP((x) => ({ ...x, images: [...x.images, url].slice(0, 8) }));
      } else if (!r.ok) setPhotoErr(`${f.name}: ${r.error}`);
    }
  }

  const movePhoto = (from: number, to: number) =>
    setP((x) => {
      if (to < 0 || to >= x.images.length || from === to) return x;
      const images = [...x.images];
      const [m] = images.splice(from, 1);
      images.splice(to, 0, m!);
      return { ...x, images };
    });

  const addFeature = () => {
    const f = newFeature.trim();
    if (!f) return;
    set('features', [...p.features, f.slice(0, 80)].slice(0, 12));
    setNewFeature('');
  };

  const readiness = [
    { ok: p.images.length > 0, text: 'At least one photo' },
    { ok: p.features.filter(Boolean).length >= 3, text: '3 or more key features' },
    { ok: p.description.trim().length >= 60, text: 'A description (60+ characters)' },
    { ok: p.specs.filter((s) => s.label.trim() && s.value.trim()).length >= 3, text: '3 or more specifications' },
  ];

  function submit() {
    setTouched({ _all: true });
    setServerErr(null);
    setOk('');
    if (Object.keys(errors).length) return;
    start(async () => {
      const r = await saveProductAction({
        id: initial.id,
        brand: p.brand,
        category: p.category,
        sub: p.sub,
        model: p.model,
        name: p.name,
        price: digits(p.price),
        stock: digits(p.stock),
        features: p.features.map((f) => f.trim()).filter(Boolean),
        description: p.description,
        specs: p.specs.filter((s) => s.label.trim() || s.value.trim()),
        images: p.images,
        hidden: p.hidden,
      });
      if (!r.ok) return setServerErr({ text: r.error, field: r.field });
      setOk(r.data?.message ?? 'Saved');
      if (!editing && r.data?.id) router.push(`/admin/products/${r.data.id}?created=1`);
      else router.refresh();
    });
  }

  const main = p.images[0];
  const priceN = Number(digits(p.price));

  return (
    <form
      className="ad-detail ad-peditor"
      aria-label={editing ? 'Edit product' : 'Add a product'}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="ad-stack">
        <section className="ad-card ad-stack s12">
          <h2 className="ad-h">1 · Basics</h2>
          <div className="ad-form">
            <label className="ad-field">
              Brand
              <select name="brand" value={p.brand} disabled={editing || brands.length < 2} onChange={(e) => setP((x) => ({ ...x, brand: e.target.value as EditorProduct['brand'], category: categories[e.target.value]?.[0]?.slug ?? '', sub: categories[e.target.value]?.[0]?.subs[0] ?? '', images: [] }))}>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {BRAND_NAME[b]}
                  </option>
                ))}
              </select>
            </label>
            <label className="ad-field">
              Category
              <select name="category" value={p.category} onChange={(e) => setP((x) => ({ ...x, category: e.target.value, sub: cats.find((c) => c.slug === e.target.value)?.subs[0] ?? '' }))} aria-invalid={!!show('category')}>
                {cats.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              {show('category') && <span className="ad-err">{show('category')}</span>}
            </label>
            <label className="ad-field">
              Sub-category
              <select name="sub" value={p.sub} onChange={(e) => set('sub', e.target.value)} aria-invalid={!!show('sub')}>
                {subs.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              {show('sub') && <span className="ad-err">{show('sub')}</span>}
            </label>
            <label className="ad-field">
              Model number
              <input name="model" value={p.model} maxLength={40} placeholder="UK G7500Q" autoComplete="off" onChange={(e) => set('model', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, model: true }))} aria-invalid={!!show('model')} />
              {show('model') && <span className="ad-err">{show('model')}</span>}
              {dupes.length > 0 && (
                <span className="ad-warn" role="status" data-testid="dup-model">
                  Model already used by{' '}
                  {dupes.map((d, i) => (
                    <span key={d.id}>
                      {i > 0 && ', '}
                      <Link href={`/admin/products/${d.id}`}>{d.name}</Link>
                      {d.hidden ? ' (hidden)' : ''}
                    </span>
                  ))}
                  . Check it is not a duplicate.
                </span>
              )}
            </label>
            <label className="ad-field full">
              Product name
              <input name="name" value={p.name} maxLength={120} placeholder="G7500Q Petrol Generator 6.5 kVA" onChange={(e) => set('name', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, name: true }))} aria-invalid={!!show('name')} />
              {show('name') && <span className="ad-err">{show('name')}</span>}
            </label>
            <label className="ad-field">
              Price (TZS)
              <input name="price" value={p.price} inputMode="numeric" placeholder="1,500,000" onChange={(e) => set('price', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, price: true }))} aria-invalid={!!show('price')} />
              {show('price') ? <span className="ad-err">{show('price')}</span> : priceN >= 1000 ? <small className="ad-muted">{fmtTZS(priceN)}</small> : null}
            </label>
            <label className="ad-field">
              Stock available
              <input name="stock" value={p.stock} inputMode="numeric" placeholder="10" onChange={(e) => set('stock', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, stock: true }))} aria-invalid={!!show('stock')} />
              {show('stock') && <span className="ad-err">{show('stock')}</span>}
            </label>
          </div>
        </section>

        <section className="ad-card ad-stack s12">
          <h2 className="ad-h">2 · Photos</h2>
          <p className="ad-sub">JPG, PNG or WebP up to 5 MB each, up to 8. Saved as WebP. The first photo is the main one: drag to reorder, or use the arrows.</p>
          <ul className="ad-photos" aria-label="Product photos">
            {p.images.map((u, i) => (
              <li
                key={u}
                draggable
                onDragStart={() => (drag.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (drag.current !== null) movePhoto(drag.current, i);
                  drag.current = null;
                }}
                data-testid="photo"
              >
                <img src={u} alt={`Photo ${i + 1}`} />
                {i === 0 ? <span className="main">Main</span> : null}
                <span className="acts">
                  <button type="button" className="ad-btn line sm" aria-label={`Move photo ${i + 1} left`} disabled={i === 0} onClick={() => movePhoto(i, i - 1)}>
                    ←
                  </button>
                  {i > 0 && (
                    <button type="button" className="ad-btn line sm" onClick={() => movePhoto(i, 0)}>
                      Set main
                    </button>
                  )}
                  <button type="button" className="ad-btn line sm" aria-label={`Move photo ${i + 1} right`} disabled={i === p.images.length - 1} onClick={() => movePhoto(i, i + 1)}>
                    →
                  </button>
                  <button type="button" className="ad-btn danger sm" aria-label={`Remove photo ${i + 1}`} onClick={() => set('images', p.images.filter((x) => x !== u))}>
                    ✕
                  </button>
                </span>
              </li>
            ))}
            {p.images.length < 8 && (
              <li className="add">
                <label>
                  <input type="file" accept={IMAGE_ACCEPT} multiple aria-label="Add photos" onChange={(e) => (addPhotos(e.target.files), (e.target.value = ''))} />
                  {uploading ? `Uploading ${uploading}…` : '+ Add photos'}
                </label>
              </li>
            )}
          </ul>
          {photoErr && (
            <span className="ad-err" role="alert">
              {photoErr}
            </span>
          )}
        </section>

        <section className="ad-card ad-stack s12">
          <div>
            <h2 className="ad-h">3 · Key features</h2>
            <p className="ad-sub">Short selling points shown as bullets on the product page, e.g. &ldquo;Inverter compressor&rdquo;.</p>
          </div>
          <ul className="ad-bullets">
            {p.features.map((f, i) => (
              <li key={i}>
                <input value={f} maxLength={80} aria-label={`Feature ${i + 1}`} onChange={(e) => set('features', p.features.map((x, k) => (k === i ? e.target.value : x)))} />
                <button type="button" className="ad-btn danger sm" aria-label={`Remove feature ${i + 1}`} onClick={() => set('features', p.features.filter((_, k) => k !== i))}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
          {p.features.length < 12 && (
            <div className="ad-row">
              <input
                className="ad-input"
                style={{ flex: 1, minWidth: 0 }}
                value={newFeature}
                maxLength={80}
                placeholder="Type a feature and press Enter"
                aria-label="New feature"
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addFeature();
                  }
                }}
              />
              <button type="button" className="ad-btn line" onClick={addFeature} disabled={!newFeature.trim()}>
                Add
              </button>
            </div>
          )}
        </section>

        <section className="ad-card ad-stack s12">
          <div>
            <h2 className="ad-h">4 · Description and specifications</h2>
            <p className="ad-sub">The AI product comparison answers only from what is written here and in the features, so fill in real figures (capacity, power, size, warranty).</p>
          </div>
          <label className="ad-field">
            Description
            <textarea name="description" rows={4} maxLength={2000} value={p.description} placeholder="Who it is for, what it does well, what is in the box." onChange={(e) => set('description', e.target.value)} />
            <small className="ad-muted">{p.description.length} / 2,000</small>
          </label>
          <datalist id="spec-labels">
            {SPEC_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <div className="ad-specs" role="group" aria-label="Specifications">
            {p.specs.map((s, i) => (
              <div key={i} className="ad-specrow">
                <input list="spec-labels" value={s.label} maxLength={40} placeholder="e.g. Capacity" aria-label={`Specification ${i + 1} name`} onChange={(e) => set('specs', p.specs.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} />
                <input value={s.value} maxLength={120} placeholder="e.g. 350 L" aria-label={`Specification ${i + 1} value`} onChange={(e) => set('specs', p.specs.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)))} />
                <button type="button" className="ad-btn danger sm" aria-label={`Remove specification ${i + 1}`} onClick={() => set('specs', p.specs.filter((_, k) => k !== i))}>
                  ✕
                </button>
              </div>
            ))}
          </div>
          {p.specs.length < 20 && (
            <button type="button" className="ad-btn line sm" style={{ alignSelf: 'flex-start' }} onClick={() => set('specs', [...p.specs, { label: SPEC_SUGGESTIONS.find((l) => !p.specs.some((s) => s.label === l)) ?? '', value: '' }])}>
              + Add specification
            </button>
          )}
        </section>
      </div>

      <aside className="ad-stack" aria-label="Preview and publish">
        <section className="ad-card ad-stack s12">
          <h2 className="ad-h">Preview</h2>
          <div className="ad-pprev" data-testid="product-preview">
            <div className="im">{main ? <img src={main} alt="" /> : <span>No photo yet</span>}</div>
            <div className="ad-row" style={{ gap: 6 }}>
              <span className={`ad-bchip ${p.brand}`}>{BRAND_NAME[p.brand]}</span>
              {p.hidden && <span className="ad-pill pill-grey">Hidden</span>}
              {digits(p.stock) === '0' && <span className="ad-pill pill-amber">Out of stock</span>}
            </div>
            <div className="nm">{p.name || 'Product name'}</div>
            <div className="ad-muted2 mono" style={{ fontSize: 12 }}>
              {p.model || 'MODEL'} · {cats.find((c) => c.slug === p.category)?.name ?? ''} · {p.sub}
            </div>
            <div className="pr">{priceN >= 1000 ? fmtTZS(priceN) : 'TZS —'}</div>
            <ul>
              {p.features.filter(Boolean).slice(0, 4).map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
          <div className="ad-ready" aria-label="Ready for AI comparison">
            <b>Ready for AI comparison: {readiness.filter((r) => r.ok).length} of {readiness.length}</b>
            <ul>
              {readiness.map((r) => (
                <li key={r.text} className={r.ok ? 'ad-ok' : 'ad-muted2'}>
                  {r.ok ? '✓' : '○'} {r.text}
                </li>
              ))}
            </ul>
          </div>
          {canHide && (
            <label className="ad-toggle">
              <span>
                <b>Visible in the store</b>
                <small>{p.hidden ? 'Hidden: only staff can see it' : 'Shoppers can find and buy it'}</small>
              </span>
              <input type="checkbox" name="visible" checked={!p.hidden} onChange={(e) => set('hidden', !e.target.checked)} />
              <span className="sw" aria-hidden="true" />
            </label>
          )}
          {touched._all && Object.keys(errors).length > 0 && (
            <div className="ad-alert" role="alert">
              Check the fields marked in red: {Object.values(errors).join(' · ')}
            </div>
          )}
          {serverErr && (
            <div className="ad-alert" role="alert">
              {serverErr.text}
            </div>
          )}
          {ok && (
            <div className="ad-msg ok" role="status">
              {ok}
            </div>
          )}
          <button type="submit" className="ad-btn block" disabled={pending || uploading > 0} aria-busy={pending}>
            {pending ? 'Saving…' : editing ? 'Save changes' : p.hidden ? 'Save as hidden' : 'Publish to store'}
          </button>
          <div className="ad-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Link href={`/admin/products?b=${p.brand}`} className="ad-btn line sm">
              Back to products
            </Link>
            {editing && !p.hidden && (
              <a className="ad-btn line sm" href={`/${p.brand}/p/${initial.id}`} target="_blank" rel="noopener">
                View in store
              </a>
            )}
          </div>
        </section>
      </aside>
    </form>
  );
}
