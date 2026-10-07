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

export const ICON = {
  dash: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z',
  orders: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  invoice: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
  adv: 'M3 7h18v13H3zM3 7l3-3h12l3 3M16 14h2',
  cust: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c1-4 4-6 7-6s6 2 7 6M17 11a3 3 0 000-6M22 21c-.6-2.6-2-4.3-4-5',
  prod: 'M4 4h16v16H4zM4 15l5-5 4 4 3-3 4 4',
  inv: 'M4 7h16v13H4zM8 7V4h8v3M9 12h6',
  cat: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  promo: 'M3 12l9-9h8v8l-9 9zM15 8.5a.5.5 0 100-1 .5.5 0 000 1z',
  cms: 'M3 4h18v12H3zM8 20h8M12 16v4',
  tk: 'M4 5h16v11H8l-4 4z',
  rep: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  set: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
};
