import Link from 'next/link';
import { prisma, type Prisma } from '@bt/db';
import { fmtDate, fmtTZS, formatTzPhone, paymentLabel, type PaymentMethod } from '@bt/core';
import { invoiceStatusAction } from '@/app/actions/admin';
import { ActBtn } from '@/components/admin/ActBtn';
import { Forbidden, INVOICE_PILL, Pill } from '@/components/admin/ui';
import { waLink } from '@/lib/format';
import { adminFilters, orderWhere } from '@/server/admin/context';
import { requireStaff } from '@/server/auth';

export const metadata = { title: 'Invoices' };

const TABS = ['all', 'issued', 'paid', 'void'] as const;

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff();
  if (!ctx.can('invoices')) return <Forbidden what="invoices" />;
  const sp = await searchParams;
  const f = await adminFilters(ctx);
  const tab = (TABS as readonly string[]).includes(sp.status ?? '') ? sp.status! : 'all';
  const q = (sp.q ?? '').trim().toUpperCase().slice(0, 40);
  const where: Prisma.InvoiceWhereInput = { order: orderWhere(f), ...(tab !== 'all' ? { status: tab } : {}), ...(q ? { OR: [{ number: { contains: q } }, { order: { number: { contains: q } } }] } : {}) };
  const [list, counts] = await Promise.all([
    prisma.invoice.findMany({ where, include: { order: { select: { number: true, contactName: true } } }, orderBy: { issuedAt: 'desc' }, take: 100 }),
    prisma.invoice.groupBy({ by: ['status'], where: { order: orderWhere(f) }, _count: { _all: true } }),
  ]);
  const selNo = sp.no && /^INV-\d{4}-\d{3,8}$/.test(sp.no) ? sp.no : list[0]?.number;
  const inv = selNo ? await prisma.invoice.findFirst({ where: { number: selNo, order: { brandKey: { in: f.allowed } } }, include: { order: { include: { items: true, brand: true, payments: { take: 1, orderBy: { createdAt: 'desc' } } } } } }) : null;
  const net = inv ? Math.round(inv.amount / 1.18) : 0;
  const write = ctx.can('invoices.write');
  const link = (extra: Record<string, string>) => `/admin/invoices?${new URLSearchParams({ ...(tab !== 'all' ? { status: tab } : {}), ...(q ? { q } : {}), ...extra })}`;
  const count = (s: string) => (s === 'all' ? counts.reduce((a, c) => a + c._count._all, 0) : (counts.find((c) => c.status === s)?._count._all ?? 0));

  return (
    <div className="ad-detail" style={{ gridTemplateColumns: '400px minmax(0, 1fr)' }}>
      <section className="ad-card tight" style={{ position: 'static' }}>
        <div className="ad-between" style={{ padding: '0 4px 10px' }}>
          <h2 className="ad-h">Invoices</h2>
          <form action="/admin/invoices" role="search">
            {tab !== 'all' && <input type="hidden" name="status" value={tab} />}
            <input className="ad-input" name="q" defaultValue={q} placeholder="INV or order no." aria-label="Find invoice" style={{ width: 170, minHeight: 36, padding: '7px 10px' }} />
          </form>
        </div>
        <nav className="ad-tabs" aria-label="Invoice status">
          {TABS.map((t) => (
            <Link key={t} className="ad-tab" href={`/admin/invoices${t === 'all' ? '' : `?status=${t}`}`} aria-current={t === tab ? 'true' : undefined} style={{ textTransform: 'capitalize' }}>
              {t} <span>{count(t)}</span>
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: 6 }}>
          {list.map((v) => (
            <Link key={v.id} href={link({ no: v.number })} className={`ad-listcard ${v.number === inv?.number ? 'sel' : ''}`}>
              <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: '#12164A' }}>
                {v.number}
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 600, textAlign: 'right' }}>{fmtTZS(v.amount)}</span>
              <span className="ad-muted2" style={{ fontSize: 12.5 }}>
                {v.order.contactName} · {fmtDate(v.issuedAt)}
              </span>
              <span style={{ textAlign: 'right' }}>
                <Pill cls={INVOICE_PILL[v.status] ?? 'pill-grey'}>{v.status}</Pill>
              </span>
            </Link>
          ))}
          {!list.length && <div className="ad-empty">No invoices</div>}
        </div>
      </section>

      {inv ? (
        <div className="ad-stack s12" style={{ position: 'static' }}>
          <div className="ad-row" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {write && inv.status === 'issued' && (
              <ActBtn action={invoiceStatusAction.bind(null, inv.number, 'paid')} className="ad-btn ok">
                Mark paid
              </ActBtn>
            )}
            {write && inv.status !== 'void' && (
              <ActBtn action={invoiceStatusAction.bind(null, inv.number, 'void')} className="ad-btn danger" confirm={`Void ${inv.number}? This cannot be undone.`}>
                Void
              </ActBtn>
            )}
            <a className="ad-btn line" href={waLink(inv.order.contactPhone, `Hello ${inv.order.contactName}, this is ${inv.order.brand.name}. Your tax invoice ${inv.number} for order ${inv.order.number} is ${fmtTZS(inv.amount)}.`)} target="_blank" rel="noopener">
              Send via WhatsApp
            </a>
            <a className="ad-btn" href={`/api/admin/invoices/${inv.number}`} target="_blank" rel="noopener">
              Download PDF
            </a>
          </div>
          <article className="ad-inv" aria-label={`Invoice ${inv.number}`}>
            <div className="ad-between" style={{ alignItems: 'flex-start' }}>
              <div>
                <img src={`/brand/${inv.order.brandKey}.png`} alt={inv.order.brand.name} style={{ height: 40, display: 'block' }} />
                <div className="ad-muted2" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.6 }}>
                  {inv.order.brand.legal}
                  <br />
                  Dar es Salaam, Tanzania
                  <br />
                  {inv.order.brand.supportEmail}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '.02em', color: '#12164A' }}>TAX INVOICE</div>
                <div className="mono ad-muted2" style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.7 }}>
                  {inv.number}
                  <br />
                  Issued {fmtDate(inv.issuedAt)}
                  <br />
                  Order {inv.order.number}
                </div>
                <div style={{ marginTop: 6 }}>
                  <Pill cls={INVOICE_PILL[inv.status] ?? 'pill-grey'}>{inv.status.toUpperCase()}</Pill>
                </div>
              </div>
            </div>
            <div className="ad-grid2" style={{ marginTop: 26, padding: '16px 0', borderTop: '1px solid #ECEDF2', borderBottom: '1px solid #ECEDF2', gap: 24 }}>
              <div>
                <div className="cap">BILL TO</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{inv.order.contactName}</div>
                <div className="ad-muted2" style={{ fontSize: 12.5 }}>
                  {formatTzPhone(inv.order.contactPhone)} · {inv.order.region}
                </div>
              </div>
              <div>
                <div className="cap">PAYMENT</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{paymentLabel(inv.order.paymentMethod as PaymentMethod)}</div>
                <div className="ad-muted2" style={{ fontSize: 12.5 }}>
                  Ref {inv.order.payments[0]?.reference || '—'}
                </div>
              </div>
            </div>
            <table className="ad-table" style={{ marginTop: 16, fontSize: 13.5 }}>
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="c">Qty</th>
                  <th className="r">Unit price</th>
                  <th className="r">Amount</th>
                </tr>
              </thead>
              <tbody>
                {inv.order.items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{it.name}</div>
                      <div className="ad-muted" style={{ fontSize: 11.5 }}>
                        {it.model}
                      </div>
                    </td>
                    <td className="c">{it.qty}</td>
                    <td className="r">{fmtTZS(it.price)}</td>
                    <td className="r">{fmtTZS(it.price * it.qty)}</td>
                  </tr>
                ))}
                {inv.order.deliveryFee > 0 && (
                  <tr>
                    <td>Delivery · {inv.order.region}</td>
                    <td className="c">1</td>
                    <td className="r">{fmtTZS(inv.order.deliveryFee)}</td>
                    <td className="r">{fmtTZS(inv.order.deliveryFee)}</td>
                  </tr>
                )}
                {inv.order.discount > 0 && (
                  <tr>
                    <td>Discount {inv.order.discountCode ?? ''}</td>
                    <td />
                    <td />
                    <td className="r">−{fmtTZS(inv.order.discount)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, marginTop: 14, alignItems: 'end' }}>
              <div className="ad-muted2" style={{ fontSize: 12, lineHeight: 1.6 }}>
                Prices include VAT at 18%.
                <br />
                TRA EFD/VFD receipt: out of scope this phase.
              </div>
              <div className="ad-stack s8" style={{ fontSize: 13.5 }}>
                <div className="ad-kv" style={{ fontSize: 13.5 }}>
                  <span>Net amount</span>
                  <span>{fmtTZS(net)}</span>
                </div>
                <div className="ad-kv" style={{ fontSize: 13.5 }}>
                  <span>VAT 18% (inclusive)</span>
                  <span>{fmtTZS(inv.amount - net)}</span>
                </div>
                <div className="ad-between" style={{ fontSize: 17, fontWeight: 600, color: '#12164A', paddingTop: 8, borderTop: '2px solid #12164A' }}>
                  <span>Total</span>
                  <span>{fmtTZS(inv.amount)}</span>
                </div>
              </div>
            </div>
            <div className="ad-between ad-muted" style={{ marginTop: 22, fontSize: 11.5 }}>
              <span>Goods remain under 2-year manufacturer warranty.</span>
              <span>Generated by Commerce OS · Bermi Techs</span>
            </div>
          </article>
        </div>
      ) : (
        <div className="ad-card ad-empty">Select an invoice</div>
      )}
    </div>
  );
}
