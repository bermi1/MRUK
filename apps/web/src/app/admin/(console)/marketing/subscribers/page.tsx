import { prisma } from '@bt/db';
import { fmtDate, formatTzPhone } from '@bt/core';
import { unsubscribeSubscriberAction } from '@/app/actions/marketing-admin';
import { ActBtn } from '@/components/admin/ActBtn';
import { MarketingTabs } from '@/components/admin/MarketingTabs';
import { BrandChip, Forbidden, Pager, pageParam, Pill } from '@/components/admin/ui';
import { adminFilters } from '@/server/admin/context';
import { subscriberWhere } from '@/server/admin/marketing';
import { requireStaff } from '@/server/auth';

export const metadata = { title: 'Subscribers' };

const PER = 50;
const SOURCE: Record<string, string> = { footer: 'Footer', home: 'Home page', signup: 'Sign-up', checkout: 'Checkout', admin: 'Staff', unsubscribe: 'Opt-out only' };

export default async function SubscribersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff();
  if (!ctx.can('marketing')) return <Forbidden what="marketing" />;
  const sp = await searchParams;
  const f = await adminFilters(ctx);
  const where = subscriberWhere(f.brands, sp);
  const page = pageParam(sp.page);
  const [total, rows] = await Promise.all([prisma.subscriber.count({ where }), prisma.subscriber.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PER, take: PER })]);
  const write = ctx.can('marketing.write');
  const canExport = ['owner', 'manager'].includes(ctx.role) && ctx.can('marketing');
  const keep = Object.fromEntries(Object.entries({ q: sp.q, channel: sp.channel, status: sp.status }).filter(([, v]) => !!v)) as Record<string, string>;
  return (
    <div className="ad-stack">
      <MarketingTabs current="subscribers" canWrite={write} />
      <section className="ad-card">
        <div className="ad-between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 className="ad-h">Subscribers</h2>
            <p className="ad-sub">
              {total} {sp.status === 'unsubscribed' ? 'unsubscribed' : sp.status === 'all' ? 'in total' : 'active'} · sign-ups from each store, with consent date
            </p>
          </div>
          {canExport && (
            <a className="ad-btn line" href={`/api/admin/marketing/subscribers?${new URLSearchParams(keep)}`} download>
              Export CSV
            </a>
          )}
        </div>
        <form action="/admin/marketing/subscribers" role="search" className="ad-row" style={{ flexWrap: 'wrap', marginTop: 12 }}>
          <input className="ad-input" name="q" defaultValue={sp.q ?? ''} placeholder="Name, phone or email" aria-label="Search subscribers" style={{ width: 220 }} maxLength={60} />
          <select className="ad-input" name="channel" defaultValue={sp.channel ?? ''} aria-label="Channel">
            <option value="">Any channel</option>
            <option value="sms">SMS opt-in</option>
            <option value="whatsapp">WhatsApp opt-in</option>
            <option value="email">Email opt-in</option>
          </select>
          <select className="ad-input" name="status" defaultValue={sp.status ?? 'active'} aria-label="Status">
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="all">All</option>
          </select>
          <button className="ad-btn line" type="submit">
            Filter
          </button>
        </form>
        <div className="ad-scroll">
          <table className="ad-table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Subscriber</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Opted in to</th>
                <th>Source</th>
                <th>Consent</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} data-subscriber={s.id}>
                  <td>
                    <span style={{ fontWeight: 500 }}>{s.name || '—'}</span> <BrandChip brand={s.brandKey} />
                    {s.customerId && (
                      <div className="ad-muted" style={{ fontSize: 11.5 }}>
                        Customer account
                      </div>
                    )}
                  </td>
                  <td className="ad-muted2">{s.phone ? formatTzPhone(s.phone) : '—'}</td>
                  <td className="ad-muted2">{s.email ?? '—'}</td>
                  <td>
                    {s.unsubscribedAt ? (
                      <Pill cls="pill-grey">Unsubscribed {fmtDate(s.unsubscribedAt)}</Pill>
                    ) : (
                      <span className="ad-row" style={{ gap: 4, flexWrap: 'wrap' }}>
                        {s.smsOptIn && <Pill cls="pill-navy">SMS</Pill>}
                        {s.whatsappOptIn && <Pill cls="pill-green">WhatsApp</Pill>}
                        {s.emailOptIn && <Pill cls="pill-blue">Email</Pill>}
                      </span>
                    )}
                  </td>
                  <td className="ad-muted2">{SOURCE[s.source] ?? s.source}</td>
                  <td className="ad-muted2">{s.consentAt ? fmtDate(s.consentAt) : '—'}</td>
                  <td className="r">
                    {write && !s.unsubscribedAt && (
                      <ActBtn action={unsubscribeSubscriberAction.bind(null, s.id)} className="ad-btn line sm" confirm="Unsubscribe this person from all of this brand's campaigns?" label={`Unsubscribe ${s.name || 'subscriber'}`}>
                        Unsubscribe
                      </ActBtn>
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="ad-empty">
                    No subscribers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager page={page} per={PER} total={total} href={(n) => `/admin/marketing/subscribers?${new URLSearchParams({ ...keep, page: String(n) })}`} />
      </section>
    </div>
  );
}
