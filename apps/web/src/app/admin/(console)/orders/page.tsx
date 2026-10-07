import Link from 'next/link';
import { prisma, type Prisma } from '@bt/db';
import { fmtDateTime, fmtTZS, formatTzPhone, nextOrderStatuses, ORDER_STATUS_LABEL, paymentLabel, type OrderStatus, type PaymentMethod } from '@bt/core';
import { transitionOrderAction } from '@/app/actions/admin';
import { ActBtn } from '@/components/admin/ActBtn';
import { Forbidden, OrderPill, Thumb } from '@/components/admin/ui';
import { adminFilters, orderWhere } from '@/server/admin/context';
import { requireStaff } from '@/server/auth';
import { releaseExpiredReservations } from '@/server/orders';

export const metadata = { title: 'Orders' };

const TABS: { key: string; label: string; statuses?: string[] }[] = [
  { key: 'all', label: 'All' },
  { key: 'placed', label: 'Awaiting payment', statuses: ['placed'] },
  { key: 'bank_review', label: 'Bank review', statuses: ['bank_review'] },
  { key: 'approved', label: 'Processing', statuses: ['approved'] },
  { key: 'packed', label: 'Packed', statuses: ['packed'] },
  { key: 'out_for_delivery', label: 'Out for delivery', statuses: ['out_for_delivery'] },
  { key: 'delivered', label: 'Delivered', statuses: ['delivered'] },
  { key: 'closed', label: 'Cancelled / Rejected', statuses: ['cancelled', 'rejected'] },
];
const CHANNEL: Record<string, string> = { web: 'Web', app: 'App', azania: 'Azania app' };
const PAGE = 50;

function actionLabel(from: string, to: OrderStatus): string {
  if (to === 'approved') return from === 'placed' ? 'Confirm payment' : 'Approve';
  return { packed: 'Mark packed', out_for_delivery: 'Mark dispatched', delivered: 'Mark delivered', cancelled: 'Cancel order', rejected: 'Reject', bank_review: 'Send to bank review', placed: 'Reopen' }[to as string] ?? ORDER_STATUS_LABEL[to];
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff();
  if (!ctx.can('orders')) return <Forbidden what="orders" />;
  await releaseExpiredReservations();
  const sp = await searchParams;
  const f = await adminFilters(ctx);
  const ow = orderWhere(f);
  const tab = TABS.find((t) => t.key === sp.status) ?? TABS[0]!;
  const page = Math.max(1, Math.min(200, Number(sp.page) || 1));
  const q = (sp.q ?? '').trim().slice(0, 60);
  const where: Prisma.OrderWhereInput = {
    ...ow,
    ...(tab.statuses ? { status: { in: tab.statuses } } : {}),
    ...(q ? { OR: [{ number: { contains: q.toUpperCase() } }, { contactName: { contains: q, mode: 'insensitive' } }, { contactPhone: { contains: q.replace(/\D/g, '') || q } }] } : {}),
  };
  const [counts, total, orders] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], where: ow, _count: { _all: true } }),
    prisma.order.count({ where }),
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE, take: PAGE }),
  ]);
  const countOf = (t: (typeof TABS)[number]) => counts.filter((c) => !t.statuses || t.statuses.includes(c.status)).reduce((a, c) => a + c._count._all, 0);
  const selNo = sp.o && /^[A-Z]{2}-\d{3,8}$/.test(sp.o) ? sp.o : orders[0]?.number;
  const o = selNo
    ? await prisma.order.findFirst({
        where: { number: selNo, brandKey: { in: f.allowed } },
        include: { items: { include: { product: { select: { images: true } } } }, events: { orderBy: { at: 'asc' } }, payments: { orderBy: { createdAt: 'desc' } }, invoices: { orderBy: { issuedAt: 'desc' } }, advance: { include: { contract: { select: { number: true } } } } },
      })
    : null;
  const qs = (extra: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const all = { status: tab.key === 'all' ? undefined : tab.key, q: q || undefined, page: page > 1 ? page : undefined, o: selNo, ...extra };
    for (const [k, v] of Object.entries(all)) if (v !== undefined && v !== '') p.set(k, String(v));
    return `/admin/orders?${p}`;
  };
  const isAdvanceReview = o?.paymentMethod === 'salary_advance' && o.status === 'bank_review';
  const nexts = o ? nextOrderStatuses(o.status as OrderStatus).filter((s) => !(isAdvanceReview && (s === 'approved' || s === 'rejected')) && !(s === 'bank_review' && o.paymentMethod !== 'salary_advance')) : [];

  return (
    <div className="ad-detail">
      <section className="ad-card tight">
        <div className="ad-between">
          <nav className="ad-tabs" aria-label="Order status">
            {TABS.map((t) => (
              <Link key={t.key} href={`/admin/orders?${new URLSearchParams({ ...(t.key !== 'all' ? { status: t.key } : {}), ...(q ? { q } : {}) })}`} className="ad-tab" aria-current={t.key === tab.key ? 'true' : undefined}>
                {t.label} <span>{countOf(t)}</span>
              </Link>
            ))}
          </nav>
          <form action="/admin/orders" className="ad-row" role="search">
            {tab.key !== 'all' && <input type="hidden" name="status" value={tab.key} />}
            <input className="ad-input" name="q" defaultValue={q} placeholder="Order no., name or phone" aria-label="Filter orders" style={{ width: 220 }} />
          </form>
        </div>
        <div className="ad-scroll">
          <table className="ad-table" style={{ marginTop: 14 }}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Region</th>
                <th>Payment</th>
                <th>Status</th>
                <th className="r">Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((r) => (
                <tr key={r.id} className={r.number === o?.number ? 'sel' : undefined}>
                  <td>
                    <Link href={qs({ o: r.number })} className="num" style={{ textDecoration: 'none' }} aria-label={`Open order ${r.number}`}>
                      {r.number}
                    </Link>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{r.contactName}</div>
                    <div style={{ fontSize: 11.5 }} className="ad-muted">
                      {CHANNEL[r.channel] ?? r.channel} · {fmtDateTime(r.createdAt)}
                    </div>
                  </td>
                  <td className="ad-muted2">{r.region}</td>
                  <td className="ad-muted2">{paymentLabel(r.paymentMethod as PaymentMethod)}</td>
                  <td>
                    <OrderPill status={r.status} />
                  </td>
                  <td className="r" style={{ fontWeight: 500 }}>
                    {fmtTZS(r.total)}
                  </td>
                </tr>
              ))}
              {!orders.length && (
                <tr>
                  <td colSpan={6} className="ad-empty">
                    No orders match this view
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {total > PAGE && (
          <div className="ad-between" style={{ marginTop: 12, fontSize: 13 }}>
            <span className="ad-muted2">
              {(page - 1) * PAGE + 1}–{Math.min(total, page * PAGE)} of {total}
            </span>
            <span className="ad-row">
              {page > 1 && (
                <Link className="ad-btn line sm" href={qs({ page: page - 1, o: undefined })}>
                  Previous
                </Link>
              )}
              {page * PAGE < total && (
                <Link className="ad-btn line sm" href={qs({ page: page + 1, o: undefined })}>
                  Next
                </Link>
              )}
            </span>
          </div>
        )}
      </section>

      {o ? (
        <aside className="ad-card ad-stack s12" aria-label={`Order ${o.number}`}>
          <div className="ad-between">
            <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: '#12164A' }}>
              {o.number}
            </span>
            <OrderPill status={o.status} />
          </div>
          <div className="ad-box">
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>{o.contactName}</div>
            <div className="ad-muted2" style={{ fontSize: 12.5, marginTop: 2 }}>
              {formatTzPhone(o.contactPhone)} · {o.region}
            </div>
            <div className="ad-muted2" style={{ fontSize: 12.5 }}>
              {o.addressLine}
            </div>
            <div className="ad-muted2" style={{ fontSize: 12.5 }}>
              Ordered via {CHANNEL[o.channel] ?? o.channel} · {fmtDateTime(o.createdAt)}
            </div>
          </div>
          {o.items.map((it) => (
            <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: 10, alignItems: 'center' }}>
              <Thumb src={it.product.images[0]} model={it.model} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{it.name}</div>
                <div className="ad-muted" style={{ fontSize: 12 }}>
                  Qty {it.qty} · {it.model}
                </div>
              </div>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{fmtTZS(it.price * it.qty)}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #ECEDF2', paddingTop: 10 }}>
            <div className="ad-kv">
              <span>Subtotal</span>
              <span>{fmtTZS(o.subtotal)}</span>
            </div>
            {o.discount > 0 && (
              <div className="ad-kv">
                <span>Discount {o.discountCode ? `(${o.discountCode})` : ''}</span>
                <span>−{fmtTZS(o.discount)}</span>
              </div>
            )}
            <div className="ad-kv">
              <span>Delivery</span>
              <span>{o.deliveryFee ? fmtTZS(o.deliveryFee) : 'Free'}</span>
            </div>
            <div className="ad-kv" style={{ fontWeight: 600 }}>
              <span>Total</span>
              <span>{fmtTZS(o.total)}</span>
            </div>
            <div className="ad-kv">
              <span>Payment</span>
              <span>
                {paymentLabel(o.paymentMethod as PaymentMethod)}
                {o.months ? ` · ${o.months} months` : ''}
              </span>
            </div>
            {o.payments[0] && (
              <div className="ad-kv">
                <span>Reference</span>
                <span className="mono" style={{ fontSize: 12 }}>
                  {o.payments[0].reference || '—'} · {o.payments[0].status}
                </span>
              </div>
            )}
            {o.reservedUntil && (
              <div className="ad-kv">
                <span>Stock reserved until</span>
                <span>{fmtDateTime(o.reservedUntil)}</span>
              </div>
            )}
          </div>
          <h3 className="ad-h" style={{ fontSize: 13 }}>
            Timeline
          </h3>
          <div className="ad-tl">
            {o.events.map((e) => (
              <div key={e.id}>
                <span className="dot">
                  <i />
                  <s />
                </span>
                <div className="t">
                  <div style={{ fontWeight: 500 }}>{ORDER_STATUS_LABEL[e.status as OrderStatus] ?? e.status}</div>
                  <small>
                    {fmtDateTime(e.at)} · {e.note || e.actor}
                  </small>
                </div>
              </div>
            ))}
          </div>
          <div className="ad-btns">
            {ctx.can('invoices') && o.invoices[0] && (
              <a className="ad-btn ghost" href={`/api/admin/invoices/${o.invoices[0].number}`} target="_blank" rel="noopener">
                View invoice
              </a>
            )}
            {ctx.can('advance') && o.advance?.contract && (
              <a className="ad-btn ghost" href={`/api/admin/contracts/${o.advance.contract.number}`} target="_blank" rel="noopener">
                Contract PDF
              </a>
            )}
          </div>
          {isAdvanceReview && ctx.can('advance') && (
            <Link className="ad-btn az" href={`/admin/advance?id=${o.advance?.id ?? ''}`}>
              Review on Salary Advance page
            </Link>
          )}
          {ctx.can('orders.write') && nexts.length > 0 && (
            <div className="ad-btns">
              {nexts.map((s) => (
                <ActBtn key={s} action={transitionOrderAction.bind(null, o.number, s)} className={s === 'cancelled' || s === 'rejected' ? 'ad-btn danger' : 'ad-btn'} confirm={s === 'cancelled' ? `Cancel order ${o.number}? Stock is returned and payments refunded.` : undefined}>
                  {actionLabel(o.status, s)}
                </ActBtn>
              ))}
            </div>
          )}
        </aside>
      ) : (
        <aside className="ad-card ad-empty">Select an order to see details</aside>
      )}
    </div>
  );
}
