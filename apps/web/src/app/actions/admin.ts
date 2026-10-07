'use server';

/**
 * Commerce OS admin server actions. Every mutation:
 * requireStaff(permission) → brand scope check → zod validation → change → audit() (no PII in diffs).
 */
import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect, unstable_rethrow } from 'next/navigation';
import QRCode from 'qrcode';
import { z } from 'zod';
import { hashPassword, prisma, type Prisma } from '@bt/db';
import { ORDER_STATUSES, type OrderStatus } from '@bt/core';
import type { ActionResult } from '@/lib/types';
import { AuthError, beginTotpEnrolment, requireStaff, staffLogout, staffPasswordLogin, verifyStaffTotp, type StaffContext } from '@/server/auth';
import { audit } from '@/server/audit';
import { integrations } from '@/server/integrations';
import { advanceLifecycle, decideAdvance, requestBankDecision, transitionOrder } from '@/server/orders';
import { RateLimitError } from '@/server/ratelimit';
import { BRAND_COOKIE, BRANCH_COOKIE } from '@/server/admin/context';
import { storePublicImage, UploadError } from '@/server/admin/files';

type Msg = { message?: string };

function fail(e: unknown): { ok: false; error: string; field?: string } {
  unstable_rethrow(e);
  if (e instanceof AuthError || e instanceof RateLimitError || e instanceof UploadError) return { ok: false, error: e.message };
  if (e instanceof z.ZodError) {
    const i = e.issues[0];
    const field = String(i?.path[0] ?? '');
    return { ok: false, error: i ? `${field ? `${field}: ` : ''}${i.message}` : 'Check the form and try again', field };
  }
  if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2002') return { ok: false, error: 'That value is already in use' };
  console.error('[admin action]', e instanceof Error ? e.message : 'unknown error');
  return { ok: false, error: e instanceof Error && e.message.length < 160 ? e.message : 'Something went wrong. Please try again.' };
}

async function run<T = Msg>(perm: string, fn: (ctx: StaffContext) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const ctx = await requireStaff(perm);
    const data = await fn(ctx);
    return { ok: true, data };
  } catch (e) {
    return fail(e);
  }
}

function assertBrand(ctx: StaffContext, brand: string) {
  if (!ctx.canBrand(brand)) throw new AuthError('You do not have access to this brand');
}

/** String fields of a FormData (files excluded). */
function fields(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === 'string' && !(k in out)) out[k] = v;
  return out;
}

const brandZ = z.enum(['mruk', 'skywood']);
const idZ = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/, 'Invalid id');
const intZ = (min: number, max: number) => z.coerce.number({ invalid_type_error: 'Enter a number' }).int('Whole numbers only').min(min).max(max);
const textZ = (max: number, min = 0) => z.string().trim().min(min, min ? `Enter at least ${min} characters` : undefined).max(max, `Keep it under ${max} characters`);
const checkbox = (v: string | undefined) => v === 'on' || v === 'true' || v === '1';

function revalidateAdmin() {
  revalidatePath('/admin', 'layout');
}
/** Storefront-visible change: CMS, price, stock, photos, promos. */
function revalidateStore() {
  revalidatePath('/', 'layout');
}

// Sign-in ------------------------------------------------------------------------------

export async function staffLoginAction(email: string, password: string): Promise<ActionResult<{ next: 'totp' | 'enrol' }>> {
  try {
    const p = z.object({ email: z.string().trim().email('Enter your work email').max(160), password: z.string().min(1, 'Enter your password').max(200) }).parse({ email, password });
    return { ok: true, data: { next: await staffPasswordLogin(p.email, p.password) } };
  } catch (e) {
    return fail(e);
  }
}

export async function beginEnrolAction(): Promise<ActionResult<{ secret: string; qr: string }>> {
  try {
    const { secret, otpauth } = await beginTotpEnrolment();
    const qr = await QRCode.toDataURL(otpauth, { margin: 1, width: 360, errorCorrectionLevel: 'M' });
    return { ok: true, data: { secret, qr } };
  } catch (e) {
    return fail(e);
  }
}

export async function verifyTotpAction(code: string): Promise<ActionResult> {
  try {
    await verifyStaffTotp(z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app').parse(code.replace(/\s/g, '')));
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function staffLogoutAction() {
  await staffLogout();
  redirect('/admin/login');
}

// Header filters -------------------------------------------------------------------------

export async function setAdminFilterAction(kind: 'brand' | 'branch', value: string): Promise<ActionResult> {
  try {
    await requireStaff();
    const k = z.enum(['brand', 'branch']).parse(kind);
    const v = k === 'brand' ? z.enum(['all', 'mruk', 'skywood']).parse(value) : z.string().regex(/^[A-Za-z .'-]{2,40}$|^all$/).parse(value);
    (await cookies()).set(k === 'brand' ? BRAND_COOKIE : BRANCH_COOKIE, v, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 365 * 86400, secure: process.env.NODE_ENV === 'production' });
    revalidateAdmin();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// Orders ---------------------------------------------------------------------------------

const orderNoZ = z.string().regex(/^[A-Z]{2}-\d{3,8}$/, 'Invalid order number');

export async function transitionOrderAction(number: string, to: string): Promise<ActionResult<Msg>> {
  return run('orders.write', async (ctx) => {
    const n = orderNoZ.parse(number);
    const st = z.enum(ORDER_STATUSES).parse(to) as OrderStatus;
    const o = await prisma.order.findUnique({ where: { number: n }, select: { brandKey: true, status: true } });
    if (!o) throw new Error('Order not found');
    assertBrand(ctx, o.brandKey);
    await transitionOrder(n, st, ctx.name, `Updated by ${ctx.name}`);
    await audit(ctx.email, 'order.status', 'Order', n, { from: o.status, to: st });
    revalidateAdmin();
    revalidateStore();
    return { message: `Order ${n} updated` };
  });
}

// Salary Advance -------------------------------------------------------------------------

async function loadApp(ctx: StaffContext, id: string) {
  const a = await prisma.salaryAdvanceApplication.findUnique({ where: { id: idZ.parse(id) }, include: { order: { select: { brandKey: true, number: true } }, schedule: { orderBy: { n: 'asc' } } } });
  if (!a) throw new Error('Application not found');
  assertBrand(ctx, a.order.brandKey);
  return a;
}

export async function bankDecisionAction(id: string): Promise<ActionResult<Msg>> {
  return run('advance.write', async (ctx) => {
    const a = await loadApp(ctx, id);
    if (a.status !== 'submitted') throw new Error('Only submitted applications can be sent for a decision');
    const d = await requestBankDecision(a.id, integrations.bank.name);
    await audit(ctx.email, 'advance.bank_decision', 'SalaryAdvanceApplication', a.id, { order: a.order.number, result: d.status });
    revalidateAdmin();
    return { message: d.status === 'pending' ? 'Azania Bank is still reviewing this application' : `Azania Bank ${d.status === 'approved' ? 'approved' : 'declined'} the application. ${d.note}` };
  });
}

export async function decideAdvanceAction(id: string, decision: 'approved' | 'rejected', fd: FormData): Promise<ActionResult<Msg>> {
  return run('advance.write', async (ctx) => {
    const a = await loadApp(ctx, id);
    const dec = z.enum(['approved', 'rejected']).parse(decision);
    const note = textZ(300, dec === 'rejected' ? 3 : 0).parse(fields(fd).note ?? '');
    await decideAdvance(a.id, dec, ctx.name, note || `Manual ${dec === 'approved' ? 'approval' : 'decision'} by ${ctx.name}`);
    await audit(ctx.email, `advance.${dec}`, 'SalaryAdvanceApplication', a.id, { order: a.order.number, manual: true });
    revalidateAdmin();
    return { message: dec === 'approved' ? 'Application approved' : 'Application rejected' };
  });
}

export async function advanceLifecycleAction(id: string, to: 'disbursed' | 'repaying' | 'closed'): Promise<ActionResult<Msg>> {
  return run('advance.write', async (ctx) => {
    const a = await loadApp(ctx, id);
    const st = z.enum(['disbursed', 'repaying', 'closed']).parse(to);
    await advanceLifecycle(a.id, st, ctx.name);
    await audit(ctx.email, `advance.${st}`, 'SalaryAdvanceApplication', a.id, { from: a.status, to: st });
    revalidateAdmin();
    return { message: `Marked ${st}` };
  });
}

export async function instalmentPaidAction(id: string, n: number): Promise<ActionResult<Msg>> {
  return run('advance.write', async (ctx) => {
    const a = await loadApp(ctx, id);
    const k = intZ(1, 60).parse(n);
    if (!['disbursed', 'repaying'].includes(a.status)) throw new Error('Instalments can be recorded once the advance is disbursed');
    const row = a.schedule.find((s) => s.n === k);
    if (!row) throw new Error('Instalment not found');
    if (row.paidAt) throw new Error('This instalment is already marked paid');
    await prisma.instalmentSchedule.update({ where: { id: row.id }, data: { paidAt: new Date() } });
    if (a.status === 'disbursed') await advanceLifecycle(a.id, 'repaying', ctx.name);
    const remaining = a.schedule.filter((s) => !s.paidAt && s.n !== k).length;
    if (remaining === 0) await advanceLifecycle(a.id, 'closed', ctx.name);
    await audit(ctx.email, 'advance.instalment_paid', 'SalaryAdvanceApplication', a.id, { n: k, closed: remaining === 0 });
    revalidateAdmin();
    return { message: remaining === 0 ? 'Final instalment recorded. Advance closed.' : `Instalment ${k} recorded` };
  });
}

// Invoices -------------------------------------------------------------------------------

export async function invoiceStatusAction(number: string, status: 'paid' | 'void'): Promise<ActionResult<Msg>> {
  return run('invoices.write', async (ctx) => {
    const no = z.string().regex(/^INV-\d{4}-\d{3,8}$/).parse(number);
    const st = z.enum(['paid', 'void']).parse(status);
    const inv = await prisma.invoice.findUnique({ where: { number: no }, include: { order: { select: { brandKey: true } } } });
    if (!inv) throw new Error('Invoice not found');
    assertBrand(ctx, inv.order.brandKey);
    const allowed: Record<string, string[]> = { issued: ['paid', 'void'], paid: ['void'], void: [] };
    if (!allowed[inv.status]?.includes(st)) throw new Error(`An ${inv.status} invoice cannot be marked ${st}`);
    await prisma.invoice.update({ where: { id: inv.id }, data: { status: st } });
    await audit(ctx.email, `invoice.${st}`, 'Invoice', no, { from: inv.status, to: st });
    revalidateAdmin();
    return { message: `Invoice marked ${st}` };
  });
}

// Products -------------------------------------------------------------------------------

async function loadProduct(ctx: StaffContext, id: string) {
  const p = await prisma.product.findUnique({ where: { id: idZ.parse(id) } });
  if (!p) throw new Error('Product not found');
  assertBrand(ctx, p.brandKey);
  return p;
}

export async function updateProductFieldAction(id: string, field: 'price' | 'stock', value: string): Promise<ActionResult<Msg>> {
  return run('products.write', async (ctx) => {
    const p = await loadProduct(ctx, id);
    const f = z.enum(['price', 'stock']).parse(field);
    const v = f === 'price' ? intZ(1_000, 500_000_000).parse(String(value).replace(/[,\s]/g, '')) : intZ(0, 100_000).parse(value);
    await prisma.product.update({ where: { id: p.id }, data: { [f]: v } });
    await audit(ctx.email, `product.${f}`, 'Product', p.id, { from: p[f], to: v });
    revalidateStore();
    return { message: 'Saved' };
  });
}

export async function toggleProductHiddenAction(id: string): Promise<ActionResult<Msg>> {
  return run('products.write', async (ctx) => {
    const p = await loadProduct(ctx, id);
    await prisma.product.update({ where: { id: p.id }, data: { hidden: !p.hidden } });
    await audit(ctx.email, p.hidden ? 'product.show' : 'product.hide', 'Product', p.id);
    revalidateStore();
    return { message: p.hidden ? 'Product is live' : 'Product hidden' };
  });
}

export async function uploadProductPhotoAction(id: string, fd: FormData): Promise<ActionResult<Msg & { url?: string }>> {
  return run('products.write', async (ctx) => {
    const p = await loadProduct(ctx, id);
    const url = await storePublicImage(fd.get('photo'), `products/${p.id}`);
    await prisma.product.update({ where: { id: p.id }, data: { images: [url, ...p.images.filter((x) => x !== url)].slice(0, 8) } });
    await audit(ctx.email, 'product.photo', 'Product', p.id, { url });
    revalidateStore();
    return { message: 'Photo uploaded', url };
  });
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export async function createProductAction(fd: FormData): Promise<ActionResult<Msg & { id?: string }>> {
  return run('products.write', async (ctx) => {
    const f = z
      .object({
        brand: brandZ,
        category: z.string().regex(/^[a-z0-9-]{1,40}$/, 'Choose a category'),
        sub: textZ(60, 1),
        model: textZ(40, 2),
        name: textZ(120, 2),
        price: z.string().transform((s) => s.replace(/[,\s]/g, '')).pipe(intZ(1_000, 500_000_000)),
        stock: intZ(0, 100_000),
        features: textZ(600),
      })
      .parse(fields(fd));
    assertBrand(ctx, f.brand);
    const cat = await prisma.category.findUnique({ where: { brandKey_slug: { brandKey: f.brand, slug: f.category } } });
    if (!cat) throw new Error('Choose a category');
    if (!cat.subs.includes(f.sub)) throw new Error('Choose a sub-category from the list');
    const base = `${f.brand}-${slugify(f.model) || 'product'}`;
    let id = base;
    for (let i = 2; await prisma.product.findUnique({ where: { id }, select: { id: true } }); i++) id = `${base}-${i}`;
    const features = f.features
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 8)
      .map((x) => x.slice(0, 80));
    const photo = fd.get('photo');
    const images = photo instanceof File && photo.size > 0 ? [await storePublicImage(photo, `products/${id}`)] : [];
    await prisma.product.create({
      data: {
        id,
        brandKey: f.brand,
        categoryId: cat.id,
        sub: f.sub,
        model: f.model,
        name: f.name,
        price: f.price,
        stock: f.stock,
        features: features.length ? features : ['New arrival'],
        images,
        tag: 'New',
        reviews: 0,
        embedding: { create: { text: [f.model, f.name, f.sub, ...features].join(' | ') } },
      },
    });
    await audit(ctx.email, 'product.create', 'Product', id, { brand: f.brand, category: f.category, price: f.price, stock: f.stock });
    revalidateStore();
    return { message: `Published ${f.name} to the ${f.brand === 'mruk' ? 'Mr UK' : 'Skywood'} store`, id };
  });
}

export async function restockAction(id: string, fd: FormData): Promise<ActionResult<Msg>> {
  return run('inventory', async (ctx) => {
    const p = await loadProduct(ctx, id);
    const qty = intZ(1, 10_000).parse(fields(fd).qty);
    const u = await prisma.product.update({ where: { id: p.id }, data: { stock: { increment: qty } } });
    await audit(ctx.email, 'product.restock', 'Product', p.id, { add: qty, stock: u.stock });
    revalidateStore();
    return { message: `+${qty} · now ${u.stock}` };
  });
}

export async function updateCategoryAction(id: string, fd: FormData): Promise<ActionResult<Msg>> {
  return run('products.write', async (ctx) => {
    const c = await prisma.category.findUnique({ where: { id: idZ.parse(id) } });
    if (!c) throw new Error('Category not found');
    assertBrand(ctx, c.brandKey);
    const f = z.object({ name: textZ(60, 2), short: textZ(30, 2), subs: textZ(600, 2) }).parse(fields(fd));
    const subs = [...new Set(f.subs.split(',').map((s) => s.trim()).filter(Boolean))].slice(0, 20).map((s) => s.slice(0, 60));
    if (!subs.length) throw new Error('Add at least one sub-category');
    const used = await prisma.product.findMany({ where: { categoryId: c.id, sub: { notIn: subs } }, select: { sub: true }, distinct: ['sub'] });
    if (used.length) throw new Error(`Sub-category in use by products: ${used.map((u) => u.sub).join(', ')}`);
    await prisma.category.update({ where: { id: c.id }, data: { name: f.name, short: f.short, subs } });
    await audit(ctx.email, 'category.update', 'Category', c.id, { name: f.name, short: f.short, subs });
    revalidateStore();
    return { message: 'Category saved' };
  });
}

// Website CMS ----------------------------------------------------------------------------

async function setCms(ctx: StaffContext, brand: string, key: string, json: Prisma.InputJsonValue) {
  assertBrand(ctx, brand);
  await prisma.cmsBlock.upsert({ where: { brandKey_key: { brandKey: brand, key } }, create: { brandKey: brand, key, json, updatedBy: ctx.email }, update: { json, updatedBy: ctx.email } });
  await audit(ctx.email, 'cms.update', 'CmsBlock', `${brand}:${key}`, { section: key });
  revalidateStore();
}

async function getCmsJson<T>(brand: string, key: string, fallback: T): Promise<T> {
  const b = await prisma.cmsBlock.findUnique({ where: { brandKey_key: { brandKey: brand, key } } });
  return (b?.json as T) ?? fallback;
}

async function brandProductIds(brand: string): Promise<Set<string>> {
  return new Set((await prisma.product.findMany({ where: { brandKey: brand }, select: { id: true } })).map((p) => p.id));
}

export async function saveAnnouncementAction(brand: string, fd: FormData): Promise<ActionResult<Msg>> {
  return run('cms.write', async (ctx) => {
    const b = brandZ.parse(brand);
    await setCms(ctx, b, 'announcement', textZ(160).parse(fields(fd).announcement ?? ''));
    return { message: 'Announcement published' };
  });
}

export async function saveHeroAction(brand: string, fd: FormData): Promise<ActionResult<Msg>> {
  return run('cms.write', async (ctx) => {
    const b = brandZ.parse(brand);
    assertBrand(ctx, b);
    const f = fields(fd);
    const ids = await brandProductIds(b);
    const current = await getCmsJson<{ img?: string }[]>(b, 'hero', []);
    const slides = [];
    for (let i = 0; i < 3; i++) {
      const s = z.object({ pid: z.string().refine((v) => ids.has(v), `Slide ${i + 1}: choose a product`), eyebrow: textZ(40), title: textZ(80, 2), sub: textZ(160) }).parse({ pid: f[`pid_${i}`], eyebrow: f[`eyebrow_${i}`] ?? '', title: f[`title_${i}`] ?? '', sub: f[`sub_${i}`] ?? '' });
      const file = fd.get(`img_${i}`);
      let img = checkbox(f[`clear_${i}`]) ? '' : (current[i]?.img ?? '');
      if (file instanceof File && file.size > 0) img = await storePublicImage(file, `cms/${b}-hero-${i + 1}`);
      slides.push({ ...s, img });
    }
    await setCms(ctx, b, 'hero', slides);
    return { message: 'Hero slides published' };
  });
}

export async function saveMegaPromoAction(brand: string, fd: FormData): Promise<ActionResult<Msg>> {
  return run('cms.write', async (ctx) => {
    const b = brandZ.parse(brand);
    const cats = (await prisma.category.findMany({ where: { brandKey: b }, select: { slug: true } })).map((c) => c.slug);
    const v = z.object({ eyebrow: textZ(30), title: textZ(80, 2), cta: textZ(30, 2), cat: z.string().refine((c) => cats.includes(c), 'Choose a category') }).parse(fields(fd));
    await setCms(ctx, b, 'megaPromo', v);
    return { message: 'Mega menu promo published' };
  });
}

export async function saveDealsAction(brand: string, fd: FormData): Promise<ActionResult<Msg>> {
  return run('cms.write', async (ctx) => {
    const b = brandZ.parse(brand);
    const f = fields(fd);
    const ids = await brandProductIds(b);
    const n = intZ(0, 12).parse(f.count ?? '0');
    const deals: { title: string; save: number; tag: string; items: string[] }[] = [];
    for (let i = 0; i < n; i++) {
      if (checkbox(f[`remove_${i}`])) continue;
      const title = textZ(60).parse(f[`title_${i}`] ?? '');
      const items = fd.getAll(`items_${i}`).filter((x): x is string => typeof x === 'string' && ids.has(x));
      if (!title && !items.length) continue; // blank "new bundle" row
      if (!title) throw new Error(`Bundle ${i + 1}: enter a name`);
      if (items.length < 2) throw new Error(`${title}: choose at least 2 products`);
      if (items.length > 6) throw new Error(`${title}: at most 6 products`);
      deals.push({ title, save: intZ(0, 60).parse(f[`save_${i}`] ?? '0'), tag: textZ(20).parse(f[`tag_${i}`] || 'Bundle'), items });
    }
    await setCms(ctx, b, 'deals', deals);
    return { message: `${deals.length} bundle${deals.length === 1 ? '' : 's'} published` };
  });
}

export async function saveSeoAction(brand: string, fd: FormData): Promise<ActionResult<Msg>> {
  return run('cms.write', async (ctx) => {
    const b = brandZ.parse(brand);
    assertBrand(ctx, b);
    const f = fields(fd);
    const v = z.object({ title: textZ(70, 5), desc: textZ(170, 10) }).parse({ title: f.title ?? '', desc: f.desc ?? '' });
    const cur = await getCmsJson<{ img?: string }>(b, 'seo', {});
    let img = checkbox(f.clearImg) ? '' : (cur.img ?? '');
    const file = fd.get('img');
    if (file instanceof File && file.size > 0) img = await storePublicImage(file, `cms/${b}-og`);
    await setCms(ctx, b, 'seo', { ...v, img });
    return { message: 'SEO and sharing card published' };
  });
}

// Promotions -----------------------------------------------------------------------------

export async function toggleHotAction(brand: string, productId: string): Promise<ActionResult<Msg>> {
  return run('promos.write', async (ctx) => {
    const b = brandZ.parse(brand);
    assertBrand(ctx, b);
    const p = await loadProduct(ctx, productId);
    if (p.brandKey !== b) throw new Error('Product belongs to another brand');
    const cur = await getCmsJson<string[]>(b, 'hot', []);
    const on = cur.includes(p.id);
    const next = on ? cur.filter((x) => x !== p.id) : [...cur, p.id].slice(-24);
    await setCms(ctx, b, 'hot', next);
    return { message: on ? 'Removed from hot picks' : 'Added to hot picks' };
  });
}

export async function createFlashAction(fd: FormData): Promise<ActionResult<Msg>> {
  return run('promos.write', async (ctx) => {
    const f = z.object({ productId: idZ, percent: intZ(1, 90) }).parse(fields(fd));
    const p = await loadProduct(ctx, f.productId);
    const pr = await prisma.promotion.create({ data: { brandKey: p.brandKey, kind: 'flash', productId: p.id, percent: f.percent, title: 'Flash deal', active: true } });
    await audit(ctx.email, 'promo.flash_create', 'Promotion', pr.id, { productId: p.id, percent: f.percent });
    revalidateStore();
    return { message: 'Flash deal live' };
  });
}

async function loadPromo(ctx: StaffContext, id: string) {
  const pr = await prisma.promotion.findUnique({ where: { id: idZ.parse(id) } });
  if (!pr) throw new Error('Promotion not found');
  assertBrand(ctx, pr.brandKey);
  return pr;
}

export async function toggleFlashAction(id: string): Promise<ActionResult<Msg>> {
  return run('promos.write', async (ctx) => {
    const pr = await loadPromo(ctx, id);
    await prisma.promotion.update({ where: { id: pr.id }, data: { active: !pr.active } });
    await audit(ctx.email, pr.active ? 'promo.pause' : 'promo.activate', 'Promotion', pr.id);
    revalidateStore();
    return { message: pr.active ? 'Paused' : 'Active' };
  });
}

export async function deleteFlashAction(id: string): Promise<ActionResult<Msg>> {
  return run('promos.write', async (ctx) => {
    const pr = await loadPromo(ctx, id);
    await prisma.promotion.delete({ where: { id: pr.id } });
    await audit(ctx.email, 'promo.delete', 'Promotion', pr.id);
    revalidateStore();
    return { message: 'Deleted' };
  });
}

function assertCodeScope(ctx: StaffContext, brandKey: string | null) {
  if (brandKey) assertBrand(ctx, brandKey);
  else if (!(ctx.canBrand('mruk') && ctx.canBrand('skywood'))) throw new AuthError('Codes for both brands need access to both brands');
}

export async function saveDiscountAction(fd: FormData): Promise<ActionResult<Msg>> {
  return run('promos.write', async (ctx) => {
    const f = z
      .object({
        id: z.string().regex(/^[a-z0-9]{0,40}$/).optional(),
        code: z.string().trim().toUpperCase().pipe(z.string().regex(/^[A-Z0-9]{3,20}$/, 'Codes are 3–20 letters or digits')),
        percent: intZ(0, 90),
        brand: z.enum(['both', 'mruk', 'skywood']),
        minSubtotal: z.string().optional(),
        maxUses: z.string().optional(),
        expiresAt: z.string().optional(),
        active: z.string().optional(),
      })
      .parse(fields(fd));
    const brandKey = f.brand === 'both' ? null : f.brand;
    assertCodeScope(ctx, brandKey);
    const minSubtotal = f.minSubtotal ? intZ(0, 500_000_000).parse(f.minSubtotal.replace(/[,\s]/g, '')) : null;
    const maxUses = f.maxUses ? intZ(1, 1_000_000).parse(f.maxUses) : null;
    let expiresAt: Date | null = null;
    if (f.expiresAt) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.expiresAt)) throw new Error('Choose a valid end date');
      expiresAt = new Date(`${f.expiresAt}T20:59:59Z`); // 23:59 EAT
    }
    const data = { code: f.code, percent: f.percent, brandKey, minSubtotal, maxUses, expiresAt, active: checkbox(f.active) };
    if (f.id) {
      const cur = await prisma.discountCode.findUnique({ where: { id: f.id } });
      if (!cur) throw new Error('Code not found');
      assertCodeScope(ctx, cur.brandKey);
      await prisma.discountCode.update({ where: { id: cur.id }, data });
      await audit(ctx.email, 'discount.update', 'DiscountCode', cur.id, { ...data, expiresAt: expiresAt?.toISOString() ?? null });
    } else {
      const c = await prisma.discountCode.create({ data });
      await audit(ctx.email, 'discount.create', 'DiscountCode', c.id, { ...data, expiresAt: expiresAt?.toISOString() ?? null });
    }
    revalidateStore();
    return { message: `Code ${f.code} saved` };
  });
}

async function loadCode(ctx: StaffContext, id: string) {
  const c = await prisma.discountCode.findUnique({ where: { id: idZ.parse(id) } });
  if (!c) throw new Error('Code not found');
  assertCodeScope(ctx, c.brandKey);
  return c;
}

export async function toggleDiscountAction(id: string): Promise<ActionResult<Msg>> {
  return run('promos.write', async (ctx) => {
    const c = await loadCode(ctx, id);
    await prisma.discountCode.update({ where: { id: c.id }, data: { active: !c.active } });
    await audit(ctx.email, c.active ? 'discount.pause' : 'discount.activate', 'DiscountCode', c.id, { code: c.code });
    revalidateStore();
    return { message: c.active ? 'Paused' : 'Active' };
  });
}

export async function deleteDiscountAction(id: string): Promise<ActionResult<Msg>> {
  return run('promos.write', async (ctx) => {
    const c = await loadCode(ctx, id);
    await prisma.discountCode.delete({ where: { id: c.id } });
    await audit(ctx.email, 'discount.delete', 'DiscountCode', c.id, { code: c.code });
    revalidateStore();
    return { message: 'Deleted' };
  });
}

// Support tickets ------------------------------------------------------------------------

async function loadTicket(ctx: StaffContext, id: string) {
  const t = await prisma.ticket.findUnique({ where: { id: idZ.parse(id) } });
  if (!t) throw new Error('Ticket not found');
  assertBrand(ctx, t.brandKey);
  return t;
}

export async function replyTicketAction(id: string, fd: FormData): Promise<ActionResult<Msg>> {
  return run('tickets.write', async (ctx) => {
    const t = await loadTicket(ctx, id);
    const f = fields(fd);
    const body = textZ(1000, 2).parse(f.body ?? '');
    const internal = checkbox(f.internal);
    await prisma.ticketMessage.create({ data: { ticketId: t.id, author: ctx.name, internal, body } });
    const status = internal ? (t.status === 'new' ? 'open' : t.status) : t.status === 'resolved' ? 'resolved' : 'waiting';
    await prisma.ticket.update({ where: { id: t.id }, data: { status, assignee: t.assignee || ctx.name } });
    if (!internal) {
      const brand = t.brandKey === 'skywood' ? 'Skywood' : 'Mr UK';
      await integrations.sms.send(t.phone, `${brand} support (${t.number}): ${body.slice(0, 400)}`).catch(() => undefined);
    }
    await audit(ctx.email, internal ? 'ticket.note' : 'ticket.reply', 'Ticket', t.number, { internal, status });
    revalidateAdmin();
    return { message: internal ? 'Internal note added' : 'Reply sent to the customer by SMS' };
  });
}

export async function assignTicketAction(id: string): Promise<ActionResult<Msg>> {
  return run('tickets.write', async (ctx) => {
    const t = await loadTicket(ctx, id);
    await prisma.ticket.update({ where: { id: t.id }, data: { assignee: ctx.name, status: t.status === 'new' ? 'open' : t.status } });
    await audit(ctx.email, 'ticket.assign', 'Ticket', t.number, { assignee: ctx.id });
    revalidateAdmin();
    return { message: 'Assigned to you' };
  });
}

export async function ticketStatusAction(id: string, status: string): Promise<ActionResult<Msg>> {
  return run('tickets.write', async (ctx) => {
    const t = await loadTicket(ctx, id);
    const st = z.enum(['new', 'open', 'waiting', 'resolved']).parse(status);
    await prisma.ticket.update({ where: { id: t.id }, data: { status: st } });
    await audit(ctx.email, 'ticket.status', 'Ticket', t.number, { from: t.status, to: st });
    revalidateAdmin();
    return { message: `Ticket ${st}` };
  });
}

// Settings and users (owner only) -----------------------------------------------------------

function brandsFrom(fd: FormData): string[] {
  const picked = fd.getAll('brands').filter((x): x is string => x === 'mruk' || x === 'skywood');
  const uniq = [...new Set(picked)];
  return uniq.length === 2 ? ['*'] : uniq;
}

export async function createStaffAction(fd: FormData): Promise<ActionResult<Msg>> {
  return run('settings', async (ctx) => {
    const f = z.object({ name: textZ(80, 2), email: z.string().trim().toLowerCase().email('Enter a valid email').max(160), role: z.string().regex(/^[a-z_]{2,30}$/) }).parse(fields(fd));
    const role = await prisma.role.findUnique({ where: { id: f.role } });
    if (!role) throw new Error('Choose a role');
    const brands = brandsFrom(fd);
    if (!brands.length) throw new Error('Choose at least one brand');
    const temp = `${randomBytes(6).toString('base64url')}-${randomBytes(4).toString('hex')}`;
    const u = await prisma.staffUser.create({ data: { name: f.name, email: f.email, roleId: role.id, brands, passwordHash: hashPassword(temp) } });
    await audit(ctx.email, 'staff.create', 'StaffUser', u.id, { role: role.id, brands });
    revalidateAdmin();
    return { message: `Created. Temporary password (shown once): ${temp} — they set up 2FA on first sign-in.` };
  });
}

export async function updateStaffAction(id: string, fd: FormData): Promise<ActionResult<Msg>> {
  return run('settings', async (ctx) => {
    const u = await prisma.staffUser.findUnique({ where: { id: idZ.parse(id) } });
    if (!u) throw new Error('User not found');
    const f = fields(fd);
    const roleId = z.string().regex(/^[a-z_]{2,30}$/).parse(f.role);
    if (!(await prisma.role.findUnique({ where: { id: roleId } }))) throw new Error('Choose a role');
    const brands = brandsFrom(fd);
    if (!brands.length) throw new Error('Choose at least one brand');
    const active = checkbox(f.active);
    if (u.id === ctx.id && (!active || roleId !== u.roleId)) throw new Error('You cannot change your own role or deactivate yourself');
    await prisma.staffUser.update({ where: { id: u.id }, data: { roleId, brands, active } });
    if (!active || roleId !== u.roleId) await prisma.session.deleteMany({ where: { staffId: u.id } });
    await audit(ctx.email, 'staff.update', 'StaffUser', u.id, { role: { from: u.roleId, to: roleId }, brands, active });
    revalidateAdmin();
    return { message: 'Saved' };
  });
}

export async function resetStaffTotpAction(id: string): Promise<ActionResult<Msg>> {
  return run('settings', async (ctx) => {
    const u = await prisma.staffUser.findUnique({ where: { id: idZ.parse(id) } });
    if (!u) throw new Error('User not found');
    await prisma.staffUser.update({ where: { id: u.id }, data: { totpEnabled: false, totpSecretEnc: null } });
    await prisma.session.deleteMany({ where: { staffId: u.id } });
    await audit(ctx.email, 'staff.reset_2fa', 'StaffUser', u.id);
    revalidateAdmin();
    if (u.id === ctx.id) redirect('/admin/login');
    return { message: '2FA reset. They will enrol again at next sign-in.' };
  });
}

const NOTIFY_KEYS = ['orders', 'bank', 'stock', 'tickets', 'daily'] as const;

export async function saveNotificationsAction(fd: FormData): Promise<ActionResult<Msg>> {
  return run('settings', async (ctx) => {
    const f = fields(fd);
    const value = Object.fromEntries(NOTIFY_KEYS.map((k) => [k, checkbox(f[k])]));
    await prisma.setting.upsert({ where: { key: 'notifications' }, create: { key: 'notifications', value }, update: { value } });
    await audit(ctx.email, 'settings.notifications', 'Setting', 'notifications', value);
    revalidateAdmin();
    return { message: 'Notification settings saved' };
  });
}

export async function saveSecurityAction(fd: FormData): Promise<ActionResult<Msg>> {
  return run('settings', async (ctx) => {
    const f = fields(fd);
    const cur = ((await prisma.setting.findUnique({ where: { key: 'security' } }))?.value ?? {}) as Record<string, unknown>;
    const value = { ...cur, sessionTimeoutMinutes: intZ(5, 480).parse(f.sessionTimeoutMinutes), require2fa: checkbox(f.require2fa) };
    await prisma.setting.upsert({ where: { key: 'security' }, create: { key: 'security', value }, update: { value } });
    await audit(ctx.email, 'settings.security', 'Setting', 'security', value as Prisma.InputJsonValue);
    revalidateAdmin();
    return { message: 'Security settings saved' };
  });
}
