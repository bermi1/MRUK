import Link from 'next/link';
import { prisma, type Prisma } from '@bt/db';
import { fmtDateTime, fmtTZS, formatTzPhone, nextOrderStatuses, ORDER_STATUS_LABEL, paymentLabel, staffConfirmed, transitionPermission, type OrderStatus, type PaymentMethod } from '@bt/core';
import { editOrderItemsAction, sendInvoiceAction, transitionOrderAction } from '@/app/actions/admin';
import { AForm } from '@/components/admin/AForm';
import { LISTABLE } from '@/server/listable';
import { ActBtn } from '@/components/admin/ActBtn';
import { BrandChip, Forbidden, OrderPill, Thumb } from '@/components/admin/ui';
import { adminFilters, orderWhere } from '@/server/admin/context';
import { requireStaff } from '@/server/auth';
import { releaseExpiredReservations } from '@/server/orders';

export const metadata = { title: 'Orders' };

const PHONE = ['pay_on_delivery', 'pay_before_delivery'];
const TABS: { key: string; label: string; statuses?: string[]; phone?: boolean }[] = [
  { key: 'all', label: 'All' },
  { key: 'placed', label: 'New', statuses: ['placed'], phone: true },
  { key: 'confirmed', label: 'Awaiting payment', statuses: ['confirmed'] },
  { key: 'bank_review', label: 'Bank review', statuses: ['bank_review'] },
  { key: 'approved', label: 'Cleared to dispatch', statuses: ['approved'] },
  { key: 'packed', label: 'Packed', statuses: ['packed'] },
  { key: 'out_for_delivery', label: 'Out for delivery', statuses: ['out_for_delivery'] },
  { key: 'delivered', label: 'Delivered', statuses: ['delivered'] },
  { key: 'unpaid', label: 'Online, not paid', statuses: ['placed'], phone: false },
  { key: 'closed', label: 'Cancelled / Rejected', statuses: ['cancelled', 'rejected'] },
];
const CHANNEL: Record<string, string> = { web: 'Web', app: 'App', azania: 'Azania app', shop: 'Shop (walk-in)' };
/** The forward path of an order; each step sends the customer an SMS. */
const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'approved', label: 'Paid / cleared' },
  { status: 'out_for_delivery', label: 'Dispatched' },
  { status: 'delivered', label: 'Delivered' },
];
const PAGE = 50;

function actionLabel(from: string, to: OrderStatus, method: string): string {
  if (to === 'confirmed') return 'Confirm order and create invoice';
  if (to === 'approved' && from === 'confirmed') return method === 'pay_on_delivery' ? 'Clear for dispatch (pay on delivery)' : 'Payment received';
  if (to === 'placed' && from === 'confirmed') return 'Not paid · back to the Order desk';
  if (to === 'approved') return from === 'placed' ? 'Confirm payment' : 'Approve';
  return { packed: 'Mark packed', out_for_delivery: 'Dispatch', delivered: 'Mark delivered', cancelled: 'Cancel order', rejected: 'Reject', bank_review: 'Send to bank review', placed: 'Reopen' }[to as string] ?? ORDER_STATUS_LABEL[to];
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff();
  if (!ctx.can('orders')) return <Forbidden what="orders" />;
  await releaseExpiredReservations();
  const sp = await searchParams;
  const f = await adminFilters(ctx);
  const ow = orderWhere(f);
  // Each team opens on its own queue: Order desk → New, Finance → Awaiting payment, Storekeeper → Cleared to dispatch.
  const home = ctx.can('*') ? 'all' : ctx.can('orders.confirm') ? 'placed' : ctx.can('payments.approve') ? 'confirmed' : ctx.can('orders.dispatch') ? 'approved' : 'all';
  // A search looks across every status unless a status tab was picked on purpose.
  const tab = TABS.find((t) => t.key === (sp.status ?? (sp.q ? 'all' : home))) ?? TABS[0]!;
  const page = Math.max(1, Math.min(200, Number(sp.page) || 1));
  const q = (sp.q ?? '').trim().slice(0, 60);
  // Phones are stored as +255…: accept 0754…, 255754… or +255 754… and match on the national digits.
  const digits = q.replace(/\D/g, '').replace(/^0/, '').replace(/^255/, '');
  const where: Prisma.OrderWhereInput = {
    ...ow,
    ...(tab.statuses ? { status: { in: tab.statuses } } : {}),
    ...(tab.phone === true ? { paymentMethod: { in: PHONE } } : tab.phone === false ? { paymentMethod: { notIn: PHONE } } : {}),
    ...(q ? { OR: [{ number: { contains: q.toUpperCase() } }, { contactName: { contains: q, mode: 'insensitive' } }, ...(digits.length >= 3 ? [{ contactPhone: { contains: digits } }] : [])] } : {}),
  };
  const [counts, phoneNew, total, orders] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], where: ow, _count: { _all: true } }),
    prisma.order.count({ where: { ...ow, status: 'placed', paymentMethod: { in: PHONE } } }),
    prisma.order.count({ where }),
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE, take: PAGE }),
  ]);
  const countOf = (t: (typeof TABS)[number]) => {
    const n = counts.filter((c) => !t.statuses || t.statuses.includes(c.status)).reduce((a, c) => a + c._count._all, 0);
    return t.phone === true ? phoneNew : t.phone === false ? n - phoneNew : n;
  };
  // Typing a full order number opens it straight away.
  const exact = /^[A-Za-z]{2}-\d{3,8}$/.test(q) ? q.toUpperCase() : null;
  const selNo = sp.o && /^[A-Z]{2}-\d{3,8}$/.test(sp.o) ? sp.o : exact && orders.some((r) => r.number === exact) ? exact : orders[0]?.number;
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
  const byPhone = !!o && staffConfirmed(o.paymentMethod);
  const nexts = o
    ? nextOrderStatuses(o.status as OrderStatus)
        .filter((s) => !(isAdvanceReview && (s === 'approved' || s === 'rejected')) && !(s === 'bank_review' && o.paymentMethod !== 'salary_advance'))
        // New phone orders are confirmed by the Order desk, never approved straight away; online orders are never "confirmed".
        .filter((s) => !(o.status === 'placed' && byPhone && s === 'approved') && !(o.status === 'placed' && !byPhone && s === 'confirmed'))
        // Only the buttons of the steps this person's roles may take.
        .filter((s) => ctx.can(transitionPermission(o.status as OrderStatus, s)))
    : [];
  const editable = !!o && o.status === 'placed' && byPhone && ctx.can('orders.confirm');
  const addable = editable ? await prisma.product.findMany({ where: { brandKey: o!.brandKey, ...LISTABLE, price: { gt: 0 }, stock: { gt: 0 } }, orderBy: { name: 'asc' }, select: { id: true, model: true, name: true, price: true, stock: true } }) : [];

  const queue = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const forward = o ? (nexts.includes('out_for_delivery') ? 'out_for_delivery' : nexts.find((s) => s !== 'cancelled' && s !== 'rejected' && s !== 'bank_review' && s !== 'placed')) : undefined;
  const others = nexts.filter((s) => s !== forward);
  const stepAt = o ? STEPS.findIndex((s) => s.status === (o.status === 'packed' ? 'approved' : o.status)) : -1;

  return (
    <div className="ad-stack">
      <nav className="ad-queue" aria-label="Order queue">
        <Link href="/admin/orders?status=placed" data-testid="queue-new" aria-current={tab.key === 'placed' ? 'true' : undefined}>
          <b>{phoneNew}</b> New · to call
        </Link>
        <Link href="/admin/orders?status=confirmed" data-testid="queue-payment" aria-current={tab.key === 'confirmed' ? 'true' : undefined}>
          <b>{queue('confirmed')}</b> Awaiting payment
        </Link>
        <Link href="/admin/orders?status=approved" data-testid="queue-dispatch" aria-current={tab.key === 'approved' ? 'true' : undefined}>
          <b>{queue('approved') + queue('packed')}</b> Cleared · to dispatch
        </Link>
        <Link href="/admin/orders?status=out_for_delivery" aria-current={tab.key === 'out_for_delivery' ? 'true' : undefined}>
          <b>{queue('out_for_delivery')}</b> Out for delivery
        </Link>
      </nav>
    <div className={`ad-detail ${sp.o ? 'picked' : ''}`}>
      <section className="ad-card tight" id="order-list">
        <div className="ad-between">
          <nav className="ad-tabs" aria-label="Order status">
            {TABS.map((t) => (
              <Link key={t.key} href={`/admin/orders?${new URLSearchParams({ ...(t.key !== 'all' ? { status: t.key } : {}), ...(q ? { q } : {}) })}`} className="ad-tab" aria-current={t.key === tab.key ? 'true' : undefined}>
                {t.label} <span>{countOf(t)}</span>
              </Link>
            ))}
          </nav>
          <form action="/admin/orders" className="ad-row" role="search">
            {sp.status && tab.key !== 'all' && <input type="hidden" name="status" value={tab.key} />}
            <input className="ad-input" name="q" type="search" defaultValue={q} placeholder="Order no., name or phone" aria-label="Find order by number, name or phone" style={{ width: 'min(260px, 100%)' }} />
          </form>
        </div>
        <div className="ad-scroll">
          <table className="ad-table cards" style={{ marginTop: 14 }}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th className="hide-sm">Region</th>
                <th className="hide-sm">Payment</th>
                <th>Status</th>
                <th className="r">Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((r) => (
                <tr key={r.id} className={`link ${r.number === o?.number ? 'sel' : ''}`}>
                  <td className="ca">
                    <Link href={qs({ o: r.number })} className="num stretch" style={{ textDecoration: 'none' }} aria-label={`Open order ${r.number}`}>
                      {r.number}
                    </Link>
                    <div style={{ marginTop: 3 }}>
                      <BrandChip brand={r.brandKey} />
                    </div>
                  </td>
                  <td className="cc">
                    <div style={{ fontWeight: 500 }}>{r.contactName}</div>
                    <div style={{ fontSize: 11.5 }} className="ad-muted">
                      {CHANNEL[r.channel] ?? r.channel} · {fmtDateTime(r.createdAt)}
                    </div>
                  </td>
                  <td className="ad-muted2 hide-sm nw">{r.region}</td>
                  <td className="ad-muted2 hide-sm">{paymentLabel(r.paymentMethod as PaymentMethod)}</td>
                  <td className="cd">
                    <OrderPill status={r.status} />
                  </td>
                  <td className="r cb" style={{ fontWeight: 500 }}>
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
        <aside className="ad-card ad-stack s12" aria-label={`Order ${o.number}`} id="order-detail">
          {sp.o && (
            <a href="#order-list" className="ad-wlink ad-phone-only">
              ← Back to the order list
            </a>
          )}
          <div className="ad-between">
            <span className="ad-row" style={{ gap: 8 }}>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: '#12164A' }}>
                {o.number}
              </span>
              <BrandChip brand={o.brandKey} />
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
              <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtTZS(it.price * it.qty)}</span>
            </div>
          ))}
          {editable && (
            <details className="ad-more" data-testid="edit-items">
              <summary>Change products (after calling the customer)</summary>
              <AForm action={editOrderItemsAction.bind(null, o.number)} submit="Save changes" className="ad-stack s8" label="Change products">
                {o.items.map((it) => (
                  <label key={it.id} className="ad-field">
                    {it.model} · {it.name} ({fmtTZS(it.price)} each)
                    <input name={`qty_${it.productId}`} type="number" min={0} max={20} defaultValue={it.qty} aria-label={`Quantity of ${it.model}`} />
                  </label>
                ))}
                <label className="ad-field">
                  Add a product (website price)
                  <select name="add_product" defaultValue="">
                    <option value="">None</option>
                    {addable.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.model} · {p.name} · {fmtTZS(p.price)} · {p.stock} in stock
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ad-field">
                  Quantity to add
                  <input name="add_qty" type="number" min={1} max={20} defaultValue={1} />
                </label>
                <small className="ad-muted2" style={{ fontSize: 12 }}>Set a quantity to 0 to remove a product. Prices stay at the website price.</small>
              </AForm>
            </details>
          )}
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
            {ctx.can('orders.confirm') && o.status === 'confirmed' && o.invoices[0] && o.invoices[0].status !== 'void' && (
              <>
                <ActBtn action={sendInvoiceAction.bind(null, o.invoices[0].number, 'whatsapp')} className="ad-btn line" showOk>
                  Send invoice by WhatsApp
                </ActBtn>
                <ActBtn action={sendInvoiceAction.bind(null, o.invoices[0].number, 'sms')} className="ad-btn line" showOk>
                  Send invoice by SMS
                </ActBtn>
              </>
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
          <ol className="ad-steps" aria-label="Order progress">
            {STEPS.map((s, i) => (
              <li key={s.status} className={stepAt >= i ? 'done' : ''} aria-current={stepAt === i ? 'step' : undefined}>
                {s.label}
              </li>
            ))}
          </ol>
          {forward && (
            <div className="ad-stack s8">
              <ActBtn action={transitionOrderAction.bind(null, o.number, forward)} className="ad-btn block ok" showOk>
                {forward === 'delivered' && o.paymentMethod === 'pay_on_delivery' ? `Mark delivered · cash ${fmtTZS(o.total)} collected` : actionLabel(o.status, forward, o.paymentMethod)}
              </ActBtn>
              <small className="ad-muted2" style={{ fontSize: 12 }}>
                {forward === 'confirmed'
                  ? 'Press after the call. Creates the invoice, texts the customer and sends the order to Finance.'
                  : forward === 'approved' && o.status === 'confirmed' && o.paymentMethod === 'pay_on_delivery'
                    ? 'Cash is collected at the door: sends the order to the Storekeeper to dispatch.'
                  : forward === 'approved'
                  ? 'Records the payment, marks the invoice paid and sends the order to the Storekeeper.'
                  : forward === 'delivered' && o.paymentMethod === 'pay_on_delivery'
                    ? 'Press when the driver hands over the cash: records the payment, marks the invoice paid and texts the customer.'
                    : 'The customer gets an SMS with the new status.'}
              </small>
            </div>
          )}
          {others.length > 0 && (
            <div className="ad-btns">
              {others.map((s) => (
                <ActBtn key={s} action={transitionOrderAction.bind(null, o.number, s)} className={s === 'cancelled' || s === 'rejected' ? 'ad-btn danger' : 'ad-btn line'} confirm={s === 'cancelled' ? `Cancel order ${o.number}? Stock is returned and payments refunded.` : s === 'placed' ? `Send ${o.number} back to the Order desk as not paid?` : s === 'rejected' ? `Reject order ${o.number}? Stock is returned and payments refunded.` : undefined}>
                  {actionLabel(o.status, s, o.paymentMethod)}
                </ActBtn>
              ))}
            </div>
          )}
          <a className="ad-btn line" href={`/admin/orders/${o.number}/note`} target="_blank" rel="noopener">
            Print picking and delivery note
          </a>
        </aside>
      ) : (
        <aside className="ad-card ad-empty">Select an order to see details</aside>
      )}
    </div>
    </div>
  );
}
