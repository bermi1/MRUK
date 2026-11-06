import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { prisma } from '@bt/db';
import { PAY_LATER_KEYS, payLaterKey, payLaterStates, payLaterValue, type PayLaterBrand, type PayLaterState } from '@bt/core';
import type { BrandKey } from '@/lib/types';
import { audit } from './audit';
import { CATALOG_TAG, refreshCatalog } from './catalog';

/**
 * "Pay Later by Azania Bank" per-brand switch (Setting payLater.<brand>, default OFF; see @bt/core paylater.ts).
 * Storefront reads go through the catalogue cache (tag 'catalog'); setPayLater() refreshes it.
 * Purchases re-check the database directly (payLaterLive) so a stale page can never place an advance order.
 */
const loadStates = unstable_cache(async () => payLaterStates(await prisma.setting.findMany({ where: { key: { in: PAY_LATER_KEYS } } })), ['paylater'], { tags: [CATALOG_TAG], revalidate: 60 });

export const getPayLaterStates = cache(async (): Promise<Record<PayLaterBrand, PayLaterState>> => loadStates());

/** Cached: is Pay Later shown on this brand's storefront? */
export async function payLaterOn(brand: BrandKey): Promise<boolean> {
  return (await getPayLaterStates())[brand].enabled;
}

/** Uncached read for server-side enforcement (checkout, mini app purchase). */
export async function payLaterLive(brand: BrandKey): Promise<boolean> {
  return payLaterStates(await prisma.setting.findMany({ where: { key: payLaterKey(brand) } }))[brand].enabled;
}

/** Admin: switch Pay Later for one brand, audit it and refresh the storefront cache. */
export async function setPayLater(brand: BrandKey, enabled: boolean, actor: string): Promise<PayLaterState> {
  const value = payLaterValue(enabled, actor);
  const key = payLaterKey(brand);
  await prisma.setting.upsert({ where: { key }, create: { key, value: { ...value } }, update: { value: { ...value } } });
  await audit(actor, enabled ? 'paylater.on' : 'paylater.off', 'Setting', key, { enabled });
  refreshCatalog();
  return value;
}

/** Uncached admin read of both brands (shows who changed it and when). */
export async function payLaterAdminStates(): Promise<Record<PayLaterBrand, PayLaterState>> {
  return payLaterStates(await prisma.setting.findMany({ where: { key: { in: PAY_LATER_KEYS } } }));
}
