'use server';

/**
 * Commerce OS marketing actions: campaigns, subscribers, loyalty adjustments.
 * Same pattern as actions/admin.ts: requireStaff(permission) → brand scope → zod → change → audit() (no PII).
 */
import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { prisma, type Prisma } from '@bt/db';
import { describeAudience, LOYALTY_TIERS, normaliseEmail, normalizeTzPhone, usesCode, type Audience } from '@bt/core';
import type { ActionResult } from '@/lib/types';
import { AuthError, requireStaff, type StaffContext } from '@/server/auth';
import { audit } from '@/server/audit';
import { adjustPoints } from '@/server/loyalty';
import { CampaignError, resolveAudience, sendCampaign, testSend, unsubscribeSubscriber, usableCode } from '@/server/marketing';
import { limit, RateLimitError } from '@/server/ratelimit';

type Msg = { message?: string };

function fail(e: unknown): { ok: false; error: string; field?: string } {
  unstable_rethrow(e);
  if (e instanceof AuthError || e instanceof RateLimitError || e instanceof CampaignError) return { ok: false, error: e.message };
  if (e instanceof z.ZodError) {
    const i = e.issues[0];
    const field = String(i?.path[0] ?? '');
    return { ok: false, error: i ? `${field ? `${field}: ` : ''}${i.message}` : 'Check the form and try again', field };
  }
  if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2002') return { ok: false, error: 'That value is already in use' };
  console.error('[marketing action]', e instanceof Error ? e.message : 'unknown error');
  return { ok: false, error: e instanceof Error && e.message.length < 200 ? e.message : 'Something went wrong. Please try again.' };
}

async function run<T = Msg>(perm: string, fn: (ctx: StaffContext) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const ctx = await requireStaff(perm);
    return { ok: true, data: await fn(ctx) };
  } catch (e) {
    return fail(e);
  }
}

function assertBrand(ctx: StaffContext, brand: string) {
  if (!ctx.canBrand(brand)) throw new AuthError('You do not have access to this brand');
}

const brandZ = z.enum(['mruk', 'skywood']);
const channelZ = z.enum(['sms', 'whatsapp', 'email']);
const idZ = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/, 'Invalid id');
const textZ = (max: number, min = 0) => z.string().trim().min(min, min ? `Enter at least ${min} characters` : undefined).max(max, `Keep it under ${max} characters`);
const optInt = (min: number, max: number) =>
  z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)), z.number({ invalid_type_error: 'Enter a number' }).int('Whole numbers only').min(min).max(max).optional());

const audienceZ = z.object({
  type: z.enum(['subscribers', 'customers', 'all']),
  filters: z
    .object({
      boughtCategory: z.preprocess((v) => (v === '' ? undefined : v), z.string().regex(/^[a-z0-9-]{1,40}$/, 'Choose a category').optional()),
      lastOrderBeforeDays: optInt(1, 3650),
      minOrders: optInt(1, 1000),
      tier: z.preprocess((v) => (v === '' ? undefined : v), z.enum(LOYALTY_TIERS as [string, ...string[]]).optional()),
    })
    .default({}),
});

function revalidateMarketing() {
  revalidatePath('/admin', 'layout');
}

// Audience ------------------------------------------------------------------------------------------

export async function audienceCountAction(brand: string, channel: string, audience: unknown): Promise<ActionResult<{ count: number; optedOut: number; label: string }>> {
  return run('marketing', async (ctx) => {
    const b = brandZ.parse(brand);
    assertBrand(ctx, b);
    const a = audienceZ.parse(audience) as Audience;
    const r = await resolveAudience(b, channelZ.parse(channel), a);
    return { count: r.recipients.length, optedOut: r.optedOut, label: describeAudience(a) };
  });
}

// Campaigns ------------------------------------------------------------------------------------------

const EAT_OFFSET = '+03:00';

const campaignZ = z.object({
  brand: brandZ,
  name: textZ(80, 3),
  channel: channelZ,
  audience: audienceZ,
  message: textZ(1000, 5),
  subject: textZ(120).default(''),
  promoCode: z.preprocess((v) => (v === '' ? undefined : v), z.string().trim().toUpperCase().pipe(z.string().regex(/^[A-Z0-9]{3,20}$/, 'Choose a promo code')).optional()),
  newCode: z
    .object({
      code: z.string().trim().toUpperCase().pipe(z.string().regex(/^[A-Z0-9]{3,20}$/, 'Codes are 3–20 letters or digits')),
      percent: z.coerce.number().int('Whole numbers only').min(1, 'At least 1%').max(90, 'At most 90%'),
      expiresAt: z.preprocess((v) => (v === '' ? undefined : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid end date').optional()),
    })
    .optional(),
  mode: z.enum(['draft', 'schedule', 'send']),
  scheduledAt: z.string().optional(),
});

export async function saveCampaignAction(input: unknown): Promise<ActionResult<Msg & { id?: string }>> {
  return run('marketing.write', async (ctx) => {
    const p = campaignZ.parse(input);
    assertBrand(ctx, p.brand);
    if (p.channel === 'email' && !p.subject) throw new z.ZodError([{ code: 'custom', path: ['subject'], message: 'Add an email subject' }]);
    let code = p.promoCode ?? null;
    if (p.newCode) {
      if (!ctx.can('promos.write')) throw new AuthError('Creating promo codes needs the Promotions permission');
      const expiresAt = p.newCode.expiresAt ? new Date(`${p.newCode.expiresAt}T20:59:59Z`) : null; // 23:59 EAT
      if (expiresAt && expiresAt < new Date()) throw new Error('The promo code end date is in the past');
      const dc = await prisma.discountCode.create({ data: { code: p.newCode.code, percent: p.newCode.percent, brandKey: p.brand, active: true, expiresAt } });
      await audit(ctx.email, 'discount.create', 'DiscountCode', dc.id, { code: dc.code, percent: dc.percent, brandKey: p.brand, via: 'campaign' });
      code = dc.code;
    } else if (code && !(await usableCode(p.brand, code))) throw new Error(`Promo code ${code} is paused, expired or for another brand`);
    if (usesCode(p.message) && !code) throw new Error('The message uses {code}: choose or create a promo code');
    let scheduledAt: Date | null = null;
    if (p.mode === 'schedule') {
      if (!p.scheduledAt || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(p.scheduledAt)) throw new Error('Choose the date and time to send');
      scheduledAt = new Date(`${p.scheduledAt}:00${EAT_OFFSET}`);
      const ms = scheduledAt.getTime() - Date.now();
      if (!(ms > 60_000)) throw new Error('Choose a time at least a few minutes from now');
      if (ms > 120 * 86_400_000) throw new Error('Schedule at most 120 days ahead');
    }
    if (p.mode === 'send') await limit('campaign-send', 10, 3600, ctx.id);
    const c = await prisma.campaign.create({
      data: {
        brandKey: p.brand,
        name: p.name,
        channel: p.channel,
        audience: p.audience as unknown as Prisma.InputJsonValue,
        message: p.message,
        subject: p.channel === 'email' ? p.subject : '',
        promoCode: code,
        status: p.mode === 'schedule' ? 'scheduled' : 'draft',
        scheduledAt,
        createdBy: ctx.email,
      },
    });
    await audit(ctx.email, `campaign.${p.mode === 'schedule' ? 'schedule' : 'create'}`, 'Campaign', c.id, { brand: p.brand, channel: p.channel, audience: p.audience as unknown as Prisma.InputJsonValue, promoCode: code, scheduledAt: scheduledAt?.toISOString() ?? null });
    if (p.mode === 'send') {
      const r = await sendCampaign(c.id);
      await audit(ctx.email, 'campaign.send', 'Campaign', c.id, { ...r.stats, done: r.done });
      revalidateMarketing();
      return { message: r.done ? `Sent to ${r.stats.sent} of ${r.stats.targeted} recipients${r.stats.failed ? ` (${r.stats.failed} failed)` : ''}` : `Sending: ${r.stats.sent} so far; the rest go out in the next run`, id: c.id };
    }
    revalidateMarketing();
    return { message: p.mode === 'schedule' ? 'Campaign scheduled' : 'Draft saved', id: c.id };
  });
}

async function loadCampaign(ctx: StaffContext, id: string) {
  const c = await prisma.campaign.findUnique({ where: { id: idZ.parse(id) } });
  if (!c) throw new Error('Campaign not found');
  assertBrand(ctx, c.brandKey);
  return c;
}

export async function sendCampaignAction(id: string): Promise<ActionResult<Msg>> {
  return run('marketing.write', async (ctx) => {
    const c = await loadCampaign(ctx, id);
    if (!['draft', 'scheduled', 'sending'].includes(c.status)) throw new Error(`A ${c.status} campaign cannot be sent`);
    await limit('campaign-send', 10, 3600, ctx.id);
    const r = await sendCampaign(c.id);
    await audit(ctx.email, 'campaign.send', 'Campaign', c.id, { ...r.stats, done: r.done });
    revalidateMarketing();
    return { message: r.done ? `Sent to ${r.stats.sent} of ${r.stats.targeted} recipients` : `Sending: ${r.stats.sent} so far` };
  });
}

export async function cancelCampaignAction(id: string): Promise<ActionResult<Msg>> {
  return run('marketing.write', async (ctx) => {
    const c = await loadCampaign(ctx, id);
    const r = await prisma.campaign.updateMany({ where: { id: c.id, status: { in: ['draft', 'scheduled'] } }, data: { status: 'cancelled' } });
    if (!r.count) throw new Error('Only drafts and scheduled campaigns can be cancelled');
    await audit(ctx.email, 'campaign.cancel', 'Campaign', c.id, { from: c.status });
    revalidateMarketing();
    return { message: 'Campaign cancelled' };
  });
}

export async function testSendAction(input: unknown): Promise<ActionResult<Msg>> {
  return run('marketing.write', async (ctx) => {
    const p = z.object({ brand: brandZ, channel: channelZ, to: z.string().trim().max(160), message: textZ(1000, 1), subject: textZ(120).default(''), promoCode: z.string().trim().toUpperCase().max(20).optional() }).parse(input);
    assertBrand(ctx, p.brand);
    const to = p.channel === 'email' ? normaliseEmail(p.to) : normalizeTzPhone(p.to);
    if (!to) throw new Error(p.channel === 'email' ? 'Enter a valid email address' : 'Enter a valid +255 mobile number');
    await limit('campaign-test', 10, 3600, ctx.id);
    const code = p.promoCode ? ((await usableCode(p.brand, p.promoCode))?.code ?? p.promoCode) : 'CODE';
    await testSend(p.brand, p.channel, to, p.message, p.subject, code, ctx.name);
    await audit(ctx.email, 'campaign.test_send', 'Campaign', '', { brand: p.brand, channel: p.channel });
    return { message: 'Test message sent' };
  });
}

// Subscribers -------------------------------------------------------------------------------------

export async function unsubscribeSubscriberAction(id: string): Promise<ActionResult<Msg>> {
  return run('marketing.write', async (ctx) => {
    const s = await prisma.subscriber.findUnique({ where: { id: idZ.parse(id) } });
    if (!s) throw new Error('Subscriber not found');
    assertBrand(ctx, s.brandKey);
    await unsubscribeSubscriber(s.id);
    await audit(ctx.email, 'subscriber.unsubscribe', 'Subscriber', s.id, { brand: s.brandKey });
    revalidateMarketing();
    return { message: 'Unsubscribed' };
  });
}

// Loyalty ---------------------------------------------------------------------------------------------

export async function adjustLoyaltyAction(customerId: string, fd: FormData): Promise<ActionResult<Msg>> {
  return run('marketing.write', async (ctx) => {
    const id = idZ.parse(customerId);
    const f = z
      .object({ brand: brandZ, points: z.coerce.number({ invalid_type_error: 'Enter a number' }).int('Whole numbers only').min(-1_000_000).max(1_000_000).refine((n) => n !== 0, 'Enter points to add (or a negative number to remove)'), reason: textZ(160, 3) })
      .parse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === 'string')));
    assertBrand(ctx, f.brand);
    const c = await prisma.customer.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
    if (!c || c.deletedAt) throw new Error('Customer not found');
    const row = await adjustPoints(c.id, f.brand, f.points, f.reason, ctx.name);
    await audit(ctx.email, 'loyalty.adjust', 'Customer', c.id, { brand: f.brand, points: f.points, ledgerId: row.id });
    revalidateMarketing();
    return { message: `${f.points > 0 ? '+' : ''}${f.points} points recorded` };
  });
}
