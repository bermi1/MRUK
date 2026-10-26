/**
 * Marketing and retention: pure rules for campaigns (audience filters, message rendering,
 * SMS segment counting) and loyalty points. No I/O; the web app does the database work.
 *
 * DEFAULTS: every business rule below is a clearly marked default (CLAUDE.md rule 4) that the
 * client has not yet confirmed. They are listed as open questions in docs/marketing.md.
 */

// Loyalty ------------------------------------------------------------------------------------

export const LOYALTY_DEFAULTS = {
  /** DEFAULT: 1 point per TZS 1,000 of the delivered order total (rounded down). */
  tzsPerPoint: 1_000,
  /** DEFAULT: 1 point is worth TZS 10 (for display; redemption is not built yet). */
  pointValueTzs: 10,
  /** DEFAULT: tiers by current points balance, per brand. Member < 2,000 ≤ Silver < 10,000 ≤ Gold. */
  tiers: [
    { name: 'Member', min: 0 },
    { name: 'Silver', min: 2_000 },
    { name: 'Gold', min: 10_000 },
  ],
  /** DEFAULT: points expire 12 months after they were earned (oldest first). */
  expiryMonths: 12,
  /** DEFAULT: points are awarded when an order reaches "delivered" and reversed if it is cancelled or refunded afterwards. */
  earnOnStatus: 'delivered',
} as const;

export type LoyaltyTier = 'Member' | 'Silver' | 'Gold';
export const LOYALTY_TIERS: LoyaltyTier[] = ['Member', 'Silver', 'Gold'];

export function pointsForOrder(total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.floor(total / LOYALTY_DEFAULTS.tzsPerPoint);
}

export function tierFor(points: number): { tier: LoyaltyTier; nextTier: LoyaltyTier | null; pointsToNext: number } {
  const tiers = LOYALTY_DEFAULTS.tiers;
  let i = 0;
  for (let k = 0; k < tiers.length; k++) if (points >= tiers[k]!.min) i = k;
  const next = tiers[i + 1];
  return { tier: tiers[i]!.name, nextTier: next ? next.name : null, pointsToNext: next ? Math.max(0, next.min - points) : 0 };
}

export function addMonths(d: Date, months: number): Date {
  const r = new Date(d.getTime());
  r.setUTCMonth(r.getUTCMonth() + months);
  return r;
}

export interface LedgerEntry {
  points: number;
  reason: string;
  at: Date;
}

/**
 * Balance with first-in-first-out expiry. Every positive entry is a lot that expires
 * `expiryMonths` after it was earned; spending (negative entries) uses the oldest live lot first,
 * and recorded "expire" entries use lots that have already expired. `dueToExpire` is the part of
 * expired lots not yet written to the ledger (the nightly sweep writes it as an "expire" entry);
 * the balance already excludes it, so it is correct even before the sweep runs.
 */
export function loyaltyState(entries: LedgerEntry[], now = new Date()): { balance: number; dueToExpire: number; earned: number } {
  const sorted = [...entries].sort((a, b) => a.at.getTime() - b.at.getTime());
  const live: { rem: number; exp: Date }[] = [];
  let expired = 0;
  let earned = 0;
  const expireUpTo = (t: Date) => {
    while (live.length && live[0]!.exp <= t) expired += live.shift()!.rem;
  };
  const useLive = (n: number) => {
    while (n > 0 && live.length) {
      const lot = live[0]!;
      const take = Math.min(lot.rem, n);
      lot.rem -= take;
      n -= take;
      if (!lot.rem) live.shift();
    }
  };
  for (const e of sorted) {
    expireUpTo(e.at);
    if (e.points > 0) {
      earned += e.points;
      live.push({ rem: e.points, exp: addMonths(e.at, LOYALTY_DEFAULTS.expiryMonths) });
      // Lots are created in time order with the same lifetime, so the queue stays sorted by expiry.
    } else if (e.points < 0) {
      let n = -e.points;
      if (e.reason === 'expire') {
        const take = Math.min(expired, n);
        expired -= take;
        n -= take;
      }
      useLive(n);
    }
  }
  expireUpTo(now);
  const total = sorted.reduce((a, e) => a + e.points, 0);
  return { balance: Math.max(0, total - expired), dueToExpire: expired, earned };
}

export interface LoyaltySummary {
  points: number;
  tier: LoyaltyTier;
  valueTzs: number;
  nextTier: string | null;
  pointsToNext: number;
}

export function loyaltySummary(entries: LedgerEntry[], now = new Date()): LoyaltySummary {
  const { balance } = loyaltyState(entries, now);
  const t = tierFor(balance);
  return { points: balance, tier: t.tier, valueTzs: balance * LOYALTY_DEFAULTS.pointValueTzs, nextTier: t.nextTier, pointsToNext: t.pointsToNext };
}

// Campaign audiences ---------------------------------------------------------------------------

export const CAMPAIGN_CHANNELS = ['sms', 'whatsapp', 'email'] as const;
export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];
export const AUDIENCE_TYPES = ['subscribers', 'customers', 'all'] as const;
export type AudienceType = (typeof AUDIENCE_TYPES)[number];
export const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'sending', 'sent', 'cancelled'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export interface AudienceFilters {
  /** Category slug the person bought from (this brand). */
  boughtCategory?: string;
  /** Last order is at least this many days ago ("lapsed"). People who never ordered do not match. */
  lastOrderBeforeDays?: number;
  /** At least this many orders with the brand. */
  minOrders?: number;
  /** Loyalty tier with the brand (exact). */
  tier?: LoyaltyTier;
}

export interface Audience {
  type: AudienceType;
  filters: AudienceFilters;
}

/** What we know about one person for filtering. */
export interface PersonStats {
  orders: number;
  lastOrderAt: Date | null;
  categories: string[];
  tier: LoyaltyTier;
}

export const NO_STATS: PersonStats = { orders: 0, lastOrderAt: null, categories: [], tier: 'Member' };

export function hasFilters(f: AudienceFilters): boolean {
  return !!(f.boughtCategory || f.lastOrderBeforeDays || f.minOrders || f.tier);
}

export function matchesFilters(s: PersonStats, f: AudienceFilters, now = new Date()): boolean {
  if (f.boughtCategory && !s.categories.includes(f.boughtCategory)) return false;
  if (f.minOrders && s.orders < f.minOrders) return false;
  if (f.lastOrderBeforeDays) {
    if (!s.lastOrderAt) return false;
    if (now.getTime() - s.lastOrderAt.getTime() < f.lastOrderBeforeDays * 86_400_000) return false;
  }
  if (f.tier && s.tier !== f.tier) return false;
  return true;
}

/** Plain-language description of an audience for lists and confirmations. */
export function describeAudience(a: Audience): string {
  const who = a.type === 'subscribers' ? 'Subscribers' : a.type === 'customers' ? 'Customers' : 'Subscribers and customers';
  const parts: string[] = [];
  if (a.filters.boughtCategory) parts.push(`bought ${a.filters.boughtCategory}`);
  if (a.filters.minOrders) parts.push(`${a.filters.minOrders}+ orders`);
  if (a.filters.lastOrderBeforeDays) parts.push(`no order in ${a.filters.lastOrderBeforeDays} days`);
  if (a.filters.tier) parts.push(`${a.filters.tier} tier`);
  return parts.length ? `${who} · ${parts.join(' · ')}` : who;
}

/** Channel addresses are the identity for de-duplication: the same phone is messaged once. */
export function dedupeBy<T>(rows: T[], key: (r: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const k = key(r);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

export function chunk<T>(rows: T[], size: number): T[][] {
  const n = Math.max(1, Math.floor(size));
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += n) out.push(rows.slice(i, i + n));
  return out;
}

// Messages ------------------------------------------------------------------------------------

/** First name for {name}; "there" when we do not know it ("Hi {name}" → "Hi there"). */
export function firstName(name: string | null | undefined): string {
  const f = (name ?? '').trim().split(/\s+/)[0] ?? '';
  return f ? f.slice(0, 30) : 'there';
}

export function renderMessage(template: string, vars: { name?: string | null; code?: string | null }): string {
  return template.replace(/\{name\}/g, firstName(vars.name)).replace(/\{code\}/g, vars.code ?? '');
}

export function usesCode(template: string): boolean {
  return /\{code\}/.test(template);
}

/**
 * Final text as sent. SMS and WhatsApp start with the brand name and end with the opt-out:
 * "Reply STOP" plus the unsubscribe link (PDPA 2022: every message offers an easy opt-out).
 */
export function composeMessage(channel: CampaignChannel, brandName: string, body: string, unsubscribeUrl: string): string {
  const text = body.trim();
  if (channel === 'email') return `${text}\n\n—\n${brandName}. You are receiving this because you subscribed. Unsubscribe: ${unsubscribeUrl}`;
  const prefixed = text.toLowerCase().startsWith(brandName.toLowerCase()) ? text : `${brandName}: ${text}`;
  return `${prefixed}\nReply STOP to opt out or visit ${unsubscribeUrl}`;
}

// SMS segments --------------------------------------------------------------------------------

/** GSM 03.38 basic character set (7-bit). */
const GSM_BASIC = new Set(
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'.split(''),
);
/** GSM extension table: each costs two characters (escape + char). */
const GSM_EXT = new Set('^{}\\[~]|€\f'.split(''));

export interface SmsCount {
  encoding: 'gsm' | 'unicode';
  /** Characters as billed (GSM extension characters count 2; unicode counts UTF-16 units). */
  chars: number;
  segments: number;
  /** Characters per segment for this message (160/153 GSM, 70/67 unicode). */
  perSegment: number;
  /** Characters left in the current segment. */
  remaining: number;
}

export function smsSegments(text: string): SmsCount {
  let gsm = true;
  let units = 0;
  for (const ch of text) {
    if (GSM_BASIC.has(ch)) units += 1;
    else if (GSM_EXT.has(ch)) units += 2;
    else {
      gsm = false;
      break;
    }
  }
  const chars = gsm ? units : text.length; // UCS-2: UTF-16 code units (emoji count 2)
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  const segments = chars === 0 ? 0 : chars <= single ? 1 : Math.ceil(chars / multi);
  const perSegment = segments > 1 ? multi : single;
  const remaining = segments === 0 ? single : segments * perSegment - chars;
  return { encoding: gsm ? 'gsm' : 'unicode', chars, segments, perSegment, remaining };
}

// Masking ---------------------------------------------------------------------------------------

/** "neema@gmail.com" → "n•••@gmail.com" (for send logs and lists that must not show raw PII). */
export function maskEmail(email: string | null | undefined): string {
  const e = (email ?? '').trim();
  const at = e.indexOf('@');
  if (at < 1) return '•••';
  return `${e[0]}•••${e.slice(at)}`;
}

export function normaliseEmail(email: string | null | undefined): string | null {
  const e = (email ?? '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 160 ? e : null;
}
