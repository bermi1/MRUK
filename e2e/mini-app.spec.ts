import { expect, test } from './fixtures';

test('Azania mini app purchase with PIN', async ({ page }) => {
  await page.goto('/azania');
  await page.getByRole('button', { name: /Demo: sign in/ }).click();
  await expect(page.getByText('Salary Advance limit')).toBeVisible();
  await page.locator('.mn-card[aria-disabled="false"]').first().click();
  await expect(page.getByText('Choose your term')).toBeVisible();
  await page.getByRole('button', { name: /12 months/ }).click();
  await page.getByRole('button', { name: /^Dar es Salaam/ }).click();
  await page.getByRole('button', { name: /Buy on Salary Advance/ }).click();
  await expect(page.getByRole('heading', { name: 'Review and sign' })).toBeVisible();
  for (const box of await page.locator('.mn-check input').all()) await box.check();
  for (const d of '0000') await page.getByRole('button', { name: `Digit ${d}` }).click();
  await expect(page.locator('.mn-error')).toBeVisible();
  for (const d of '1234') await page.getByRole('button', { name: `Digit ${d}` }).click();
  await expect(page.getByRole('heading', { name: /Approved and ordered/ })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.mn-row', { hasText: 'Order number' })).toContainText(/(MU|SW)-\d+/);
});
