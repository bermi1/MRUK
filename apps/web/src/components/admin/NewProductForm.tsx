'use client';
import { useState } from 'react';
import { createProductAction } from '@/app/actions/admin';
import { AForm } from './AForm';
import { ImagePick } from './PhotoUpload';

export function NewProductForm({ brand, brandName, cats }: { brand: string; brandName: string; cats: { slug: string; name: string; subs: string[] }[] }) {
  const [cat, setCat] = useState(cats[0]?.slug ?? '');
  const [k, setK] = useState(0);
  const subs = cats.find((c) => c.slug === cat)?.subs ?? [];
  return (
    <AForm
      key={`${brand}-${k}`}
      label={`Add a product to ${brandName}`}
      action={async (fd) => {
        const r = await createProductAction(fd);
        if (r.ok) setTimeout(() => setK((x) => x + 1), 2500);
        return r;
      }}
      submit="Publish to store"
      submitClass="ad-btn block"
      className="ad-stack s12"
    >
      <input type="hidden" name="brand" value={brand} />
      <ImagePick name="photo" text="+ Upload product photo" />
      <div className="ad-form">
        <label className="ad-field">
          Category
          <select name="category" value={cat} onChange={(e) => setCat(e.target.value)}>
            {cats.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="ad-field">
          Sub-category
          <select name="sub" key={cat}>
            {subs.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="ad-field">
          Model
          <input name="model" required placeholder="UK G7500Q" maxLength={40} />
        </label>
        <label className="ad-field">
          Price (TZS)
          <input name="price" required inputMode="numeric" placeholder="1500000" />
        </label>
        <label className="ad-field full">
          Product name
          <input name="name" required placeholder="G7500Q Generator" maxLength={120} />
        </label>
        <label className="ad-field">
          Stock
          <input name="stock" required inputMode="numeric" placeholder="10" defaultValue="10" />
        </label>
        <label className="ad-field">
          Features (comma separated)
          <input name="features" placeholder="Key starter, 4 stroke" maxLength={600} />
        </label>
      </div>
    </AForm>
  );
}
