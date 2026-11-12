import { expect, test } from './fixtures';

// Desktop header: "All products" opens the full catalogue on both brands.
for (const brand of ['mruk', 'skywood'] as const) {
  test(`${brand}: header "All products" opens the full catalogue`, async ({ page }) => {
    await page.goto(`/${brand}`);
    await page.getByTestId('nav-all-products').click();
    await expect(page).toHaveURL(new RegExp(`/${brand}/shop`));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('shop-grid').locator('> *').first()).toBeVisible();
  });
}
