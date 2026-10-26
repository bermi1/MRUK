'use server';

/**
 * Storefront marketing actions (contract shared with the storefront team; keep signatures stable).
 * No PII in logs: errors are logged by message only and never include the input.
 */
import { z } from 'zod';
import { normaliseEmail, normalizeTzPhone } from '@bt/core';
import { subscribe, unsubscribeByToken } from '@/server/marketing';
import { limit, RateLimitError } from '@/server/ratelimit';
import { currentCustomer } from '@/server/session';

const BRAND_NAME = { mruk: 'Mr UK', skywood: 'Skywood' } as const;

const inputZ = z.object({
  name: z.string().trim().max(120, 'Keep your name under 120 characters').optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().max(160).optional(),
  consent: z.boolean(),
  source: z.enum(['footer', 'home', 'signup', 'checkout']),
});

export async function subscribeAction(
  brand: 'mruk' | 'skywood',
  input: { name?: string; phone?: string; email?: string; consent: boolean; source: 'footer' | 'home' | 'signup' | 'checkout' },
): Promise<{ ok: true; data: { message: string } } | { ok: false; error: string }> {
  try {
    const b = z.enum(['mruk', 'skywood']).parse(brand);
    const okMsg = `Thank you. You will hear about ${BRAND_NAME[b]} offers first. Reply STOP to any message to opt out.`;
    // Bot protection: a filled hidden "website" field (honeypot) gets a silent success and is dropped.
    const honeypot = input && typeof input === 'object' ? (input as Record<string, unknown>).website : undefined;
    if (typeof honeypot === 'string' && honeypot.trim()) return { ok: true, data: { message: okMsg } };
    const p = inputZ.parse(input);
    if (!p.consent) return { ok: false, error: 'Please agree to receive offers so we can sign you up' };
    const phone = p.phone ? normalizeTzPhone(p.phone) : null;
    if (p.phone && !phone) return { ok: false, error: 'Enter a valid Tanzanian mobile number, e.g. +255 754 000 214' };
    const email = p.email ? normaliseEmail(p.email) : null;
    if (p.email && !email) return { ok: false, error: 'Enter a valid email address' };
    if (!phone && !email) return { ok: false, error: 'Enter your phone number or email address' };
    await limit('subscribe', 5, 60 * 60, phone ?? email ?? undefined);
    const me = await currentCustomer();
    const customerId = me && (!phone || me.phone === phone) ? me.id : null;
    const r = await subscribe(b, { name: p.name ?? '', phone, email, source: p.source, customerId });
    return { ok: true, data: { message: r.created ? okMsg : `You are already on the ${BRAND_NAME[b]} list. We have updated your details.` } };
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? 'Check the form and try again' };
    console.error('[subscribe]', e instanceof Error ? e.message : 'unknown error');
    return { ok: false, error: 'We could not sign you up just now. Please try again.' };
  }
}

/** Confirm button on /[brand]/unsubscribe (a POST, so link scanners in SMS apps cannot unsubscribe people). */
export async function unsubscribeAction(brand: 'mruk' | 'skywood', token: string): Promise<{ ok: true; data: { message: string } } | { ok: false; error: string }> {
  try {
    const b = z.enum(['mruk', 'skywood']).parse(brand);
    await limit('unsubscribe', 20, 60 * 60);
    const ok = await unsubscribeByToken(b, z.string().max(200).parse(token));
    return ok ? { ok: true, data: { message: `You will no longer receive ${BRAND_NAME[b]} offers by SMS, WhatsApp or email.` } } : { ok: false, error: 'This unsubscribe link is not valid. Reply STOP to any of our messages instead.' };
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: e.message };
    console.error('[unsubscribe]', e instanceof Error ? e.message : 'unknown error');
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}
