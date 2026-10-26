import { createHmac } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const PASSWORD = process.env.SEED_STAFF_PASSWORD ?? 'ChangeMe-2026!';
const DB_URL = process.env.DATABASE_URL ?? 'postgresql://bt:bt@localhost:5432/bt_commerce';

/** SESSION_SECRET signs unsubscribe links; read it the way the app does (root .env), falling back to the dev default. */
function sessionSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const f = resolve(__dirname, '../.env');
  const m = existsSync(f) ? /^SESSION_SECRET="?([^"\n]*)"?/m.exec(readFileSync(f, 'utf8')) : null;
  return m?.[1] || 'dev-only-session-secret-change-me-0000000000';
}

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

test('staff send an SMS campaign with a promo code to subscribers and see delivery stats; a subscriber unsubscribes', async ({ page }) => {
  const db = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  // A fresh, opted-in Mr UK subscriber (the storefront sign-up form is built by the storefront team).
  const phone = `+2557${String(Date.now()).slice(-8)}`;
  const sub = await db.subscriber.create({ data: { brandKey: 'mruk', name: 'Test Subscriber', phone, smsOptIn: true, consentAt: new Date(), source: 'footer' } });
  const name = `E2E offer ${Date.now().toString(36)}`;

  await signIn(page, 'bernard@bermitechs.com');
  await expect(page.getByTestId('subscribers-tile')).toBeVisible();
  await page.getByRole('link', { name: 'Campaigns and loyalty' }).click();
  await expect(page.getByRole('heading', { name: 'Campaigns', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '+ New campaign' }).click();

  await page.getByLabel('Campaign name (staff only)').fill(name);
  await page.getByLabel('Brand', { exact: true }).selectOption('mruk');
  await page.getByLabel('Channel', { exact: true }).selectOption('sms');
  await page.getByLabel('Audience', { exact: true }).selectOption('subscribers');
  await page.getByLabel('Message', { exact: true }).fill('Hi {name}, 10% off fridges this week with code {code}.');
  await page.getByLabel('Use an existing code').check();
  await page.getByLabel('Promo code').selectOption('KARIBU10');

  const preview = page.getByTestId('campaign-preview');
  await expect(preview).toContainText('Mr UK: Hi Neema, 10% off fridges this week with code KARIBU10.');
  await expect(preview).toContainText('Reply STOP to opt out');
  await expect(page.getByTestId('sms-segments')).toContainText('2 SMS parts');

  const count = page.getByTestId('audience-count');
  await expect(count).toContainText(/\d+ recipients? · Subscribers/);
  const expected = await db.subscriber.count({ where: { brandKey: 'mruk', unsubscribedAt: null, smsOptIn: true, consentAt: { not: null }, phone: { not: null } } });
  await expect(count).toContainText(`${expected} recipient`);

  // Test send to a staff phone.
  await page.getByLabel('Test recipient').fill('0754 000 999');
  await page.getByRole('button', { name: 'Send test' }).click();
  await expect(page.getByText('Test message sent')).toBeVisible();

  // Send now → confirmation with the count → send.
  await page.getByRole('button', { name: 'Send now…' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText(`Send to ${expected} recipient`);
  await dialog.getByRole('button', { name: 'Confirm and send' }).click();

  await expect(page).toHaveURL(/\/admin\/marketing\/[a-z0-9]+/);
  await expect(page.getByTestId('campaign-status')).toContainText('sent');
  const stats = page.getByTestId('campaign-stats');
  await expect(stats.locator('.ad-kpi').nth(0)).toContainText(String(expected));
  await expect(stats.locator('.ad-kpi').nth(1)).toContainText(String(expected));
  await expect(page.getByText(`Sent to ${expected} of ${expected} recipients`)).toBeVisible();

  const campaign = await db.campaign.findFirstOrThrow({ where: { name }, include: { sends: true } });
  expect(campaign.status).toBe('sent');
  expect(campaign.promoCode).toBe('KARIBU10');
  expect(campaign.sends.filter((s) => s.status === 'sent')).toHaveLength(expected);
  // The send log stores a masked number, never the raw one.
  expect(campaign.sends.some((s) => s.subscriberId === sub.id && s.to.includes('•••') && !s.to.includes(phone.slice(-6, -3)))).toBe(true);
  expect(await db.auditLog.count({ where: { action: 'campaign.send', entityId: campaign.id } })).toBe(1);

  // Unsubscribe link from the message: confirm on the storefront page.
  const t = `s.${sub.id}.${createHmac('sha256', sessionSecret()).update(`unsub:mruk:s:${sub.id}`).digest('base64url').slice(0, 32)}`;
  await page.goto(`/mruk/unsubscribe?t=${t}`);
  await page.getByRole('button', { name: 'Unsubscribe me' }).click();
  await expect(page.getByText('You will no longer receive Mr UK offers')).toBeVisible();
  expect((await db.subscriber.findUniqueOrThrow({ where: { id: sub.id } })).unsubscribedAt).not.toBeNull();
  await page.goto('/mruk/unsubscribe?t=s.bogus.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  await expect(page.getByTestId('unsubscribe-card').getByRole('alert')).toContainText('not valid');

  // The subscriber list shows them as unsubscribed.
  await page.goto('/admin/marketing/subscribers?status=unsubscribed&q=Test+Subscriber');
  await expect(page.locator(`tr[data-subscriber="${sub.id}"]`)).toContainText('Unsubscribed');
  await db.$disconnect();
});

test('loyalty points show per brand on the customer page and staff can adjust them', async ({ page }) => {
  const db = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  const c = await db.customer.findUniqueOrThrow({ where: { phone: '+255754000214' } });
  await signIn(page, 'amani@mruk.co.tz');
  await page.goto(`/admin/customers/${c.id}`);
  const card = page.getByTestId('loyalty-mruk');
  await expect(card).toContainText('points');
  const before = Number(((await card.locator('div').filter({ hasText: /points$/ }).first().textContent()) ?? '0').replace(/\D/g, ''));
  await page.getByText('Adjust points').click();
  const form = page.getByRole('form', { name: 'Adjust loyalty points' });
  await form.getByLabel('Brand').selectOption('mruk');
  await form.getByLabel('Points (+ or −)').fill('250');
  await form.getByLabel('Reason (kept in the audit log)').fill('Goodwill for late delivery');
  await form.getByRole('button', { name: 'Record adjustment' }).click();
  await expect(form.getByText('+250 points recorded')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('loyalty-mruk')).toContainText((before + 250).toLocaleString('en-US'));
  expect(await db.auditLog.count({ where: { action: 'loyalty.adjust', entityId: c.id } })).toBeGreaterThan(0);
  await db.$disconnect();
});
