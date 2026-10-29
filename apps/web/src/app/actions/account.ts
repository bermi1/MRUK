'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@bt/db';
import { normaliseOrderNumber, REGIONS } from '@bt/core';
import type { ActionResult } from '@/lib/types';
import { addToCart } from '@/server/cart';
import { isBrandKey } from '@/server/catalog';
import { setCustomerPrefs } from '@/server/marketing';
import { limit, RateLimitError } from '@/server/ratelimit';
import { currentCustomer } from '@/server/session';

/**
 * Customer dashboard actions. Every query is scoped to the signed-in customer's id (or the phone
 * they signed in with, for guest orders), so another customer's ids simply match nothing (IDOR-safe).
 * Errors are i18n message keys (lib/i18n.ts, "accErr*"); nothing personal is logged.
 */
const brandZ = z.string().refine(isBrandKey);
const idZ = z.string().regex(/^[a-z0-9]{8,40}$/i);
const MAX_ADDRESSES = 10;

class Fail extends Error {}

function fail(e: unknown): { ok: false; error: string } {
  if (e instanceof Fail) return { ok: false, error: e.message };
  if (e instanceof RateLimitError) return { ok: false, error: 'accErrTooMany' };
  if (e instanceof z.ZodError) return { ok: false, error: 'accErrInvalid' };
  console.error('[account]', e instanceof Error ? e.name : 'error');
  return { ok: false, error: 'accErrGeneric' };
}

async function me(action: string) {
  const c = await currentCustomer();
  if (!c) throw new Fail('accErrSignIn');
  await limit(`account-${action}`, 30, 600, c.id);
  return c;
}

function refresh(brand: string) {
  revalidatePath(`/${brand}/account`);
}

// Addresses ---------------------------------------------------------------------------------------

const addressZ = z.object({
  region: z.enum(REGIONS.map((r) => r.name) as [string, ...string[]]),
  line: z.string().trim().min(5).max(240),
  makeDefault: z.boolean().default(false),
});

export async function addAddressAction(brand: string, input: unknown): Promise<ActionResult> {
  try {
    const b = brandZ.parse(brand);
    const c = await me('address');
    const d = addressZ.parse(input);
    const count = await prisma.address.count({ where: { customerId: c.id } });
    if (count >= MAX_ADDRESSES) throw new Fail('accErrMaxAddresses');
    const isDefault = d.makeDefault || count === 0;
    await prisma.$transaction([
      ...(isDefault ? [prisma.address.updateMany({ where: { customerId: c.id }, data: { isDefault: false } })] : []),
      prisma.address.create({ data: { customerId: c.id, region: d.region, line: d.line, isDefault } }),
    ]);
    refresh(b);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeAddressAction(brand: string, id: string): Promise<ActionResult> {
  try {
    const b = brandZ.parse(brand);
    const c = await me('address');
    const addressId = idZ.parse(id);
    const own = await prisma.address.findFirst({ where: { id: addressId, customerId: c.id }, select: { id: true, isDefault: true } });
    if (!own) throw new Fail('accErrNotFound');
    await prisma.address.deleteMany({ where: { id: own.id, customerId: c.id } });
    if (own.isDefault) {
      const next = await prisma.address.findFirst({ where: { customerId: c.id }, orderBy: { id: 'asc' }, select: { id: true } });
      if (next) await prisma.address.updateMany({ where: { id: next.id, customerId: c.id }, data: { isDefault: true } });
    }
    refresh(b);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setDefaultAddressAction(brand: string, id: string): Promise<ActionResult> {
  try {
    const b = brandZ.parse(brand);
    const c = await me('address');
    const addressId = idZ.parse(id);
    const own = await prisma.address.findFirst({ where: { id: addressId, customerId: c.id }, select: { id: true } });
    if (!own) throw new Fail('accErrNotFound');
    await prisma.$transaction([
      prisma.address.updateMany({ where: { customerId: c.id }, data: { isDefault: false } }),
      prisma.address.updateMany({ where: { id: own.id, customerId: c.id }, data: { isDefault: true } }),
    ]);
    refresh(b);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// Marketing preferences ---------------------------------------------------------------------------

const prefsZ = z.object({ sms: z.boolean(), email: z.boolean(), whatsapp: z.boolean() });

export async function setMarketingPrefsAction(brand: string, input: unknown): Promise<ActionResult> {
  try {
    const b = brandZ.parse(brand) as 'mruk' | 'skywood';
    const c = await me('prefs');
    const p = prefsZ.parse(input);
    if (p.email && !c.email) throw new Fail('accErrNeedEmail');
    await setCustomerPrefs(b, c, p);
    refresh(b);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// Reorder -----------------------------------------------------------------------------------------

/** Put a past order's items back in this brand's cart. Products no longer sold or out of stock are skipped. */
export async function reorderAction(brand: string, number: string): Promise<ActionResult<{ added: number; skipped: number }>> {
  try {
    const b = brandZ.parse(brand) as 'mruk' | 'skywood';
    const c = await me('reorder');
    const n = normaliseOrderNumber(z.string().max(20).parse(number));
    const o = await prisma.order.findFirst({ where: { number: n, brandKey: b, OR: [{ customerId: c.id }, { contactPhone: c.phone }] }, select: { items: { select: { productId: true, qty: true } } } });
    if (!o) throw new Fail('accErrNotFound');
    let added = 0;
    let skipped = 0;
    for (const i of o.items) {
      try {
        await addToCart(b, i.productId, Math.min(Math.max(i.qty, 1), 20));
        added++;
      } catch {
        skipped++;
      }
    }
    revalidatePath(`/${b}`, 'layout');
    return { ok: true, data: { added, skipped } };
  } catch (e) {
    return fail(e);
  }
}
