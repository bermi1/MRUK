import { PrismaClient } from '@prisma/client';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { DB_URL, setPayLater, signInOwner, togglePayLater } from './paylater';

const PRODUCT = '/skywood/p/skywood-s-06';
const PL = /Pay Later|Lipa Baadaye|\/mo\b|\/mwezi|salary/i;

/** All text in the rendered page (visible or not), scripts and styles excluded. */
async function pageText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const b = document.body.cloneNode(true) as HTMLElement;
    b.querySelectorAll('script, style, noscript').forEach((n) => n.remove());
    return b.textContent ?? '';
  });
}

async function advanceOrders(): Promise<number> {
  const db = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  try {
    return await db.order.count({ where: { brandKey: 'skywood', paymentMethod: 'salary_advance' } });
  } finally {
    await db.$disconnect();
  }
}

/** Skywood checkout up to the signing step, with Pay Later chosen while it is still on. */
async function toContract(store: Page) {
  await store.goto(PRODUCT);
  await store.getByRole('button', { name: '6 months' }).click();
  await store.getByTestId('buy-now').click();
  await expect(store).toHaveURL(/\/skywood\/checkout/);
  await store.locator('input[name=name]').fill('Neema Mushi');
  await store.locator('input[name=phone]').fill('+255 754 000 214');
  await store.getByTestId('consent').check();
  await store.getByTestId('place-order').click();
  await store.locator('input[name=nida]').fill('19900101-12345-00001-23');
  await store.locator('input[name=employer]').fill('University of Dar es Salaam');
  await store.locator('input[name=checkNumber]').fill('100311');
  await store.locator('input[name=account]').fill('015022148821');
  await store.locator('input[name=salary]').fill('1800000');
  await store.getByTestId('to-contract').click();
  await store.getByTestId('signature').fill('Neema Mushi');
  await store.getByTestId('consent-0').check();
  await store.getByTestId('consent-1').check();
}

test('admin switches Pay Later off for Skywood: no Pay Later anywhere, pay in full only, advance orders refused; on again brings it back', async ({ page, browser, baseURL }) => {
  test.setTimeout(180_000);
  await setPayLater(browser, baseURL!, { skywood: true, mruk: true });
  await signInOwner(page);

  // A customer starts a Pay Later checkout while it is still on.
  const ctx = await browser.newContext({ baseURL });
  const store = await ctx.newPage();
  await store.route('**/*', (r) => (r.request().url().startsWith(baseURL!) ? r.continue() : r.abort()));
  await toContract(store);
  const before = await advanceOrders();

  // Admin turns it off (confirm dialog, audit-logged); the dashboard shows the state.
  await togglePayLater(page, 'skywood', false);
  await page.goto('/admin');
  await expect(page.getByTestId('paylater-status').locator('[data-brand=skywood]')).toHaveAttribute('data-state', 'off');
  await expect(page.getByTestId('paylater-status').locator('[data-brand=mruk]')).toHaveAttribute('data-state', 'on');

  // The stale checkout page cannot create the advance order: the server re-checks the switch.
  await store.getByTestId('sign-submit').click();
  await expect(store.getByRole('alert').filter({ hasText: 'Pay Later is not available' })).toBeVisible();
  await expect(store).toHaveURL(/\/skywood\/checkout/);
  expect(await advanceOrders()).toBe(before);

  // Store home: no Pay Later, monthly prices or salary copy, in either language.
  await store.goto('/skywood');
  await expect(store.getByRole('heading', { level: 1 }).first()).toBeVisible();
  expect(await pageText(store)).not.toMatch(PL);

  // Product page: pay in full only.
  await store.goto(PRODUCT);
  const options = store.getByRole('radiogroup', { name: 'Payment option' }).getByRole('radio');
  await expect(options).toHaveCount(1);
  await expect(options.first()).toContainText('Pay in full');
  await expect(store.getByRole('button', { name: '6 months' })).toHaveCount(0);
  expect(await pageText(store)).not.toMatch(PL);

  // Checkout offers no Pay Later method, even when asked for it in the URL.
  await store.goto('/skywood/checkout?method=salary_advance');
  await expect(store.getByTestId('pay-card')).toBeVisible();
  await expect(store.getByTestId('pay-salary_advance')).toHaveCount(0);

  // The explainer page is gone; Mr UK is untouched.
  expect((await store.goto('/skywood/pay-later'))!.status()).toBe(404);
  await store.goto('/mruk');
  expect(await pageText(store)).toMatch(/Pay Later/);

  // Kiswahili too.
  await ctx.addCookies([{ name: 'bt_locale', value: 'sw', url: baseURL! }]);
  await store.goto('/skywood');
  expect(await pageText(store)).not.toMatch(PL);
  await ctx.clearCookies({ name: 'bt_locale' });

  // Admin turns it back on: everything returns.
  await togglePayLater(page, 'skywood', true);
  await store.goto('/skywood');
  expect(await pageText(store)).toMatch(/Pay Later/);
  await store.goto(PRODUCT);
  await expect(store.getByRole('radiogroup', { name: 'Payment option' }).getByRole('radio')).toHaveCount(2);
  await expect(store.getByTestId('monthly')).toBeVisible();
  expect((await store.goto('/skywood/pay-later'))!.status()).toBe(200);
  await ctx.close();

  // Both changes are in the audit log.
  const db = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  const logs = await db.auditLog.findMany({ where: { entityId: 'payLater.skywood' }, orderBy: { at: 'desc' }, take: 2 });
  await db.$disconnect();
  expect(logs.map((l) => l.action)).toEqual(['paylater.on', 'paylater.off']);
});

test('Azania mini app shows "coming soon" while Pay Later is off for both brands', async ({ page, browser, baseURL }) => {
  await setPayLater(browser, baseURL!, { mruk: false, skywood: false });
  try {
    await page.goto('/azania');
    await expect(page.getByTestId('mini-soon')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Coming soon to the Azania app' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Demo: sign in/ })).toHaveCount(0);
  } finally {
    await setPayLater(browser, baseURL!, { mruk: true, skywood: true });
  }
  await page.goto('/azania');
  await expect(page.getByTestId('mini-soon')).toHaveCount(0);
});
