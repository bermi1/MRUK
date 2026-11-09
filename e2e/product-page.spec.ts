import { PrismaClient } from '@prisma/client';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * Product page: detail accordion (keyboard, deep links), in-page photo gallery and sticky buy bar,
 * on both brands. Products are picked from the seeded catalogue (the one with most photos).
 */
const db = new PrismaClient();
const BRANDS = ['mruk', 'skywood'] as const;
const picks: Record<string, { id: string; model: string; images: number }> = {};

test.beforeAll(async () => {
  for (const brand of BRANDS) {
    const all = await db.product.findMany({ where: { brandKey: brand, hidden: false, stock: { gt: 0 } }, select: { id: true, model: true, images: true } });
    const best = all.filter((p) => p.images.length > 0).sort((a, b) => b.images.length - a.images.length)[0]!;
    picks[brand] = { id: best.id, model: best.model, images: best.images.length };
  }
});
test.afterAll(async () => {
  await db.$disconnect();
});

const btn = (page: Page, id: string) => page.locator(`#${id}-btn`);

for (const brand of BRANDS) {
  test.describe(`${brand} product page`, () => {
    test('accordion: first section open, keyboard navigation and toggling, one h1', async ({ page }) => {
      const p = picks[brand]!;
      await page.goto(`/${brand}/p/${p.id}`);
      await expect(page.locator('h1')).toHaveCount(1);
      const details = page.getByTestId('pdp-details');
      await expect(details.getByRole('heading', { level: 2 })).toBeVisible();

      const buttons = details.locator('.pdx-btn');
      const n = await buttons.count();
      expect(n).toBeGreaterThanOrEqual(4);
      await expect(buttons.first()).toHaveAttribute('aria-expanded', 'true');
      for (let i = 1; i < n; i++) await expect(buttons.nth(i)).toHaveAttribute('aria-expanded', 'false');
      // Every button controls a labelled region; collapsed panels are inert.
      const first = buttons.first();
      const panelId = (await first.getAttribute('aria-controls'))!;
      await expect(page.locator(`#${panelId}`)).toHaveAttribute('role', 'region');
      await expect(page.locator(`#${panelId}`)).toBeVisible();

      // Arrow keys move between headings (wrapping), End/Home jump.
      await first.focus();
      await page.keyboard.press('ArrowDown');
      await expect(buttons.nth(1)).toBeFocused();
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowUp');
      await expect(buttons.nth(n - 1)).toBeFocused();
      await page.keyboard.press('Home');
      await expect(first).toBeFocused();
      await page.keyboard.press('End');
      await expect(buttons.nth(n - 1)).toBeFocused();

      // Enter opens Specifications, Space closes it again.
      await btn(page, 'specs').focus();
      await page.keyboard.press('Enter');
      await expect(btn(page, 'specs')).toHaveAttribute('aria-expanded', 'true');
      const specs = page.getByTestId('pdp-specs');
      await expect(specs).toBeVisible();
      await expect(specs.locator('tr').first()).toContainText(p.model);
      await page.keyboard.press(' ');
      await expect(btn(page, 'specs')).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('#specs-panel')).toHaveAttribute('inert', '');

      // No warranty period or return policy is invented: the support section points to WhatsApp.
      await btn(page, 'warranty').click();
      await expect(page.locator('#warranty-panel')).toContainText('Ask our team on WhatsApp for warranty details.');
      await expect(page.locator('#warranty-panel a[href^="https://wa.me/"]')).toBeVisible();
    });

    test('accordion: deep links open the section (#specs on load, #delivery from the perks)', async ({ page }) => {
      const p = picks[brand]!;
      await page.goto(`/${brand}/p/${p.id}#specs`);
      await expect(btn(page, 'specs')).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByTestId('pdp-specs')).toBeInViewport();

      await page.locator('.perks a[href="#delivery"]').click();
      await expect(btn(page, 'delivery')).toHaveAttribute('aria-expanded', 'true');
      await expect(page).toHaveURL(/#delivery$/);
      const fees = page.getByTestId('pdp-fees');
      await expect(fees).toBeInViewport();
      await expect(fees).toContainText('Dar es Salaam');
      await expect(fees).toContainText('Zanzibar');
    });

    test('photos stay on the page: clicking the photo opens no full-screen viewer; arrows and thumbnails switch', async ({ page }) => {
      const p = picks[brand]!;
      await page.goto(`/${brand}/p/${p.id}`);
      const media = page.getByTestId('gallery-media');
      await media.click({ position: { x: 40, y: 40 } });
      await expect(page.getByRole('dialog')).toHaveCount(0);
      if (p.images > 1) {
        const count = page.getByTestId('gallery-count');
        await expect(count).toHaveText(`1 / ${p.images}`);
        await page.getByRole('button', { name: /next/i }).first().click();
        await expect(count).toHaveText(`2 / ${p.images}`);
        await page.locator('.thumbs button').first().click();
        await expect(count).toHaveText(`1 / ${p.images}`);
      }
    });
  });
}

test('sticky buy bar appears after scrolling past the buttons and adds to cart', async ({ page, context }) => {
  await context.clearCookies();
  const p = picks.mruk!;
  await page.goto(`/mruk/p/${p.id}`);
  const bar = page.getByTestId('sticky-buy');
  await expect(bar).not.toHaveClass(/is-shown/);
  await page.getByTestId('pdp-details').scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 300);
  await expect(bar).toHaveClass(/is-shown/);
  await bar.getByTestId('sticky-add').click();
  await expect(page).toHaveURL(/\/mruk\/cart/);
  await expect(page.getByTestId('cart-line')).toHaveCount(1);
});

test('a product without description or specs still has an overview (features) and a spec table', async ({ page }) => {
  const plain = await db.product.findFirst({ where: { brandKey: 'skywood', hidden: false, description: '', features: { isEmpty: false } }, select: { id: true, model: true, features: true } });
  test.skip(!plain, 'every product has a description');
  await page.goto(`/skywood/p/${plain!.id}`);
  const overview = page.getByTestId('pdp-overview');
  await expect(overview).toBeVisible();
  await expect(overview).toContainText(plain!.features[0]!);
  // Features are the overview, so there is no separate (duplicate) Key features section.
  await expect(page.locator('#features')).toHaveCount(0);
  await expect(page.locator('#specs-panel')).toContainText(plain!.model);
  await expect(page.getByTestId('pdp-highlights').locator('li')).toHaveCount(Math.min(4, plain!.features.length));
});
