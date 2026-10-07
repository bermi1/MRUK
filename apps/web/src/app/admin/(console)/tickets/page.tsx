import Link from 'next/link';
import { prisma } from '@bt/db';
import { fmtDateTime, formatTzPhone } from '@bt/core';
import { assignTicketAction, replyTicketAction, ticketStatusAction } from '@/app/actions/admin';
import { ActBtn } from '@/components/admin/ActBtn';
import { AForm } from '@/components/admin/AForm';
import { Forbidden, Pill, TICKET_PILL } from '@/components/admin/ui';
import { waLink } from '@/lib/format';
import { adminFilters, BRAND_NAME } from '@/server/admin/context';
import { requireStaff } from '@/server/auth';

export const metadata = { title: 'Support tickets' };

const STATUSES = ['new', 'open', 'waiting', 'resolved'] as const;
const LABEL: Record<string, string> = { new: 'New', open: 'Open', waiting: 'Waiting on customer', resolved: 'Resolved' };

export default async function TicketsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff();
  if (!ctx.can('tickets')) return <Forbidden what="support tickets" />;
  const sp = await searchParams;
  const f = await adminFilters(ctx);
  const st = (STATUSES as readonly string[]).includes(sp.status ?? '') ? sp.status! : 'all';
  const [list, counts] = await Promise.all([
    prisma.ticket.findMany({ where: { brandKey: { in: f.brands }, ...(st !== 'all' ? { status: st } : {}) }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.ticket.groupBy({ by: ['status'], where: { brandKey: { in: f.brands } }, _count: { _all: true } }),
  ]);
  const selId = sp.id && /^[a-z0-9]{10,40}$/.test(sp.id) ? sp.id : list[0]?.id;
  const t = selId ? await prisma.ticket.findFirst({ where: { id: selId, brandKey: { in: f.allowed } }, include: { messages: { orderBy: { at: 'asc' } }, brand: { select: { name: true } } } }) : null;
  const product = t?.productId ? await prisma.product.findUnique({ where: { id: t.productId }, select: { name: true, model: true } }) : null;
  const productNames = new Map((await prisma.product.findMany({ where: { id: { in: list.map((x) => x.productId).filter(Boolean) } }, select: { id: true, name: true } })).map((p) => [p.id, p.name]));
  const write = ctx.can('tickets.write');
  const count = (s: string) => (s === 'all' ? counts.reduce((a, c) => a + c._count._all, 0) : (counts.find((c) => c.status === s)?._count._all ?? 0));
  const href = (extra: Record<string, string>) => `/admin/tickets?${new URLSearchParams({ ...(st !== 'all' ? { status: st } : {}), ...extra })}`;

  return (
    <div className="ad-detail" style={{ gridTemplateColumns: 'minmax(0,1fr) 440px' }}>
      <section className="ad-card">
        <h2 className="ad-h">Support tickets</h2>
        <p className="ad-sub">Requests sent from the Mr UK and Skywood support pages</p>
        <nav className="ad-tabs" aria-label="Ticket status" style={{ marginTop: 12 }}>
          {['all', ...STATUSES].map((s) => (
            <Link key={s} className="ad-tab" href={s === 'all' ? '/admin/tickets' : `/admin/tickets?status=${s}`} aria-current={s === st ? 'true' : undefined}>
              {s === 'all' ? 'All' : LABEL[s]} <span>{count(s)}</span>
            </Link>
          ))}
        </nav>
        <div className="ad-stack s8" style={{ marginTop: 12 }}>
          {list.map((x) => (
            <Link key={x.id} href={href({ id: x.id })} className={`ad-listcard ${x.id === t?.id ? 'sel' : ''}`} style={{ gridTemplateColumns: '110px minmax(0,1fr) auto', alignItems: 'center', gap: 12, padding: '12px 14px', marginTop: 0 }}>
              <span>
                <span className="mono" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#12164A' }}>
                  {x.number}
                </span>
                <span className="ad-muted" style={{ fontSize: 11.5 }}>
                  {fmtDateTime(x.createdAt)}
                </span>
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>
                  {x.name} · {x.issue}
                </span>
                <span className="ad-muted2" style={{ display: 'block', fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {BRAND_NAME[x.brandKey]} · {productNames.get(x.productId) ?? 'No product'} · {x.description}
                </span>
              </span>
              <Pill cls={TICKET_PILL[x.status] ?? 'pill-grey'}>{LABEL[x.status] ?? x.status}</Pill>
            </Link>
          ))}
          {!list.length && <div className="ad-empty">No tickets here</div>}
        </div>
      </section>
      {t ? (
        <aside className="ad-card ad-stack s12" aria-label={`Ticket ${t.number}`}>
          <div className="ad-between">
            <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: '#12164A' }}>
              {t.number}
            </span>
            <span className="ad-row">
              <span className="ad-muted" style={{ fontSize: 12.5 }}>
                {t.brand.name} · via {t.channel}
              </span>
              <Pill cls={TICKET_PILL[t.status] ?? 'pill-grey'}>{LABEL[t.status]}</Pill>
            </span>
          </div>
          <div className="ad-box">
            <div style={{ fontSize: 15, fontWeight: 600 }}>{t.name}</div>
            <div className="ad-muted2" style={{ fontSize: 12.5 }}>
              {formatTzPhone(t.phone)} · Order {t.orderNumber ? ctx.can('orders') ? <Link href={`/admin/orders?o=${t.orderNumber}`}>{t.orderNumber}</Link> : t.orderNumber : '—'}
            </div>
            <div className="ad-muted2" style={{ fontSize: 12.5 }}>
              Assigned: {t.assignee || 'Nobody yet'}
            </div>
          </div>
          <div style={{ fontSize: 13 }}>
            <span className="ad-muted">Issue</span> · <b>{t.issue}</b>
            {product ? ` · ${product.name} (${product.model})` : ''}
          </div>
          {t.photoKey && (
            <a href={`/api/files/${t.photoKey}`} target="_blank" rel="noopener">
              <img src={`/api/files/${t.photoKey}`} alt="Photo sent by the customer" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 14 }} />
            </a>
          )}
          <div className="ad-msgs" aria-label="Conversation">
            {t.messages.map((m) => {
              const staff = m.author !== t.name;
              return (
                <div key={m.id} className={`ad-bubble ${m.internal ? 'note' : staff ? 'staff' : ''}`}>
                  <small>
                    {m.internal ? 'Internal note · ' : ''}
                    {m.author} · {fmtDateTime(m.at)}
                  </small>
                  {m.body}
                </div>
              );
            })}
          </div>
          {write && (
            <>
              <AForm action={replyTicketAction.bind(null, t.id)} submit="Send" resetOnOk className="ad-stack s8" label="Reply to customer">
                <label className="ad-field">
                  Reply (sent to the customer by SMS) or internal note
                  <textarea name="body" rows={3} required minLength={2} maxLength={1000} placeholder={`Hello ${t.name.split(' ')[0]}, …`} />
                </label>
                <label className="ad-check">
                  <input type="checkbox" name="internal" /> Internal note (not sent to the customer)
                </label>
              </AForm>
              <div className="ad-btns">
                {t.assignee !== ctx.name && (
                  <ActBtn action={assignTicketAction.bind(null, t.id)} className="ad-btn line">
                    Assign to me
                  </ActBtn>
                )}
                {STATUSES.filter((s) => s !== t.status).map((s) => (
                  <ActBtn key={s} action={ticketStatusAction.bind(null, t.id, s)} className={s === 'resolved' ? 'ad-btn ok' : 'ad-btn line'}>
                    {s === 'resolved' ? 'Mark resolved' : `Set ${LABEL[s]!.toLowerCase()}`}
                  </ActBtn>
                ))}
              </div>
            </>
          )}
          <a className="ad-btn wa block" href={waLink(t.phone, `Hello ${t.name}, this is ${t.brand.name} support about ticket ${t.number}.`)} target="_blank" rel="noopener">
            Reply on WhatsApp
          </a>
        </aside>
      ) : (
        <aside className="ad-card ad-empty">Select a ticket</aside>
      )}
    </div>
  );
}
