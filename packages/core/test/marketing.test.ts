import { describe, expect, it } from 'vitest';
import {
  addMonths,
  chunk,
  composeMessage,
  dedupeBy,
  describeAudience,
  firstName,
  hasFilters,
  LOYALTY_DEFAULTS,
  loyaltyState,
  loyaltySummary,
  maskEmail,
  matchesFilters,
  NO_STATS,
  normaliseEmail,
  pointsForOrder,
  renderMessage,
  smsSegments,
  tierFor,
  usesCode,
  type PersonStats,
} from '../src/index';

const D = (s: string) => new Date(`${s}T00:00:00Z`);

describe('loyalty defaults', () => {
  it('earns 1 point per TZS 1,000, rounded down', () => {
    expect(pointsForOrder(1_250_999)).toBe(1_250);
    expect(pointsForOrder(999)).toBe(0);
    expect(pointsForOrder(0)).toBe(0);
    expect(pointsForOrder(-5)).toBe(0);
    expect(pointsForOrder(Number.NaN)).toBe(0);
    expect(LOYALTY_DEFAULTS.pointValueTzs).toBe(10);
  });
  it('assigns tiers at 2,000 and 10,000', () => {
    expect(tierFor(0)).toEqual({ tier: 'Member', nextTier: 'Silver', pointsToNext: 2_000 });
    expect(tierFor(1_999)).toMatchObject({ tier: 'Member', pointsToNext: 1 });
    expect(tierFor(2_000)).toEqual({ tier: 'Silver', nextTier: 'Gold', pointsToNext: 8_000 });
    expect(tierFor(9_999)).toMatchObject({ tier: 'Silver', pointsToNext: 1 });
    expect(tierFor(10_000)).toEqual({ tier: 'Gold', nextTier: null, pointsToNext: 0 });
  });
  it('adds calendar months', () => {
    expect(addMonths(D('2026-01-15'), 12).toISOString().slice(0, 10)).toBe('2027-01-15');
  });
});

describe('loyalty balance with expiry', () => {
  it('sums live points', () => {
    const now = D('2026-06-01');
    const s = loyaltyState([{ points: 1_500, reason: 'order', at: D('2026-01-01') }, { points: 700, reason: 'order', at: D('2026-03-01') }, { points: -200, reason: 'adjust', at: D('2026-04-01') }], now);
    expect(s).toEqual({ balance: 2_000, dueToExpire: 0, earned: 2_200 });
    expect(loyaltySummary([{ points: 2_000, reason: 'order', at: D('2026-01-01') }], now)).toEqual({ points: 2_000, tier: 'Silver', valueTzs: 20_000, nextTier: 'Gold', pointsToNext: 8_000 });
  });
  it('expires unspent points after 12 months, oldest first', () => {
    const entries = [
      { points: 1_000, reason: 'order', at: D('2025-01-01') },
      { points: 500, reason: 'order', at: D('2025-08-01') },
      { points: -300, reason: 'redeem', at: D('2025-03-01') }, // spends from the first lot
    ];
    const s = loyaltyState(entries, D('2026-02-01'));
    expect(s.dueToExpire).toBe(700);
    expect(s.balance).toBe(500);
    // After the sweep writes the expiry, nothing more is due and the balance is unchanged.
    const swept = loyaltyState([...entries, { points: -700, reason: 'expire', at: D('2026-02-01') }], D('2026-02-02'));
    expect(swept).toMatchObject({ balance: 500, dueToExpire: 0 });
    // Later, the second lot expires too.
    expect(loyaltyState([...entries, { points: -700, reason: 'expire', at: D('2026-02-01') }], D('2026-09-01'))).toMatchObject({ balance: 0, dueToExpire: 500 });
  });
  it('does not spend expired lots and never goes below zero', () => {
    const s = loyaltyState([{ points: 100, reason: 'order', at: D('2024-01-01') }, { points: -50, reason: 'order', at: D('2026-01-01') }], D('2026-01-02'));
    expect(s.balance).toBe(0);
    expect(s.dueToExpire).toBe(100);
    expect(loyaltyState([], D('2026-01-01'))).toEqual({ balance: 0, dueToExpire: 0, earned: 0 });
    expect(loyaltyState([{ points: 0, reason: 'adjust', at: D('2026-01-01') }])).toMatchObject({ balance: 0 });
    // An expire entry larger than what has expired consumes live points.
    expect(loyaltyState([{ points: 100, reason: 'order', at: D('2026-01-01') }, { points: -40, reason: 'expire', at: D('2026-02-01') }], D('2026-03-01')).balance).toBe(60);
  });
});

describe('audience filters', () => {
  const now = D('2026-10-01');
  const s: PersonStats = { orders: 3, lastOrderAt: D('2026-06-01'), categories: ['fridges', 'tvs'], tier: 'Silver' };
  it('matches every filter', () => {
    expect(matchesFilters(s, {}, now)).toBe(true);
    expect(matchesFilters(s, { boughtCategory: 'fridges', minOrders: 3, lastOrderBeforeDays: 90, tier: 'Silver' }, now)).toBe(true);
  });
  it('rejects people outside the segment', () => {
    expect(matchesFilters(s, { boughtCategory: 'cookers' }, now)).toBe(false);
    expect(matchesFilters(s, { minOrders: 4 }, now)).toBe(false);
    expect(matchesFilters(s, { lastOrderBeforeDays: 180 }, now)).toBe(false);
    expect(matchesFilters(s, { tier: 'Gold' }, now)).toBe(false);
    expect(matchesFilters(NO_STATS, { lastOrderBeforeDays: 30 }, now)).toBe(false);
    expect(matchesFilters(NO_STATS, { tier: 'Member' }, now)).toBe(true);
  });
  it('describes audiences and detects filters', () => {
    expect(describeAudience({ type: 'subscribers', filters: {} })).toBe('Subscribers');
    expect(describeAudience({ type: 'all', filters: {} })).toBe('Subscribers and customers');
    expect(describeAudience({ type: 'customers', filters: { boughtCategory: 'tvs', minOrders: 2, lastOrderBeforeDays: 60, tier: 'Gold' } })).toBe('Customers · bought tvs · 2+ orders · no order in 60 days · Gold tier');
    expect(hasFilters({})).toBe(false);
    expect(hasFilters({ tier: 'Gold' })).toBe(true);
  });
  it('de-duplicates and chunks recipients', () => {
    expect(dedupeBy([{ p: 'a' }, { p: 'b' }, { p: 'a' }, { p: '' }], (r) => r.p)).toEqual([{ p: 'a' }, { p: 'b' }]);
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([1], 0)).toEqual([[1]]);
  });
});

describe('messages', () => {
  it('renders placeholders', () => {
    expect(renderMessage('Hi {name}, use {code}!', { name: 'Neema Mushi', code: 'KARIBU10' })).toBe('Hi Neema, use KARIBU10!');
    expect(renderMessage('Hi {name} {code}', {})).toBe('Hi there ');
    expect(firstName('   ')).toBe('there');
    expect(usesCode('x {code}')).toBe(true);
    expect(usesCode('x')).toBe(false);
  });
  it('adds the brand name and opt-out text', () => {
    const sms = composeMessage('sms', 'Mr UK', 'New fridges in stock.', 'https://x/u');
    expect(sms).toBe('Mr UK: New fridges in stock.\nReply STOP to opt out or visit https://x/u');
    expect(composeMessage('whatsapp', 'Skywood', 'Skywood deals this week', 'u')).toMatch(/^Skywood deals this week\nReply STOP/);
    expect(composeMessage('email', 'Skywood', 'Hello', 'u')).toContain('Unsubscribe: u');
  });
  it('counts SMS segments (160/153 GSM, 70/67 unicode)', () => {
    expect(smsSegments('')).toMatchObject({ segments: 0, remaining: 160 });
    expect(smsSegments('a'.repeat(160))).toMatchObject({ encoding: 'gsm', chars: 160, segments: 1, perSegment: 160, remaining: 0 });
    expect(smsSegments('a'.repeat(161))).toMatchObject({ segments: 2, perSegment: 153, remaining: 145 });
    expect(smsSegments('€'.repeat(80))).toMatchObject({ encoding: 'gsm', chars: 160, segments: 1 });
    expect(smsSegments('Karibu ✓')).toMatchObject({ encoding: 'unicode', chars: 8, segments: 1, perSegment: 70 });
    expect(smsSegments('ü'.repeat(10) + '✓'.repeat(61))).toMatchObject({ encoding: 'unicode', segments: 2, perSegment: 67 });
  });
  it('masks and normalises emails', () => {
    expect(maskEmail('neema@gmail.com')).toBe('n•••@gmail.com');
    expect(maskEmail('bad')).toBe('•••');
    expect(maskEmail(null)).toBe('•••');
    expect(normaliseEmail(' Neema@Gmail.com ')).toBe('neema@gmail.com');
    expect(normaliseEmail('nope')).toBeNull();
    expect(normaliseEmail(undefined)).toBeNull();
  });
});
