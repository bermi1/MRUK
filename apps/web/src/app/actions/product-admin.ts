'use server';

/**
 * Product editor (Admin › Products › Add / Edit). Same pattern as actions/admin.ts:
 * requireStaff(permission) → brand scope → zod → change → audit() → storefront refresh.
 */
import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { prisma, type Prisma } from '@bt/db';
import type { ActionResult } from '@/lib/types';
import { AuthError, requireStaff, type StaffContext } from '@/server/auth';
import { audit } from '@/server/audit';
import { refreshCatalog } from '@/server/catalog';
import { storePublicImage, UploadError } from '@/server/admin/files';
import { RateLimitError } from '@/server/ratelimit';
import { checkPhotos, checkStock } from '@/server/tasks';

function fail(e: unknown): { ok: false; error: string; field?: string } {
  unstable_rethrow(e);
  if (e instanceof AuthError || e instanceof RateLimitError || e instanceof UploadError) return { ok: false, error: e.message };
  if (e instanceof z.ZodError) {
    const i = e.issues[0];
    return { ok: false, error: i?.message ?? 'Check the form and try again', field: String(i?.path[0] ?? '') };
  }
  console.error('[product action]', e instanceof Error ? e.message : 'unknown error');
  return { ok: false, error: e instanceof Error && e.message.length < 160 ? e.message : 'Something went wrong. Please try again.' };
}

async function run<T>(perm: string, fn: (ctx: StaffContext) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const ctx = await requireStaff(perm);
    return { ok: true, data: await fn(ctx) };
  } catch (e) {
    return fail(e);
  }
}

const brandZ = z.enum(['mruk', 'skywood'], { errorMap: () => ({ message: 'Choose a brand' }) });

function assertBrand(ctx: StaffContext, brand: string) {
  if (!ctx.canBrand(brand)) throw new AuthError('You do not have access to this brand');
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/** Upload one photo for the editor (stored as WebP). The product's photo list is saved with the product. */
export async function uploadProductImageAction(brand: string, fd: FormData): Promise<ActionResult<{ url: string }>> {
  return run('products.write', async (ctx) => {
    const b = brandZ.parse(brand);
    assertBrand(ctx, b);
    return { url: await storePublicImage(fd.get('photo'), `products/${b}-upload`) };
  });
}

/** Other products of the brand with the same model number (duplicate warning while typing). */
export async function checkModelAction(brand: string, model: string, excludeId?: string): Promise<ActionResult<{ matches: { id: string; name: string; hidden: boolean }[] }>> {
  return run('products', async (ctx) => {
    const b = brandZ.parse(brand);
    assertBrand(ctx, b);
    const m = z.string().trim().max(40).parse(model);
    if (m.length < 2) return { matches: [] };
    const rows = await prisma.product.findMany({ where: { brandKey: b, model: { equals: m, mode: 'insensitive' }, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true, name: true, hidden: true }, take: 5 });
    return { matches: rows };
  });
}

const text = (max: number, min: number, what: string) => z.string().trim().min(min, min ? `${what}: enter at least ${min} characters` : undefined).max(max, `${what}: keep it under ${max} characters`);
const whole = (min: number, max: number, what: string) =>
  z.preprocess((v) => (typeof v === 'string' ? Number(v.replace(/[,\s]/g, '') || NaN) : v), z.number({ invalid_type_error: `${what}: enter a number` }).int(`${what}: whole numbers only`).min(min, `${what}: at least ${min.toLocaleString('en-US')}`).max(max, `${what}: at most ${max.toLocaleString('en-US')}`));

const productZ = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/).optional(),
  brand: brandZ,
  category: z.string().regex(/^[a-z0-9-]{1,40}$/, 'Choose a category'),
  sub: text(60, 1, 'Sub-category'),
  model: text(40, 2, 'Model'),
  name: text(120, 2, 'Product name'),
  price: whole(1_000, 500_000_000, 'Price'),
  stock: whole(0, 100_000, 'Stock'),
  features: z.array(z.string().trim().max(80, 'Each feature: keep it under 80 characters')).max(12, 'At most 12 features'),
  description: z.string().trim().max(2000, 'Description: keep it under 2,000 characters').default(''),
  specs: z.array(z.object({ label: z.string().trim().max(40, 'Spec name: under 40 characters'), value: z.string().trim().max(120, 'Spec value: under 120 characters') })).max(20, 'At most 20 specifications').default([]),
  images: z.array(z.string().max(300)).max(8, 'At most 8 photos'),
  hidden: z.boolean().default(false),
});
export type ProductInput = z.input<typeof productZ>;

/** Create or update a product from the editor. Returns the product id. */
export async function saveProductAction(input: ProductInput): Promise<ActionResult<{ id: string; message: string }>> {
  return run('products.write', async (ctx) => {
    const p = productZ.parse(input);
    const current = p.id ? await prisma.product.findUnique({ where: { id: p.id } }) : null;
    if (p.id && !current) throw new Error('Product not found');
    const brand = current ? current.brandKey : p.brand;
    assertBrand(ctx, brand);
    if (current && p.brand !== current.brandKey) throw new Error('A product cannot move to the other brand');
    const cat = await prisma.category.findUnique({ where: { brandKey_slug: { brandKey: brand, slug: p.category } } });
    if (!cat) throw new z.ZodError([{ code: 'custom', path: ['category'], message: 'Choose a category' }]);
    if (!cat.subs.includes(p.sub)) throw new z.ZodError([{ code: 'custom', path: ['sub'], message: 'Choose a sub-category from the list' }]);
    // Photos: ones the product already has, or new uploads of this brand (stored by uploadProductImageAction).
    const own = new Set(current?.images ?? []);
    const upload = new RegExp(`^/api/files/public/products/${brand}-[a-z0-9/_-]+\\.(webp|jpg|png)$`);
    const images = [...new Set(p.images)];
    if (images.some((u) => !own.has(u) && !upload.test(u))) throw new Error('A photo could not be verified. Upload it again.');
    const features = [...new Set(p.features.filter(Boolean))];
    const specs = p.specs.filter((s) => s.label && s.value);
    const data = { categoryId: cat.id, sub: p.sub, model: p.model, name: p.name, price: p.price, stock: p.stock, features: features.length ? features : ['New arrival'], description: p.description, specs: specs as Prisma.InputJsonValue, images, hidden: p.hidden };
    const embeddingText = [p.model, p.name, p.sub, cat.name, ...features, p.description, ...specs.map((s) => `${s.label}: ${s.value}`)].filter(Boolean).join(' | ');

    let id: string;
    if (current) {
      id = current.id;
      await prisma.product.update({ where: { id }, data: { ...data, embedding: { upsert: { create: { text: embeddingText }, update: { text: embeddingText } } } } });
      const changed: string[] = (['categoryId', 'sub', 'model', 'name', 'price', 'stock', 'hidden'] as const).filter((k) => current[k] !== data[k]);
      if (JSON.stringify(current.features) !== JSON.stringify(data.features)) changed.push('features');
      if (current.description !== data.description) changed.push('description');
      if (JSON.stringify(current.specs) !== JSON.stringify(specs)) changed.push('specs');
      if (JSON.stringify(current.images) !== JSON.stringify(images)) changed.push('images');
      await audit(ctx.email, 'product.update', 'Product', id, { changed, ...(current.price !== p.price ? { price: { from: current.price, to: p.price } } : {}), ...(current.stock !== p.stock ? { stock: { from: current.stock, to: p.stock } } : {}) });
    } else {
      const base = `${brand}-${slugify(p.model) || 'product'}`;
      id = base;
      for (let i = 2; await prisma.product.findUnique({ where: { id }, select: { id: true } }); i++) id = `${base}-${i}`;
      await prisma.product.create({ data: { id, brandKey: brand, ...data, tag: 'New', reviews: 0, embedding: { create: { text: embeddingText } } } });
      await audit(ctx.email, 'product.create', 'Product', id, { brand, category: p.category, price: p.price, stock: p.stock, photos: images.length, hidden: p.hidden });
    }
    await checkStock([id]);
    await checkPhotos(brand);
    refreshCatalog();
    revalidatePath('/', 'layout');
    return { id, message: current ? 'Saved. The store shows the changes now.' : `Published ${p.name} to the ${brand === 'mruk' ? 'Mr UK' : 'Skywood'} store` };
  });
}
