import { PrismaClient } from '@prisma/client';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const db = new PrismaClient();
const DEAL = 'mruk-uk-f215-30-4dl-wd'; // fridge with a seeded 15% flash deal
const FRIDGES = [DEAL, 'mruk-uk59', 'mruk-uk-f47-094i'];
const FOURTH = 'mruk-uk-50';
const OTHER_CAT = 'mruk-uk-g5500q'; // generator

test.afterAll(() => db.$disconnect());

async function addFromPdp(page: Page, brand: string, id: string) {
  await page.goto(`/${brand}/p/${id}`);
  await page.locator('.buybox-cmp [data-testid=compare-toggle], [data-testid=compare-toggle].cmp-link').first().click();
  await expect(page.locator('.toast')).toBeVisible();
  return (await page.locator('.toast').innerText()).trim();
}

const verdictText = (page: Page) => page.getByTestId('verdict').innerText();

test.describe('AI compare', () => {
  test.beforeEach(async ({ context }) => context.clearCookies());

  test('same-category picks, deal prices, limit, bilingual grounded verdict that follows admin edits', async ({ page }) => {
    for (const id of FRIDGES) expect(await addFromPdp(page, 'mruk', id)).toContain('added to compare');
    // The tray shows the picks on every store page.
    await expect(page.getByTestId('compare-tray')).toContainText('Compare (3/3)');
    // A 4th is refused (nothing dropped silently); another category is refused with a way to start over.
    expect(await addFromPdp(page, 'mruk', FOURTH)).toContain('up to 3 products');
    const mixed = await addFromPdp(page, 'mruk', OTHER_CAT);
    expect(mixed).toContain('You are comparing Refrigerators');
    await expect(page.locator('.toast').getByRole('button', { name: 'Start new comparison' })).toBeVisible();

    await page.goto('/mruk/compare');
    await expect(page.getByTestId('compare-col')).toHaveCount(3);
    await expect(page.getByTestId('compare-count')).toContainText('3 of 3');
    await expect(page.locator('[role=table]')).not.toContainText('G5500Q');
    // The deal fridge shows today's price with the list price struck, as on its product page and in the cart.
    const dealCol = (await page.getByTestId('compare-col').allInnerTexts()).findIndex((t) => t.includes('Side by Side'));
    const cell = page.locator('[data-row=price] [role=cell]').nth(dealCol);
    await expect(cell.locator('s')).toBeVisible();
    await expect(cell).toContainText('−15%');
    for (const row of ['rating', 'stock', 'type']) await expect(page.locator(`[data-row=${row}]`)).toBeVisible();

    // English verdict, grounded in the listed features only (Pay Later is off: no monthly prices).
    await page.getByTestId('run-verdict').click();
    await expect(page.getByTestId('verdict')).toHaveAttribute('data-lang', 'en');
    await expect(page.getByTestId('verdict-pick')).toBeVisible();
    await expect(page.getByTestId('verdict-value')).toContainText('Best value:');
    await expect(page.getByTestId('verdict-product')).toHaveCount(3);
    const en = await verdictText(page);
    const features = (await db.product.findMany({ where: { id: { in: FRIDGES } } })).flatMap((p) => p.features.map((f) => f.toLowerCase()));
    const quoted = [...en.matchAll(/“([^”]+)”/g)].map((m) => m[1]!.toLowerCase());
    for (const q of quoted) expect(features).toContain(q);
    expect(en).toMatch(/not specified/);
    expect(en).not.toMatch(/\/mo\b|per month|Pay Later/);

    // Kiswahili from the panel toggle.
    await page.getByTestId('verdict-lang-sw').click();
    await expect(page.getByTestId('verdict')).toHaveAttribute('data-lang', 'sw');
    await expect(page.getByTestId('verdict')).toContainText('Thamani bora kwa pesa');
    await expect(page.getByTestId('verdict')).toContainText('hakijaelezwa');

    // Staff add a spec in the admin: the next verdict uses it.
    const before = await db.product.findUniqueOrThrow({ where: { id: 'mruk-uk-f47-094i' } });
    try {
      await db.product.update({ where: { id: before.id }, data: { features: [...before.features, 'Whisper quiet compressor'] } });
      await page.getByTestId('verdict-lang-en').click();
      await expect(page.getByTestId('verdict')).toHaveAttribute('data-lang', 'en');
      await page.getByTestId('run-verdict').click();
      await expect(page.getByTestId('verdict')).toContainText('Whisper quiet compressor');
      await expect(page.getByTestId('verdict')).toContainText('quiet rooms');
    } finally {
      await db.product.update({ where: { id: before.id }, data: { features: before.features } });
    }

    // Skywood keeps its own list.
    expect(await addFromPdp(page, 'skywood', 'skywood-r10')).toContain('added to compare');
    await page.goto('/skywood/compare');
    await expect(page.getByTestId('compare-count')).toContainText('1 of 3');
    await expect(page.locator('[role=table]')).not.toContainText('Refrigerator');

    // Start a new comparison from another category, then clear all.
    await addFromPdp(page, 'mruk', OTHER_CAT);
    await page.locator('.toast').getByRole('button', { name: 'Start new comparison' }).click();
    await expect(page.locator('.toast')).toContainText('added to compare');
    await page.goto('/mruk/compare');
    await expect(page.getByTestId('compare-count')).toContainText('1 of 3');
    await expect(page.getByTestId('compare-col').first()).toContainText('G5500Q');
    await page.getByTestId('compare-clear').click();
    await expect(page.getByTestId('compare-count')).toContainText('0 of 3');
  });

  test('site language Kiswahili gives a Kiswahili verdict', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'bt_locale', value: 'sw', url: baseURL! }]);
    await addFromPdp(page, 'skywood', 'skywood-r10');
    await addFromPdp(page, 'skywood', 'skywood-sk-g05');
    await page.goto('/skywood/compare');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Linganisha bidhaa');
    await page.getByTestId('run-verdict').click();
    await expect(page.getByTestId('verdict')).toHaveAttribute('data-lang', 'sw');
    await expect(page.getByTestId('verdict')).toContainText('Chaguo letu');
  });

  test.describe('phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    test('compare from the category grid, tray, table and verdict without page scroll', async ({ page }) => {
      await page.goto('/skywood/c/kitchen');
      const toggles = page.locator('[data-testid=product-tile] [data-testid=compare-toggle]');
      await toggles.nth(0).tap();
      await expect(page.locator('.toast')).toContainText('added to compare');
      await toggles.nth(1).tap();
      await expect(toggles.nth(1)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByTestId('compare-tray')).toBeVisible();
      await page.getByTestId('compare-tray').getByRole('link', { name: 'Compare now' }).tap();
      await expect(page).toHaveURL(/\/skywood\/compare/);
      await expect(page.getByTestId('compare-col')).toHaveCount(2);
      await page.getByTestId('run-verdict').tap();
      await expect(page.getByTestId('verdict-pick')).toBeVisible();
      const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(sw).toBeLessThanOrEqual(iw);
    });
  });
});
