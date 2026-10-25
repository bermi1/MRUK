import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const PASSWORD = process.env.SEED_STAFF_PASSWORD ?? 'ChangeMe-2026!';
const DB_URL = process.env.DATABASE_URL ?? 'postgresql://bt:bt@localhost:5432/bt_commerce';

async function signIn(page: Page, email: string) {
  const db = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  await db.staffUser.update({ where: { email }, data: { totpEnabled: false, totpSecretEnc: null, failedLogins: 0, lockedUntil: null } });
  await db.$disconnect();
  await page.goto('/admin/login');
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();
  const secret = (await page.getByTestId('totp-secret').textContent())!.trim();
  await page.fill('input[name=code]', authenticator.generate(secret));
  await page.getByRole('button', { name: /verify/i }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

test('brand switcher filters the console and marks it by brand', async ({ page }) => {
  await signIn(page, 'bernard@bermitechs.com');
  const brands = page.getByRole('group', { name: 'Brand shown across the console' });
  await brands.getByRole('button', { name: 'All brands' }).click();
  await expect(page.getByTestId('perf-all')).toBeVisible();

  await brands.getByRole('button', { name: 'Skywood' }).click();
  await expect(page.locator('header.ad-top')).toHaveAttribute('data-brand', 'skywood');
  await expect(page.getByTestId('perf-mruk')).toHaveCount(0);
  await page.goto('/admin/orders');
  const numbers = await page.locator('tbody a.num').allTextContents();
  expect(numbers.length).toBeGreaterThan(0);
  expect(numbers.every((n) => n.startsWith('SW-'))).toBe(true);

  // The CMS edits the selected brand and links to its live store.
  await page.goto('/admin/cms');
  await expect(page.getByTestId('cms-brand')).toContainText('Skywood');
  await expect(page.getByRole('link', { name: 'View live on the Skywood store' })).toHaveAttribute('href', '/skywood');

  await brands.getByRole('button', { name: 'All brands' }).click();
  await expect(page.locator('header.ad-top')).toHaveAttribute('data-brand', 'all');
});

test('brand-scoped staff only see their own brand', async ({ page }) => {
  await signIn(page, 'halima@skywood.co.tz');
  const brands = page.getByRole('group', { name: 'Brand shown across the console' });
  await expect(brands.getByRole('button', { name: 'Mr UK' })).toHaveCount(0);
  await expect(brands.getByRole('button', { name: 'All brands' })).toHaveCount(0);
  await page.goto('/admin/products?b=mruk');
  await expect(page.locator('tr[data-product^="mruk-"]')).toHaveCount(0);
  await expect(page.locator('tr[data-product^="skywood-"]').first()).toBeVisible();
  await page.goto('/admin/cms?b=mruk');
  await expect(page.getByTestId('cms-brand')).toContainText('Skywood');
});
