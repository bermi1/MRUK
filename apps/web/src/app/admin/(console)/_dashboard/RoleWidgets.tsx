import Link from 'next/link';
import { prisma } from '@bt/db';
import { fmtDateTime, fmtTZS, ROLE_LABEL, ticketSla, type TaskRole } from '@bt/core';
import { AdvancePill, BrandChip, OrderPill, Pill, Stat, TICKET_PILL, Widget } from '@/components/admin/ui';
import { ago, LOW_STOCK, monthName, orderWhere, REORDER_STOCK, REVENUE_STATUSES, startOfDayEAT, startOfMonthEAT, type AdminFilters } from '@/server/admin/context';
import { openTasksByRole } from '@/server/admin/taskview';
import type { StaffContext } from '@/server/auth';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const millions = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n.toLocaleString('en-US'));
const n = (v: number) => v.toLocaleString('en-US');
/** DEFAULT (not in README): an issued, unpaid invoice is overdue after 7 days. */
const INVOICE_DUE_DAYS = 7;

// Finance ---------------------------------------------------------------------------------------

export async function FinanceWidgets({ f }: { f: AdminFilters }) {
  const ow = orderWhere(f);
  const now = new Date();
  const today = startOfDayEAT(now);
  const d7 = new Date(today.getTime() - 6 * DAY);
  const d30 = new Date(today.getTime() - 29 * DAY);
  const rev = { ...ow, status: { in: REVENUE_STATUSES } };
  const week = new Date(now.getTime() + 7 * DAY);
  const [rToday, r7, r30, waiting, approved, declined, unpaid, overdue, dueWeek, lateInst, cancelled, refunded, queue] = await Promise.all([
    prisma.order.aggregate({ where: { ...rev, createdAt: { gte: today } }, _sum: { total: true }, _count: { _all: true } }),
    prisma.order.aggregate({ where: { ...rev, createdAt: { gte: d7 } }, _sum: { total: true }, _count: { _all: true } }),
    prisma.order.aggregate({ where: { ...rev, createdAt: { gte: d30 } }, _sum: { total: true }, _count: { _all: true } }),
    prisma.salaryAdvanceApplication.aggregate({ where: { status: 'submitted', order: ow }, _count: { _all: true }, _min: { createdAt: true } }),
    prisma.salaryAdvanceApplication.count({ where: { status: { in: ['approved', 'disbursed', 'repaying', 'closed'] }, decidedAt: { gte: d30 }, order: ow } }),
    prisma.salaryAdvanceApplication.count({ where: { status: 'rejected', decidedAt: { gte: d30 }, order: ow } }),
    prisma.invoice.aggregate({ where: { status: 'issued', order: ow }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.invoice.aggregate({ where: { status: 'issued', issuedAt: { lt: new Date(now.getTime() - INVOICE_DUE_DAYS * DAY) }, order: ow }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.instalmentSchedule.aggregate({ where: { paidAt: null, dueDate: { gte: now, lt: week }, application: { status: { in: ['disbursed', 'repaying'] }, order: ow } }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.instalmentSchedule.count({ where: { paidAt: null, dueDate: { lt: now }, application: { status: { in: ['disbursed', 'repaying'] }, order: ow } } }),
    prisma.order.count({ where: { ...ow, status: { in: ['cancelled', 'rejected'] }, updatedAt: { gte: d30 } } }),
    prisma.payment.aggregate({ where: { status: 'refunded', order: ow, createdAt: { gte: d30 } }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.salaryAdvanceApplication.findMany({ where: { status: 'submitted', order: ow }, orderBy: { createdAt: 'asc' }, take: 6, select: { id: true, total: true, monthly: true, termMonths: true, ratioPercent: true, status: true, createdAt: true, order: { select: { number: true, brandKey: true } } } }),
  ]);
  const oldest = waiting._min.createdAt;
  return (
    <>
      <Widget title="Revenue" sub="Confirmed orders (paid or approved), all channels · TZS" link={{ href: '/admin/reports', label: 'Reports' }} testid="dash-finance-revenue">
        <div className="ad-stats">
          <Stat label="Today" value={`TZS ${millions(rToday._sum.total ?? 0)}`} sub={`${rToday._count._all} orders`} testid="rev-today" />
          <Stat label="Last 7 days" value={`TZS ${millions(r7._sum.total ?? 0)}`} sub={`${r7._count._all} orders`} testid="rev-7d" />
          <Stat label="Last 30 days" value={`TZS ${millions(r30._sum.total ?? 0)}`} sub={`${r30._count._all} orders`} testid="rev-30d" />
          <Stat label="Refunds and cancellations" value={cancelled} sub={`${fmtTZS(refunded._sum.amount ?? 0)} refunded · 30 days`} tone={cancelled ? 'warn' : undefined} href="/admin/orders?status=closed" />
        </div>
      </Widget>
      <div className="ad-grid2">
        <Widget title="Pay Later by Azania Bank" sub="Applications · decisions in the last 30 days" link={{ href: '/admin/advance', label: 'Open queue' }} testid="dash-finance-advance">
          <div className="ad-stats s3">
            <Stat label="Awaiting bank" value={waiting._count._all} sub={oldest ? `Oldest ${ago(oldest)}` : 'Queue is clear'} tone={waiting._count._all ? 'az' : 'ok'} href="/admin/advance" />
            <Stat label="Approved" value={approved} tone="ok" />
            <Stat label="Declined" value={declined} tone={declined ? 'bad' : undefined} />
          </div>
          <ul className="ad-rows">
            {queue.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/advance?id=${a.id}`} className="ad-rowlink">
                  <span>
                    <b className="num">{a.order.number}</b> <BrandChip brand={a.order.brandKey} />
                    <small>
                      {a.termMonths} × {fmtTZS(a.monthly)} · {a.ratioPercent}% of salary · {ago(a.createdAt)} ago
                    </small>
                  </span>
                  <span className="r">
                    <b>{fmtTZS(a.total)}</b>
                    <AdvancePill status={a.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Widget>
        <Widget title="Money to collect" sub={`Unpaid invoices (overdue after ${INVOICE_DUE_DAYS} days) and salary deductions`} link={{ href: '/admin/invoices?status=issued', label: 'Invoices' }} testid="dash-finance-collect">
          <div className="ad-stats">
            <Stat label="Unpaid invoices" value={unpaid._count._all} sub={fmtTZS(unpaid._sum.amount ?? 0)} href="/admin/invoices?status=issued" />
            <Stat label="Overdue invoices" value={overdue._count._all} sub={fmtTZS(overdue._sum.amount ?? 0)} tone={overdue._count._all ? 'bad' : 'ok'} href="/admin/invoices?status=issued" />
            <Stat label="Instalments due this week" value={dueWeek._count._all} sub={fmtTZS(dueWeek._sum.amount ?? 0)} tone="az" href="/admin/advance" />
            <Stat label="Instalments past due" value={lateInst} sub="Not yet recorded as paid" tone={lateInst ? 'bad' : 'ok'} href="/admin/advance" />
          </div>
        </Widget>
      </div>
    </>
  );
}

// Warehouse -------------------------------------------------------------------------------------

export async function WarehouseWidgets({ f }: { f: AdminFilters }) {
  const ow = orderWhere(f);
  const now = new Date();
  const today = startOfDayEAT(now);
  const [counts, deliveredToday, expiring, toPack, low, branches] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], where: { ...ow, status: { in: ['approved', 'packed', 'out_for_delivery'] } }, _count: { _all: true } }),
    prisma.orderEvent.count({ where: { status: 'delivered', at: { gte: today }, order: ow } }),
    prisma.order.findMany({ where: { ...ow, status: 'placed', reservedUntil: { gt: now } }, orderBy: { reservedUntil: 'asc' }, take: 5, select: { number: true, brandKey: true, reservedUntil: true, items: { select: { qty: true } } } }),
    prisma.order.findMany({ where: { ...ow, status: { in: ['approved', 'packed'] } }, orderBy: { updatedAt: 'asc' }, take: 8, select: { number: true, brandKey: true, status: true, region: true, branch: true, updatedAt: true, items: { select: { qty: true, model: true } } } }),
    prisma.product.findMany({ where: { brandKey: { in: f.brands }, stock: { lte: LOW_STOCK } }, orderBy: [{ stock: 'asc' }, { model: 'asc' }], take: 10, select: { id: true, brandKey: true, model: true, name: true, stock: true } }),
    prisma.order.groupBy({ by: ['branch', 'status'], where: { ...ow, status: { in: ['approved', 'packed', 'out_for_delivery'] } }, _count: { _all: true } }),
  ]);
  const c = (s: string) => counts.find((x) => x.status === s)?._count._all ?? 0;
  const lowCount = await prisma.product.count({ where: { brandKey: { in: f.brands }, stock: { lte: LOW_STOCK } } });
  const branchRows = [...new Set(branches.map((b) => b.branch))].sort().map((b) => ({ b, pack: 0, dispatch: 0, out: 0, ...Object.fromEntries(branches.filter((x) => x.branch === b).map((x) => [x.status === 'approved' ? 'pack' : x.status === 'packed' ? 'dispatch' : 'out', x._count._all])) }));
  return (
    <>
      <Widget title="Orders in the warehouse" sub={f.branch ? `${f.branch} branch` : 'All branches'} link={{ href: '/admin/orders?status=approved', label: 'Orders' }} testid="dash-warehouse">
        <div className="ad-stats">
          <Stat label="To pack" value={c('approved')} tone={c('approved') ? 'bad' : 'ok'} href="/admin/orders?status=approved" testid="wh-pack" />
          <Stat label="Ready to dispatch" value={c('packed')} tone={c('packed') ? 'warn' : 'ok'} href="/admin/orders?status=packed" testid="wh-dispatch" />
          <Stat label="Out for delivery" value={c('out_for_delivery')} tone="az" href="/admin/orders?status=out_for_delivery" />
          <Stat label="Delivered today" value={deliveredToday} tone="ok" href="/admin/orders?status=delivered" />
        </div>
      </Widget>
      <div className="ad-grid2">
        <Widget title="Pick and pack" sub="Oldest first · no prices shown" testid="dash-warehouse-queue">
          <ul className="ad-rows">
            {toPack.map((o) => (
              <li key={o.number}>
                <Link href={`/admin/orders?o=${o.number}`} className="ad-rowlink">
                  <span>
                    <b className="num">{o.number}</b> <BrandChip brand={o.brandKey} />
                    <small>
                      {o.items.reduce((a, i) => a + i.qty, 0)} item(s): {o.items.map((i) => i.model).join(', ')} · {o.branch}
                    </small>
                  </span>
                  <span className="r">
                    <OrderPill status={o.status} />
                    <small>{ago(o.updatedAt)}</small>
                  </span>
                </Link>
              </li>
            ))}
            {!toPack.length && <li className="ad-empty">Nothing to pack</li>}
          </ul>
          {expiring.length > 0 && (
            <>
              <h3 className="ad-h3">Stock held for unpaid orders</h3>
              <ul className="ad-rows" data-testid="wh-reservations">
                {expiring.map((o) => (
                  <li key={o.number}>
                    <Link href={`/admin/orders?o=${o.number}`} className="ad-rowlink">
                      <span>
                        <b className="num">{o.number}</b> <BrandChip brand={o.brandKey} />
                        <small>{o.items.reduce((a, i) => a + i.qty, 0)} item(s) reserved</small>
                      </span>
                      <span className="r ad-bad">Releases in {Math.max(0, Math.round((o.reservedUntil!.getTime() - now.getTime()) / 60_000))} min</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Widget>
        <Widget title="Low stock and reorder" sub={`${lowCount} at ${LOW_STOCK} or fewer · reorder at ${REORDER_STOCK}`} link={{ href: '/admin/inventory?show=low', label: 'Inventory' }} testid="dash-warehouse-stock">
          <ul className="ad-rows">
            {low.map((p) => (
              <li key={p.id}>
                <Link href="/admin/inventory?show=low" className="ad-rowlink">
                  <span>
                    <b>{p.model}</b> <BrandChip brand={p.brandKey} />
                    <small>{p.name}</small>
                  </span>
                  <span className="r">
                    <b className={p.stock <= REORDER_STOCK ? 'ad-bad' : ''}>{p.stock} left</b>
                    <Pill cls={p.stock <= REORDER_STOCK ? 'pill-red' : 'pill-amber'}>{p.stock <= REORDER_STOCK ? 'Reorder' : 'Low'}</Pill>
                  </span>
                </Link>
              </li>
            ))}
            {!low.length && <li className="ad-empty">Stock is healthy</li>}
          </ul>
        </Widget>
      </div>
      {branchRows.length > 0 && (
        <Widget title="By branch" sub="Orders still in the warehouse or on the road" testid="dash-warehouse-branches">
          <div className="ad-scroll">
            <table className="ad-table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Branch</th>
                  <th className="r">To pack</th>
                  <th className="r">To dispatch</th>
                  <th className="r">Out for delivery</th>
                </tr>
              </thead>
              <tbody>
                {branchRows.map((r) => (
                  <tr key={r.b}>
                    <td>{r.b}</td>
                    <td className="r">{r.pack}</td>
                    <td className="r">{r.dispatch}</td>
                    <td className="r">{r.out}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Widget>
      )}
    </>
  );
}

// Support ---------------------------------------------------------------------------------------

const TICKET_LABEL: Record<string, string> = { new: 'New', open: 'Open', waiting: 'Waiting on customer', resolved: 'Resolved' };

export async function SupportWidgets({ ctx, f }: { ctx: StaffContext; f: AdminFilters }) {
  const ow = orderWhere(f);
  const now = new Date();
  const today = startOfDayEAT(now);
  const tw = { brandKey: { in: f.brands } };
  const [open, mine, todays, todayCount, problem] = await Promise.all([
    prisma.ticket.findMany({ where: { ...tw, status: { not: 'resolved' } }, orderBy: { createdAt: 'asc' }, take: 200, select: { id: true, number: true, brandKey: true, issue: true, status: true, assignee: true, orderNumber: true, createdAt: true, updatedAt: true } }),
    prisma.ticket.count({ where: { ...tw, status: { not: 'resolved' }, assignee: ctx.name } }),
    prisma.order.findMany({ where: { ...ow, createdAt: { gte: today } }, orderBy: { createdAt: 'desc' }, take: 6, select: { number: true, brandKey: true, status: true, channel: true, createdAt: true } }),
    prisma.order.count({ where: { ...ow, createdAt: { gte: today } } }),
    prisma.order.findMany({ where: { ...ow, status: { in: ['cancelled', 'rejected'] }, updatedAt: { gte: new Date(now.getTime() - 7 * DAY) } }, orderBy: { updatedAt: 'desc' }, take: 5, select: { number: true, brandKey: true, status: true, updatedAt: true } }),
  ]);
  const hours = (t: (typeof open)[number]) => (now.getTime() - (t.status === 'new' ? t.createdAt : t.updatedAt).getTime()) / HOUR;
  const withSla = open.map((t) => ({ ...t, h: hours(t), sla: ticketSla(t.status, hours(t)) })).sort((a, b) => Number(b.sla === 'breach') - Number(a.sla === 'breach') || b.h - a.h);
  const cnt = (s: string) => open.filter((t) => t.status === s).length;
  const breached = withSla.filter((t) => t.sla === 'breach').length;
  // Orders customers are asking about (open tickets with an order number).
  const asked = open.filter((t) => t.orderNumber).slice(0, 5);
  return (
    <>
      <Widget title="Support tickets" sub="Reply to new tickets within 2 hours; chase anything waiting over 24 hours" link={{ href: '/admin/tickets', label: 'Inbox' }} testid="dash-support">
        <div className="ad-stats">
          <Stat label="New" value={cnt('new')} tone={cnt('new') ? 'az' : 'ok'} href="/admin/tickets?status=new" testid="sup-new" />
          <Stat label="Open" value={cnt('open')} href="/admin/tickets?status=open" />
          <Stat label="Waiting on customer" value={cnt('waiting')} href="/admin/tickets?status=waiting" />
          <Stat label="Past SLA" value={breached} tone={breached ? 'bad' : 'ok'} sub={`${mine} assigned to you`} testid="sup-sla" />
        </div>
        <ul className="ad-rows">
          {withSla.slice(0, 8).map((t) => (
            <li key={t.id} className={t.sla === 'breach' ? 'breach' : t.sla === 'warn' ? 'warn' : ''}>
              <Link href={`/admin/tickets?id=${t.id}`} className="ad-rowlink">
                <span>
                  <b className="num">{t.number}</b> <BrandChip brand={t.brandKey} />
                  <small>
                    {t.issue} · {t.assignee ? (t.assignee === ctx.name ? 'You' : t.assignee) : 'Unassigned'}
                  </small>
                </span>
                <span className="r">
                  <Pill cls={TICKET_PILL[t.status] ?? 'pill-grey'}>{TICKET_LABEL[t.status] ?? t.status}</Pill>
                  <small className={t.sla === 'breach' ? 'ad-bad' : t.sla === 'warn' ? 'ad-warn' : ''}>
                    {t.sla === 'breach' ? 'Past SLA · ' : ''}
                    {ago(t.status === 'new' ? t.createdAt : t.updatedAt)}
                  </small>
                </span>
              </Link>
            </li>
          ))}
          {!withSla.length && <li className="ad-empty">No open tickets</li>}
        </ul>
      </Widget>
      <div className="ad-grid2">
        <Widget title="Today's orders" sub={`${todayCount} placed today · look up any order`} link={{ href: '/admin/orders', label: 'All orders' }} testid="dash-support-orders">
          <form action="/admin/orders" className="ad-lookup" role="search">
            <input className="ad-input" name="q" placeholder="Order no., name or phone" aria-label="Look up an order" maxLength={60} />
            <button type="submit" className="ad-btn">
              Find
            </button>
          </form>
          <ul className="ad-rows">
            {todays.map((o) => (
              <li key={o.number}>
                <Link href={`/admin/orders?o=${o.number}`} className="ad-rowlink">
                  <span>
                    <b className="num">{o.number}</b> <BrandChip brand={o.brandKey} />
                    <small>
                      {o.channel === 'azania' ? 'Azania app' : o.channel === 'app' ? 'App' : 'Web'} · {fmtDateTime(o.createdAt)}
                    </small>
                  </span>
                  <OrderPill status={o.status} />
                </Link>
              </li>
            ))}
            {!todays.length && <li className="ad-empty">No orders yet today</li>}
          </ul>
        </Widget>
        <Widget title="Orders with issues" sub="Cancelled or declined in the last 7 days, and orders customers are asking about" testid="dash-support-issues">
          <ul className="ad-rows">
            {problem.map((o) => (
              <li key={o.number}>
                <Link href={`/admin/orders?o=${o.number}`} className="ad-rowlink">
                  <span>
                    <b className="num">{o.number}</b> <BrandChip brand={o.brandKey} />
                    <small>{o.status === 'rejected' ? 'Pay Later declined' : 'Cancelled'} · {ago(o.updatedAt)} ago</small>
                  </span>
                  <OrderPill status={o.status} />
                </Link>
              </li>
            ))}
            {asked.map((t) => (
              <li key={t.id}>
                <Link href={`/admin/tickets?id=${t.id}`} className="ad-rowlink">
                  <span>
                    <b className="num">{t.orderNumber}</b> <BrandChip brand={t.brandKey} />
                    <small>
                      {t.number}: {t.issue}
                    </small>
                  </span>
                  <Pill cls={TICKET_PILL[t.status] ?? 'pill-grey'}>{TICKET_LABEL[t.status] ?? t.status}</Pill>
                </Link>
              </li>
            ))}
            {!problem.length && !asked.length && <li className="ad-empty">No problem orders</li>}
          </ul>
        </Widget>
      </div>
    </>
  );
}

// Catalogue -------------------------------------------------------------------------------------

export async function CatalogueWidgets({ f }: { f: AdminFilters }) {
  const pw = { brandKey: { in: f.brands } };
  const soon = new Date(Date.now() + 14 * DAY);
  const [total, hidden, out, low, noPhoto, recent, cms, flash, codes] = await Promise.all([
    prisma.product.count({ where: pw }),
    prisma.product.count({ where: { ...pw, hidden: true } }),
    prisma.product.count({ where: { ...pw, stock: 0 } }),
    prisma.product.count({ where: { ...pw, stock: { gt: 0, lte: LOW_STOCK } } }),
    prisma.product.count({ where: { ...pw, images: { isEmpty: true } } }),
    prisma.product.findMany({ where: pw, orderBy: { updatedAt: 'desc' }, take: 6, select: { id: true, brandKey: true, model: true, name: true, updatedAt: true, hidden: true } }),
    prisma.cmsBlock.findMany({ where: pw, orderBy: { updatedAt: 'desc' }, select: { brandKey: true, key: true, updatedAt: true, updatedBy: true } }),
    prisma.promotion.groupBy({ by: ['brandKey'], where: { ...pw, active: true }, _count: { _all: true } }),
    prisma.discountCode.findMany({ where: { active: true, OR: [{ brandKey: null }, { brandKey: { in: f.brands } }] }, orderBy: [{ expiresAt: 'asc' }], take: 8 }),
  ]);
  const cmsBy = f.brands.map((b) => cms.find((c) => c.brandKey === b)).filter((c): c is NonNullable<typeof c> => !!c);
  return (
    <>
      <Widget title="Catalogue health" sub="Both stores update the moment you save" link={{ href: '/admin/products', label: 'Products' }} testid="dash-catalogue">
        <div className="ad-stats s5">
          <Stat label="Products" value={total} href="/admin/products" testid="cat-total" />
          <Stat label="Hidden" value={hidden} href="/admin/products" />
          <Stat label="Out of stock" value={out} tone={out ? 'bad' : 'ok'} href="/admin/inventory?show=low" />
          <Stat label="Low stock" value={low} tone={low ? 'warn' : 'ok'} href="/admin/inventory?show=low" />
          <Stat label="Without photo" value={noPhoto} tone={noPhoto ? 'warn' : 'ok'} href="/admin/products" testid="cat-nophoto" />
        </div>
      </Widget>
      <div className="ad-grid2">
        <Widget title="Recently edited" sub="Products" testid="dash-catalogue-recent">
          <ul className="ad-rows">
            {recent.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/products?b=${p.brandKey}&q=${encodeURIComponent(p.model)}`} className="ad-rowlink">
                  <span>
                    <b>{p.model}</b> <BrandChip brand={p.brandKey} />
                    <small>{p.name}</small>
                  </span>
                  <span className="r">
                    {p.hidden && <Pill cls="pill-grey">Hidden</Pill>}
                    <small>{ago(p.updatedAt)} ago</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Widget>
        <div className="ad-stack">
          <Widget title="Website CMS" sub="Last change per store" link={{ href: '/admin/cms', label: 'Edit' }} testid="dash-catalogue-cms">
            <ul className="ad-rows">
              {cmsBy.map((c) => (
                <li key={c.brandKey}>
                  <Link href={`/admin/cms?b=${c.brandKey}`} className="ad-rowlink">
                    <span>
                      <BrandChip brand={c.brandKey} />
                      <small>
                        {c.key} · by {c.updatedBy}
                      </small>
                    </span>
                    <small className="r">{fmtDateTime(c.updatedAt)}</small>
                  </Link>
                </li>
              ))}
            </ul>
          </Widget>
          <Widget title="Promotions and codes" sub={`${flash.reduce((a, x) => a + x._count._all, 0)} flash deals live · codes expiring within 14 days in red`} link={{ href: '/admin/promos', label: 'Promotions' }} testid="dash-catalogue-promos">
            <ul className="ad-rows">
              {codes.map((c) => (
                <li key={c.id} className={c.expiresAt && c.expiresAt < soon ? 'warn' : ''}>
                  <Link href="/admin/promos" className="ad-rowlink">
                    <span>
                      <b className="num">{c.code}</b> <BrandChip brand={c.brandKey} />
                      <small>
                        {c.percent ? `${c.percent}% off` : 'Offer code'} · used {n(c.uses)}
                        {c.maxUses ? ` of ${n(c.maxUses)}` : ''}
                      </small>
                    </span>
                    <small className={`r ${c.expiresAt && c.expiresAt < soon ? 'ad-bad' : ''}`}>{c.expiresAt ? `Ends ${fmtDateTime(c.expiresAt).split(',')[0]}` : 'No end date'}</small>
                  </Link>
                </li>
              ))}
              {!codes.length && <li className="ad-empty">No active codes</li>}
            </ul>
          </Widget>
        </div>
      </div>
    </>
  );
}

// Marketing -------------------------------------------------------------------------------------

export async function MarketingWidgets({ f }: { f: AdminFilters }) {
  const now = new Date();
  const month = startOfMonthEAT(now);
  const lastMonth = startOfMonthEAT(now, -1);
  const d30 = new Date(now.getTime() - 30 * DAY);
  const bw = { brandKey: { in: f.brands } };
  const [active, newMonth, newLast, byStatus, next, sends, redeemed, points] = await Promise.all([
    prisma.subscriber.groupBy({ by: ['brandKey'], where: { ...bw, consentAt: { not: null }, unsubscribedAt: null }, _count: { _all: true } }),
    prisma.subscriber.groupBy({ by: ['brandKey'], where: { ...bw, consentAt: { gte: month }, unsubscribedAt: null }, _count: { _all: true } }),
    prisma.subscriber.groupBy({ by: ['brandKey'], where: { ...bw, consentAt: { gte: lastMonth, lt: month } }, _count: { _all: true } }),
    prisma.campaign.groupBy({ by: ['status'], where: bw, _count: { _all: true } }),
    prisma.campaign.findFirst({ where: { ...bw, status: 'scheduled' }, orderBy: { scheduledAt: 'asc' }, select: { id: true, name: true, scheduledAt: true } }),
    prisma.campaignSend.groupBy({ by: ['status'], where: { at: { gte: d30 }, campaign: bw }, _count: { _all: true } }),
    prisma.order.count({ where: { ...orderWhere(f), discountCode: { not: null }, createdAt: { gte: d30 } } }),
    prisma.loyaltyLedger.aggregate({ where: { ...bw, points: { gt: 0 }, at: { gte: d30 } }, _sum: { points: true } }),
  ]);
  const st = (s: string) => byStatus.find((x) => x.status === s)?._count._all ?? 0;
  const sent = sends.find((s) => s.status === 'sent')?._count._all ?? 0;
  const failed = sends.find((s) => s.status === 'failed')?._count._all ?? 0;
  const rate = sent + failed ? Math.round((sent / (sent + failed)) * 100) : null;
  return (
    <>
      <section className="ad-card" data-testid="subscribers-tile">
        <div className="ad-between">
          <div>
            <h2 className="ad-h">New subscribers, {monthName(now)}</h2>
            <p className="ad-sub">Sign-ups from each store (consent recorded)</p>
          </div>
          <Link href="/admin/marketing/subscribers" className="ad-wlink">
            Subscribers
          </Link>
        </div>
        <div className="ad-stats">
          {f.brands.map((b) => {
            const nNow = newMonth.find((r) => r.brandKey === b)?._count._all ?? 0;
            const before = newLast.find((r) => r.brandKey === b)?._count._all ?? 0;
            const total = active.find((r) => r.brandKey === b)?._count._all ?? 0;
            return (
              <div key={b} className="ad-stat" data-testid={`subs-${b}`}>
                <span className="l">
                  <BrandChip brand={b} />
                </span>
                <span className="v">{n(nNow)}</span>
                <span className="s">
                  {before} in {monthName(lastMonth)} · {n(total)} active
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <Widget title="Campaigns and loyalty" sub="Last 30 days" link={{ href: '/admin/marketing', label: 'Campaigns' }} testid="dash-marketing">
        <div className="ad-stats s5">
          <Stat label="Scheduled" value={st('scheduled')} sub={next?.scheduledAt ? `Next ${fmtDateTime(next.scheduledAt)}` : 'None scheduled'} href="/admin/marketing?status=scheduled" />
          <Stat label="Sent" value={st('sent')} sub={`${st('draft')} drafts`} href="/admin/marketing?status=sent" />
          <Stat label="Delivered" value={rate === null ? '—' : `${rate}%`} sub={`${n(sent)} sent · ${n(failed)} failed`} tone={failed ? 'warn' : 'ok'} />
          <Stat label="Codes redeemed" value={redeemed} sub="Orders with a promo code" href="/admin/promos" />
          <Stat label="Points issued" value={n(points._sum.points ?? 0)} sub="Loyalty, all customers" href="/admin/marketing/loyalty" />
        </div>
      </Widget>
    </>
  );
}

// Teams (owner / manager) -----------------------------------------------------------------------

export async function TeamsWidget({ f }: { f: AdminFilters }) {
  const by = await openTasksByRole(f.brands);
  const roles: TaskRole[] = ['warehouse', 'finance', 'support', 'catalogue', 'manager'];
  return (
    <Widget title="Work by team" sub="Open tasks routed to each team · overdue in red" link={{ href: '/admin/tasks?view=all', label: 'All tasks' }} testid="dash-teams">
      <div className="ad-stats s5">
        {roles.map((r) => {
          const v = by.get(r) ?? { open: 0, overdue: 0, urgent: 0 };
          return <Stat key={r} label={ROLE_LABEL[r]} value={v.open} sub={v.overdue ? `${v.overdue} overdue` : v.urgent ? `${v.urgent} urgent` : 'On track'} tone={v.overdue ? 'bad' : v.urgent ? 'warn' : undefined} href={`/admin/tasks?view=all&role=${r}`} testid={`team-${r}`} />;
        })}
      </div>
    </Widget>
  );
}
