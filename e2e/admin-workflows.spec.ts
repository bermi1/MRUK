import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { db, staffSignIn } from './staff';

const sharp = createRequire(resolve(__dirname, '../apps/web/package.json'))('sharp') as typeof import('sharp');

async function signIn(page: Page, email: string) {
  await staffSignIn(page, email);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

const png = (color: string) => sharp({ create: { width: 120, height: 90, channels: 3, background: color } }).png().toBuffer();

test('add a product: one form with features, specs, photos (reorder, main), preview, then edit with the same form', async ({ page }) => {
  await signIn(page, 'halima@skywood.co.tz');
  const c = db();
  await page.goto('/admin/products?b=skywood');
  await page.getByRole('link', { name: '+ Add product' }).click();
  const form = page.getByRole('form', { name: 'Add a product' });
  await expect(form).toBeVisible();

  // Inline validation before anything is sent.
  await form.getByRole('button', { name: 'Publish to store' }).click();
  await expect(form.getByRole('alert')).toContainText('Enter the model number');
  expect(await c.product.count({ where: { name: 'QA Air Fryer 5L' } })).toBe(0);

  // Duplicate model warning for an existing Skywood model.
  const existing = await c.product.findFirstOrThrow({ where: { brandKey: 'skywood' }, orderBy: { name: 'asc' } });
  await form.locator('input[name=model]').fill(existing.model);
  await expect(form.getByTestId('dup-model')).toContainText(existing.name);

  const model = `QA-AF${Date.now().toString(36).slice(-5).toUpperCase()}`;
  await form.locator('input[name=model]').fill(model);
  await expect(form.getByTestId('dup-model')).toHaveCount(0);
  await form.locator('input[name=name]').fill('QA Air Fryer 5L');
  await form.locator('input[name=price]').fill('245,000');
  await form.locator('input[name=stock]').fill('12');
  for (const f of ['5 litre basket', 'Digital touch panel', 'Auto shut-off']) {
    await form.getByLabel('New feature').fill(f);
    await form.getByLabel('New feature').press('Enter');
  }
  await form.getByRole('button', { name: 'Remove feature 3' }).click();
  await form.getByLabel('New feature').fill('Dishwasher-safe basket');
  await form.getByRole('button', { name: 'Add', exact: true }).click();
  await form.locator('textarea[name=description]').fill('A family air fryer that cooks chips, chicken and samosa with little or no oil. Easy to clean.');
  await form.getByLabel('Specification 1 value').fill('5 L');
  await form.getByLabel('Specification 2 value').fill('1500 W');
  await form.getByLabel('Specification 3 value').fill('1 year');
  // Two photos, then make the second one the main photo.
  await form.getByLabel('Add photos').setInputFiles([
    { name: 'a.png', mimeType: 'image/png', buffer: await png('#aa3322') },
    { name: 'b.png', mimeType: 'image/png', buffer: await png('#2233aa') },
  ]);
  await expect(form.getByTestId('photo')).toHaveCount(2);
  const second = await form.getByTestId('photo').nth(1).locator('img').getAttribute('src');
  await form.getByTestId('photo').nth(1).getByRole('button', { name: 'Set main' }).click();
  await expect(form.getByTestId('photo').first().locator('img')).toHaveAttribute('src', second!);
  // Preview shows what the shopper will see.
  const preview = form.getByTestId('product-preview');
  await expect(preview).toContainText('QA Air Fryer 5L');
  await expect(preview).toContainText('TZS 245,000');
  await expect(form.getByText('Ready for AI comparison: 4 of 4')).toBeVisible();

  await form.getByRole('button', { name: 'Publish to store' }).click();
  await expect(page).toHaveURL(/\/admin\/products\/skywood-qa-af/);
  await expect(page.getByText('is live in the store')).toBeVisible();
  const p = await c.product.findFirstOrThrow({ where: { model }, include: { embedding: true } });
  expect(p).toMatchObject({ brandKey: 'skywood', price: 245_000, stock: 12, hidden: false, features: ['5 litre basket', 'Digital touch panel', 'Dishwasher-safe basket'] });
  expect(p.specs).toEqual([{ label: 'Capacity', value: '5 L' }, { label: 'Power', value: '1500 W' }, { label: 'Warranty', value: '1 year' }]);
  expect(p.images).toHaveLength(2);
  expect(p.images[0]).toBe(second);
  expect(p.images.every((u) => u.endsWith('.webp'))).toBe(true);
  expect(p.embedding?.text).toContain('Power: 1500 W');
  expect(await c.auditLog.count({ where: { action: 'product.create', entityId: p.id } })).toBe(1);

  // The store has it.
  const store = await page.context().newPage();
  const r = await store.goto(`/skywood/p/${p.id}`);
  expect(r?.status()).toBe(200);
  await expect(store.getByRole('heading', { level: 1 })).toHaveText('QA Air Fryer 5L');
  await store.close();

  // Edit with the same form: change the price, hide it.
  const edit = page.getByRole('form', { name: 'Edit product' });
  await edit.locator('input[name=price]').fill('239000');
  await edit.getByText('Visible in the store').click();
  await edit.getByRole('button', { name: 'Save changes' }).click();
  await expect(edit.getByRole('status')).toContainText('Saved');
  expect(await c.product.findUniqueOrThrow({ where: { id: p.id } })).toMatchObject({ price: 239_000, hidden: true });
  const log = await c.auditLog.findFirstOrThrow({ where: { action: 'product.update', entityId: p.id } });
  expect(log.diff).toMatchObject({ price: { from: 245_000, to: 239_000 } });

  // Phone layout: no sideways scrolling.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/products/new?b=skywood');
  const [sw, w] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(sw).toBeLessThanOrEqual(w);
  await c.$disconnect();
});

test('receive an order: new-order queue, one-click steps with SMS, picking note, search by number', async ({ page }) => {
  const c = db();
  // An unpaid card order (seeded); on a re-run, a confirmed one that still has to be packed.
  const unpaid = await c.order.findFirst({ where: { brandKey: 'mruk', status: 'placed', paymentMethod: 'card' }, orderBy: { createdAt: 'desc' } });
  const o = unpaid ?? (await c.order.findFirstOrThrow({ where: { brandKey: 'mruk', status: 'approved' }, orderBy: { createdAt: 'desc' } }));
  if (unpaid) await c.order.update({ where: { id: o.id }, data: { reservedUntil: new Date(Date.now() + 30 * 60_000) } });
  await signIn(page, 'daudi@mruk.co.tz');
  await page.goto('/admin/orders');
  await expect(page.getByTestId('queue-new')).toContainText('New · to pack');
  // Typing the order number opens it.
  await page.getByLabel('Find order by number, name or phone').fill(o.number);
  await page.getByLabel('Find order by number, name or phone').press('Enter');
  const detail = page.getByRole('complementary', { name: `Order ${o.number}` });
  await expect(detail).toBeVisible();
  const steps = async () => c.auditLog.count({ where: { entityId: o.number, action: 'order.status' } });
  const before = await steps();
  if (unpaid) {
    // Confirm payment → payment recorded and the paid invoice issued.
    await detail.getByRole('button', { name: 'Confirm payment' }).click();
    await expect.poll(async () => (await c.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe('approved');
    expect(await c.invoice.findFirst({ where: { orderId: o.id, status: 'paid' } })).not.toBeNull();
  }
  for (const [label, status] of [
    ['Mark packed', 'packed'],
    ['Mark dispatched', 'out_for_delivery'],
    ['Mark delivered', 'delivered'],
  ] as const) {
    await detail.getByRole('button', { name: label }).click();
    await expect.poll(async () => (await c.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe(status);
  }
  expect(await steps()).toBe(before + (unpaid ? 4 : 3));
  await expect(detail.locator('.ad-steps li.done')).toHaveCount(4);
  // Picking / delivery note.
  await page.goto(`/admin/orders/${o.number}/note`);
  await expect(page.getByTestId('note-number')).toHaveText(o.number);
  await expect(page.getByText('Received in good condition by (customer)')).toBeVisible();
  // Another brand's note is not reachable for Mr UK-only staff.
  const sk = await c.order.findFirstOrThrow({ where: { brandKey: 'skywood' } });
  const r = await page.goto(`/admin/orders/${sk.number}/note`);
  expect(r?.status()).toBe(404);
  await c.$disconnect();
});

test('create an invoice for a walk-in sale, preview, send and mark paid', async ({ page }) => {
  await signIn(page, 'finance@mruk.co.tz');
  const c = db();
  const p = await c.product.findFirstOrThrow({ where: { brandKey: 'mruk', hidden: false, stock: { gte: 3 } }, orderBy: { price: 'asc' } });
  await page.goto('/admin/invoices');
  await page.getByRole('link', { name: '+ Create invoice' }).click();
  const form = page.getByRole('form', { name: 'Create invoice' });
  await form.locator('select[name=brand]').selectOption('mruk');
  await form.getByRole('button', { name: 'Create invoice' }).click();
  await expect(form.getByRole('alert')).toContainText('Add at least one item');
  await form.locator('input[name=name]').fill('Walk-in Customer');
  await form.locator('input[name=phone]').fill('0754 888 111');
  await form.getByLabel('Find a product').fill(p.model);
  await form.getByLabel('Add product').selectOption(p.id);
  await form.getByLabel(`Quantity of ${p.name}`).fill('2');
  await form.locator('input[name=discount]').fill('1000');
  await form.locator('input[name=deliveryFee]').fill('0');
  const total = p.price * 2 - 1000;
  await expect(form.getByTestId('invoice-total')).toHaveText(`TZS ${total.toLocaleString('en-US')}`);
  await form.getByText('Paid now').click(); // unpaid: invoice is due
  await form.getByRole('button', { name: 'Create invoice' }).click();
  await expect(page).toHaveURL(/\/admin\/invoices\?no=INV-/);
  const no = new URL(page.url()).searchParams.get('no')!;
  const inv = await c.invoice.findUniqueOrThrow({ where: { number: no }, include: { order: { include: { items: true } } } });
  expect(inv).toMatchObject({ status: 'issued', amount: total });
  expect(inv.order).toMatchObject({ channel: 'shop', status: 'delivered', contactPhone: '+255754888111', discount: 1000 });
  expect((await c.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(p.stock - 2);
  await expect(page.getByRole('article', { name: `Invoice ${no}` })).toContainText('Walk-in Customer');
  const pdf = await page.request.get(`/api/admin/invoices/${no}`);
  expect(pdf.headers()['content-type']).toBe('application/pdf');
  await page.getByRole('button', { name: 'Send by SMS' }).click();
  await expect(page.getByText('Invoice link sent by SMS')).toBeVisible();
  await page.getByRole('button', { name: 'Mark paid' }).click();
  await expect.poll(async () => (await c.invoice.findUniqueOrThrow({ where: { number: no } })).status).toBe('paid');
  expect(await c.payment.count({ where: { orderId: inv.orderId, status: 'captured' } })).toBe(1);
  expect(await c.auditLog.count({ where: { entityId: no, action: { in: ['invoice.create', 'invoice.send', 'invoice.paid'] } } })).toBe(3);
  // Support staff cannot create invoices.
  await signIn(page, 'zawadi@mruk.co.tz');
  await page.goto('/admin/invoices/new');
  await expect(page.getByRole('form', { name: 'Create invoice' })).toHaveCount(0);
  await c.$disconnect();
});
