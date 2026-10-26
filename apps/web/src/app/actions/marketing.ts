'use server';

/**
 * TEMPORARY STUB — the marketing backend (another engineer) replaces this file at merge.
 * Contract (do not change): subscribeAction(brand, input) → { ok, data: { message } } | { ok: false, error }.
 * The stub validates input the same way the UI expects, stores nothing and never logs PII.
 */
export async function subscribeAction(
  brand: 'mruk' | 'skywood',
  input: { name?: string; phone?: string; email?: string; consent: boolean; source: 'footer' | 'home' | 'signup' | 'checkout' },
): Promise<{ ok: true; data: { message: string } } | { ok: false; error: string }> {
  if (brand !== 'mruk' && brand !== 'skywood') return { ok: false, error: 'Unknown brand' };
  if (!input || input.consent !== true) return { ok: false, error: 'Please tick the consent box.' };
  const phone = (input.phone ?? '').replace(/[\s-]/g, '');
  const email = (input.email ?? '').trim();
  if (!phone && !email) return { ok: false, error: 'Enter a phone number or an email.' };
  if (phone && !/^(\+?255|0)[67]\d{8}$/.test(phone)) return { ok: false, error: 'Enter a valid Tanzanian mobile number (+255…).' };
  if (email && !/^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(email)) return { ok: false, error: 'Enter a valid email address.' };
  return { ok: true, data: { message: 'Thanks — you are subscribed.' } };
}
