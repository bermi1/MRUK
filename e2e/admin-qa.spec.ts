import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { db, resetStaff, serverRequires2fa, STAFF_PASSWORD, staffSignIn } from './staff';

/** sharp is a dependency of the web app; the tests use it to make realistic JPEG/PNG uploads and to read the results. */
const sharp = createRequire(resolve(__dirname, '../apps/web/package.json'))('sharp') as typeof import('sharp');

async function signIn(page: Page, email: string) {
  await staffSignIn(page, email);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

test('staff sign-in: wrong password, lockout after 5 failures, and the mode the server runs in', async ({ page }) => {
  const email = 'daudi@mruk.co.tz';
  await resetStaff(email);
  await page.goto('/admin/login');
  for (let i = 1; i <= 5; i++) {
    await page.fill('input[name=email]', email);
    await page.fill('input[name=password]', `wrong-${i}`);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.locator('.ad-alert')).toContainText(i < 5 ? 'Email or password is incorrect' : 'locked for 15 minutes');
  }
  // Even the right password is refused while locked.
  const c = db();
  await c.rateLimit.deleteMany({});
  await page.fill('input[name=password]', STAFF_PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('.ad-alert')).toContainText('Account locked');
  // Once the lock has run out, one more typo does not lock again.
  await c.staffUser.update({ where: { email }, data: { lockedUntil: new Date(Date.now() - 1000) } });
  await page.fill('input[name=password]', 'typo');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('.ad-alert')).toContainText('Email or password is incorrect');
  expect((await c.staffUser.findUniqueOrThrow({ where: { email } })).failedLogins).toBe(1);
  await c.$disconnect();
  await resetStaff(email);

  // With 2FA required the password leads to the authenticator step; with STAFF_2FA_REQUIRED=false straight in.
  const twoFa = await serverRequires2fa(page);
  await page.goto('/admin/login');
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', STAFF_PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();
  if (twoFa) {
    await expect(page.getByTestId('totp-secret')).toBeVisible();
    await page.fill('input[name=code]', '000000');
    await page.getByRole('button', { name: /verify/i }).click();
    await expect(page.locator('.ad-alert')).toContainText('code is not valid');
  } else {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    const c2 = db();
    expect(await c2.auditLog.count({ where: { actor: email, action: 'login.password_only' } })).toBeGreaterThan(0);
    await c2.$disconnect();
    await page.goto('/admin/account');
    await expect(page.getByText('Not required on this server')).toBeVisible();
  }
});

test('password-only sign-in when STAFF_2FA_REQUIRED=false', async ({ page }) => {
  test.skip(await serverRequires2fa(page), 'server requires 2FA (run the server with STAFF_2FA_REQUIRED=false)');
  await resetStaff('finance@mruk.co.tz');
  await page.goto('/admin/login');
  await page.fill('input[name=email]', 'finance@mruk.co.tz');
  await page.fill('input[name=password]', STAFF_PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByTestId('totp-secret')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL(/\/admin\/login/);
  await page.goto('/admin/orders');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('uploaded JPEG and PNG photos are stored and served as WebP (rotated, resized, transparency kept)', async ({ page }) => {
  await signIn(page, 'halima@skywood.co.tz');
  const c = db();
  const product = await c.product.findFirstOrThrow({ where: { brandKey: 'skywood', hidden: false }, orderBy: { name: 'asc' } });
  // 2400×1200 JPEG with EXIF orientation 6 (phone held upright) → upright, 1600 px on the longest side.
  const jpeg = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: '#c04020' } }).jpeg({ quality: 60 }).withMetadata({ orientation: 6 }).toBuffer();
  await page.goto(`/admin/products?b=skywood&q=${encodeURIComponent(product.model)}`);
  const row = page.locator(`tr[data-product="${product.id}"]`);
  await row.locator('input[type=file]').setInputFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer: jpeg });
  await expect.poll(async () => (await c.product.findUniqueOrThrow({ where: { id: product.id } })).images[0]).toMatch(/\.webp$/);
  const url = (await c.product.findUniqueOrThrow({ where: { id: product.id } })).images[0]!;
  const res = await page.request.get(url);
  expect(res.headers()['content-type']).toBe('image/webp');
  const meta = await sharp(await res.body()).metadata();
  expect(meta).toMatchObject({ format: 'webp', width: 800, height: 1600 });
  expect(meta.exif).toBeUndefined();
  // The storefront shows the new photo.
  const store = await page.context().newPage();
  await store.goto(`/skywood/p/${product.id}`);
  expect(await store.content()).toContain(url.split('/').pop()!);
  await store.close();

  // PNG with transparency, through the CMS (SEO / sharing image).
  const png = await sharp({ create: { width: 64, height: 48, channels: 4, background: { r: 0, g: 120, b: 200, alpha: 0.5 } } }).png().toBuffer();
  await page.goto('/admin/cms?b=skywood');
  const seo = page.locator('form').filter({ has: page.locator('input[name=img]') });
  await seo.locator('input[name=img]').setInputFiles({ name: 'og.png', mimeType: 'image/png', buffer: png });
  await seo.getByRole('button', { name: /Publish/ }).click();
  await expect(seo.getByRole('status')).toContainText('published');
  const og = ((await c.cmsBlock.findUniqueOrThrow({ where: { brandKey_key: { brandKey: 'skywood', key: 'seo' } } })).json as { img: string }).img;
  expect(og).toMatch(/\.webp$/);
  const ogMeta = await sharp(await (await page.request.get(og)).body()).metadata();
  expect(ogMeta).toMatchObject({ format: 'webp', width: 64, height: 48, hasAlpha: true });

  // Not an image (right name and type, wrong bytes) is refused.
  await page.goto(`/admin/products?b=skywood&q=${encodeURIComponent(product.model)}`);
  await row.locator('input[type=file]').setInputFiles({ name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('definitely not a picture, just text') });
  await expect(row.getByRole('alert')).toContainText('Only JPG, PNG or WebP');
  await c.$disconnect();
});

test('stock: restock adds, inline edit sets, never negative, reserved units shown, audit-logged', async ({ page }) => {
  await signIn(page, 'bernard@bermitechs.com');
  const c = db();
  const p = await c.product.findFirstOrThrow({ where: { brandKey: 'mruk', hidden: false, stock: { gte: 2 } }, orderBy: { name: 'asc' } });

  // Inline edit sets the exact available number.
  await page.goto(`/admin/products?b=mruk&q=${encodeURIComponent(p.model)}`);
  const stock = page.locator(`tr[data-product="${p.id}"]`).getByLabel(/^Stock of/);
  await stock.fill('-4');
  await stock.press('Enter');
  await expect(page.locator(`tr[data-product="${p.id}"] .ad-err`)).toBeVisible();
  await stock.fill('9');
  await stock.press('Enter');
  await expect.poll(async () => (await c.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(9);
  // Saved once (Enter + blur must not double-submit).
  await page.waitForTimeout(500);
  expect(await c.auditLog.count({ where: { action: 'product.stock', entityId: p.id, at: { gte: new Date(Date.now() - 60_000) } } })).toBe(1);

  // Restock adds.
  await page.goto('/admin/inventory');
  const row = page.locator(`tr[data-product="${p.id}"]`);
  await expect(row.getByTestId('stock-available')).toHaveText('9');
  // Reserved = units in unpaid orders (awaiting payment or bank review), counted after expired holds are released.
  const reserved = (await c.orderItem.aggregate({ where: { productId: p.id, order: { status: { in: ['placed', 'bank_review'] } } }, _sum: { qty: true } }))._sum.qty ?? 0;
  await expect(row.getByTestId('stock-reserved')).toHaveText(String(reserved));
  await row.locator('input[name=qty]').fill('-3');
  await row.getByRole('button', { name: 'Add' }).click();
  await expect(row.locator('.ad-msg.err')).toBeVisible();
  await row.locator('input[name=qty]').fill('6');
  await row.getByRole('button', { name: 'Add' }).click();
  await expect(row.locator('.ad-msg.ok')).toContainText('now 15');
  expect((await c.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(15);
  const log = await c.auditLog.findFirstOrThrow({ where: { action: 'product.restock', entityId: p.id }, orderBy: { at: 'desc' } });
  expect(log.diff).toMatchObject({ add: 6, stock: 15 });

  // Put the original number back.
  await page.goto(`/admin/products?b=mruk&q=${encodeURIComponent(p.model)}`);
  await stock.fill(String(p.stock));
  await stock.press('Enter');
  await expect.poll(async () => (await c.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(p.stock);
  await c.$disconnect();
});

test('promo codes: validation, edit, pause; uses count only when an order is placed', async ({ page }) => {
  await signIn(page, 'bernard@bermitechs.com');
  const c = db();
  const code = `QA${Date.now().toString(36).toUpperCase().slice(-6)}`;
  await page.goto('/admin/promos');
  await page.getByText('+ New discount code').click();
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Create code' }) });
  await form.locator('input[name=code]').fill(code);
  await form.locator('input[name=percent]').evaluate((el: HTMLInputElement) => el.removeAttribute('max'));
  await form.locator('input[name=percent]').fill('95');
  await form.getByRole('button', { name: 'Create code' }).click();
  await expect(form.getByRole('alert')).toContainText('at most 90%');
  await form.locator('input[name=percent]').fill('10');
  await form.locator('input[name=expiresAt]').fill('2020-01-01');
  await form.getByRole('button', { name: 'Create code' }).click();
  await expect(form.getByRole('alert')).toContainText('in the past');
  await form.locator('input[name=expiresAt]').fill('2099-12-31');
  await form.locator('input[name=minSubtotal]').fill('10,000');
  await form.locator('input[name=maxUses]').fill('5');
  await form.locator('select[name=brand]').selectOption('skywood');
  await form.getByRole('button', { name: 'Create code' }).click();
  await expect(form.getByRole('status')).toContainText(`Code ${code} saved`);
  const dc = await c.discountCode.findUniqueOrThrow({ where: { code } });
  expect(dc).toMatchObject({ percent: 10, brandKey: 'skywood', minSubtotal: 10_000, maxUses: 5, uses: 0, active: true });
  expect(await c.auditLog.count({ where: { action: 'discount.create', entityId: dc.id } })).toBe(1);

  // A shopper applies it: no use counted until the order is placed.
  await page.goto('/skywood/p/skywood-sk-20s03');
  await page.getByRole('radio', { name: /Pay in full/ }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page).toHaveURL(/\/skywood\/cart/);
  await page.locator('#dc').fill(code);
  await page.locator('#dc').press('Enter');
  await expect(page.locator('.promo-remove')).toBeVisible();
  expect((await c.discountCode.findUniqueOrThrow({ where: { code } })).uses).toBe(0);
  await page.getByTestId('go-checkout').click();
  await page.locator('input[name=name]').fill('Promo Test');
  await page.locator('input[name=phone]').fill('0754222333');
  await page.getByTestId('pay-card').click();
  await page.getByTestId('consent').check();
  await page.getByTestId('place-order').click();
  await expect(page).toHaveURL(/\/pay\/SW-/);
  expect((await c.discountCode.findUniqueOrThrow({ where: { code } })).uses).toBe(1);

  // Edit: the limit cannot go below the uses already made; pause works and is audit-logged.
  await page.goto('/admin/promos');
  const row = page.locator('tr').filter({ hasText: code });
  await row.getByText('Edit').click();
  const edit = row.locator('form');
  await edit.locator('input[name=maxUses]').fill('0');
  await edit.getByRole('button', { name: 'Save code' }).click();
  await expect(edit.getByRole('alert')).toBeVisible();
  await edit.locator('input[name=maxUses]').fill('2');
  await edit.locator('input[name=percent]').fill('20');
  await edit.getByRole('button', { name: 'Save code' }).click();
  await expect(edit.getByRole('status')).toContainText('saved');
  expect(await c.discountCode.findUniqueOrThrow({ where: { code } })).toMatchObject({ percent: 20, maxUses: 2, uses: 1 });
  await row.getByRole('button', { name: `Pause ${code}` }).click();
  await expect.poll(async () => (await c.discountCode.findUniqueOrThrow({ where: { code } })).active).toBe(false);
  expect(await c.auditLog.count({ where: { action: 'discount.pause', entityId: dc.id } })).toBe(1);
  await c.discountCode.delete({ where: { code } });
  await c.$disconnect();
});

test('role limits on figures and PII; order search by local phone number', async ({ page }) => {
  // Catalogue editor: promotions without revenue figures.
  await signIn(page, 'halima@skywood.co.tz');
  await page.goto('/admin/promos');
  await expect(page.getByText('Active discount codes')).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Promo revenue');
  // Manager: can view Pay Later applications but not unmask NIDA / salary.
  const c = db();
  const app = await c.salaryAdvanceApplication.findFirstOrThrow({ where: { order: { brandKey: 'mruk' } } });
  await signIn(page, 'amani@mruk.co.tz');
  await page.goto(`/admin/advance?id=${app.id}&reveal=1`);
  await expect(page.getByText('APPLICANT')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Show full details' })).toHaveCount(0);
  await expect(page.locator('main')).toContainText(`•••• ${app.nidaLast4}`);
  expect(await c.auditLog.count({ where: { actor: 'amani@mruk.co.tz', action: 'advance.view_pii' } })).toBe(0);
  // Orders: 0754… finds an order stored as +255754….
  const o = await c.order.findFirstOrThrow({ where: { brandKey: 'mruk' }, orderBy: { createdAt: 'desc' } });
  await page.goto(`/admin/orders?q=${o.contactPhone.replace('+255', '0')}`);
  await expect(page.getByRole('link', { name: `Open order ${o.number}` })).toBeVisible();
  await c.$disconnect();
});

test('hero: switching a middle slide off keeps the other slides\' media, even when saved twice', async ({ page }) => {
  await signIn(page, 'amani@mruk.co.tz');
  const c = db();
  const key = { brandKey_key: { brandKey: 'mruk', key: 'hero' } } as const;
  const before = await c.cmsBlock.findUniqueOrThrow({ where: key });
  try {
    const png = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#335577' } }).png().toBuffer();
    await page.goto('/admin/cms?b=mruk');
    const hero = page.getByRole('form', { name: 'Hero carousel' });
    await hero.locator('input[name=title_1]').fill('QA middle slide');
    await hero.locator('input[name=title_2]').fill('QA last slide');
    await hero.locator('input[name=img_2]').setInputFiles({ name: 'last.png', mimeType: 'image/png', buffer: png });
    await hero.getByRole('button', { name: 'Publish hero slides' }).click();
    await expect(hero.getByRole('status')).toContainText('Hero slides published');
    const img = ((await c.cmsBlock.findUniqueOrThrow({ where: key })).json as { title: string; img: string }[]).find((s) => s.title === 'QA last slide')!.img;
    expect(img).toMatch(/\.webp$/);
    // Switch the middle slide off and publish twice without reloading.
    const version = async () => (await c.cmsBlock.findUniqueOrThrow({ where: key })).updatedAt.getTime();
    let v = await version();
    await hero.locator('input[name=title_1]').fill('');
    await hero.getByRole('button', { name: 'Publish hero slides' }).click();
    await expect.poll(version).toBeGreaterThan(v);
    // The rows now show the saved slides again: the last slide moved up into the second row.
    await expect(hero.locator('input[name=title_1]')).toHaveValue('QA last slide');
    v = await version();
    await hero.getByRole('button', { name: 'Publish hero slides' }).click();
    await expect.poll(version).toBeGreaterThan(v);
    const slides = (await c.cmsBlock.findUniqueOrThrow({ where: key })).json as { title: string; img: string }[];
    expect(slides.map((s) => s.title)).not.toContain('QA middle slide');
    expect(slides.find((s) => s.title === 'QA last slide')?.img).toBe(img);
  } finally {
    await c.cmsBlock.update({ where: key, data: { json: before.json as object } });
    await c.$disconnect();
  }
});
