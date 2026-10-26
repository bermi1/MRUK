import Link from 'next/link';
import { prisma } from '@bt/db';
import { describeAudience, fmtDateTime, type Audience } from '@bt/core';
import { BrandChip, Forbidden, Kpi, Pager, pageParam, Pill } from '@/components/admin/ui';
import { CAMPAIGN_PILL, CHANNEL_LABEL, MarketingTabs } from '@/components/admin/MarketingTabs';
import { adminFilters, monthName, startOfMonthEAT } from '@/server/admin/context';
import { requireStaff } from '@/server/auth';
import type { CampaignStats } from '@/server/marketing';

export const metadata = { title: 'Campaigns' };

const PER = 30;
const STATUSES = ['all', 'draft', 'scheduled', 'sending', 'sent', 'cancelled'] as const;

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireStaff();
  if (!ctx.can('marketing')) return <Forbidden what="marketing" />;
  const sp = await searchParams;
  const f = await adminFilters(ctx);
  const month = startOfMonthEAT();
  const tab = STATUSES.find((s) => s === sp.status) ?? 'all';
  const where = { brandKey: { in: f.brands }, ...(tab !== 'all' ? { status: tab } : {}) };
  const page = pageParam(sp.page);
  const [total, campaigns, subsActive, subsNew, sentMonth, optOuts, scheduled] = await Promise.all([
    prisma.campaign.count({ where }),
    prisma.campaign.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PER, take: PER }),
    prisma.subscriber.count({ where: { brandKey: { in: f.brands }, unsubscribedAt: null, consentAt: { not: null } } }),
    prisma.subscriber.count({ where: { brandKey: { in: f.brands }, consentAt: { gte: month }, unsubscribedAt: null } }),
    prisma.campaignSend.count({ where: { status: 'sent', at: { gte: month }, campaign: { brandKey: { in: f.brands } } } }),
    prisma.subscriber.count({ where: { brandKey: { in: f.brands }, unsubscribedAt: { gte: month } } }),
    prisma.campaign.count({ where: { brandKey: { in: f.brands }, status: 'scheduled' } }),
  ]);
  const now = new Date();
  return (
    <div className="ad-stack">
      <MarketingTabs current="campaigns" canWrite={ctx.can('marketing.write')} />
      <div className="ad-grid4">
        <Kpi label="Active subscribers" value={subsActive.toLocaleString('en-US')} delta={`+${subsNew} in ${monthName(now)}`} />
        <Kpi label={`Messages sent, ${monthName(now)}`} value={sentMonth.toLocaleString('en-US')} color="#5E6378" delta="SMS, WhatsApp and email" />
        <Kpi label={`Opt-outs, ${monthName(now)}`} value={optOuts} color={optOuts ? '#B4462E' : '#16825D'} delta="Unsubscribe link or STOP" />
        <Kpi label="Scheduled" value={scheduled} color="#0070A8" delta="Sent by the daily job" />
      </div>
      <section className="ad-card">
        <div className="ad-between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 className="ad-h">Campaigns</h2>
            <p className="ad-sub">{total} campaign{total === 1 ? '' : 's'} · newest first</p>
          </div>
          <nav className="ad-tabs" aria-label="Campaign status">
            {STATUSES.map((s) => (
              <Link key={s} className="ad-tab" href={`/admin/marketing${s === 'all' ? '' : `?status=${s}`}`} aria-current={s === tab ? 'true' : undefined} style={{ textTransform: 'capitalize' }}>
                {s}
              </Link>
            ))}
          </nav>
        </div>
        <div className="ad-scroll">
          <table className="ad-table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Channel</th>
                <th>Audience</th>
                <th>Status</th>
                <th>When</th>
                <th className="r">Targeted</th>
                <th className="r">Sent</th>
                <th className="r">Failed</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const st = (c.stats ?? {}) as Partial<CampaignStats>;
                const when = c.sentAt ?? c.scheduledAt ?? c.createdAt;
                return (
                  <tr key={c.id} data-campaign={c.id}>
                    <td>
                      <Link href={`/admin/marketing/${c.id}`} style={{ fontWeight: 600, color: '#12152B', textDecoration: 'none' }}>
                        {c.name}
                      </Link>{' '}
                      <BrandChip brand={c.brandKey} />
                      {c.promoCode && (
                        <div className="ad-muted mono" style={{ fontSize: 11.5 }}>
                          Code {c.promoCode}
                        </div>
                      )}
                    </td>
                    <td>{CHANNEL_LABEL[c.channel] ?? c.channel}</td>
                    <td className="ad-muted2" style={{ maxWidth: 260 }}>
                      {describeAudience(c.audience as unknown as Audience)}
                    </td>
                    <td>
                      <Pill cls={CAMPAIGN_PILL[c.status] ?? 'pill-grey'}>{c.status}</Pill>
                    </td>
                    <td className="ad-muted2">{fmtDateTime(when)}</td>
                    <td className="r">{st.targeted ?? '—'}</td>
                    <td className="r" style={{ fontWeight: 600 }}>
                      {st.sent ?? '—'}
                    </td>
                    <td className="r">{st.failed ?? '—'}</td>
                  </tr>
                );
              })}
              {!campaigns.length && (
                <tr>
                  <td colSpan={8} className="ad-empty">
                    No campaigns yet. Create one to message subscribers and customers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager page={page} per={PER} total={total} href={(n) => `/admin/marketing?${new URLSearchParams({ ...(tab !== 'all' ? { status: tab } : {}), page: String(n) })}`} />
      </section>
    </div>
  );
}
