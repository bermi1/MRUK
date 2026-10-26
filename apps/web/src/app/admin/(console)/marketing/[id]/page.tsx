import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@bt/db';
import { composeMessage, describeAudience, fmtDateTime, renderMessage, type Audience, type CampaignChannel } from '@bt/core';
import { cancelCampaignAction, sendCampaignAction } from '@/app/actions/marketing-admin';
import { ActBtn } from '@/components/admin/ActBtn';
import { CAMPAIGN_PILL, CHANNEL_LABEL, MarketingTabs } from '@/components/admin/MarketingTabs';
import { BrandChip, Forbidden, Kpi, Meter, Pill } from '@/components/admin/ui';
import { requireStaff } from '@/server/auth';
import { BRAND_NAMES, campaignStats, type Brand, type CampaignStats } from '@/server/marketing';

export const metadata = { title: 'Campaign' };

const SEND_PILL: Record<string, string> = { sent: 'pill-green', failed: 'pill-red', pending: 'pill-amber' };

export default async function CampaignPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  const ctx = await requireStaff();
  if (!ctx.can('marketing')) return <Forbidden what="marketing" />;
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) notFound();
  const c = await prisma.campaign.findUnique({ where: { id } });
  if (!c || !ctx.canBrand(c.brandKey)) notFound();
  const done = ((await searchParams).done ?? '').slice(0, 160);
  const saved = (c.stats ?? {}) as Partial<CampaignStats>;
  const [live, sends] = await Promise.all([campaignStats(c.id, saved.targeted ?? 0, saved.optedOut ?? 0), prisma.campaignSend.findMany({ where: { campaignId: c.id }, orderBy: { at: 'desc' }, take: 100 })]);
  const write = ctx.can('marketing.write');
  const brand = c.brandKey as Brand;
  const sample = composeMessage(c.channel as CampaignChannel, BRAND_NAMES[brand], renderMessage(c.message, { name: 'Neema', code: c.promoCode }), '<personal unsubscribe link>');
  const pct = live.targeted ? Math.round((live.sent / live.targeted) * 100) : 0;
  return (
    <div className="ad-stack">
      <MarketingTabs current="campaigns" canWrite={write} />
      {done && (
        <div role="status" style={{ borderRadius: 12, padding: '10px 12px', background: '#E7F5EE', color: '#0F5E42', fontSize: 13.5 }}>
          {done}
        </div>
      )}
      <section className="ad-card">
        <div className="ad-between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 className="ad-h" data-testid="campaign-name">
              {c.name} <BrandChip brand={c.brandKey} />
            </h2>
            <p className="ad-sub">
              {CHANNEL_LABEL[c.channel]} · {describeAudience(c.audience as unknown as Audience)} · created by {c.createdBy} · {fmtDateTime(c.createdAt)}
            </p>
          </div>
          <span className="ad-row">
            <span data-testid="campaign-status">
              <Pill cls={CAMPAIGN_PILL[c.status] ?? 'pill-grey'}>{c.status}</Pill>
            </span>
            {write && ['draft', 'scheduled', 'sending'].includes(c.status) && (
              <ActBtn action={sendCampaignAction.bind(null, c.id)} confirm={`Send "${c.name}" now to everyone in its audience?`} showOk>
                {c.status === 'sending' ? 'Resume sending' : 'Send now'}
              </ActBtn>
            )}
            {write && ['draft', 'scheduled'].includes(c.status) && (
              <ActBtn action={cancelCampaignAction.bind(null, c.id)} className="ad-btn line" confirm="Cancel this campaign?">
                Cancel campaign
              </ActBtn>
            )}
          </span>
        </div>
      </section>
      <div className="ad-grid4" data-testid="campaign-stats">
        <Kpi label="Targeted" value={live.targeted} delta={c.scheduledAt && c.status === 'scheduled' ? `Scheduled ${fmtDateTime(c.scheduledAt)}` : c.sentAt ? `Sent ${fmtDateTime(c.sentAt)}` : 'Counted when sent'} color="#5E6378" />
        <Kpi label="Delivered to gateway" value={live.sent} delta={live.targeted ? `${pct}% of targeted` : '—'} />
        <Kpi label="Failed" value={live.failed} color={live.failed ? '#B4462E' : '#16825D'} delta={live.failed ? 'See the log below' : 'None'} />
        <Kpi label="Opted out (excluded)" value={live.optedOut} color="#5E6378" delta="Not messaged" />
      </div>
      <div className="ad-grid2 wide-left">
        <section className="ad-card">
          <h2 className="ad-h">Delivery log</h2>
          <Meter pct={pct} />
          <div className="ad-scroll">
            <table className="ad-table" style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {sends.map((s) => (
                  <tr key={s.id}>
                    <td className="mono">{s.to}</td>
                    <td>
                      <Pill cls={SEND_PILL[s.status] ?? 'pill-grey'}>{s.status}</Pill>
                      {s.error && (
                        <div className="ad-err" style={{ fontSize: 11.5 }}>
                          {s.error}
                        </div>
                      )}
                    </td>
                    <td className="ad-muted2">{fmtDateTime(s.at)}</td>
                  </tr>
                ))}
                {!sends.length && (
                  <tr>
                    <td colSpan={3} className="ad-empty">
                      Nothing sent yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {sends.length === 100 && <p className="ad-muted2" style={{ fontSize: 12 }}>Latest 100 messages shown. Numbers are masked.</p>}
        </section>
        <section className="ad-card">
          <h2 className="ad-h">Message</h2>
          {c.promoCode && (
            <p style={{ fontSize: 13 }}>
              Promo code <b className="mono">{c.promoCode}</b>{' '}
              {ctx.can('promos') && (
                <Link href="/admin/promos" style={{ fontSize: 12.5 }}>
                  Usage in Promotions
                </Link>
              )}
            </p>
          )}
          {c.subject && <p style={{ fontSize: 13 }}>Subject: {c.subject}</p>}
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#F4F5F9', borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}>{sample}</pre>
          <p className="ad-muted2" style={{ fontSize: 12 }}>Example for a customer called Neema. Each person gets their own unsubscribe link from {BRAND_NAMES[brand]}.</p>
        </section>
      </div>
    </div>
  );
}
