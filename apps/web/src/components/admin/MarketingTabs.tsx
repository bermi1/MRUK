import Link from 'next/link';

const TABS = [
  { key: 'campaigns', href: '/admin/marketing', label: 'Campaigns' },
  { key: 'subscribers', href: '/admin/marketing/subscribers', label: 'Subscribers' },
  { key: 'loyalty', href: '/admin/marketing/loyalty', label: 'Loyalty' },
] as const;

/** Section tabs for Marketing (campaigns, subscribers, loyalty) plus the "New campaign" button. */
export function MarketingTabs({ current, canWrite }: { current: 'campaigns' | 'subscribers' | 'loyalty' | 'new'; canWrite: boolean }) {
  return (
    <div className="ad-between" style={{ flexWrap: 'wrap', gap: 10 }}>
      <nav className="ad-tabs" aria-label="Marketing sections">
        {TABS.map((t) => (
          <Link key={t.key} href={t.href} className="ad-tab" aria-current={t.key === current ? 'true' : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
      {canWrite && current !== 'new' && (
        <Link href="/admin/marketing/new" className="ad-btn">
          + New campaign
        </Link>
      )}
    </div>
  );
}

export const CAMPAIGN_PILL: Record<string, string> = { draft: 'pill-grey', scheduled: 'pill-blue', sending: 'pill-amber', sent: 'pill-green', cancelled: 'pill-grey' };
export const CHANNEL_LABEL: Record<string, string> = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'Email' };
