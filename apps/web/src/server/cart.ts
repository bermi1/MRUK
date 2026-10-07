import 'server-only';
import { cookies } from 'next/headers';
import { prisma } from '@bt/db';
import { checkDiscount, isAdvanceTerm, isRegion, priceCart } from '@bt/core';
import type { BrandKey, CartView } from '@/lib/types';
import { env } from './env';
import { sign, verifySigned } from './session';

const cartCookie = (brand: BrandKey) => `bt_cart_${brand}`;
const cmpCookie = (brand: BrandKey) => `bt_cmp_${brand}`;

async function cartId(brand: BrandKey): Promise<string | null> {
  const raw = (await cookies()).get(cartCookie(brand))?.value;
  if (!raw) return null;
  const [id, sig] = raw.split('.');
  return id && verifySigned(`cart:${id}`, sig) ? id : null;
}

async function ensureCart(brand: BrandKey) {
  const id = await cartId(brand);
  if (id) {
    const c = await prisma.cart.findUnique({ where: { id } });
    if (c) return c;
  }
  const c = await prisma.cart.create({ data: { brandKey: brand } });
  (await cookies()).set(cartCookie(brand), `${c.id}.${sign(`cart:${c.id}`)}`, { httpOnly: true, sameSite: 'lax', secure: env.isProd, path: '/', maxAge: 60 * 60 * 24 * 30 });
  return c;
}

export async function getCart(brand: BrandKey): Promise<CartView> {
  const id = await cartId(brand);
  const cart = id ? await prisma.cart.findUnique({ where: { id }, include: { items: { include: { product: true }, orderBy: { id: 'asc' } } } }) : null;
  const lines = (cart?.items ?? [])
    .filter((i) => !i.product.hidden)
    .map((i) => ({ productId: i.productId, qty: i.qty, name: i.product.name, model: i.product.model, price: i.product.price, img: i.product.images[0] ?? '', stock: i.product.stock, sub: i.product.sub }));
  const region = cart?.region ?? 'Dar es Salaam';
  const months = cart?.months ?? 12;
  const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
  // Complete bundles from the CMS get their saving automatically.
  let bundleSaving = 0;
  const bundles: { title: string; sets: number; saving: number }[] = [];
  if (lines.length > 1) {
    const deals = await prisma.cmsBlock.findUnique({ where: { brandKey_key: { brandKey: brand, key: 'deals' } } });
    for (const d of ((deals?.json ?? []) as { title: string; items: string[]; save: number }[])) {
      const ls = d.items.map((id) => lines.find((l) => l.productId === id));
      if (!d.items.length || ls.some((l) => !l)) continue;
      const sets = Math.min(...ls.map((l) => l!.qty));
      const saving = Math.round((ls.reduce((a, l) => a + l!.price, 0) * d.save) / 100) * sets;
      bundleSaving += saving;
      bundles.push({ title: d.title, sets, saving });
    }
  }
  let discount = bundleSaving;
  let discountError: string | null = null;
  if (cart?.discountCode) {
    const rule = await prisma.discountCode.findUnique({ where: { code: cart.discountCode } });
    const r = checkDiscount(rule, subtotal, brand);
    if (r.ok) discount += r.amount;
    else discountError = r.reason;
  }
  const t = priceCart(lines, region, discount);
  return { brand, lines, region, months, discountCode: cart?.discountCode ?? null, discountError, bundles, ...t };
}

export async function addToCart(brand: BrandKey, productId: string, qty = 1) {
  const p = await prisma.product.findFirst({ where: { id: productId, brandKey: brand, hidden: false } });
  if (!p) throw new Error('Product not found');
  if (p.stock <= 0) throw new Error('This product is out of stock');
  const cart = await ensureCart(brand);
  const existing = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId } } });
  const next = Math.min((existing?.qty ?? 0) + qty, p.stock, 20);
  await prisma.cartItem.upsert({ where: { cartId_productId: { cartId: cart.id, productId } }, create: { cartId: cart.id, productId, qty: next }, update: { qty: next } });
}

export async function setQty(brand: BrandKey, productId: string, qty: number) {
  const cart = await ensureCart(brand);
  if (qty <= 0) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    return;
  }
  const p = await prisma.product.findFirst({ where: { id: productId, brandKey: brand } });
  if (!p) return;
  await prisma.cartItem.updateMany({ where: { cartId: cart.id, productId }, data: { qty: Math.min(qty, Math.max(p.stock, 1), 20) } });
}

export async function updateCartSettings(brand: BrandKey, patch: { region?: string; months?: number; discountCode?: string | null }) {
  const cart = await ensureCart(brand);
  const data: { region?: string; months?: number; discountCode?: string | null } = {};
  if (patch.region && isRegion(patch.region)) data.region = patch.region;
  if (patch.months && isAdvanceTerm(patch.months)) data.months = patch.months;
  if (patch.discountCode !== undefined) data.discountCode = patch.discountCode ? patch.discountCode.trim().toUpperCase().slice(0, 32) : null;
  await prisma.cart.update({ where: { id: cart.id }, data });
}

export async function clearCart(brand: BrandKey) {
  const id = await cartId(brand);
  if (id) await prisma.cartItem.deleteMany({ where: { cartId: id } });
}

export async function getCartCount(brand: BrandKey): Promise<number> {
  const id = await cartId(brand);
  if (!id) return 0;
  const r = await prisma.cartItem.aggregate({ where: { cartId: id }, _sum: { qty: true } });
  return r._sum.qty ?? 0;
}

// Compare list (max 3 products, non-sensitive, cookie only) -------------------------

export async function getCompareIds(brand: BrandKey): Promise<string[]> {
  const raw = (await cookies()).get(cmpCookie(brand))?.value ?? '';
  return raw.split(',').filter((x) => /^[a-z0-9-]{1,80}$/.test(x)).slice(0, 3);
}

export async function toggleCompare(brand: BrandKey, id: string): Promise<string[]> {
  if (!/^[a-z0-9-]{1,80}$/.test(id)) return getCompareIds(brand);
  const cur = await getCompareIds(brand);
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-3);
  (await cookies()).set(cmpCookie(brand), next.join(','), { sameSite: 'lax', secure: env.isProd, path: '/', maxAge: 60 * 60 * 24 * 30 });
  return next;
}
