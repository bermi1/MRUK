'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@bt/db';
import { isPaymentMethod } from '@bt/core';
import type { ActionResult } from '@/lib/types';
import { AuthError, requestOtp, verifyOtp } from '@/server/auth';
import { addToCart, getCart, setQty, toggleCompare, updateCartSettings } from '@/server/cart';
import { getProducts, isBrandKey } from '@/server/catalog';
import { LOCALE_COOKIE } from '@/server/locale';
import { capturePayment, CheckoutError, confirmationPath, confirmationToken, placeAdvanceOrder, placeOrder } from '@/server/orders';
import { clientIp, RateLimitError } from '@/server/ratelimit';
import { CUSTOMER_COOKIE, currentCustomer, endSession } from '@/server/session';
import { aiAnswer, aiTips, aiVerdict, createTicket } from '@/server/support';

const brandZ = z.string().refine(isBrandKey, 'Unknown brand');
const idZ = z.string().regex(/^[a-z0-9-]{1,80}$/);

function fail(e: unknown): { ok: false; error: string; field?: string } {
  if (e instanceof CheckoutError) return { ok: false, error: e.message, field: e.field };
  if (e instanceof AuthError || e instanceof RateLimitError) return { ok: false, error: e.message };
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? 'Check the form and try again', field: String(e.issues[0]?.path[0] ?? '') };
  console.error('[action]', e instanceof Error ? e.message : e);
  return { ok: false, error: e instanceof Error && e.message.length < 140 ? e.message : 'Something went wrong. Please try again.' };
}

// Cart ---------------------------------------------------------------------------------

export async function addToCartAction(brand: string, productId: string, qty = 1): Promise<ActionResult<{ count: number }>> {
  try {
    const b = brandZ.parse(brand) as 'mruk' | 'skywood';
    await addToCart(b, idZ.parse(productId), z.number().int().min(1).max(20).parse(qty));
    revalidatePath(`/${b}`, 'layout');
    return { ok: true, data: { count: (await getCart(b)).count } };
  } catch (e) {
    return fail(e);
  }
}

export async function addBundleAction(brand: string, ids: string[]): Promise<ActionResult> {
  try {
    const b = brandZ.parse(brand) as 'mruk' | 'skywood';
    for (const id of z.array(idZ).max(6).parse(ids)) await addToCart(b, id, 1);
    revalidatePath(`/${b}`, 'layout');
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setQtyAction(brand: string, productId: string, qty: number): Promise<ActionResult> {
  try {
    const b = brandZ.parse(brand) as 'mruk' | 'skywood';
    await setQty(b, idZ.parse(productId), z.number().int().min(0).max(20).parse(qty));
    revalidatePath(`/${b}`, 'layout');
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateCartAction(brand: string, patch: { region?: string; months?: number; discountCode?: string | null }): Promise<ActionResult> {
  try {
    const b = brandZ.parse(brand) as 'mruk' | 'skywood';
    const p = z.object({ region: z.string().max(40).optional(), months: z.number().int().optional(), discountCode: z.string().max(32).nullable().optional() }).parse(patch);
    await updateCartSettings(b, p);
    revalidatePath(`/${b}`, 'layout');
    const cart = await getCart(b);
    if (p.discountCode && cart.discountError) return { ok: false, error: cart.discountError, field: 'discount' };
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleCompareAction(brand: string, productId: string): Promise<ActionResult<{ ids: string[] }>> {
  try {
    const b = brandZ.parse(brand) as 'mruk' | 'skywood';
    const ids = await toggleCompare(b, idZ.parse(productId));
    revalidatePath(`/${b}`, 'layout');
    return { ok: true, data: { ids } };
  } catch (e) {
    return fail(e);
  }
}

// Checkout -----------------------------------------------------------------------------

const contactZ = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(120),
  phone: z.string().trim().min(9, 'Enter your phone number').max(20),
  email: z.union([z.literal(''), z.string().email('Enter a valid email')]).optional(),
  address: z.string().max(240).optional(),
});

export async function placeOrderAction(brand: string, input: unknown): Promise<ActionResult<{ redirect: string }>> {
  try {
    const b = brandZ.parse(brand) as 'mruk' | 'skywood';
    const d = contactZ.extend({ method: z.string().refine(isPaymentMethod), consent: z.boolean(), channel: z.enum(['web', 'app']).default('web') }).parse(input);
    if (d.method === 'salary_advance') throw new CheckoutError('Use the Salary Advance application for this payment method');
    const customer = await currentCustomer();
    const r = await placeOrder(b, { ...d, method: d.method as 'card' | 'azania_account' | 'pay_on_delivery', region: '', customerId: customer?.id });
    revalidatePath(`/${b}`, 'layout');
    return { ok: true, data: { redirect: r.next === 'pay' ? `/${b}/pay/${r.number}?t=${confirmationToken(r.number)}` : confirmationPath(b, r.number) } };
  } catch (e) {
    return fail(e);
  }
}

const advanceZ = contactZ.extend({
  months: z.number().int(),
  nida: z.string().trim().min(10, 'Enter your NIDA number').max(30),
  employer: z.string().trim().min(2, 'Enter your employer').max(160),
  checkNumber: z.string().trim().min(1, 'Enter your check / employee number').max(40),
  jobTitle: z.string().trim().max(120).default(''),
  netSalary: z.number().int().min(1, 'Enter your net monthly salary').max(1_000_000_000),
  account: z.string().trim().min(10, 'Enter your Azania Bank salary account number').max(24),
  signature: z.string().trim().min(4, 'Type your full name to sign').max(120),
  consents: z.tuple([z.boolean(), z.boolean()]),
  channel: z.enum(['web', 'app']).default('web'),
});

export async function placeAdvanceOrderAction(brand: string, input: unknown): Promise<ActionResult<{ redirect: string }>> {
  try {
    const b = brandZ.parse(brand) as 'mruk' | 'skywood';
    const d = advanceZ.parse(input);
    const customer = await currentCustomer();
    const r = await placeAdvanceOrder(b, { ...d, region: '', customerId: customer?.id, signerIp: await clientIp() });
    revalidatePath(`/${b}`, 'layout');
    return { ok: true, data: { redirect: confirmationPath(b, r.number) } };
  } catch (e) {
    return fail(e);
  }
}

export async function payAction(number: string, method: 'card' | 'azania_account', details: Record<string, string>): Promise<ActionResult> {
  try {
    const n = z.string().regex(/^(MU|SW)-\d{4,7}$/).parse(number);
    const d = z.object({ cardNumber: z.string().max(24).optional(), expiry: z.string().max(5).optional(), cvc: z.string().max(4).optional(), account: z.string().max(24).optional(), pin: z.string().max(6).optional() }).parse(details);
    await capturePayment(n, z.enum(['card', 'azania_account']).parse(method), d);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// Customer auth -------------------------------------------------------------------------

export async function requestOtpAction(phone: string): Promise<ActionResult<{ phone: string; devCode?: string }>> {
  try {
    return { ok: true, data: await requestOtp(z.string().max(20).parse(phone)) };
  } catch (e) {
    return fail(e);
  }
}

export async function verifyOtpAction(phone: string, code: string, profile?: { name?: string; email?: string }): Promise<ActionResult<{ name: string }>> {
  try {
    const p = z.object({ name: z.string().max(120).optional(), email: z.union([z.literal(''), z.string().email()]).optional() }).parse(profile ?? {});
    const locale = (await cookies()).get(LOCALE_COOKIE)?.value;
    const c = await verifyOtp(z.string().max(20).parse(phone), z.string().max(6).parse(code), { ...p, locale });
    revalidatePath('/', 'layout');
    return { ok: true, data: { name: c.name } };
  } catch (e) {
    return fail(e);
  }
}

export async function logoutAction(): Promise<void> {
  await endSession(CUSTOMER_COOKIE);
  revalidatePath('/', 'layout');
}

export async function updateProfileAction(input: { name: string; email: string }): Promise<ActionResult> {
  try {
    const c = await currentCustomer();
    if (!c) return { ok: false, error: 'Sign in first' };
    const d = z.object({ name: z.string().trim().min(2).max(120), email: z.union([z.literal(''), z.string().email('Enter a valid email')]) }).parse(input);
    await prisma.customer.update({ where: { id: c.id }, data: d });
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** PDPA 2022: customers can delete their account. Orders are kept for tax law but unlinked and anonymised. */
export async function deleteAccountAction(): Promise<void> {
  const c = await currentCustomer();
  if (!c) return;
  await prisma.$transaction([
    prisma.order.updateMany({ where: { customerId: c.id }, data: { customerId: null } }),
    prisma.address.deleteMany({ where: { customerId: c.id } }),
    prisma.session.deleteMany({ where: { customerId: c.id } }),
    prisma.customer.update({ where: { id: c.id }, data: { name: '', email: '', phone: `deleted-${c.id}`, deletedAt: new Date() } }),
  ]);
  await endSession(CUSTOMER_COOKIE);
  redirect('/');
}

export async function setLocaleAction(locale: 'en' | 'sw'): Promise<void> {
  (await cookies()).set(LOCALE_COOKIE, locale === 'sw' ? 'sw' : 'en', { sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 });
  const c = await currentCustomer();
  if (c) await prisma.customer.update({ where: { id: c.id }, data: { locale } });
  revalidatePath('/', 'layout');
}

// Support and AI ------------------------------------------------------------------------

export async function createTicketAction(brand: string, form: FormData): Promise<ActionResult<{ number: string; phone: string }>> {
  try {
    const b = brandZ.parse(brand) as 'mruk' | 'skywood';
    const photo = form.get('photo');
    let ph: { data: Uint8Array; contentType: string } | null = null;
    if (photo instanceof File && photo.size > 0) {
      if (photo.size > 5 * 1024 * 1024) throw new Error('Photo must be smaller than 5 MB');
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) throw new Error('Photo must be a JPG, PNG or WebP image');
      ph = { data: new Uint8Array(await photo.arrayBuffer()), contentType: photo.type };
    }
    const s = (k: string) => String(form.get(k) ?? '');
    const r = await createTicket({ brand: b, issue: s('issue'), name: s('name'), phone: s('phone'), orderNumber: s('order'), productId: s('productId'), description: s('description'), photo: ph, channel: s('channel') || 'web' });
    return { ok: true, data: r };
  } catch (e) {
    return fail(e);
  }
}

async function productsByIds(brand: 'mruk' | 'skywood', ids: string[]) {
  const all = await getProducts(brand);
  return ids.map((id) => all.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
}

export async function aiVerdictAction(brand: string, ids: string[], months: number): Promise<ActionResult<{ text: string }>> {
  try {
    const b = brandZ.parse(brand) as 'mruk' | 'skywood';
    const items = await productsByIds(b, z.array(idZ).min(1).max(3).parse(ids));
    if (!items.length) return { ok: false, error: 'Add products to compare first' };
    const r = await aiVerdict(items, [3, 6, 12].includes(months) ? months : 12);
    return { ok: true, data: { text: r.text } };
  } catch (e) {
    return fail(e);
  }
}

export async function aiAskAction(brand: string, ids: string[], question: string, months: number): Promise<ActionResult<{ text: string }>> {
  try {
    const b = brandZ.parse(brand) as 'mruk' | 'skywood';
    const items = await productsByIds(b, z.array(idZ).min(1).max(3).parse(ids));
    const r = await aiAnswer(items, z.string().trim().min(2, 'Type a question').max(300).parse(question), [3, 6, 12].includes(months) ? months : 12);
    return { ok: true, data: { text: r.text } };
  } catch (e) {
    return fail(e);
  }
}

export async function aiTipsAction(brand: string, issue: string, productId: string, description: string): Promise<ActionResult<{ text: string }>> {
  try {
    const b = brandZ.parse(brand) as 'mruk' | 'skywood';
    const p = productId ? (await productsByIds(b, [idZ.parse(productId)]))[0] ?? null : null;
    return { ok: true, data: { text: await aiTips(z.string().max(40).parse(issue), p, z.string().max(2000).parse(description)) } };
  } catch (e) {
    return fail(e);
  }
}
