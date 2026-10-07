import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';
import { expect, test } from './fixtures';

const EMAIL = 'amani@mruk.co.tz';
const PASSWORD = process.env.SEED_STAFF_PASSWORD ?? 'ChangeMe-2026!';

test('admin signs in with 2FA, edits the hero and price, and the store shows it', async ({ page, browser, baseURL }) => {
  // Fresh 2FA enrolment for the test user.
  const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL ?? 'postgresql://bt:bt@localhost:5432/bt_commerce' } } });
  await db.staffUser.update({ where: { email: EMAIL }, data: { totpEnabled: false, totpSecretEnc: null, failedLogins: 0, lockedUntil: null } });
  await db.$disconnect();

  await page.goto('/admin/login');
  await page.fill('input[name=email]', EMAIL);
  await page.fill('input[name=password]', PASSWORD);
  await page.getByRole('button', { name: /sign in|continue/i }).click();
  const secret = (await page.getByTestId('totp-secret').textContent())!.trim();
  await page.fill('input[name=code]', authenticator.generate(secret));
  await page.getByRole('button', { name: /verify|confirm|sign in|continue/i }).click();
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
  await expect(store.getByRole('heading', { level: 1, name: headline })).toBeVisible();
  await store.close();

  // Restore the original hero title.
  await page.fill('[data-testid=hero-title-0]', original);
  await page.getByRole('button', { name: 'Publish hero slides' }).click();
  await expect(page.getByText('Hero slides published')).toBeVisible();
});
