import Link from 'next/link';
import { LOYALTY_DEFAULTS, type StepperStep } from '@bt/core';
import { ArrowRightIcon, CardIcon, ChatIcon, SparkleIcon, TickIcon, TruckIcon } from '@/components/icons';
import { PImg } from '@/components/store/PImg';
import { ReorderButton } from '@/components/store/AccountPanel';
import type { Locale, MessageKey } from '@/lib/i18n';
import { fmt } from '@/lib/format';
import type { BrandKey } from '@/lib/types';
import type { AccountData, OrderCard } from '@/server/account';
import { fmtDay, type T } from './util';

/** Server-rendered panels of the customer dashboard. Client widgets live in AccountPanel.tsx. */
type Ctx = { brand: BrandKey; brandName: string; locale: Locale; t: T };

const k = (s: string) => s as MessageKey;
const href = (brand: string, tab: string, extra = '') => `/${brand}/account?tab=${tab}${extra}`;

// Building blocks ------------------------------------------------------------------------------

export function Stepper({ steps, salaryAdvance, ctx }: { steps: StepperStep[]; salaryAdvance: boolean; ctx: Ctx }) {
  const { t, locale } = ctx;
  const label = (s: StepperStep) => (s.key === 'confirmed' && salaryAdvance ? t('accStep_confirmedSa') : t(k(`accStep_${s.key}`)));
  return (
    <ol className="acc-steps" data-testid="order-stepper">
      {steps.map((s) => (
        <li key={s.key} className={`acc-step is-${s.state}`} aria-current={s.state === 'current' ? 'step' : undefined}>
          <span className="acc-dot" aria-hidden="true">
            {s.state === 'done' && <TickIcon size={12} strokeWidth={3} />}
          </span>
          <span className="acc-step-t">{label(s)}</span>
          {s.at && <span className="acc-step-d">{fmtDay(locale, s.at, false)}</span>}
        </li>
      ))}
    </ol>
  );
}

function Empty({ icon, text, children }: { icon: React.ReactNode; text: string; children?: React.ReactNode }) {
  return (
    <div className="acc-empty">
      <span className="acc-empty-ico" aria-hidden="true">
        {icon}
      </span>
      <p>{text}</p>
      {children}
    </div>
  );
}

function Card({ title, action, children, className = '', testId }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string; testId?: string }) {
  return (
    <section className={`acc-card ${className}`} data-testid={testId}>
      <div className="acc-card-h">
        <h2 className="acc-h2">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function More({ to, label }: { to: string; label: string }) {
  return (
    <Link href={to} className="acc-more">
      {label}
      <ArrowRightIcon size={14} />
    </Link>
  );
}

function statusBadge(o: OrderCard, t: T) {
  return <span className={`acc-badge st-${o.status}`}>{t(k(`accSt_${o.status}`))}</span>;
}

export function OrderItemCard({ o, ctx, full = false }: { o: OrderCard; ctx: Ctx; full?: boolean }) {
  const { t, brand, locale } = ctx;
  const count = o.items.reduce((a, i) => a + i.qty, 0);
  const sa = o.method === 'salary_advance';
  return (
    <article className="acc-order" data-testid="account-order">
      <header className="acc-order-h">
        <div className="acc-order-id">
          <div className="mono acc-ono">{o.number}</div>
          <div className="acc-meta">
            {t('accOrderedOn', { date: fmtDay(locale, o.createdAt) })} · {count === 1 ? t('accItem1') : t('accItemsN', { n: count })} · {t(k(`accPay_${o.method}`))}
          </div>
        </div>
        <div className="acc-order-r">
          <b>{fmt(o.total)}</b>
          {statusBadge(o, t)}
        </div>
      </header>
      {o.steps ? (o.active || full ? <Stepper steps={o.steps} salaryAdvance={sa} ctx={ctx} /> : null) : <p className="acc-closed">{t('accClosed')}</p>}
      {full ? (
        <ul className="acc-lines">
          {o.items.map((i) => (
            <li key={`${i.productId}-${i.model}`}>
              <PImg src={i.img} alt={i.name} model={i.model} sub={i.sub} size="xs" className="acc-thumb" />
              <div className="acc-line-t">
                <div className="acc-line-n">{i.name}</div>
                <div className="acc-meta">
                  {i.model} · {i.qty} × {fmt(i.price)}
                  {!i.available && <span className="acc-unavail"> · {t('accUnavailable')}</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="acc-thumbs">
          {o.items.slice(0, 3).map((i) => (
            <PImg key={`${i.productId}-${i.model}`} src={i.img} alt={i.name} model={i.model} sub={i.sub} size="xs" className="acc-thumb" />
          ))}
          <span className="acc-thumbs-n">{o.items.map((i) => i.name).join(', ')}</span>
        </div>
      )}
      <div className="acc-order-acts">
        {o.active && (
          <Link href={`/${brand}/track?o=${o.number}`} className="btn btn-primary btn-sm">
            <TruckIcon size={16} />
            {t('trackOrder')}
          </Link>
        )}
        <Link href={`/${brand}/order/${o.number}`} className="btn btn-outline btn-sm">
          {t('accDetails')}
        </Link>
        {full && o.invoice && (
          <a href={`/api/orders/${o.number}/invoice`} className="acc-txtbtn" target="_blank" rel="noopener" data-testid="invoice-link">
            {t('accInvoice')}
          </a>
        )}
        {full && o.advance?.contract && (
          <a href={`/api/orders/${o.number}/contract`} className="acc-txtbtn" target="_blank" rel="noopener">
            {t('accContract')}
          </a>
        )}
        {full && !o.active && o.items.some((i) => i.available) && <ReorderButton brand={brand} number={o.number} locale={locale} />}
      </div>
    </article>
  );
}

function PayLaterSummary({ o, ctx, compact }: { o: OrderCard; ctx: Ctx; compact?: boolean }) {
  const { t, locale } = ctx;
  const a = o.advance!;
  const paidCount = a.schedule.filter((s) => s.paidAt).length;
  const waiting = a.status === 'submitted' || a.status === 'draft';
  return (
    <div className="acc-pl" data-testid="paylater-summary">
      <div className="acc-pl-top">
        <div>
          <div className="acc-meta">{t('accOrderN', { n: o.number })}</div>
          <div className="acc-pl-m">{t('accMonthlyN', { amount: fmt(a.monthly), n: a.months })}</div>
        </div>
        <span className={`acc-badge adv-${a.status}`}>{t(k(`accAdv_${a.status}`))}</span>
      </div>
      {waiting ? (
        <p className="note">{t('accFirstAfterApproval')}</p>
      ) : a.nextDue ? (
        <div className="acc-pl-next">
          <span>{t('accNextInstalment')}</span>
          <b data-testid="next-instalment">{t('accNextOn', { amount: fmt(a.nextDue.amount), date: fmtDay(locale, a.nextDue.dueDate) })}</b>
        </div>
      ) : (
        <p className="note">{t('accAllPaid')}</p>
      )}
      <div className="acc-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={a.percent} aria-label={t('accInstalmentsPaid', { n: paidCount, m: a.schedule.length })}>
        <i style={{ width: `${a.percent}%` }} />
      </div>
      <div className="acc-pl-legend">
        <span>{t('accPaidN', { amount: fmt(a.paid) })}</span>
        <span>{t('accRemainingN', { amount: fmt(a.remaining) })}</span>
      </div>
      {!compact && <p className="note">{t('accInstalmentsPaid', { n: paidCount, m: a.schedule.length })} · {t('accDeductedFrom', { last4: a.accountLast4 })}</p>}
      {a.contract && (
        <a href={`/api/orders/${o.number}/contract`} className="acc-more" target="_blank" rel="noopener" data-testid="contract-link">
          {t('accContractPdf')}
          <ArrowRightIcon size={14} />
        </a>
      )}
    </div>
  );
}

function LoyaltyBand({ d, ctx }: { d: AccountData; ctx: Ctx }) {
  const { t, brand } = ctx;
  const l = d.loyalty;
  return (
    <div className={`loyal loyal-${brand} acc-loyal`}>
      <div>
        <p className="loyal-k">{t('rewards')}</p>
        <p className="loyal-tier">{t(k(`accTier_${l.tier}`))}</p>
      </div>
      <div className="loyal-pts">
        <b data-testid="points">{t('pointsN', { n: l.points.toLocaleString('en-US') })}</b>
        <span>{t('worthN', { amount: fmt(l.valueTzs) })}</span>
        {l.nextTier && <span>{t('toNextTier', { n: l.pointsToNext.toLocaleString('en-US'), tier: t(k(`accTier_${l.nextTier}`)) })}</span>}
      </div>
    </div>
  );
}

function Ledger({ d, ctx, limit }: { d: AccountData; ctx: Ctx; limit?: number }) {
  const { t, locale } = ctx;
  const rows = limit ? d.ledger.slice(0, limit) : d.ledger;
  if (!rows.length) return <Empty icon={<SparkleIcon size={22} />} text={t('accNoPoints')} />;
  return (
    <ul className="acc-ledger">
      {rows.map((r) => (
        <li key={r.id}>
          <div>
            <div className="acc-ledger-n">{t(k(`accReason_${r.reason}`))}</div>
            <div className="acc-meta">
              {fmtDay(locale, r.at)}
              {r.note ? ` · ${r.note}` : ''}
            </div>
          </div>
          <b className={r.points < 0 ? 'neg' : 'pos'}>
            {r.points > 0 ? '+' : ''}
            {r.points.toLocaleString('en-US')}
          </b>
        </li>
      ))}
    </ul>
  );
}

function TicketRow({ tk, ctx, openId }: { tk: AccountData['tickets'][number]; ctx: Ctx; openId?: string }) {
  const { t, brand, locale } = ctx;
  const expanded = openId === tk.number;
  return (
    <li className="acc-ticket" data-testid="account-ticket">
      <div className="acc-ticket-h">
        <div>
          <div className="acc-ticket-t">
            <span className="mono">{tk.number}</span> · {tk.issue}
          </div>
          <div className="acc-meta">
            {fmtDay(locale, tk.createdAt)}
            {tk.orderNumber ? ` · ${t('accTicketFor', { n: tk.orderNumber })}` : ''}
          </div>
        </div>
        <div className="acc-ticket-r">
          <span className={`acc-badge tk-${tk.status}`}>{t(k(`accTk_${tk.status}`))}</span>
          <Link href={expanded ? href(brand, 'support') : href(brand, 'support', `&ticket=${tk.number}#${tk.number}`)} className="acc-txtbtn" aria-expanded={expanded} scroll={false}>
            {expanded ? t('accHide') : t('accView')}
          </Link>
        </div>
      </div>
      {expanded && (
        <div className="acc-thread" id={tk.number}>
          <div className="acc-h3">{t('accConversation')}</div>
          {tk.messages.map((m, i) => (
            <div key={i} className="acc-msg">
              <div className="acc-meta">
                {m.author} · {fmtDay(locale, m.at)}
              </div>
              <p>{m.body}</p>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

// Panels ---------------------------------------------------------------------------------------

function currentAdvance(d: AccountData) {
  const withAdv = d.orders.filter((o) => o.advance);
  return withAdv.find((o) => !['rejected', 'closed', 'draft'].includes(o.advance!.status)) ?? null;
}

export function OverviewPanel({ d, ctx }: { d: AccountData; ctx: Ctx }) {
  const { t, brand } = ctx;
  const active = d.orders.filter((o) => o.active);
  const recent = d.orders.filter((o) => !o.active).slice(0, active.length > 1 ? 2 : 4);
  const adv = currentAdvance(d);
  const open = d.tickets.filter((x) => x.open);
  return (
    <div className="acc-ov">
      <Card title={t('accActiveOrders')} className="acc-ov-orders" testId="overview-orders" action={d.orders.length ? <More to={href(brand, 'orders')} label={t('accViewAllOrders')} /> : undefined}>
        {active.length ? (
          <div className="acc-list">
            {active.slice(0, 3).map((o) => (
              <OrderItemCard key={o.number} o={o} ctx={ctx} />
            ))}
          </div>
        ) : (
          <Empty icon={<TruckIcon size={22} />} text={d.orders.length ? t('accNoActive') : t('accNoOrders')}>
            <Link href={`/${brand}/shop`} className="btn btn-primary btn-sm">
              {t('accStartShopping')}
            </Link>
          </Empty>
        )}
        {recent.length > 0 && (
          <>
            <div className="acc-h3">{t('accRecentOrders')}</div>
            <ul className="acc-recent" data-testid="recent-orders">
              {recent.map((o) => (
                <li key={o.number}>
                  <div className="acc-recent-l">
                    <PImg src={o.items[0]?.img ?? ''} alt={o.items[0]?.name ?? o.number} model={o.items[0]?.model ?? ''} sub={o.items[0]?.sub} size="xs" className="acc-thumb" />
                    <div style={{ minWidth: 0 }}>
                      <Link href={`/${brand}/order/${o.number}`} className="mono acc-ono">
                        {o.number}
                      </Link>
                      <span className="acc-meta acc-thumbs-n">
                        {fmtDay(ctx.locale, o.createdAt)} · {o.items.map((i) => i.name).join(', ')}
                      </span>
                    </div>
                  </div>
                  <div className="acc-recent-r">
                    {statusBadge(o, t)}
                    {o.items.some((i) => i.available) && o.status === 'delivered' && <ReorderButton brand={brand} number={o.number} locale={ctx.locale} />}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
      <div className="acc-ov-side">
        <Card title={t('accPayLater')} className="acc-card-pl" testId="overview-paylater" action={adv ? <More to={href(brand, 'paylater')} label={t('accSeeAll')} /> : undefined}>
          {adv ? (
            <PayLaterSummary o={adv} ctx={ctx} compact />
          ) : (
            <Empty icon={<CardIcon size={22} />} text={t('accPayLaterEmpty')}>
              <Link href={`/${brand}/pay-later`} className="acc-more">
                {t('accPayLaterHow')}
                <ArrowRightIcon size={14} />
              </Link>
            </Empty>
          )}
        </Card>
        <Card title={t('rewards')} testId="overview-rewards" action={<More to={href(brand, 'rewards')} label={t('accSeeAll')} />}>
          <LoyaltyBand d={d} ctx={ctx} />
          <Ledger d={d} ctx={ctx} limit={3} />
        </Card>
        <Card title={t('accSupport')} testId="overview-support" action={<More to={href(brand, 'support')} label={t('accSeeAll')} />}>
          {open.length ? (
            <ul className="acc-tickets">
              {open.slice(0, 3).map((tk) => (
                <TicketRow key={tk.number} tk={tk} ctx={ctx} />
              ))}
            </ul>
          ) : (
            <Empty icon={<ChatIcon size={22} />} text={t('accNoOpenTickets')}>
              <Link href={`/${brand}/support`} className="acc-more">
                {t('accQHelp')}
                <ArrowRightIcon size={14} />
              </Link>
            </Empty>
          )}
        </Card>
      </div>
    </div>
  );
}

export function OrdersPanel({ d, ctx, filter }: { d: AccountData; ctx: Ctx; filter: 'all' | 'active' | 'completed' }) {
  const { t, brand } = ctx;
  const list = d.orders.filter((o) => (filter === 'all' ? true : filter === 'active' ? o.active : !o.active));
  const chips = [
    ['all', t('allFilter'), d.orders.length],
    ['active', t('accFilterActive'), d.orders.filter((o) => o.active).length],
    ['completed', t('accFilterCompleted'), d.orders.filter((o) => !o.active).length],
  ] as const;
  return (
    <Card title={t('accTabOrders')} testId="orders-panel">
      <nav className="acc-chips" aria-label={t('filters')}>
        {chips.map(([key, label, n]) => (
          <Link key={key} href={href(brand, 'orders', key === 'all' ? '' : `&f=${key}`)} className={`chip${filter === key ? ' on' : ''}`} aria-current={filter === key ? 'page' : undefined} scroll={false}>
            {label} <span className="acc-chip-n">{n}</span>
          </Link>
        ))}
      </nav>
      {list.length ? (
        <div className="acc-list">
          {list.map((o) => (
            <OrderItemCard key={o.number} o={o} ctx={ctx} full />
          ))}
        </div>
      ) : (
        <Empty icon={<TruckIcon size={22} />} text={d.orders.length ? t('accNoOrdersFilter') : t('accNoOrders')}>
          {!d.orders.length && (
            <Link href={`/${brand}/shop`} className="btn btn-primary btn-sm">
              {t('accStartShopping')}
            </Link>
          )}
        </Empty>
      )}
    </Card>
  );
}

export function PayLaterPanel({ d, ctx }: { d: AccountData; ctx: Ctx }) {
  const { t, brand, locale } = ctx;
  const plans = d.orders.filter((o) => o.advance);
  if (!plans.length)
    return (
      <Card title={t('accPayLater')} testId="paylater-panel">
        <Empty icon={<CardIcon size={22} />} text={t('accPayLaterEmpty')}>
          <Link href={`/${brand}/pay-later`} className="btn btn-primary btn-sm">
            {t('accPayLaterHow')}
          </Link>
        </Empty>
      </Card>
    );
  const now = Date.now();
  return (
    <div className="acc-list" data-testid="paylater-panel">
      {plans.map((o) => {
        const a = o.advance!;
        const nextN = a.nextDue?.n;
        return (
          <Card key={o.number} title={t('accPayLater')} className="acc-card-pl">
            <PayLaterSummary o={o} ctx={ctx} />
            <div className="acc-h3">{t('accSchedule')}</div>
            <div className="acc-table-wrap">
              <table className="acc-table">
                <thead>
                  <tr>
                    <th scope="col">{t('accColNo')}</th>
                    <th scope="col">{t('accColDue')}</th>
                    <th scope="col" className="num">
                      {t('accColAmount')}
                    </th>
                    <th scope="col">{t('accColStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {a.schedule.map((s) => {
                    const st = s.paidAt ? 'paid' : s.n === nextN ? (new Date(s.dueDate).getTime() < now ? 'overdue' : 'next') : new Date(s.dueDate).getTime() < now ? 'overdue' : 'upcoming';
                    return (
                      <tr key={s.n} className={`is-${st}`}>
                        <td>{s.n}</td>
                        <td>{fmtDay(locale, s.dueDate)}</td>
                        <td className="num">{fmt(s.amount)}</td>
                        <td>
                          <span className={`acc-inst inst-${st}`}>{st === 'paid' ? t('accInstPaid', { date: fmtDay(locale, s.paidAt!, false) }) : st === 'next' ? t('accInstNext') : st === 'overdue' ? t('accInstOverdue') : t('accInstUpcoming')}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function RewardsPanel({ d, ctx }: { d: AccountData; ctx: Ctx }) {
  const { t, locale } = ctx;
  const tiers = LOYALTY_DEFAULTS.tiers;
  return (
    <div className="acc-two">
      <Card title={t('rewards')} testId="rewards-panel">
        <LoyaltyBand d={d} ctx={ctx} />
        <ol className="acc-tiers">
          {tiers.map((tier) => (
            <li key={tier.name} className={tier.name === d.loyalty.tier ? 'on' : ''} aria-current={tier.name === d.loyalty.tier ? 'true' : undefined}>
              <b>{t(k(`accTier_${tier.name}`))}</b>
              <span>{tier.name === d.loyalty.tier ? t('accTierYou') : t('accTierFrom', { n: tier.min.toLocaleString('en-US') })}</span>
            </li>
          ))}
        </ol>
        <div className="acc-h3">{t('accHowPoints')}</div>
        <ul className="acc-bullets">
          <li>{t('accEarnRule', { n: LOYALTY_DEFAULTS.tzsPerPoint.toLocaleString('en-US') })}</li>
          <li>{t('accPointValue', { amount: fmt(LOYALTY_DEFAULTS.pointValueTzs) })}</li>
          <li>{t('accExpiryRule', { n: LOYALTY_DEFAULTS.expiryMonths })}</li>
        </ul>
      </Card>
      <Card title={t('accPointsHistory')}>
        <Ledger d={d} ctx={{ ...ctx, locale }} />
      </Card>
    </div>
  );
}

export function SupportPanel({ d, ctx, openId }: { d: AccountData; ctx: Ctx; openId?: string }) {
  const { t, brand } = ctx;
  return (
    <Card
      title={t('accSupport')}
      testId="support-panel"
      action={
        <Link href={`/${brand}/support`} className="btn btn-primary btn-sm">
          {t('accNewTicket')}
        </Link>
      }
    >
      {d.tickets.length ? (
        <ul className="acc-tickets">
          {d.tickets.map((tk) => (
            <TicketRow key={tk.number} tk={tk} ctx={ctx} openId={openId} />
          ))}
        </ul>
      ) : (
        <Empty icon={<ChatIcon size={22} />} text={t('accNoTickets')} />
      )}
    </Card>
  );
}
