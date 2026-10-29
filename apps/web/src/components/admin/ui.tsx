import Link from 'next/link';
import { ADVANCE_STATUS_LABEL, ORDER_STATUS_LABEL, type AdvanceStatus, type OrderStatus } from '@bt/core';

export const ORDER_PILL: Record<string, string> = {
  placed: 'pill-amber',
  bank_review: 'pill-blue',
  approved: 'pill-navy',
  packed: 'pill-navy',
  out_for_delivery: 'pill-violet',
  delivered: 'pill-green',
  cancelled: 'pill-grey',
  rejected: 'pill-red',
};

export const ADVANCE_PILL: Record<string, string> = {
  draft: 'pill-grey',
  submitted: 'pill-blue',
  approved: 'pill-navy',
  rejected: 'pill-red',
  disbursed: 'pill-violet',
  repaying: 'pill-amber',
  closed: 'pill-green',
};

export const INVOICE_PILL: Record<string, string> = { issued: 'pill-amber', paid: 'pill-green', void: 'pill-grey' };
export const TICKET_PILL: Record<string, string> = { new: 'pill-blue', open: 'pill-amber', waiting: 'pill-violet', resolved: 'pill-green' };

export function Pill({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`ad-pill ${cls}`}>{children}</span>;
}

export function OrderPill({ status }: { status: string }) {
  return <Pill cls={ORDER_PILL[status] ?? 'pill-grey'}>{ORDER_STATUS_LABEL[status as OrderStatus] ?? status}</Pill>;
}

export function AdvancePill({ status }: { status: string }) {
  return <Pill cls={ADVANCE_PILL[status] ?? 'pill-grey'}>{ADVANCE_STATUS_LABEL[status as AdvanceStatus] ?? status}</Pill>;
}

export function Kpi({ label, value, delta, color = '#16825D' }: { label: string; value: React.ReactNode; delta?: React.ReactNode; color?: string }) {
  return (
    <div className="ad-kpi">
      <div className="l">{label}</div>
      <div className="v">{value}</div>
      {delta ? (
        <div className="d" style={{ color }}>
          {delta}
        </div>
      ) : null}
    </div>
  );
}

export function Forbidden({ what }: { what: string }) {
  return (
    <div className="ad-card" style={{ maxWidth: 560 }}>
      <h2 className="ad-h">No access</h2>
      <p className="ad-muted2" style={{ fontSize: 14, lineHeight: 1.6 }}>
        Your role cannot open {what}. Ask a Super admin to change your role in Settings and users.
      </p>
    </div>
  );
}

export function Thumb({ src, model, dark }: { src?: string; model: string; dark?: boolean }) {
  return <div className={`ad-thumb ${dark ? 'dark' : ''}`}>{src ? <img src={src} alt="" loading="lazy" /> : <span>{model.replace(/^(UK|SKY)[-\s]*/i, '').slice(0, 8) || 'NO IMG'}</span>}</div>;
}

export function Meter({ pct, color = '#283A6E', lg }: { pct: number; color?: string; lg?: boolean }) {
  return (
    <div className={`ad-meter ${lg ? 'lg' : ''}`} role="presentation">
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

export const BRAND_LABEL: Record<string, string> = { mruk: 'Mr UK', skywood: 'Skywood' };

/** Small brand tag for rows and cards: Mr UK navy, Skywood ink with gold. Same look everywhere. */
export function BrandChip({ brand, title }: { brand: string | null | undefined; title?: string }) {
  if (!brand) return <span className="ad-bchip both">Both brands</span>;
  return (
    <span className={`ad-bchip ${brand}`} title={title ?? `${BRAND_LABEL[brand] ?? brand} store`}>
      {BRAND_LABEL[brand] ?? brand}
    </span>
  );
}

/** Brand header with logo (CMS, products, catalogue, dashboard brand cards). */
export function BrandMark({ brand, children }: { brand: string; children?: React.ReactNode }) {
  return (
    <span className={`ad-bmark ${brand}`}>
      <span className="lg">
        <img src={`/brand/${brand}-white.png`} alt="" />
      </span>
      <span>
        <b>{BRAND_LABEL[brand] ?? brand}</b>
        {children ? <small>{children}</small> : null}
      </span>
    </span>
  );
}

/** "1–50 of 230 · Previous / Next" for long lists. `href(page)` builds the link for a page. */
export function Pager({ page, per, total, href }: { page: number; per: number; total: number; href: (page: number) => string }) {
  if (total <= per) return null;
  return (
    <nav className="ad-between" aria-label="Pages" style={{ marginTop: 12, fontSize: 13 }}>
      <span className="ad-muted2">
        {(page - 1) * per + 1}–{Math.min(total, page * per)} of {total}
      </span>
      <span className="ad-row">
        {page > 1 && (
          <Link className="ad-btn line sm" href={href(page - 1)}>
            Previous
          </Link>
        )}
        {page * per < total && (
          <Link className="ad-btn line sm" href={href(page + 1)}>
            Next
          </Link>
        )}
      </span>
    </nav>
  );
}

/** Page number from a query string value (1…max). */
export function pageParam(v: string | undefined, max = 1000): number {
  return Math.max(1, Math.min(max, Math.floor(Number(v)) || 1));
}

/** Compact figure for role dashboards. `tone` colours the value (bad = needs action). Links when `href` is set (44 px touch target). */
export function Stat({ label, value, sub, tone, href, testid }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'bad' | 'warn' | 'ok' | 'az'; href?: string; testid?: string }) {
  const body = (
    <>
      <span className="l">{label}</span>
      <span className="v">{value}</span>
      {sub ? <span className="s">{sub}</span> : null}
    </>
  );
  const cls = `ad-stat${tone ? ` t-${tone}` : ''}`;
  return href ? (
    <Link href={href} className={cls} data-testid={testid}>
      {body}
    </Link>
  ) : (
    <div className={cls} data-testid={testid}>
      {body}
    </div>
  );
}

/** Dashboard widget card with a heading, a sub line and an optional "open" link. */
export function Widget({ title, sub, link, testid, children }: { title: string; sub?: string; link?: { href: string; label: string }; testid?: string; children: React.ReactNode }) {
  return (
    <section className="ad-card ad-widget" data-testid={testid}>
      <div className="ad-between">
        <div>
          <h2 className="ad-h">{title}</h2>
          {sub ? <p className="ad-sub">{sub}</p> : null}
        </div>
        {link ? (
          <Link href={link.href} className="ad-wlink">
            {link.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export const ICON = {
  task: 'M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9',
  dash:'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z',
  orders: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  invoice: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
  adv: 'M3 7h18v13H3zM3 7l3-3h12l3 3M16 14h2',
  cust: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c1-4 4-6 7-6s6 2 7 6M17 11a3 3 0 000-6M22 21c-.6-2.6-2-4.3-4-5',
  prod: 'M4 4h16v16H4zM4 15l5-5 4 4 3-3 4 4',
  inv: 'M4 7h16v13H4zM8 7V4h8v3M9 12h6',
  cat: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  promo: 'M3 12l9-9h8v8l-9 9zM15 8.5a.5.5 0 100-1 .5.5 0 000 1z',
  cms: 'M3 4h18v12H3zM8 20h8M12 16v4',
  mkt: 'M3 10v4h4l6 5V5L7 10zM16 9a4 4 0 010 6M19 6a8 8 0 010 12',
  tk: 'M4 5h16v11H8l-4 4z',
  rep: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  set: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
};
