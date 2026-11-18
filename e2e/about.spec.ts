import { expect, test } from './fixtures';
import { db, staffSignIn } from './staff';

test('Mr UK About page lists the story, activities and awards; the home page shows a quiet awards strip', async ({ page }) => {
  await page.goto('/mruk/about');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Our story' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What we do' })).toBeVisible();
  await expect(page.getByTestId('award')).toHaveCount(3);
  await expect(page.getByTestId('award').first()).toContainText('Home Appliance Supplier of the Year');
  // Indexable: canonical URL and the awards in the Organization structured data.
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/about$/);
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(ld).toContain('Africa Company of the Year Awards');
  // No Azania wording while Pay Later is off.
  await expect(page.locator('main, .about').first()).not.toContainText(/azania/i);

  await page.goto('/mruk');
  const strip = page.getByTestId('awards-strip');
  await expect(strip).toContainText('Outstanding Home Appliance Brand of the Year');
  await strip.getByRole('link', { name: /See our awards/ }).click();
  await expect(page).toHaveURL(/\/mruk\/about#awards$/);
  // Footer link on every page.
  await page.goto('/mruk/shop');
  await expect(page.locator('footer').getByRole('link', { name: 'About us' })).toHaveAttribute('href', '/mruk/about');
});

test('Skywood has an About page and shows the group awards', async ({ page }) => {
  await page.goto('/skywood/about');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByTestId('award')).toHaveCount(3);
  await page.goto('/skywood');
  await expect(page.getByTestId('awards-strip')).toBeVisible();
});

test('leadership is listed on the About page and indexed as a Person', async ({ page }) => {
  await page.goto('/mruk/about');
  await expect(page.getByTestId('leader').first()).toContainText('Profile Beda Masawe');
  await expect(page.getByTestId('leader').first()).toContainText('Chairperson');
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
  expect(ld).toContain('"@type":"Person"');
  expect(ld).toContain('Profile Beda Masawe');
});

test('staff edit the About page in the CMS and the store shows it', async ({ page, browser, baseURL }) => {
  await staffSignIn(page, 'amani@mruk.co.tz');
  await page.goto('/admin/cms?b=mruk#about');
  const form = page.getByRole('form', { name: 'About page' });
  const original = await form.locator('input[name=headline]').inputValue();
  const headline = `About from admin ${Date.now().toString(36)}`;
  await form.locator('input[name=headline]').fill(headline);
  await form.getByRole('button', { name: 'Publish About page' }).click();
  await expect(form.getByText('About page published')).toBeVisible();

  const store = await browser.newPage();
  await store.route('**/*', (r) => (r.request().url().startsWith(baseURL!) ? r.continue() : r.abort()));
  await store.goto('/mruk/about');
  await expect(store.getByRole('heading', { level: 1, name: headline })).toBeVisible();
  await expect(store.getByTestId('award')).toHaveCount(3); // trophy photos and rows survive a text edit
  await expect(store.getByTestId('award').first().locator('img')).toBeVisible();
  await store.close();

  await form.locator('input[name=headline]').fill(original);
  await form.getByRole('button', { name: 'Publish About page' }).click();
  await expect(form.getByText('About page published')).toBeVisible();
});

test('one person can hold several roles: client support who is also the storekeeper', async ({ page }) => {
  const c = db();
  try {
    await staffSignIn(page, 'bernard@bermitechs.com');
    await page.goto('/admin/settings');
    const row = page.locator('tr', { hasText: 'zawadi@mruk.co.tz' });
    await row.locator('summary', { hasText: 'Manage' }).click();
    const form = row.getByRole('form', { name: /^Manage / });
    await form.getByRole('checkbox', { name: /^Storekeeper/ }).check();
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form.getByText('Saved')).toBeVisible();
    expect((await c.staffUser.findUniqueOrThrow({ where: { email: 'zawadi@mruk.co.tz' } })).extraRoles).toEqual(['support']);

    await staffSignIn(page, 'zawadi@mruk.co.tz');
    await expect(page.getByTestId('dash-hello')).toContainText('Storekeeper + Client support');
    // Support pages as before, plus the warehouse's inventory page.
    await page.goto('/admin/tickets');
    await expect(page.getByRole('heading', { name: /tickets/i }).first()).toBeVisible();
    await page.goto('/admin/inventory');
    await expect(page.getByText(/cannot|not allowed|no access/i)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /inventory/i }).first()).toBeVisible();
  } finally {
    await c.staffUser.update({ where: { email: 'zawadi@mruk.co.tz' }, data: { roleId: 'support', extraRoles: [] } });
    await c.$disconnect();
  }
});
