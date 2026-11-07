'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { fmtTZS, REGIONS, SHOP_PAYMENT_LABEL, SHOP_PAYMENT_METHODS } from '@bt/core';
import { createInvoiceAction } from '@/app/actions/admin';

export interface PickProduct {
  id: string;
  brand: 'mruk' | 'skywood';
  model: string;
  name: string;
  price: number;
  stock: number;
}

const BRAND_NAME = { mruk: 'Mr UK', skywood: 'Skywood' } as const;
const num = (s: string) => Number(s.replace(/[,\s]/g, '') || 0);

/** Create invoice for a walk-in or phone sale: customer, items from the catalogue, totals with VAT, payment. */
export function InvoiceBuilder({ brands, products }: { brands: ('mruk' | 'skywood')[]; products: PickProduct[] }) {
  const router = useRouter();
  const [brand, setBrand] = useState(brands[0]!);
  const [c, setC] = useState({ name: '', phone: '', email: '', region: 'Dar es Salaam', address: '' });
  const [lines, setLines] = useState<{ productId: string; qty: string }[]>([]);
  const [pick, setPick] = useState('');
  const [query, setQuery] = useState('');
  const [discount, setDiscount] = useState('');
  const [delivery, setDelivery] = useState('0');
  const [method, setMethod] = useState<(typeof SHOP_PAYMENT_METHODS)[number]>('cash');
  const [paid, setPaid] = useState(true);
  const [collected, setCollected] = useState(true);
  const [err, setErr] = useState<{ text: string; field?: string } | null>(null);
  const [pending, start] = useTransition();

  const list = products.filter((p) => p.brand === brand);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const matches = query.trim() ? list.filter((p) => `${p.model} ${p.name}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 50) : list.slice(0, 50);
  const rows = lines.map((l) => ({ ...l, p: byId.get(l.productId)!, n: Math.max(0, Math.floor(num(l.qty))) }));
  const subtotal = rows.reduce((a, r) => a + r.p.price * r.n, 0);
  const total = Math.max(0, subtotal - num(discount) + num(delivery));
  const net = Math.round(total / 1.18);

  const add = (id: string) => {
    if (!id) return;
    setLines((ls) => (ls.some((l) => l.productId === id) ? ls.map((l) => (l.productId === id ? { ...l, qty: String(num(l.qty) + 1) } : l)) : [...ls, { productId: id, qty: '1' }]));
    setPick('');
  };

  function submit() {
    setErr(null);
    if (!rows.length) return setErr({ text: 'Add at least one item', field: 'lines' });
    const short = rows.find((r) => r.n > r.p.stock);
    if (short) return setErr({ text: `Only ${short.p.stock} of ${short.p.name} in stock`, field: 'lines' });
    start(async () => {
      const r = await createInvoiceAction({ brand, ...c, lines: rows.map((x) => ({ productId: x.productId, qty: x.n })), discount: num(discount), deliveryFee: num(delivery), method, paid, collected });
      if (!r.ok) return setErr({ text: r.error, field: r.field });
      router.push(`/admin/invoices?no=${r.data?.invoice}&created=1`);
    });
  }

  const fieldErr = (f: string) => (err?.field === f ? <span className="ad-err">{err.text}</span> : null);

  return (
    <form
      className="ad-detail"
      aria-label="Create invoice"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="ad-stack">
        <section className="ad-card ad-stack s12">
          <h2 className="ad-h">1 · Customer</h2>
          <div className="ad-form">
            {brands.length > 1 && (
              <label className="ad-field full">
                Brand (seller on the invoice)
                <select name="brand" value={brand} onChange={(e) => (setBrand(e.target.value as typeof brand), setLines([]))}>
                  {brands.map((b) => (
                    <option key={b} value={b}>
                      {BRAND_NAME[b]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="ad-field">
              Customer name
              <input name="name" required value={c.name} maxLength={120} onChange={(e) => setC({ ...c, name: e.target.value })} />
              {fieldErr('name')}
            </label>
            <label className="ad-field">
              Mobile number
              <input name="phone" type="tel" inputMode="tel" required placeholder="0754 000 214" value={c.phone} maxLength={20} onChange={(e) => setC({ ...c, phone: e.target.value })} />
              {fieldErr('phone')}
            </label>
            <label className="ad-field">
              Email (optional, to email the invoice)
              <input name="email" type="email" value={c.email} maxLength={160} onChange={(e) => setC({ ...c, email: e.target.value })} />
              {fieldErr('email')}
            </label>
            <label className="ad-field">
              Region
              <select name="region" value={c.region} onChange={(e) => setC({ ...c, region: e.target.value })}>
                {REGIONS.map((r) => (
                  <option key={r.name}>{r.name}</option>
                ))}
              </select>
            </label>
            <label className="ad-field full">
              Address (for delivery)
              <input name="address" value={c.address} maxLength={240} onChange={(e) => setC({ ...c, address: e.target.value })} />
            </label>
          </div>
        </section>

        <section className="ad-card ad-stack s12">
          <h2 className="ad-h">2 · Items</h2>
          <div className="ad-form">
            <label className="ad-field">
              Find a product
              <input type="search" value={query} placeholder="Model or name" onChange={(e) => setQuery(e.target.value)} aria-label="Find a product" />
            </label>
            <label className="ad-field">
              Product
              <select name="product" value={pick} onChange={(e) => add(e.target.value)} aria-label="Add product">
                <option value="">+ Add an item…</option>
                {matches.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.stock < 1}>
                    {p.model} · {p.name} · {fmtTZS(p.price)} {p.stock < 1 ? '(out of stock)' : `(${p.stock} in stock)`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {fieldErr('lines')}
          <div className="ad-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="c">Qty</th>
                  <th className="r">Unit price</th>
                  <th className="r">Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.productId} data-testid="invoice-line">
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.p.name}</div>
                      <div className="ad-muted mono" style={{ fontSize: 11.5 }}>
                        {r.p.model} · {r.p.stock} in stock
                      </div>
                    </td>
                    <td className="c">
                      <input className="ad-inline" inputMode="numeric" style={{ width: 64 }} aria-label={`Quantity of ${r.p.name}`} value={r.qty} onChange={(e) => setLines((ls) => ls.map((l) => (l.productId === r.productId ? { ...l, qty: e.target.value } : l)))} />
                    </td>
                    <td className="r">{fmtTZS(r.p.price)}</td>
                    <td className="r">{fmtTZS(r.p.price * r.n)}</td>
                    <td className="r">
                      <button type="button" className="ad-btn danger sm" aria-label={`Remove ${r.p.name}`} onClick={() => setLines((ls) => ls.filter((l) => l.productId !== r.productId))}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={5} className="ad-empty">
                      No items yet: pick products above
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="ad-form">
            <label className="ad-field">
              Discount (TZS)
              <input name="discount" inputMode="numeric" value={discount} placeholder="0" onChange={(e) => setDiscount(e.target.value)} />
              {fieldErr('discount')}
            </label>
            <label className="ad-field">
              Delivery (TZS)
              <input name="deliveryFee" inputMode="numeric" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
            </label>
          </div>
        </section>
      </div>

      <aside className="ad-card ad-stack s12" aria-label="Totals and payment">
        <h2 className="ad-h">3 · Payment</h2>
        <div className="ad-stack s8" style={{ fontSize: 13.5 }} data-testid="invoice-totals">
          <div className="ad-kv">
            <span>Items</span>
            <span>{fmtTZS(subtotal)}</span>
          </div>
          {num(discount) > 0 && (
            <div className="ad-kv">
              <span>Discount</span>
              <span>−{fmtTZS(num(discount))}</span>
            </div>
          )}
          <div className="ad-kv">
            <span>Delivery</span>
            <span>{num(delivery) ? fmtTZS(num(delivery)) : 'None'}</span>
          </div>
          <div className="ad-kv">
            <span>Net of VAT</span>
            <span>{fmtTZS(net)}</span>
          </div>
          <div className="ad-kv">
            <span>VAT 18% (inclusive)</span>
            <span>{fmtTZS(total - net)}</span>
          </div>
          <div className="ad-between" style={{ fontSize: 17, fontWeight: 700, color: '#12164A', borderTop: '2px solid #12164A', paddingTop: 8 }}>
            <span>Total</span>
            <span data-testid="invoice-total">{fmtTZS(total)}</span>
          </div>
        </div>
        <label className="ad-field">
          Payment method
          <select name="method" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
            {SHOP_PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {SHOP_PAYMENT_LABEL[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="ad-toggle">
          <span>
            <b>Paid now</b>
            <small>{paid ? 'Invoice is issued as PAID' : 'Invoice is issued as due; mark it paid later'}</small>
          </span>
          <input type="checkbox" name="paid" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
          <span className="sw" aria-hidden="true" />
        </label>
        <label className="ad-toggle">
          <span>
            <b>Customer takes the goods now</b>
            <small>{collected ? 'Order is closed as delivered' : 'Goes to the warehouse queue to pack and deliver'}</small>
          </span>
          <input type="checkbox" name="collected" checked={collected} onChange={(e) => setCollected(e.target.checked)} />
          <span className="sw" aria-hidden="true" />
        </label>
        {err && !['name', 'phone', 'email', 'lines', 'discount'].includes(err.field ?? '') && (
          <div className="ad-alert" role="alert">
            {err.text}
          </div>
        )}
        {err && ['name', 'phone', 'email', 'lines', 'discount'].includes(err.field ?? '') && (
          <div className="ad-alert" role="alert">
            Check the form: {err.text}
          </div>
        )}
        <button type="submit" className="ad-btn block" disabled={pending} aria-busy={pending}>
          {pending ? 'Creating…' : 'Create invoice'}
        </button>
        <p className="ad-muted2" style={{ fontSize: 12, margin: 0 }}>
          Prices come from the catalogue; stock is taken off at once. You can preview, download, mark paid and send the invoice on the next screen.
        </p>
      </aside>
    </form>
  );
}
