import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/** The price the product page shows (after any flash deal), e.g. "TZS 1,485,000". */
async function pdpPrice(page: Page, brand: string, id: string) {
  await page.goto(`/${brand}/p/${id}`);
  const price = (await page.getByTestId('pdp-price').innerText()).trim();
  const was = (await page.getByTestId('pdp-was').count()) ? (await page.getByTestId('pdp-was').innerText()).trim() : null;
  return { price, was };
}

const priceCell = (page: Page, col: number) => page.locator('[data-row=price] [role=cell]').nth(col);

test.describe('compare', () => {
  test.beforeEach(async ({ context }) => context.clearCookies());

  test('flash-deal prices, limit, brand isolation, AI and clear all', async ({ page }) => {
    // A Mr UK flash-deal product: compare must show the deal price the cart charges, with the list price struck.
    const deal = await pdpPrice(page, 'mruk', 'mruk-uk-g5500q');
    expect(deal.was).not.toBeNull();
    await page.getByRole('button', { name: /Add .*G5500Q Generator.* to compare/ }).click();
    await expect(page.locator('.toast')).toContainText('added to compare');
    await expect(page.getByRole('button', { name: /Remove .*G5500Q Generator.* from compare/ })).toBeVisible();

    await page.goto('/mruk/compare');
    await expect(page.getByTestId('compare-count')).toContainText('1 of 3');
    await expect(page.getByTestId('compare-col').first()).toContainText('G5500Q Generator');
    await expect(priceCell(page, 0)).toContainText(deal.price);
    await expect(priceCell(page, 0).locator('s')).toHaveText(deal.was!);

    // Add more from the shop; the fourth is refused, nothing is dropped silently.
    await page.goto('/mruk/shop');
    const toggles = page.locator('.shop-grid [data-testid=compare-toggle][aria-pressed=false]');
    for (let i = 0; i < 2; i++) {
      await toggles.first().click();
      await expect(page.locator('.toast')).toContainText('added to compare');
    }
    await toggles.first().click();
    await expect(page.locator('.toast')).toContainText('up to 3 products');
    await page.goto('/mruk/compare');
    await expect(page.getByTestId('compare-col')).toHaveCount(3);
    await expect(page.getByTestId('compare-count')).toContainText('3 of 3');
    await expect(page.getByTestId('compare-col').first()).toContainText('G5500Q Generator');
    await expect(page.locator('[data-row=rating]')).toBeVisible();

    // AI answers from the same live prices.
    await page.getByRole('button', { name: 'Which is best value?' }).click();
    await expect(page.getByTestId('ai-answer')).toContainText(`${deal.price} (flash deal, was ${deal.was})`);
    await page.getByTestId('run-verdict').click();
    await expect(page.getByTestId('verdict')).toContainText('Best value');

    // Skywood has its own list; neither leaks into the other.
    await page.goto('/skywood/p/skywood-q9');
    await page.getByRole('button', { name: /Add .* to compare/ }).click();
    await expect(page.locator('.toast')).toContainText('added to compare');
    await page.goto('/skywood/compare');
    await expect(page.getByTestId('compare-count')).toContainText('1 of 3');
    await expect(page.getByTestId('compare-col').first()).toContainText('Q9');
    await expect(page.locator('[role=table]')).not.toContainText('G5500Q');
    await page.goto('/mruk/compare');
    await expect(page.locator('[role=table]')).not.toContainText('Q9 Party Speaker');

    // Remove one, then clear all.
    await page.getByRole('button', { name: /Remove .*G5500Q Generator.* from compare/ }).click();
    await expect(page.getByTestId('compare-count')).toContainText('2 of 3');
    await page.getByTestId('compare-clear').click();
    await expect(page.getByTestId('compare-count')).toContainText('0 of 3');

    // The cart charges the price compare showed.
    await page.goto('/mruk/p/mruk-uk-g5500q');
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await expect(page).toHaveURL(/\/mruk\/cart/);
    await expect(page.getByTestId('cart-line')).toContainText(deal.price);
  });

  test.describe('phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    test('compare from the shop grid and read the table without page scroll', async ({ page }) => {
      await page.goto('/skywood/shop');
      const toggles = page.locator('.shop-grid [data-testid=compare-toggle]');
      await toggles.nth(0).tap();
      await expect(page.locator('.toast')).toContainText('added to compare');
      await toggles.nth(1).tap();
      await expect(toggles.nth(1)).toHaveAttribute('aria-pressed', 'true');
      await page.goto('/skywood/compare');
      await expect(page.getByTestId('compare-col')).toHaveCount(2);
      await expect(page.getByTestId('compare-count')).toContainText('2 of 3');
      const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(sw).toBeLessThanOrEqual(iw);
    });
  });
});
