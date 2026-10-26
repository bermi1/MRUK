import 'server-only';
import { prisma, sha256, type Prisma } from '@bt/db';
import {
  composeMessage,
  dedupeBy,
  hasFilters,
  maskEmail,
  maskTzPhone,
  matchesFilters,
  NO_STATS,
  renderMessage,
  usesCode,
  type Audience,
  type AudienceFilters,
  type CampaignChannel,
  type PersonStats,
} from '@bt/core';
import { env } from './env';
import { integrations } from './integrations';
import { tiersFor } from './loyalty';
import { sign, verifySigned } from './session';

/**
 * Marketing: sign-ups, consent and opt-out, audience resolution, campaign sending.
 * See docs/marketing.md. Never log phone numbers, emails or message bodies.
 */
export type Brand = 'mruk' | 'skywood';
export const BRAND_NAMES: Record<Brand, string> = { mruk: 'Mr UK', skywood: 'Skywood' };

export const MARKETING_DEFAULTS = {
  /**
   * DEFAULT ("soft opt-in"): customers who bought from a brand and accepted the privacy notice at
   * checkout may receive that brand's campaigns unless they opted out; every message carries
   * "Reply STOP" and an unsubscribe link. Set to false to message explicit subscribers only.
   * OPEN QUESTION for the client / their legal adviser (PDPA 2022, direct marketing).
   */
  customersSoftOptIn: true,
  /** DEFAULT: a phone sign-up opts in to SMS only; WhatsApp needs a separate tick (not on the forms yet). */
  phoneOptsInToWhatsApp: false,
  /** Messages per chunk, pause between chunks (gateway friendly), and the most one run sends (serverless time limits). */
  chunkSize: 50,
  pauseMs: 150,
  maxPerRun: 1_000,
  runBudgetMs: 45_000,
} as const;

// Subscribe / unsubscribe ------------------------------------------------------------------------

export async function subscribe(brand: Brand, input: { name: string; phone: string | null; email: string | null; source: string; customerId?: string | null }): Promise<{ created: boolean }> {
  const { phone, email } = input;
  if (!phone && !email) throw new Error('Enter a phone number or an email address');
  const customerId = input.customerId ?? (phone ? ((await prisma.customer.findUnique({ where: { phone }, select: { id: true, deletedAt: true } }).then((c) => (c && !c.deletedAt ? c.id : null))) ?? null) : null);
  const now = new Date();
  for (let attempt = 0; attempt < 2; attempt++) {
    const [byPhone, byEmail] = await Promise.all([
      phone ? prisma.subscriber.findUnique({ where: { brandKey_phone: { brandKey: brand, phone } } }) : null,
      email ? prisma.subscriber.findUnique({ where: { brandKey_email: { brandKey: brand, email } } }) : null,
    ]);
    const target = byPhone ?? byEmail;
    try {
      if (!target) {
        await prisma.subscriber.create({
          data: { brandKey: brand, name: input.name, phone, email, smsOptIn: !!phone, whatsappOptIn: !!phone && MARKETING_DEFAULTS.phoneOptsInToWhatsApp, emailOptIn: !!email, consentAt: now, source: input.source, customerId },
        });
        return { created: true };
      }
      // Phone and email belong to two different rows: keep the phone row and move the email to it.
      if (byPhone && byEmail && byPhone.id !== byEmail.id) await prisma.subscriber.update({ where: { id: byEmail.id }, data: { email: null, emailOptIn: false } });
      await prisma.subscriber.update({
        where: { id: target.id },
        data: {
          name: input.name || target.name,
          phone: phone ?? target.phone,
          email: email ?? target.email,
          smsOptIn: phone ? true : target.unsubscribedAt ? false : target.smsOptIn,
          whatsappOptIn: phone ? MARKETING_DEFAULTS.phoneOptsInToWhatsApp || target.whatsappOptIn : target.unsubscribedAt ? false : target.whatsappOptIn,
          emailOptIn: email ? true : target.unsubscribedAt ? false : target.emailOptIn,
          consentAt: now,
          unsubscribedAt: null,
          customerId: target.customerId ?? customerId,
        },
      });
      return { created: !target.consentAt || !!target.unsubscribedAt };
    } catch (e) {
      if (attempt === 0 && e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2002') continue; // a parallel sign-up won the race
      throw e;
    }
  }
  return { created: false };
}

type TokenKind = 's' | 'c'; // subscriber | customer

export function unsubscribeToken(brand: Brand, kind: TokenKind, id: string): string {
  return `${kind}.${id}.${sign(`unsub:${brand}:${kind}:${id}`)}`;
}

export function unsubscribeUrl(brand: Brand, kind: TokenKind, id: string): string {
  return `${env.APP_URL.replace(/\/$/, '')}/${brand}/unsubscribe?t=${unsubscribeToken(brand, kind, id)}`;
}

export function parseUnsubscribeToken(brand: Brand, token: string | null | undefined): { kind: TokenKind; id: string } | null {
  const m = /^([sc])\.([A-Za-z0-9_-]{1,40})\.([A-Za-z0-9_-]{20,64})$/.exec(token ?? '');
  if (!m) return null;
  const [, kind, id, sig] = m as unknown as [string, TokenKind, string, string];
  return verifySigned(`unsub:${brand}:${kind}:${id}`, sig) ? { kind, id } : null;
}

/** Add or update suppression rows so this person gets no more of the brand's campaigns on any channel. */
async function suppress(brand: Brand, who: { phone?: string | null; email?: string | null; customerId?: string | null }) {
  const now = new Date();
  const off = { unsubscribedAt: now, smsOptIn: false, whatsappOptIn: false, emailOptIn: false };
  for (const [field, value] of [['phone', who.phone], ['email', who.email]] as const) {
    if (!value) continue;
    const where = field === 'phone' ? { brandKey_phone: { brandKey: brand, phone: value } } : { brandKey_email: { brandKey: brand, email: value } };
    await prisma.subscriber.upsert({ where, update: off, create: { brandKey: brand, [field]: value, source: 'unsubscribe', customerId: who.customerId ?? null, ...off } });
  }
}

/** Unsubscribe from a signed link. Returns false when the token is invalid. */
export async function unsubscribeByToken(brand: Brand, token: string): Promise<boolean> {
  const t = parseUnsubscribeToken(brand, token);
  if (!t) return false;
  if (t.kind === 's') {
    const s = await prisma.subscriber.findUnique({ where: { id: t.id } });
    if (!s || s.brandKey !== brand) return false;
    await suppress(brand, { phone: s.phone, email: s.email, customerId: s.customerId });
    return true;
  }
  const c = await prisma.customer.findUnique({ where: { id: t.id } });
  if (!c) return false;
  await suppress(brand, { phone: c.deletedAt ? null : c.phone, email: c.email || null, customerId: c.id });
  return true;
}

/** Inbound "STOP" (for the live SMS adapter's delivery-receipt / inbound webhook, not wired yet). */
export async function unsubscribePhone(brand: Brand, phone: string) {
  await suppress(brand, { phone });
}

/** Staff "unsubscribe" button. */
export async function unsubscribeSubscriber(id: string) {
  const s = await prisma.subscriber.findUniqueOrThrow({ where: { id } });
  await suppress(s.brandKey as Brand, { phone: s.phone, email: s.email, customerId: s.customerId });
  return s;
}

// Audience ----------------------------------------------------------------------------------------

export interface Recipient {
  /** E.164 phone (sms/whatsapp) or lower-case email. */
  address: string;
  name: string;
  subscriberId: string | null;
  customerId: string | null;
}

function addressOf(channel: CampaignChannel, p: { phone?: string | null; email?: string | null }): string | null {
  if (channel === 'email') return p.email ? p.email.toLowerCase() : null;
  return p.phone && p.phone.startsWith('+255') ? p.phone : null;
}

/** Order history per phone for one brand (only computed when the audience has filters). */
async function statsByPhone(brand: Brand, filters: AudienceFilters): Promise<Map<string, PersonStats>> {
  const out = new Map<string, PersonStats>();
  if (!hasFilters(filters)) return out;
  const orders = await prisma.order.findMany({
    where: { brandKey: brand, status: { notIn: ['cancelled', 'rejected'] } },
    select: { contactPhone: true, customerId: true, createdAt: true, items: { select: { product: { select: { category: { select: { slug: true } } } } } } },
  });
  const custOf = new Map<string, string>();
  for (const o of orders) {
    const s = out.get(o.contactPhone) ?? { orders: 0, lastOrderAt: null, categories: [], tier: 'Member' as const };
    s.orders++;
    if (!s.lastOrderAt || o.createdAt > s.lastOrderAt) s.lastOrderAt = o.createdAt;
    for (const i of o.items) if (!s.categories.includes(i.product.category.slug)) s.categories.push(i.product.category.slug);
    out.set(o.contactPhone, s);
    if (o.customerId) custOf.set(o.contactPhone, o.customerId);
  }
  if (filters.tier) {
    const tiers = await tiersFor(brand, [...new Set(custOf.values())]);
    for (const [phone, cid] of custOf) out.get(phone)!.tier = tiers.get(cid) ?? 'Member';
  }
  return out;
}

/**
 * Who a campaign reaches, with consent and opt-out enforced:
 * - subscribers: consent recorded, not unsubscribed, opted in to this channel;
 * - customers (soft opt-in DEFAULT): bought from this brand, privacy consent recorded, not deleted;
 * - nobody whose phone/email is on the brand's suppression list (unsubscribed);
 * - each address once.
 */
export async function resolveAudience(brand: Brand, channel: CampaignChannel, audience: Audience): Promise<{ recipients: Recipient[]; optedOut: number }> {
  const f = audience.filters ?? {};
  const optIn = channel === 'sms' ? 'smsOptIn' : channel === 'whatsapp' ? 'whatsappOptIn' : 'emailOptIn';
  const [subs, stats] = await Promise.all([
    prisma.subscriber.findMany({ where: { brandKey: brand }, select: { id: true, name: true, phone: true, email: true, smsOptIn: true, whatsappOptIn: true, emailOptIn: true, consentAt: true, unsubscribedAt: true, customerId: true, customer: { select: { phone: true } } }, orderBy: { createdAt: 'asc' } }),
    statsByPhone(brand, f),
  ]);
  const suppressed = new Set<string>();
  for (const s of subs) if (s.unsubscribedAt) for (const a of [s.phone, s.email?.toLowerCase()]) if (a) suppressed.add(a);
  const now = new Date();
  const statsOf = (phone: string | null | undefined) => (phone ? (stats.get(phone) ?? NO_STATS) : NO_STATS);
  const out: Recipient[] = [];
  let optedOut = 0;

  if (audience.type !== 'customers') {
    for (const s of subs) {
      const address = addressOf(channel, s);
      if (!address) continue;
      if (s.unsubscribedAt || !s.consentAt || !s[optIn] || suppressed.has(address)) {
        if (s.unsubscribedAt || suppressed.has(address)) optedOut++; // not opted in to this channel is not an opt-out
        continue;
      }
      if (hasFilters(f) && !matchesFilters(statsOf(s.phone ?? s.customer?.phone), f, now)) continue;
      out.push({ address, name: s.name, subscriberId: s.id, customerId: s.customerId });
    }
  }
  if (audience.type !== 'subscribers' && MARKETING_DEFAULTS.customersSoftOptIn) {
    const customers = await prisma.customer.findMany({ where: { deletedAt: null, consentAt: { not: null }, orders: { some: { brandKey: brand } } }, select: { id: true, name: true, phone: true, email: true }, orderBy: { createdAt: 'asc' } });
    for (const c of customers) {
      const address = addressOf(channel, c);
      if (!address) continue;
      if (suppressed.has(address) || (channel !== 'email' && c.email && suppressed.has(c.email.toLowerCase()))) {
        optedOut++;
        continue;
      }
      if (hasFilters(f) && !matchesFilters(statsOf(c.phone), f, now)) continue;
      out.push({ address, name: c.name, subscriberId: null, customerId: c.id });
    }
  }
  const recipients = dedupeBy(out, (r) => r.address);
  return { recipients, optedOut };
}

// Sending -------------------------------------------------------------------------------------------

function mask(channel: CampaignChannel, address: string) {
  return channel === 'email' ? maskEmail(address) : maskTzPhone(address);
}

async function deliver(channel: CampaignChannel, to: string, subject: string, text: string) {
  if (channel === 'sms') return integrations.sms.send(to, text);
  if (channel === 'whatsapp') return integrations.whatsapp.send(to, text);
  return integrations.email.send(to, subject, text);
}

export function messageFor(brand: Brand, channel: CampaignChannel, body: string, r: { name: string; subscriberId: string | null; customerId: string | null }, code: string | null): string {
  const url = r.subscriberId ? unsubscribeUrl(brand, 's', r.subscriberId) : r.customerId ? unsubscribeUrl(brand, 'c', r.customerId) : `${env.APP_URL.replace(/\/$/, '')}/${brand}`;
  return composeMessage(channel, BRAND_NAMES[brand], renderMessage(body, { name: r.name, code }), url);
}

/** Promo code a campaign may advertise: active, not expired, for this brand or both. */
export async function usableCode(brand: Brand, code: string | null | undefined) {
  if (!code) return null;
  const c = await prisma.discountCode.findUnique({ where: { code } });
  if (!c || !c.active || (c.expiresAt && c.expiresAt < new Date()) || (c.brandKey && c.brandKey !== brand)) return null;
  return c;
}

export interface CampaignStats {
  targeted: number;
  sent: number;
  failed: number;
  optedOut: number;
}

export async function campaignStats(campaignId: string, targeted: number, optedOut: number): Promise<CampaignStats> {
  const g = await prisma.campaignSend.groupBy({ by: ['status'], where: { campaignId }, _count: { _all: true } });
  const n = (s: string) => g.find((x) => x.status === s)?._count._all ?? 0;
  return { targeted, sent: n('sent'), failed: n('failed'), optedOut };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class CampaignError extends Error {}

/**
 * Send (or resume) a campaign. Safe to run again or in parallel: each recipient gets a
 * CampaignSend row keyed by (campaign, hash of address) BEFORE the message goes out, so
 * nobody is messaged twice. Stops after maxPerRun / runBudgetMs and leaves the campaign in
 * "sending"; the cron route resumes it.
 */
export async function sendCampaign(campaignId: string): Promise<{ status: string; stats: CampaignStats; done: boolean }> {
  const claimed = await prisma.campaign.updateMany({ where: { id: campaignId, status: { in: ['draft', 'scheduled', 'sending'] } }, data: { status: 'sending' } });
  if (!claimed.count) throw new CampaignError('This campaign has already been sent or was cancelled');
  const c = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  const brand = c.brandKey as Brand;
  const channel = c.channel as CampaignChannel;
  let code: string | null = null;
  if (c.promoCode) {
    const dc = await usableCode(brand, c.promoCode);
    if (!dc) {
      await prisma.campaign.update({ where: { id: c.id }, data: { status: 'draft' } });
      throw new CampaignError(`Promo code ${c.promoCode} is paused, expired or for another brand. Fix it in Promotions, then send again.`);
    }
    code = dc.code;
  }
  if (usesCode(c.message) && !code) {
    await prisma.campaign.update({ where: { id: c.id }, data: { status: 'draft' } });
    throw new CampaignError('The message uses {code} but no promo code is attached');
  }
  const { recipients, optedOut } = await resolveAudience(brand, channel, c.audience as unknown as Audience);
  const done = new Set((await prisma.campaignSend.findMany({ where: { campaignId: c.id }, select: { toHash: true } })).map((s) => s.toHash));
  const all = recipients.map((r) => ({ ...r, hash: sha256(`${channel}:${r.address}`) }));
  const current = new Set(all.map((r) => r.hash));
  const todo = all.filter((r) => !done.has(r.hash));
  const started = Date.now();
  let processed = 0;
  let finished = true;
  for (let i = 0; i < todo.length; i += MARKETING_DEFAULTS.chunkSize) {
    if (processed >= MARKETING_DEFAULTS.maxPerRun || Date.now() - started > MARKETING_DEFAULTS.runBudgetMs) {
      finished = false;
      break;
    }
    const part = todo.slice(i, i + MARKETING_DEFAULTS.chunkSize);
    for (const r of part) {
      try {
        await prisma.campaignSend.create({ data: { campaignId: c.id, to: mask(channel, r.address), toHash: r.hash, subscriberId: r.subscriberId, customerId: r.customerId, status: 'pending' } });
      } catch {
        continue; // another run already took this recipient
      }
      let status = 'sent';
      let error: string | null = null;
      try {
        await deliver(channel, r.address, c.subject || c.name, messageFor(brand, channel, c.message, r, code));
      } catch (e) {
        status = 'failed';
        error = (e instanceof Error ? e.message : 'Send failed').replace(/\+?\d{9,}/g, '•••').slice(0, 200);
      }
      await prisma.campaignSend.update({ where: { campaignId_toHash: { campaignId: c.id, toHash: r.hash } }, data: { status, error, at: new Date() } });
      processed++;
    }
    if (i + MARKETING_DEFAULTS.chunkSize < todo.length && MARKETING_DEFAULTS.pauseMs) await sleep(MARKETING_DEFAULTS.pauseMs);
  }
  // Targeted = everyone in the audience now, plus anyone already messaged who has since left it.
  const stats = await campaignStats(c.id, all.length + [...done].filter((h) => !current.has(h)).length, optedOut);
  const status = finished ? 'sent' : 'sending';
  await prisma.campaign.update({ where: { id: c.id }, data: { status, stats: stats as unknown as Prisma.InputJsonValue, ...(finished ? { sentAt: new Date() } : {}) } });
  return { status, stats, done: finished };
}

/** Cron: send every scheduled campaign that is due, and resume interrupted ones. */
export async function runDueCampaigns(now = new Date()) {
  const due = await prisma.campaign.findMany({ where: { OR: [{ status: 'scheduled', scheduledAt: { lte: now } }, { status: 'sending', updatedAt: { lt: new Date(now.getTime() - 2 * 60_000) } }] }, select: { id: true }, orderBy: { scheduledAt: 'asc' }, take: 20 });
  const results: { id: string; status: string; error?: string }[] = [];
  for (const d of due) {
    try {
      const r = await sendCampaign(d.id);
      results.push({ id: d.id, status: r.status });
    } catch (e) {
      results.push({ id: d.id, status: 'error', error: e instanceof Error ? e.message.slice(0, 160) : 'error' });
    }
  }
  return results;
}

/** One message to a staff phone/email so they can check the wording before sending. */
export async function testSend(brand: Brand, channel: CampaignChannel, address: string, body: string, subject: string, code: string | null, staffName: string) {
  const text = messageFor(brand, channel, body, { name: staffName, subscriberId: null, customerId: null }, code);
  await deliver(channel, address, `[TEST] ${subject || 'Campaign'}`, `[TEST] ${text}`);
  return text;
}
