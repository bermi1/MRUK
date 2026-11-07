import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';
import type { Page } from '@playwright/test';
import { expect } from './fixtures';

/** Shared staff sign-in for the admin specs. Works whether the server requires 2FA or not (STAFF_2FA_REQUIRED=false). */
export const STAFF_PASSWORD = process.env.SEED_STAFF_PASSWORD ?? 'ChangeMe-2026!';
export const DB_URL = process.env.DATABASE_URL ?? 'postgresql://bt:bt@localhost:5432/bt_commerce';

export function db() {
  return new PrismaClient({ datasources: { db: { url: DB_URL } } });
}

/** Reset a staff member's 2FA, lockout and the sign-in rate limits so each test starts clean. */
export async function resetStaff(email: string) {
  const c = db();
  await c.staffUser.update({ where: { email }, data: { totpEnabled: false, totpSecretEnc: null, failedLogins: 0, lockedUntil: null } });
  await c.rateLimit.deleteMany({});
  await c.$disconnect();
}

/** Does the server under test ask for an authenticator code? (GET /api/health reports the sign-in mode.) */
export async function serverRequires2fa(page: Page): Promise<boolean> {
  const r = await page.request.get('/api/health');
  const j = (await r.json().catch(() => ({}))) as { staff2faRequired?: boolean };
  return j.staff2faRequired !== false;
}

/**
 * Email + password, then (when the server requires it) first-time authenticator enrolment, or a code
 * when the secret is already known. Returns the TOTP secret ('' in password-only mode).
 */
export async function staffSignIn(page: Page, email: string, opts: { password?: string; secret?: string; reset?: boolean } = {}): Promise<string> {
  if (opts.reset !== false && !opts.secret && opts.password === undefined) await resetStaff(email);
  await page.context().clearCookies(); // a staff session already in this browser would skip the login page
  await page.goto('/admin/login');
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', opts.password ?? STAFF_PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();
  const enrol = page.getByTestId('totp-secret');
  const code = page.getByText('Enter your 6-digit code');
  await expect(enrol.or(code).or(page.locator('.ad-shell'))).toBeVisible();
  if (!page.url().includes('/admin/login')) return '';
  let secret = opts.secret ?? '';
  if (await enrol.isVisible()) secret = (await enrol.textContent())!.trim();
  await page.fill('input[name=code]', authenticator.generate(secret));
  await page.getByRole('button', { name: /verify|sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/admin/login'));
  return secret;
}
