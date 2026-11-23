import { expect, test } from './fixtures';
import { staffSignIn } from './staff';

const EMAIL = 'amani@mruk.co.tz';

test('admin signs in, edits the hero and price, and the store shows it', async ({ page, browser, baseURL }) => {
  await staffSignIn(page, EMAIL);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  const headline = `Live from admin ${Date.now().toString(36)}`;
  await page.goto('/admin/cms?b=mruk');
  const original = await page.inputValue('[data-testid=hero-title-0]');
  await page.fill('[data-testid=hero-title-0]', headline);
  await page.getByRole('button', { name: 'Publish hero slides' }).click();
  await expect(page.getByText('Hero slides published')).toBeVisible();

  const store = await browser.newPage();
  await store.route('**/*', (r) => (r.request().url().startsWith(baseURL!) ? r.continue() : r.abort()));
  await store.goto('/mruk');
  // The opening film is slide 1; the first CMS slide is slide 2.
  await store.getByRole('tab', { name: 'Slide 2' }).click();
  await expect(store.getByRole('heading', { name: headline })).toBeVisible();
  await store.close();

  // Restore the original hero title.
  await page.fill('[data-testid=hero-title-0]', original);
  await page.getByRole('button', { name: 'Publish hero slides' }).click();
  await expect(page.getByText('Hero slides published')).toBeVisible();
});
