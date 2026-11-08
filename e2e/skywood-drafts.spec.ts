import { expect, test } from './fixtures';
import { db, staffSignIn } from './staff';

/**
 * Skywood draft products (client photo/spec pack): created hidden with price 0. They must never reach the
 * store, a draft cannot be published until it has a price (server-side), and the Drafts filter lets staff
 * set price and stock and publish in one place.
 */
const PID = 'skywood-sk-g01'; // published by this test, then put back to a draft
const OTHER = 'skywood-sk-g02'; // stays a draft throughout

async function resetDraft(id: string) {
  const c = db();
  await c.product.update({ where: { id }, data: { hidden: true, price: 0, stock: 0 } });
  await c.$disconnect();
}

test.beforeEach(async () => {
  await resetDraft(PID);
  await resetDraft(OTHER);
});
test.afterAll(async () => {
  await resetDraft(PID);
});

test('drafts stay out of the store, cannot be published without a price, and publish in one click once priced', async ({ page }) => {
  // Storefront: drafts are not listed, not in the sitemap or llms.txt, and their pages are not found.
  expect((await page.request.get(`/skywood/p/${OTHER}`)).status()).toBe(404);
  const sitemap = await (await page.request.get('/sitemap.xml')).text();
  expect(sitemap).not.toContain(OTHER);
  expect(sitemap).not.toContain(PID);
  expect(await (await page.request.get('/llms.txt')).text()).not.toContain('SK-G02');

  await staffSignIn(page, 'bernard@bermitechs.com');
  // Sidebar badge on Products and the Drafts filter with its count.
  await expect(page.locator('a.ad-nav[href="/admin/products"] .ad-badge')).toBeVisible();
  await page.goto('/admin/products?b=skywood&f=drafts');
  await expect(page.getByTestId('drafts-filter')).toHaveText(/Drafts — needs price \(\d+\)/);
  const row = page.locator(`tr[data-product="${PID}"]`);
  await expect(row.getByTestId('draft-pill')).toBeVisible();
  await expect(page.locator('tr[data-product="skywood-sky-50-5bi"]')).toHaveCount(0); // live products are not listed here

  // Server refuses to publish a draft with price 0.
  await row.getByRole('button', { name: /Draft, needs price/ }).click();
  await expect(row.getByRole('alert')).toHaveText('Set a price before publishing');
  const c = db();
  expect((await c.product.findUniqueOrThrow({ where: { id: PID } })).hidden).toBe(true);

  // The editor refuses too (switching it to visible with no price).
  await page.goto(`/admin/products/${PID}`);
  await page.locator('input[name=visible]').check({ force: true });
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Set a price before publishing').first()).toBeVisible();
  expect((await c.product.findUniqueOrThrow({ where: { id: PID } })).hidden).toBe(true);

  // Set price and stock in the drafts list, then Publish.
  await page.goto('/admin/products?b=skywood&f=drafts');
  const price = row.getByLabel(/^Price of /);
  await price.fill('450,000');
  await price.press('Enter');
  await expect(row.getByRole('button', { name: /^Publish / })).toBeVisible();
  const stock = row.getByLabel(/^Stock of /);
  await stock.fill('5');
  await stock.press('Enter');
  await expect.poll(async () => (await c.product.findUniqueOrThrow({ where: { id: PID } })).stock).toBe(5);
  await row.getByRole('button', { name: /^Publish / }).click();
  await expect(row).toHaveCount(0); // live now, so it leaves the drafts list
  const live = await c.product.findUniqueOrThrow({ where: { id: PID } });
  expect(live).toMatchObject({ hidden: false, price: 450_000, stock: 5 });
  expect(await c.auditLog.count({ where: { action: 'product.publish', entityId: PID, actor: 'bernard@bermitechs.com' } })).toBeGreaterThan(0);
  await c.$disconnect();

  // On the store with its photos.
  await page.goto(`/skywood/p/${PID}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Built-in Gas Hob with Hot Plate');
  await expect(page.locator(`img[src*="${PID}-1.webp"]`).first()).toBeVisible();
  expect((await page.request.get(`/skywood/p/${OTHER}`)).status()).toBe(404);
});
