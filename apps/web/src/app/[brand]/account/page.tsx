import type { Metadata } from 'next';
import Link from 'next/link';
import { REGIONS } from '@bt/core';
import { AddressBook, DataPanel, DetailsForm, MarketingPrefs, SignInPrompt } from '@/components/store/AccountPanel';
import { OrdersPanel, OverviewPanel, PayLaterPanel, RewardsPanel, SupportPanel } from '@/components/store/account/Dashboard';
import { fmtDay, makeT, parseTab, type AccountTab } from '@/components/store/account/util';
import { GridIcon, HelpIcon, TruckIcon, UserIcon } from '@/components/icons';
import { formatTzPhone } from '@/lib/format';
import type { MessageKey } from '@/lib/i18n';
import type { BrandKey } from '@/lib/types';
import { accountData } from '@/server/account';
import { getBrand } from '@/server/catalog';
import { getLocale } from '@/server/locale';
import { BRAND_NAMES } from '@/server/marketing';
import { currentCustomer } from '@/server/session';
import '@/styles/account.css';

export const metadata: Metadata = { title: 'Account', robots: { index: false } };
export const dynamic = 'force-dynamic';

const TAB_LABEL: Record<AccountTab, MessageKey> = {
  overview: 'accTabOverview',
  orders: 'accTabOrders',
  paylater: 'accTabPayLater',
  rewards: 'accTabRewards',
  support: 'accTabSupport',
  addresses: 'accTabAddresses',
  settings: 'accTabSettings',
};

type Search = { tab?: string; f?: string; ticket?: string };

export default async function AccountPage({ params, searchParams }: { params: Promise<{ brand: string }>; searchParams: Promise<Search> }) {
  const { brand: key } = (await params) as { brand: BrandKey };
  const sp = await searchParams;
  const [c, locale, brand] = await Promise.all([currentCustomer(), getLocale(), getBrand(key)]);
  const t = makeT(locale);
  if (!c)
    return (
      <div className={`acc acc-${key}`}>
        <div className="wrap-narrow page-top acc-signin">
          <div className="eyebrow">{t('accEyebrow')}</div>
          <h1 className="h1">{t('accSignInTitle')}</h1>
          <p className="acc-lead">{t('accSignInSub')}</p>
          <SignInPrompt label={t('accSignInBtn')} />
        </div>
      </div>
    );

  const tab = parseTab(sp.tab);
  const d = await accountData(c, key);
  const ctx = { brand: key, brandName: brand.name, locale, t };
  const first = c.name.trim().split(/\s+/)[0];
  const activeCount = d.orders.filter((o) => o.active).length;
  const openTickets = d.tickets.filter((x) => x.open).length;
  const counts: Partial<Record<AccountTab, number>> = { orders: activeCount, support: openTickets };
  const filter = sp.f === 'active' || sp.f === 'completed' ? sp.f : 'all';
  const ticket = /^TK-\d{1,8}$/.test(sp.ticket ?? '') ? sp.ticket : undefined;

  return (
    <div className={`acc acc-${key}`}>
      <div className="wrap">
        <header className="acc-hero" data-testid="account-header">
          <div className="acc-hero-main">
            <div className="acc-avatar" aria-hidden="true">
              <UserIcon size={26} />
            </div>
            <div className="acc-hero-txt">
              <p className="acc-eyebrow">{t('accEyebrow')}</p>
              <h1 className="acc-h1">{first ? t('accHello', { name: first }) : t('accHelloAnon')}</h1>
              <p className="acc-hero-sub">
                <span className="mono">{formatTzPhone(c.phone)}</span>
                <span aria-hidden="true"> · </span>
                <span>{t('accSince', { date: fmtDay(locale, c.createdAt) })}</span>
              </p>
            </div>
            <span className={`acc-tier tier-${d.loyalty.tier.toLowerCase()}`} data-testid="tier-badge">
              {t('accTierBadge', { tier: t(`accTier_${d.loyalty.tier}` as MessageKey) })}
            </span>
          </div>
          <nav className="acc-quick" aria-label={t('accEyebrow')}>
            <Link href={`/${key}/track`}>
              <TruckIcon size={20} />
              <span>{t('accQTrack')}</span>
            </Link>
            <Link href={`/${key}/support`}>
              <HelpIcon size={20} />
              <span>{t('accQHelp')}</span>
            </Link>
            <Link href={`/${key}/shop`}>
              <GridIcon size={20} />
              <span>{t('accQShop')}</span>
            </Link>
          </nav>
        </header>

        <nav className="acc-tabs nsb" aria-label={t('accTabsLabel')}>
          {(Object.keys(TAB_LABEL) as AccountTab[]).map((k) => (
            <Link key={k} href={`/${key}/account${k === 'overview' ? '' : `?tab=${k}`}`} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} scroll={false} data-testid={`tab-${k}`}>
              {t(TAB_LABEL[k])}
              {!!counts[k] && <span className="acc-tab-n">{counts[k]}</span>}
            </Link>
          ))}
        </nav>

        {d.sisterOrders > 0 && (tab === 'overview' || tab === 'orders') && (
          <p className="acc-sister" data-testid="sister-note">
            {t('accSisterNote', { n: d.sisterOrders, brand: BRAND_NAMES[d.other] })}{' '}
            <Link href={`/${d.other}/account?tab=orders`} className="link-u">
              {t('accSisterLink', { brand: BRAND_NAMES[d.other] })}
            </Link>
          </p>
        )}

        <div className="acc-body" id="account-panel">
          {tab === 'overview' && <OverviewPanel d={d} ctx={ctx} />}
          {tab === 'orders' && <OrdersPanel d={d} ctx={ctx} filter={filter} />}
          {tab === 'paylater' && <PayLaterPanel d={d} ctx={ctx} />}
          {tab === 'rewards' && <RewardsPanel d={d} ctx={ctx} />}
          {tab === 'support' && <SupportPanel d={d} ctx={ctx} openId={ticket} />}
          {tab === 'addresses' && (
            <section className="acc-card" data-testid="addresses-panel">
              <div className="acc-card-h">
                <h2 className="acc-h2">{t('accAddressesTitle')}</h2>
              </div>
              <AddressBook brand={key} locale={locale} addresses={d.addresses.map((a) => ({ id: a.id, region: a.region, line: a.line, isDefault: a.isDefault }))} regions={REGIONS.map((r) => r.name)} />
            </section>
          )}
          {tab === 'settings' && (
            <div className="acc-two">
              <section className="acc-card" data-testid="settings-details">
                <div className="acc-card-h">
                  <h2 className="acc-h2">{t('accMyDetails')}</h2>
                </div>
                <DetailsForm name={c.name} email={c.email} locale={locale} />
              </section>
              <div className="acc-stack">
                <section className="acc-card" data-testid="settings-offers">
                  <div className="acc-card-h">
                    <h2 className="acc-h2">{t('accOffersTitle', { brand: brand.name })}</h2>
                  </div>
                  <p className="note">{t('accOffersSub', { brand: brand.name })}</p>
                  <MarketingPrefs
                    brand={key}
                    brandName={brand.name}
                    locale={locale}
                    prefs={{ ...d.prefs, consentAt: d.prefs.consentAt ? fmtDay(locale, d.prefs.consentAt) : null, unsubscribedAt: d.prefs.unsubscribedAt ? fmtDay(locale, d.prefs.unsubscribedAt) : null }}
                  />
                </section>
                <section className="acc-card" data-testid="settings-data">
                  <div className="acc-card-h">
                    <h2 className="acc-h2">{t('accYourData')}</h2>
                  </div>
                  <p className="note">{t('accYourDataSub')}</p>
                  <DataPanel locale={locale} />
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
