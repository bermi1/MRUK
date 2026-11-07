import { PrismaClient } from '@prisma/client';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const db = new PrismaClient();
const PID = 'skywood-q9';
let original = 0;

test.beforeAll(async () => {
  original = (await db.product.findUniqueOrThrow({ where: { id: PID } })).stock;
});
test.afterAll(async () => {
  await db.product.update({ where: { id: PID }, data: { stock: original } });
  await db.$disconnect();
});

async function checkoutWithCard(page: Page, phone: string) {
  await page.goto('/skywood/checkout');
  await page.locator('input[name=name]').fill('Stock Tester');
  await page.locator('input[name=phone]').fill(phone);
  await page.getByTestId('pay-card').click();
  await page.getByTestId('consent').check();
  await page.getByTestId('place-order').click();
  await expect(page).toHaveURL(/\/skywood\/pay\/SW-/);
  return page.url().match(/SW-\d+/)![0];
}

async function payCard(page: Page) {
  await page.locator('input[name=cardNumber]').fill('4242 4242 4242 4242');
  await page.locator('input[name=expiry]').fill('12/29');
  await page.locator('input[name=cvc]').fill('123');
  await page.getByTestId('pay-submit').click();
}

test('stock: low stock shows "Only N left", cart caps at stock, buying reduces it, expiry and restock return it', async ({ page, context }) => {
  await context.clearCookies();
  // Older unpaid test orders would hand their reserved units back mid-test when they expire.
  await db.order.updateMany({ where: { status: 'placed', items: { some: { productId: PID } } }, data: { status: 'cancelled', reservedUntil: null } });
  await db.product.update({ where: { id: PID }, data: { stock: 3 } });

  await page.goto(`/skywood/p/${PID}`);
  await expect(page.getByTestId('stock-status')).toHaveText('Only 3 left');
  await page.getByRole('radio', { name: /Pay in full/ }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page).toHaveURL(/\/skywood\/cart/);

  // Up to the 3 on the shelf, no further.
  const inc = page.getByRole('button', { name: /^Increase/ });
  await inc.click();
  await expect(page.getByTestId('cart-line')).toContainText('2');
  await inc.click();
  await expect(page.getByTestId('cart-stock')).toHaveText('Only 3 left');
  await expect(inc).toBeDisabled();
  await page.goto(`/skywood/p/${PID}`);
  await page.getByRole('radio', { name: /Pay in full/ }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.locator('.toast')).toContainText('all in your cart');

  // Placing the order reserves the stock: the product is out of stock and can't be added.
  const number = await checkoutWithCard(page, '0754222333');
  await page.goto(`/skywood/p/${PID}`);
  await expect(page.getByTestId('stock-status')).toHaveText('Out of stock');
  await expect(page.getByTestId('buy-now')).toBeDisabled();

  // The unpaid reservation expires: stock comes back (and payment is refused).
  await page.goBack();
  await expect(page).toHaveURL(/\/skywood\/pay\/SW-/);
  await db.order.update({ where: { number }, data: { reservedUntil: new Date(Date.now() - 60_000) } });
  await payCard(page);
  await expect(page.getByText(/payment window has expired|This order is\s+cancelled/).first()).toBeVisible();
  expect((await db.product.findUniqueOrThrow({ where: { id: PID } })).stock).toBe(3);
  expect((await db.order.findUniqueOrThrow({ where: { number } })).status).toBe('cancelled');
  await page.goto(`/skywood/p/${PID}`);
  await expect(page.getByTestId('stock-status')).toHaveText('Only 3 left');

  // Admin restock (same database write as Inventory › Restock) shows on the product page at once.
  await db.product.update({ where: { id: PID }, data: { stock: { increment: 5 } } });
  const now = (await db.product.findUniqueOrThrow({ where: { id: PID } })).stock;
  await page.goto(`/skywood/p/${PID}`);
  await expect(page.getByTestId('stock-status')).toHaveText(now <= 6 ? `Only ${now} left` : `${now} in stock`);

  // Buy one and pay: stock drops by one for good.
  await page.getByRole('radio', { name: /Pay in full/ }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page).toHaveURL(/\/skywood\/cart/);
  await checkoutWithCard(page, '0754222444');
  await payCard(page);
  await expect(page).toHaveURL(/\/skywood\/order\/SW-/);
  await page.goto(`/skywood/p/${PID}`);
  await expect(page.getByTestId('stock-status')).toHaveText(now - 1 <= 6 ? `Only ${now - 1} left` : `${now - 1} in stock`);
});

test('promo codes: wrong brand, minimum, unknown, apply/remove, and the order total uses the server discount', async ({ page, context }) => {
  await context.clearCookies();
  await db.product.update({ where: { id: PID }, data: { stock: 10 } });
  await page.goto(`/skywood/p/${PID}`);
  await page.getByRole('radio', { name: /Pay in full/ }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page).toHaveURL(/\/skywood\/cart/);

  const apply = async (code: string) => {
    await page.locator('#dc').fill(code);
    await page.locator('.promo-apply').click();
  };
  await apply('NOPE99');
  await expect(page.locator('#dc-err')).toHaveText('Code not found');
  await apply('POWER15'); // Mr UK only
  await expect(page.locator('#dc-err')).toHaveText('Code is not valid for this brand');
  await apply('WELCOME5'); // inactive
  await expect(page.locator('#dc-err')).toHaveText('Code is not active');
  await db.discountCode.upsert({ where: { code: 'E2EMIN' }, create: { code: 'E2EMIN', percent: 10, minSubtotal: 50_000_000 }, update: { active: true, minSubtotal: 50_000_000 } });
  await apply('E2EMIN');
  await expect(page.locator('#dc-err')).toContainText('Spend at least');
  await db.discountCode.upsert({ where: { code: 'E2EOLD' }, create: { code: 'E2EOLD', percent: 10, expiresAt: new Date('2020-01-01') }, update: { expiresAt: new Date('2020-01-01') } });
  await apply('E2EOLD');
  await expect(page.locator('#dc-err')).toHaveText('Code has expired');
  await db.discountCode.upsert({ where: { code: 'E2EUSED' }, create: { code: 'E2EUSED', percent: 10, maxUses: 1, uses: 1 }, update: { maxUses: 1, uses: 1 } });
  await apply('E2EUSED');
  await expect(page.locator('#dc-err')).toHaveText('Code has been fully used');

  const before = await page.getByTestId('cart-total').innerText();
  await apply('KARIBU10');
  await expect(page.locator('.promo-on')).toContainText('KARIBU10');
  await expect(page.getByTestId('cart-total')).not.toHaveText(before);
  await page.locator('.promo-remove').click();
  await expect(page.getByTestId('cart-total')).toHaveText(before);
  await apply('KARIBU10');
  await expect(page.locator('.promo-on')).toBeVisible();

  const number = await checkoutWithCard(page, '0754222555');
  const o = await db.order.findUniqueOrThrow({ where: { number } });
  expect(o.discountCode).toBe('KARIBU10');
  expect(o.discount).toBe(Math.round(o.subtotal * 0.1));
  expect(o.total).toBe(o.subtotal - o.discount + o.deliveryFee);
  await payCard(page);
  await expect(page).toHaveURL(/\/skywood\/order\/SW-/);
  const inv = await db.invoice.findFirst({ where: { orderId: o.id } });
  if (inv) expect(inv.amount).toBe(o.total);
});
